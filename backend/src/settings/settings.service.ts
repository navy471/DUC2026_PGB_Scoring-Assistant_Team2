import { Injectable, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemFeatures {
  allowScanUpload: boolean;
  allowGoogleSheetsSync: boolean;
  allowManualGradeEdit: boolean;
  allowExcelExport: boolean;
  allowStudentRosterEdit: boolean;
}

export interface SystemSettingsData {
  features: SystemFeatures;
  aiConfig: {
    confidenceThreshold: number;
    autoApprove: boolean;
  };
  general: {
    schoolName: string;
    gradingScale: string;
    exportFormat: string;
  };
}

const DEFAULT_SETTINGS: SystemSettingsData = {
  features: {
    allowScanUpload: true,
    allowGoogleSheetsSync: true,
    allowManualGradeEdit: true,
    allowExcelExport: true,
    allowStudentRosterEdit: true,
  },
  aiConfig: {
    confidenceThreshold: 80,
    autoApprove: false,
  },
  general: {
    schoolName: 'Digital University of Cambodia (DUC)',
    gradingScale: 'percentage',
    exportFormat: 'excel',
  },
};

@Injectable()
export class SettingsService {
  private filePath = path.resolve(process.cwd(), 'data', 'system_settings.json');

  constructor() {
    this.ensureFileExists();
  }

  private ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    }
  }

  getSettings(): SystemSettingsData {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        features: { ...DEFAULT_SETTINGS.features, ...(parsed.features || {}) },
        aiConfig: { ...DEFAULT_SETTINGS.aiConfig, ...(parsed.aiConfig || {}) },
        general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) },
      };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  updateSettings(newData: Partial<SystemSettingsData>, userRole: string): SystemSettingsData {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('មានតែ Administrator ប៉ុណ្ណោះដែលអាចកំណត់ Feature បាន (Only Administrators can modify system settings)');
    }

    const current = this.getSettings();
    const updated: SystemSettingsData = {
      features: { ...current.features, ...(newData.features || {}) },
      aiConfig: { ...current.aiConfig, ...(newData.aiConfig || {}) },
      general: { ...current.general, ...(newData.general || {}) },
    };

    fs.writeFileSync(this.filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }
}

