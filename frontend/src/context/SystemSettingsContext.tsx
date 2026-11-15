import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface SystemFeatures {
  allowScanUpload: boolean;
  allowGoogleSheetsSync: boolean;
  allowManualGradeEdit: boolean;
  allowExcelExport: boolean;
  allowStudentRosterEdit: boolean;
}

export interface SystemSettings {
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

const DEFAULT_SETTINGS: SystemSettings = {
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

interface SystemSettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const refreshSettings = async () => {
    try {
      const res = await axios.get(`${apiUrl}/settings`);
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.warn('Using default settings (could not reach /settings endpoint)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!token) return;
    const res = await axios.put(`${apiUrl}/settings`, newSettings, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSettings(res.data);
  };

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return context;
};

