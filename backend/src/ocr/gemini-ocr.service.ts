import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import * as fs from 'fs';

export interface GeminiOcrResult {
  studentCode: string | null;
  studentName: string | null;
  topRightScore: { numerator: number; denominator: number } | null;
  totalMarksScore: { numerator: number; denominator: number } | null;
  confidence: number;
  rawResponse: string;
}

@Injectable()
export class GeminiOcrService {
  private genAI: GoogleGenerativeAI | null = null;
  private isAvailable = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.isAvailable = true;
      console.log('[GeminiOCR] ✅ Gemini Vision API ready');
    } else {
      console.warn('[GeminiOCR] ⚠️ GEMINI_API_KEY not set — Gemini OCR disabled, using Tesseract fallback');
    }
  }

  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * Analyze an exam paper image using Gemini Vision AI
   * Returns structured data: student code, name, and scores
   */
  async analyzeExamPaper(imageBuffer: Buffer, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'): Promise<GeminiOcrResult> {
    if (!this.genAI || !this.isAvailable) {
      return {
        studentCode: null,
        studentName: null,
        topRightScore: null,
        totalMarksScore: null,
        confidence: 0,
        rawResponse: 'Gemini not available'
      };
    }

    const imagePart: Part = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType
      }
    };

    const prompt = `You are an expert AI vision system analyzing a university exam paper from Digital University of Cambodia (DUC).
The image may be rotated at 90, 180, or 270 degrees. Read text in whatever orientation it appears.

Extract the following key information with MAXIMUM ACCURACY:

1. **studentCode**:
   - Look at the "Identification:" line inside the student information box.
   - The handwritten number often looks like "20240212" or "DUC20240212" or "DIT20240212".
   - Extract the full student code or numeric ID.

2. **studentName**:
   - The handwritten name on the "Name:" line (e.g. "SOURN VISAL" or Khmer name).

3. **topRightScore**:
   - Handwritten score in RED INK at the TOP-RIGHT corner of the paper (outside the form box).
   - Format is typically "numerator/denominator", like "29/100", "47/60", "2/60", "32/100".
   - It may be rotated or angled.
   - Return object: {"numerator": <number>, "denominator": <number>} or null.

4. **totalMarksScore**:
   - Look inside the printed form box at the field labeled "Total Marks:".
   - Look for a handwritten score circled or written in red ink, like "41.4/60", "44/60", "19.2/60".
   - Return object: {"numerator": <number>, "denominator": <number>} or null.

Respond ONLY with valid JSON (no markdown formatting, no code block backticks):
{
  "studentCode": "20240212",
  "studentName": "SOURN VISAL",
  "topRightScore": {"numerator": 29, "denominator": 100},
  "totalMarksScore": {"numerator": 41.4, "denominator": 60},
  "confidence": 0.98,
  "notes": "detected score 41.4/60 and 29/100"
}`;

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let rawText = '';
    let success = false;

    for (const modelName of candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        rawText = response.text().trim();
        console.log(`[GeminiOCR (${modelName})] Raw response:`, rawText.slice(0, 300));
        success = true;
        break;
      } catch (err: any) {
        console.warn(`[GeminiOCR (${modelName})] Failed:`, err.message?.slice(0, 150));
        // If 429 quota, wait 2 seconds before trying fallback model
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!success || !rawText) {
      return {
        studentCode: null,
        studentName: null,
        topRightScore: null,
        totalMarksScore: null,
        confidence: 0,
        rawResponse: 'All Gemini models unavailable or quota exceeded'
      };
    }

    try {
      // Clean response — remove markdown code blocks if present
      let jsonText = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      } else {
        // Find JSON object in response
        const objMatch = rawText.match(/\{[\s\S]*\}/);
        if (objMatch) jsonText = objMatch[0];
      }

      const parsed = JSON.parse(jsonText);

      const parseFraction = (val: any): { numerator: number; denominator: number } | null => {
        if (!val) return null;
        if (typeof val === 'object' && val.numerator != null) {
          const num = parseFloat(val.numerator);
          const den = parseFloat(val.denominator || 100);
          return isNaN(num) ? null : { numerator: num, denominator: isNaN(den) ? 100 : den };
        }
        if (typeof val === 'string') {
          const match = val.match(/([0-9.]+)\s*[/|\\]\s*([0-9.]+)/);
          if (match) {
            return { numerator: parseFloat(match[1]), denominator: parseFloat(match[2]) };
          }
          const single = parseFloat(val);
          return isNaN(single) ? null : { numerator: single, denominator: 100 };
        }
        if (typeof val === 'number') {
          return { numerator: val, denominator: 100 };
        }
        return null;
      };
      
      return {
        studentCode: parsed.studentCode || parsed.identification_number || null,
        studentName: parsed.studentName || parsed.student_name || null,
        topRightScore: parseFraction(parsed.topRightScore || parsed.handwritten_score_top_right),
        totalMarksScore: parseFraction(parsed.totalMarksScore || parsed.total_marks_score),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
        rawResponse: rawText
      };
    } catch (err: any) {
      console.error('[GeminiOCR] JSON Parse Error:', err.message);
      return {
        studentCode: null,
        studentName: null,
        topRightScore: null,
        totalMarksScore: null,
        confidence: 0,
        rawResponse: rawText
      };
    }
  }

  /**
   * Convert a score fraction to a percentage (0-100)
   */
  scoreToPercent(score: { numerator: number; denominator: number } | null): number | null {
    if (!score) return null;
    const { numerator, denominator } = score;
    if (denominator === 100) return Math.round(numerator);
    if (denominator > 0) return Math.round((numerator / denominator) * 100);
    return null;
  }
}

