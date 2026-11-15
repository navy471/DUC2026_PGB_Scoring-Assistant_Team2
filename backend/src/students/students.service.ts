import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SharesService } from '../shares/shares.service.js';
import * as xlsx from 'xlsx';
import axios from 'axios';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private sharesService: SharesService,
  ) {}

  async findAll(user?: any) {
    const where: any = {};
    if (user && user.role !== 'ADMIN') {
      const allowedIds = await this.sharesService.getCollaboratorIds(user.userId);
      where.created_by = { in: allowedIds };
    }
    return this.prisma.student.findMany({ where, orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }

  async findByCode(student_code: string, user?: any) {
    const where: any = { student_code };
    if (user && user.role !== 'ADMIN') {
      const allowedIds = await this.sharesService.getCollaboratorIds(user.userId);
      where.created_by = { in: allowedIds };
    }
    return this.prisma.student.findFirst({ where });
  }

  create(data: any, userId?: string) {
    return this.prisma.student.create({
      data: {
        ...data,
        created_by: userId || data.created_by
      }
    });
  }

  update(id: string, data: any) {
    return this.prisma.student.update({ where: { id }, data });
  }

  async remove(id: string) {
    try {
      return await this.prisma.student.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('Cannot delete student. They may have existing grades or scans.');
      }
      throw e;
    }
  }

  async renameClass(oldName: string, newName: string, user?: any) {
    if (!newName || !newName.trim()) {
      throw new BadRequestException('New class name is required');
    }
    const cleanNew = newName.trim();
    const studentWhere: any = { class_name: oldName };
    const assessmentWhere: any = { class_name: oldName };
    if (user && user.role !== 'ADMIN') {
      const allowedIds = await this.sharesService.getCollaboratorIds(user.userId);
      studentWhere.created_by = { in: allowedIds };
      assessmentWhere.created_by = { in: allowedIds };
    }

    const studentUpdate = await this.prisma.student.updateMany({
      where: studentWhere,
      data: { class_name: cleanNew }
    });

    await this.prisma.assessment.updateMany({
      where: assessmentWhere,
      data: { class_name: cleanNew }
    });

    return { success: true, updatedStudents: studentUpdate.count, new_class_name: cleanNew };
  }

  async deleteClass(className: string, user?: any) {
    const studentWhere: any = { class_name: className };
    const assessmentWhere: any = { class_name: className };
    if (user && user.role !== 'ADMIN') {
      const allowedIds = await this.sharesService.getCollaboratorIds(user.userId);
      studentWhere.created_by = { in: allowedIds };
      assessmentWhere.created_by = { in: allowedIds };
    }

    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: { id: true }
    });
    const studentIds = students.map(s => s.id);

    if (studentIds.length > 0) {
      const grades = await this.prisma.grade.findMany({
        where: { student_id: { in: studentIds } },
        select: { id: true }
      });
      const gradeIds = grades.map(g => g.id);

      if (gradeIds.length > 0) {
        await this.prisma.verificationLog.deleteMany({
          where: { grade_id: { in: gradeIds } }
        });
        await this.prisma.grade.deleteMany({
          where: { student_id: { in: studentIds } }
        });
      }

      await this.prisma.scannedPaper.updateMany({
        where: { student_id: { in: studentIds } },
        data: { student_id: null }
      });

      const deleteResult = await this.prisma.student.deleteMany({
        where: studentWhere
      });

      return { success: true, deletedStudents: deleteResult.count };
    }

    return { success: true, deletedStudents: 0 };
  }

  private extractDataFromWorksheet(worksheet: xlsx.WorkSheet) {
    const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rows.length === 0) {
      throw new BadRequestException('The uploaded file or sheet is empty.');
    }

    let headerRowIndex = -1;
    let headers: string[] = [];
    
    // Scan up to first 30 rows to find the true header row (looks for ID/Number and Name keywords)
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const rowString = row.filter(Boolean).map(c => String(c).trim().toLowerCase()).join(' ').replace(/\s+/g, '');
      const hasId = rowString.includes('អត្តលេខ') || rowString.includes('ល.រ') || rowString.includes('លរ') || rowString.includes('id') || rowString.includes('code') || rowString.includes('លេខសម្គាល់');
      const hasName = rowString.includes('ឈ្មោះ') || rowString.includes('គោត្តនាម') || rowString.includes('នាម') || rowString.includes('name');
      if (hasId && hasName) {
        headerRowIndex = i;
        headers = row.map((col, idx) => col ? String(col).trim() : `__EMPTY_${idx}`);
        break;
      }
    }

    // Secondary scan: if only Name is found in a row with at least 2 non-empty cells
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const nonEmpties = row.filter(Boolean);
        const rowString = nonEmpties.map(c => String(c).trim().toLowerCase()).join(' ').replace(/\s+/g, '');
        if (nonEmpties.length >= 2 && (rowString.includes('ឈ្មោះ') || rowString.includes('គោត្តនាម') || rowString.includes('នាម') || rowString.includes('name'))) {
          headerRowIndex = i;
          headers = row.map((col, idx) => col ? String(col).trim() : `__EMPTY_${idx}`);
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
       headerRowIndex = 0;
       headers = (rows[0] || []).map((col, idx) => col ? String(col).trim() : `__EMPTY_${idx}`);
    }

    const rawData = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const rowArray = rows[i];
      // Skip completely empty rows
      if (!rowArray || rowArray.length === 0 || rowArray.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
        continue;
      }
      
      const rowObj: any = {};
      headers.forEach((h, index) => {
        rowObj[h] = rowArray[index];
      });
      rawData.push(rowObj);
    }

    return { headers, rawData };
  }

  async parseImportFile(buffer: Buffer) {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return this.extractDataFromWorksheet(worksheet);
    } catch (e) {
      throw new BadRequestException('Failed to parse Excel/CSV file.');
    }
  }

  async parseGoogleSheet(sheetUrl: string) {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new BadRequestException('តំណភ្ជាប់ Google Sheets មិនត្រឹមត្រូវឡើយ (Invalid Google Sheets URL)');
    }
    const sheetId = match[1];

    // Extract gid (sheet tab ID) if present in URL
    const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : null;

    // Strategies to download sheet data:
    // 1. XLSX export (Preserves exact Unicode/Khmer text encoding, types, numbers)
    // 2. CSV export with GID
    // 3. Google Visualization API (often succeeds if export endpoint is rate-limited)
    const exportUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`,
    ];

    let lastError: any = null;
    for (const url of exportUrls) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          },
          maxRedirects: 5,
        });

        // Detect if Google returned a sign-in / redirect HTML page (happens when sheet is private)
        const previewText = Buffer.from(response.data.slice(0, 400)).toString('utf-8').trim();
        if (
          previewText.startsWith('<!DOCTYPE html') ||
          previewText.startsWith('<html') ||
          previewText.includes('ServiceLogin') ||
          previewText.includes('accounts.google.com')
        ) {
          throw new BadRequestException(
            'Google Sheet នេះមិនទាន់បានបើកសិទ្ធិសាធារណៈឡើយ។ សូមកំណត់ក្នុង Google Sheets: Share > General access > Anyone with the link (Viewer)!'
          );
        }

        const workbook = xlsx.read(response.data, { type: 'buffer' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          continue;
        }

        // Use the first sheet or the sheet tab
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return this.extractDataFromWorksheet(worksheet);
      } catch (err: any) {
        lastError = err;
        if (err instanceof BadRequestException) {
          throw err;
        }
      }
    }

    throw new BadRequestException(
      lastError?.response?.status === 404
        ? 'រកមិនឃើញឯកសារ Google Sheet នេះឡើយ (404 Not Found)។ សូមពិនិត្យតំណភ្ជាប់ម្តងទៀត។'
        : (lastError?.message || 'មិនអាចទាញទិន្នន័យពី Google Sheet បានឡើយ។ សូមប្រាកដថា Google Sheet ត្រូវបានកំណត់ Share ជា "Anyone with the link can view"!')
    );
  }

  async bulkUpsertStudents(mappedData: any[], fallbackClassName?: string, userId?: string) {
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const row of mappedData) {
      if (!row.student_id || !row.full_name) {
        failed++;
        errors.push(`Missing student_id or full_name for row: ${JSON.stringify(row)}`);
        continue;
      }

      const class_name = row.class_name || fallbackClassName || 'Unassigned';

      try {
        const existing = await this.prisma.student.findUnique({
          where: { student_code: String(row.student_id) }
        });

        if (existing) {
          await this.prisma.student.update({
            where: { student_code: String(row.student_id) },
            data: {
              name: String(row.full_name),
              khmer_name: row.khmer_name ? String(row.khmer_name) : null,
              gender: row.gender ? String(row.gender) : null,
              class_name: class_name,
              academic_year: row.academic_year ? String(row.academic_year) : null,
              email: row.email ? String(row.email) : null,
              phone: row.phone ? String(row.phone) : null,
              import_source: row.import_source || 'EXCEL',
              created_by: userId || existing.created_by
            }
          });
          updated++;
        } else {
          await this.prisma.student.create({
            data: {
              student_code: String(row.student_id),
              name: String(row.full_name),
              khmer_name: row.khmer_name ? String(row.khmer_name) : null,
              gender: row.gender ? String(row.gender) : null,
              class_name: class_name,
              academic_year: row.academic_year ? String(row.academic_year) : null,
              email: row.email ? String(row.email) : null,
              phone: row.phone ? String(row.phone) : null,
              import_source: row.import_source || 'EXCEL',
              created_by: userId || null
            }
          });
          inserted++;
        }
      } catch (e: any) {
        failed++;
        errors.push(`Failed to save student ${row.student_id}: ${e.message}`);
      }
    }

    return {
      success: true,
      stats: { inserted, updated, failed },
      errors
    };
  }
}
