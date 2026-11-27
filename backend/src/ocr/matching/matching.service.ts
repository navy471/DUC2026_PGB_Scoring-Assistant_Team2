import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CandidateSuggestion {
  studentId: string;
  studentCode: string;
  name: string;
  khmerName?: string | null;
  className: string;
  similarity: number;
}

export interface MatchResult {
  studentId: string | null;
  studentCode: string;
  studentName: string | null;
  confidence: number;
  matchType: 'EXACT_CODE' | 'NORM_CODE' | 'DIGITS_CODE' | 'NAME_EXACT' | 'NAME_FUZZY' | 'NAME_LATIN' | 'NONE';
  matchedStudent?: any;
  suggestions?: CandidateSuggestion[];
}

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  // Common Khmer to Latin phonetic variations for Cambodian names
  private readonly KHMER_TO_LATIN: Record<string, string[]> = {
    'សុខ': ['sok', 'sokh'],
    'នៀម': ['niem', 'neam', 'nem', 'ntem'],
    'ពៅ': ['pov', 'peou', 'pau'],
    'សុវណ្ណ': ['sovann', 'sovanna', 'souvann'],
    'រិទ្ធ': ['rith', 'riddh', 'reth'],
    'រិទ្ទ': ['rith', 'riddh', 'reth'],
    'ស្រី': ['srey', 'srei', 'sre'],
    'និត': ['nit', 'nith', 'neat'],
    'សុផា': ['sopha', 'sophea'],
    'រដ្ឋា': ['rotha', 'rotta'],
    'ស្រីលាក់': ['sreyleak', 'sreylak'],
    'ស្រីអូន': ['sreyoun', 'sreyoun'],
    'បញ្ញា': ['panha', 'panya'],
    'ម៉ាង': ['mang', 'marng'],
    'ទូច': ['touch', 'tuch'],
    'ណារាជ': ['nareach', 'narach'],
    'សីហា': ['seyha', 'seiha'],
    'តាំង': ['tang'],
    'ប៊ុនផៃ': ['bunphai', 'bunfai', 'bunphy'],
    'ឈន': ['chhon', 'chhon'],
    'វ៉េន': ['ven', 'vean'],
    'តេង': ['teng'],
    'អ៊ុន': ['oun', 'un']
  };

  private cleanStr(s: string | null | undefined): string {
    return (s || '')
      .toLowerCase()
      .replace(/[\s\u200B\u200C\u200D\-_.:@,]/g, '');
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }
    return d[m][n];
  }

  private similarity(a: string, b: string): number {
    const ca = this.cleanStr(a);
    const cb = this.cleanStr(b);
    if (!ca || !cb) return 0;
    if (ca === cb) return 1;
    const maxLen = Math.max(ca.length, cb.length);
    return 1 - (this.levenshtein(ca, cb) / maxLen);
  }

  async matchStudent(
    detectedCode: string | null, 
    detectedName: string | null,
    assessmentClass?: string | null
  ): Promise<MatchResult> {
    // 1. Fetch candidate students, prioritizing current assessment class if provided
    let candidateStudents = assessmentClass
      ? await this.prisma.student.findMany({
          where: {
            OR: [
              { class_name: assessmentClass },
              { class_name: { contains: assessmentClass, mode: 'insensitive' } }
            ]
          }
        })
      : [];

    if (candidateStudents.length === 0) {
      candidateStudents = await this.prisma.student.findMany();
    }

    if (candidateStudents.length === 0) {
      return { 
        studentId: null, 
        studentCode: detectedCode || 'UNKNOWN', 
        studentName: detectedName, 
        confidence: 0.3, 
        matchType: 'NONE' 
      };
    }

    const cleanCode = this.cleanStr(detectedCode);
    const cleanDigits = (detectedCode || '').replace(/\D/g, '');

    // Helper to build candidate suggestions
    const buildSuggestions = (): CandidateSuggestion[] => {
      const suggestions: { student: any; similarity: number }[] = [];
      for (const s of candidateStudents) {
        let maxSim = 0;
        if (detectedName) {
          const simName = this.similarity(detectedName, s.name);
          const simKhmer = s.khmer_name ? this.similarity(detectedName, s.khmer_name) : 0;
          maxSim = Math.max(simName, simKhmer);
        }
        if (cleanCode && cleanCode !== 'unknown') {
          const simCode = this.similarity(cleanCode, s.student_code);
          maxSim = Math.max(maxSim, simCode);
        }
        if (maxSim >= 0.35) {
          suggestions.push({ student: s, similarity: maxSim });
        }
      }
      return suggestions
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 4)
        .map(({ student: s, similarity }) => ({
          studentId: s.id,
          studentCode: s.student_code,
          name: s.name,
          khmerName: s.khmer_name,
          className: s.class_name,
          similarity: Math.round(similarity * 100) / 100
        }));
    };

    // STRATEGY 1: STUDENT NAME MATCH (Khmer & Transliteration)
    if (detectedName) {
      const cleanDetName = this.cleanStr(detectedName);

      // Exact Latin name match (case-insensitive)
      for (const s of candidateStudents) {
        if (s.name && s.name.trim().toLowerCase() === detectedName.trim().toLowerCase()) {
          return {
            studentId: s.id,
            studentCode: s.student_code,
            studentName: s.name,
            confidence: 0.99,
            matchType: 'NAME_EXACT',
            matchedStudent: s
          };
        }
      }

      // Exact Khmer match
      for (const s of candidateStudents) {
        const sName = this.cleanStr(s.name);
        const sKhmer = this.cleanStr(s.khmer_name);
        if ((sName && sName === cleanDetName) || (sKhmer && sKhmer === cleanDetName)) {
          return {
            studentId: s.id,
            studentCode: s.student_code,
            studentName: s.name,
            confidence: 0.96,
            matchType: 'NAME_EXACT',
            matchedStudent: s
          };
        }
      }

      // Fuzzy Khmer / Latin similarity (e.g. សុខ សុវណ្ណរិទ្ធ vs សុខ​ សុវណ្ណរិទ្ទ)
      let bestMatch: any = null;
      let highestSim = 0;
      for (const s of candidateStudents) {
        const sim1 = this.similarity(detectedName, s.name);
        const sim2 = s.khmer_name ? this.similarity(detectedName, s.khmer_name) : 0;
        const maxSim = Math.max(sim1, sim2);
        if (maxSim > highestSim) {
          highestSim = maxSim;
          bestMatch = s;
        }
      }

      if (bestMatch && highestSim >= 0.72) {
        return {
          studentId: bestMatch.id,
          studentCode: bestMatch.student_code,
          studentName: bestMatch.name,
          confidence: Math.round(highestSim * 100) / 100,
          matchType: 'NAME_FUZZY',
          matchedStudent: bestMatch,
          suggestions: buildSuggestions()
        };
      }

      // Token-level Khmer matching (e.g. "ឈឹម ថាវី" matches "យ៉េង ថាវី" on "ថាវី" if class has only 1 "ថាវី")
      const detTokens = detectedName.trim().split(/[\s\u200B]+/);
      for (const token of detTokens) {
        if (token.length >= 2) {
          const matchingStudents = candidateStudents.filter(s => 
            (s.khmer_name && s.khmer_name.includes(token)) || 
            (s.name && s.name.toLowerCase().includes(token.toLowerCase()))
          );
          if (matchingStudents.length === 1) {
            const single = matchingStudents[0];
            return {
              studentId: single.id,
              studentCode: single.student_code,
              studentName: single.name,
              confidence: 0.88,
              matchType: 'NAME_FUZZY',
              matchedStudent: single,
              suggestions: buildSuggestions()
            };
          }
        }
      }

      // Latin Transliteration match (e.g. NIEM SREYNIT vs នៀម ស្រីនិត)
      const latinLower = detectedName.toLowerCase().replace(/[^a-z]/g, '');
      if (latinLower.length >= 3) {
        for (const s of candidateStudents) {
          const sName = s.name || '';
          let matchCount = 0;
          for (const [khmerWord, translits] of Object.entries(this.KHMER_TO_LATIN)) {
            if (sName.includes(khmerWord) || (s.khmer_name && s.khmer_name.includes(khmerWord))) {
              if (translits.some(t => latinLower.includes(t))) {
                matchCount++;
              }
            }
          }
          if (matchCount >= 2 || (matchCount >= 1 && sName.length <= 4)) {
            return {
              studentId: s.id,
              studentCode: s.student_code,
              studentName: s.name,
              confidence: 0.92,
              matchType: 'NAME_LATIN',
              matchedStudent: s,
              suggestions: buildSuggestions()
            };
          }
        }
      }
    }

    // STRATEGY 2: EXACT / NORMALIZED STUDENT CODE MATCH (fallback when name is unclear)
    if (cleanCode && cleanCode !== 'unknown') {
      for (const s of candidateStudents) {
        const sCode = this.cleanStr(s.student_code);
        // Only consider exact match or clean match (avoid partial suffix like 150 matching 2024150 if name conflicts)
        if (sCode === cleanCode) {
          return {
            studentId: s.id,
            studentCode: s.student_code,
            studentName: s.name,
            confidence: 0.99,
            matchType: 'EXACT_CODE',
            matchedStudent: s
          };
        }
      }
    }

    // STRATEGY 3: NUMERIC SUFFIX MATCH (stripping year prefix like 2024/2025)
    // Avoid matching pure year digits (e.g. 2024 should not match Khmer-024)
    const pureStudentNum = cleanDigits.replace(/^202[0-9]/, '');
    if (pureStudentNum.length >= 3) {
      // If studentName was detected, also check that the candidate student loosely matches name to prevent collisions
      for (const s of candidateStudents) {
        const sRawDigits = (s.student_code || '').replace(/\D/g, '');
        const sPureDigits = sRawDigits.replace(/^202[0-9]/, '');
        if (sPureDigits && (sPureDigits === pureStudentNum || sPureDigits.endsWith(pureStudentNum) || pureStudentNum.endsWith(sPureDigits))) {
          // Verify name does not drastically conflict
          if (detectedName) {
            const simName = this.similarity(detectedName, s.name);
            const simKhmer = s.khmer_name ? this.similarity(detectedName, s.khmer_name) : 0;
            // If another candidate in candidateStudents matches detectedName directly, don't use this numeric match!
            const nameBetter = candidateStudents.some(cs => cs.id !== s.id && (this.similarity(detectedName, cs.name) >= 0.75 || (cs.khmer_name && this.similarity(detectedName, cs.khmer_name) >= 0.75)));
            if (nameBetter) continue;
          }

          return {
            studentId: s.id,
            studentCode: s.student_code,
            studentName: s.name,
            confidence: 0.91,
            matchType: 'DIGITS_CODE',
            matchedStudent: s,
            suggestions: buildSuggestions()
          };
        }
      }
    }

    return {
      studentId: null,
      studentCode: detectedCode || 'UNKNOWN',
      studentName: detectedName,
      confidence: 0.4,
      matchType: 'NONE',
      suggestions: buildSuggestions()
    };
  }

  async fuzzyMatchStudent(detectedCode: string | null): Promise<string | null> {
    const res = await this.matchStudent(detectedCode, null);
    return res.studentId;
  }
}
