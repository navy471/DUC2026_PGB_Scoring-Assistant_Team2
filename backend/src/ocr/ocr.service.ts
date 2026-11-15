import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MatchingService } from './matching/matching.service.js';
import { GeminiOcrService } from './gemini-ocr.service.js';
import * as path from 'path';
import * as process from 'process';
import * as os from 'os';
import * as fs from 'fs';
import Tesseract from 'tesseract.js';
import { Jimp } from 'jimp';
import sharp from 'sharp';

@Injectable()
export class OcrService {
  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
    private geminiOcrService: GeminiOcrService
  ) {}

  async processPaper(paperId: string) {
    const paper = await this.prisma.scannedPaper.findUnique({
      where: { id: paperId },
      include: {
        ScanBatch: {
          include: {
            Assessment: true
          }
        }
      }
    });

    if (!paper) return;

    try {
      // Robust path resolution whether process.cwd() is project root or backend dir
      let filePath = path.join(process.cwd(), paper.file_url);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), 'backend', paper.file_url);
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), 'uploads', path.basename(paper.file_url));
      }
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // 1. Auto-orient / rotate image if uploaded in landscape (A4 exam papers are always portrait)
      let imageBuffer = await sharp(filePath).rotate().toBuffer();
      const meta = await sharp(imageBuffer).metadata();
      if (meta.width && meta.height && meta.width > meta.height) {
        imageBuffer = await sharp(imageBuffer).rotate(90).toBuffer();
        try {
          fs.writeFileSync(filePath, imageBuffer);
        } catch (err) {
          console.warn('Could not overwrite rotated image to file:', err);
        }
      }

      let detectedCode = 'UNKNOWN';
      let detectedName: string | null = null;
      let detectedScore = 0;
      let scoreConfidence = 0.5;
      let rawText = '';

      // 2. Try Gemini Multimodal Vision AI FIRST (if available) for >=90% accuracy on handwritten marks
      if (this.geminiOcrService.available) {
        try {
          console.log(`[OCR ${paperId}] Invoking Gemini Vision AI for high-accuracy handwriting recognition...`);
          const geminiResult = await this.geminiOcrService.analyzeExamPaper(imageBuffer);
          rawText = geminiResult.rawResponse;

          if (geminiResult.studentCode) {
            detectedCode = geminiResult.studentCode;
          }
          if (geminiResult.studentName) {
            detectedName = geminiResult.studentName;
          }

          // Prioritize Total Marks score, then top-right score
          const totalMarksPct = this.geminiOcrService.scoreToPercent(geminiResult.totalMarksScore);
          const topRightPct = this.geminiOcrService.scoreToPercent(geminiResult.topRightScore);

          if (totalMarksPct !== null && totalMarksPct >= 0 && totalMarksPct <= 100) {
            detectedScore = totalMarksPct;
            scoreConfidence = Math.max(geminiResult.confidence, 0.95);
          } else if (topRightPct !== null && topRightPct >= 0 && topRightPct <= 100) {
            detectedScore = topRightPct;
            scoreConfidence = Math.max(geminiResult.confidence, 0.92);
          }
          console.log(`[OCR ${paperId}] Gemini Vision parsed:`, { detectedCode, detectedName, detectedScore, scoreConfidence });
        } catch (geminiErr) {
          console.warn(`[OCR ${paperId}] Gemini Vision failed, falling back to Tesseract:`, geminiErr);
        }
      }

      // 3. Fallback to Tesseract if Code or Score not resolved
      if (detectedScore === 0 || detectedCode === 'UNKNOWN') {
        const { data: { text } } = await Tesseract.recognize(
          imageBuffer,
          'eng+khm',
          { logger: m => console.log(`[OCR ${paperId}]:`, m.status, Math.round((m.progress || 0) * 100) + '%') }
        );

        if (!rawText) rawText = text;
        console.log(`[OCR TEXT for ${paperId}]:\n`, text.slice(0, 400));

        if (detectedCode === 'UNKNOWN') {
          const ducMatch = text.match(/DUC[\s._-]*([A-Z0-9-]+)/i);
          const ditMatch = text.match(/D[\s._]*I[\s._]*T[\s._]*([A-Z0-9-]+)/i);
          const atMatch = text.match(/@IT[\s._]*([A-Z0-9-]+)/i);
          const identMatch = text.match(/Identification\s*[:.-]*\s*([A-Za-z0-9._-]+)/i);
          const idMatch = text.match(/ID[\s:]*([A-Za-z0-9-]+)/i);

          if (ducMatch) {
            const clean = ducMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            detectedCode = `DUC${clean}`;
          } else if (ditMatch) {
            const clean = ditMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            detectedCode = `DIT${clean}`;
          } else if (atMatch) {
            const clean = atMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            detectedCode = `DIT${clean}`;
          } else if (identMatch) {
            detectedCode = identMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          } else if (idMatch) {
            detectedCode = idMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          }
        }

        if (!detectedName) {
          const nameMatch = text.match(/Name\s*[:.-]+\s*([^\n\r.]+)/i);
          if (nameMatch) {
            let rawName = nameMatch[1].trim();
            rawName = rawName.split(/\b(Gender|Room|Exam|Seat|Identification|Total)\b/i)[0].trim();
            rawName = rawName.replace(/[._\-]+/g, ' ').trim();
            if (rawName.length >= 2) {
              detectedName = rawName;
            }
          }
        }

        if (detectedScore === 0) {
          const totalMarksMatch = text.match(/Total\s*Marks\s*[:.-]*\s*([0-9.]+)\s*[/|]\s*60/i);
          const outOf100Match = text.match(/([0-9.]+)\s*[/|]\s*100/i);

          if (totalMarksMatch) {
            const rawMarks = parseFloat(totalMarksMatch[1]);
            if (!isNaN(rawMarks) && rawMarks >= 0 && rawMarks <= 60) {
              detectedScore = Math.round((rawMarks / 60) * 100);
              scoreConfidence = 0.95;
            }
          } else if (outOf100Match) {
            const raw100 = parseFloat(outOf100Match[1]);
            if (!isNaN(raw100) && raw100 >= 0 && raw100 <= 100) {
              detectedScore = Math.round(raw100);
              scoreConfidence = 0.92;
            }
          }
        }

        // Color isolation fallback
        if (detectedScore === 0) {
          try {
            const image = await Jimp.read(imageBuffer);
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(this: any, x, y, idx) {
              const r = this.bitmap.data[idx + 0];
              const g = this.bitmap.data[idx + 1];
              const b = this.bitmap.data[idx + 2];
              if (r > 105 && (r - g > 20) && (r - b > 20)) {
                this.bitmap.data[idx + 0] = 0;
                this.bitmap.data[idx + 1] = 0;
                this.bitmap.data[idx + 2] = 0;
              } else {
                this.bitmap.data[idx + 0] = 255;
                this.bitmap.data[idx + 1] = 255;
                this.bitmap.data[idx + 2] = 255;
              }
            });
            
            const tmpPath = path.join(os.tmpdir(), `score-${paperId}.png`);
            await image.write(tmpPath as `${string}.${string}`);
            
            const { data: scoreData } = await Tesseract.recognize(tmpPath, 'eng');
            const numbers = scoreData.text.match(/\d+/g);
            if (numbers && numbers.length > 0) {
              const validScores = numbers.map(n => parseInt(n, 10)).filter(n => n <= 100 && n >= 5);
              if (validScores.length > 0) {
                detectedScore = validScores[validScores.length - 1];
                scoreConfidence = 0.88;
              }
            }
          } catch (err) {
            console.error("Error isolating red score:", err);
          }
        }
      }

      // 4. Intelligent Multi-Tier Student Matching
      const assessmentClass = paper.ScanBatch?.Assessment?.class_name;
      const matchResult = await this.matchingService.matchStudent(
        detectedCode, 
        detectedName, 
        assessmentClass
      );

      const studentId = matchResult.studentId;
      const finalCode = matchResult.studentCode || detectedCode;
      const overallConfidence = Math.min(
        Math.max(matchResult.confidence, scoreConfidence), 
        0.99
      );

      await this.prisma.recognizedResult.create({
        data: {
          paper_id: paperId,
          detected_student_code: finalCode,
          detected_score: detectedScore,
          confidence: overallConfidence,
          raw_text: rawText,
          status: overallConfidence >= 0.75 && studentId ? 'CONFIDENT' : 'NEEDS_REVIEW'
        }
      });

      await this.prisma.scannedPaper.update({
        where: { id: paperId },
        data: {
          status: 'PROCESSED',
          student_id: studentId,
        }
      });
    } catch (e) {
      console.error('OCR Error:', e);
      await this.prisma.scannedPaper.update({
        where: { id: paperId },
        data: { status: 'FAILED' }
      });
    }
  }

  async processBatch(batchId: string) {
    const batch = await this.prisma.scanBatch.findUnique({
      where: { id: batchId },
      include: { ScannedPapers: true }
    });

    if (!batch) return;

    for (let i = 0; i < batch.ScannedPapers.length; i++) {
      const paper = batch.ScannedPapers[i];
      await this.processPaper(paper.id);
      await this.prisma.scanBatch.update({
        where: { id: batchId },
        data: { processed_files: { increment: 1 } }
      });
      // Small pause between papers to prevent API bursts and allow UI real-time progress updates
      if (i < batch.ScannedPapers.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    await this.prisma.scanBatch.update({
      where: { id: batchId },
      data: { status: 'COMPLETED' }
    });
  }

  async quickScanPreview(filePath: string, assessmentClass?: string) {
    try {
      let imageBuffer = await sharp(filePath).rotate().toBuffer();
      const meta = await sharp(imageBuffer).metadata();
      if (meta.width && meta.height && meta.width > meta.height) {
        imageBuffer = await sharp(imageBuffer).rotate(90).toBuffer();
      }

      let detectedCode = 'UNKNOWN';
      let detectedName: string | null = null;

      // 1. Try Gemini Vision for instant high-accuracy preview
      if (this.geminiOcrService.available) {
        try {
          const geminiRes = await this.geminiOcrService.analyzeExamPaper(imageBuffer);
          if (geminiRes.studentCode) detectedCode = geminiRes.studentCode;
          if (geminiRes.studentName) detectedName = geminiRes.studentName;
        } catch (err) {
          console.warn('[quickScanPreview] Gemini error, fallback to crop OCR');
        }
      }

      // 2. Fallback to Tesseract if still unresolved
      if (detectedCode === 'UNKNOWN' && !detectedName) {
        const totalH = meta.width && meta.height && meta.width > meta.height ? meta.width : (meta.height || 1000);
        const totalW = meta.width && meta.height && meta.width > meta.height ? meta.height : (meta.width || 800);

        const cropTop = Math.floor(totalH * 0.35);
        const cropHeight = Math.floor(totalH * 0.22);

        const croppedBuffer = await sharp(imageBuffer)
          .extract({ left: 0, top: cropTop, width: totalW, height: cropHeight })
          .toBuffer();

        const { data: { text } } = await Tesseract.recognize(croppedBuffer, 'eng+khm');

        const ducMatch = text.match(/DUC[\s._-]*([A-Z0-9-]+)/i);
        const ditMatch = text.match(/D[\s._]*I[\s._]*T[\s._]*([A-Z0-9-]+)/i);
        const atMatch = text.match(/@IT[\s._]*([A-Z0-9-]+)/i);
        const identMatch = text.match(/Identification\s*[:.-]*\s*([A-Za-z0-9._-]+)/i);
        if (ducMatch) detectedCode = `DUC${ducMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
        else if (ditMatch) detectedCode = `DIT${ditMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
        else if (atMatch) detectedCode = `DIT${atMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
        else if (identMatch) detectedCode = identMatch[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();

        const nameMatch = text.match(/Name\s*[:.-]+\s*([^\n\r.]+)/i);
        if (nameMatch) {
          let rawName = nameMatch[1].trim().split(/\b(Gender|Room|Exam|Seat|Identification|Total)\b/i)[0].trim();
          rawName = rawName.replace(/[._\-]+/g, ' ').trim();
          if (rawName.length >= 2) detectedName = rawName;
        }
      }

      const matchResult = await this.matchingService.matchStudent(detectedCode, detectedName, assessmentClass);
      return {
        success: true,
        detectedCode,
        detectedName,
        matchResult
      };
    } catch (e: any) {
      console.error('Quick scan preview error:', e);
      return {
        success: false,
        error: e.message
      };
    }
  }
}
