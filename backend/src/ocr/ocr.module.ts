import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service.js';
import { MatchingService } from './matching/matching.service.js';
import { GeminiOcrService } from './gemini-ocr.service.js';

@Module({
  providers: [OcrService, MatchingService, GeminiOcrService],
  exports: [OcrService, GeminiOcrService],
})
export class OcrModule {}
