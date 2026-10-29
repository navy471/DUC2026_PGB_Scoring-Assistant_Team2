import React, { useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { X, UploadCloud, Link as LinkIcon, AlertTriangle, ArrowRight, Wand2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [importSource, setImportSource] = useState<'FILE' | 'SHEET'>('FILE');
  const [sheetUrl, setSheetUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetClass, setTargetClass] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const processAndImport = async () => {
    setError('');
    setIsProcessing(true);

    if (!targetClass.trim()) {
      setError('Please provide a Target Class Name (e.g. 10A, PGB_2)');
      setIsProcessing(false);
      return;
    }

    try {
      let res;
      if (importSource === 'FILE' && file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/import-file`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else if (importSource === 'SHEET' && sheetUrl.trim()) {
        res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/import-google-sheet`,
          { sheet_url: sheetUrl.trim() },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        throw new Error('Please select an Excel file or provide a valid Google Sheets URL.');
      }

      const headers: string[] = res.data.headers || [];
      const rawData: any[] = res.data.rawData || [];
      const safeHeaders = headers.filter((h): h is string => Boolean(h && String(h).trim()));

      // Auto-Magic Mapping
      let idCol = '';
      let nameCol = '';
      let latinNameCol = '';
      let lastNameCol = '';
      let firstNameCol = '';
      let genderCol = '';

      safeHeaders.forEach((h: string) => {
        const norm = String(h || '').toLowerCase().trim().replace(/\s+/g, '');

        if (
          !idCol &&
          (norm.includes('អត្តលេខ') ||
            norm.includes('studentid') ||
            norm.includes('student_id') ||
            norm.includes('លេខសម្គាល់') ||
            norm.includes('code') ||
            norm.includes('id'))
        ) {
          idCol = h;
        } else if (
          !idCol &&
          (norm.includes('ល.រ') || norm.includes('លរ') || norm === 'no' || norm === 'nr' || norm === 'លរ.')
        ) {
          idCol = h;
        }

        // Mapping ឈ្មោះឡាតាំង (Latin Name)
        if (norm.includes('latin') || norm.includes('ឡាតាំង') || norm.includes('english') || norm.includes('eng')) {
          latinNameCol = h;
        }

        // Mapping ឈ្មោះខ្មែរ
        if (norm.includes('គោត្តនាម') && norm.includes('នាម')) {
          nameCol = h;
        } else if (norm.includes('គោត្តនាម')) {
          lastNameCol = h;
        } else if (norm.includes('នាម') && !lastNameCol) {
          nameCol = h;
        } else if ((norm.includes('ឈ្មោះ') || norm.includes('name') || norm.includes('fullname')) && !norm.includes('latin') && !norm.includes('eng')) {
          nameCol = h;
        }

        if (norm.includes('ភេទ') || norm.includes('gender') || norm.includes('sex')) {
          genderCol = h;
        }
      });

      if (!nameCol && lastNameCol) {
        firstNameCol =
          safeHeaders.find((h: string) => {
            const n = String(h || '').toLowerCase().trim().replace(/\s+/g, '');
            return n.includes('នាម') && !n.includes('គោត្ត');
          }) || '';
      }

      if (!idCol) {
        idCol =
          safeHeaders.find((h: string) => {
            const n = String(h || '').toLowerCase().trim().replace(/\s+/g, '');
            return n.includes('ល.រ') || n.includes('លរ') || n.includes('no') || n.includes('id');
          }) || '';
      }

      if (!nameCol && !lastNameCol) {
        throw new Error(
          `Auto-Mapping Failed: Could not find columns for 'ឈ្មោះ' (Name). Found headers: ${safeHeaders.join(', ')}`
        );
      }

      const validRows = rawData.filter((row) => {
        const nameVal = nameCol ? row[nameCol] : lastNameCol ? row[lastNameCol] : null;
        return nameVal && String(nameVal).trim() !== '' && String(nameVal).trim() !== 'null';
      });

      if (validRows.length === 0) {
        throw new Error('No valid student rows found in file/sheet.');
      }

      const mappedData = validRows.map((row, idx) => {
        let fullName = '';
        if (lastNameCol && firstNameCol && row[lastNameCol]) {
          fullName = `${String(row[lastNameCol]).trim()} ${String(row[firstNameCol] || '').trim()}`.trim();
        } else if (nameCol && row[nameCol]) {
          fullName = String(row[nameCol]).trim();
        }

        const latinName = latinNameCol && row[latinNameCol] ? String(row[latinNameCol]).trim() : '';

        let rawId = idCol && row[idCol] != null ? String(row[idCol]).trim() : '';
        let studentId = rawId;
        const cleanClass = targetClass.trim().replace(/\s+/g, '');

        if (!studentId || /^\d+$/.test(studentId)) {
          const num = studentId ? studentId.padStart(3, '0') : String(idx + 1).padStart(3, '0');
          studentId = cleanClass ? `${cleanClass}-${num}` : `STU-${num}`;
        }

        let gender: string | null = null;
        if (genderCol && row[genderCol]) {
          const g = String(row[genderCol]).trim().toLowerCase();
          if (g === 'ប្រុស' || g === 'm' || g === 'male' || g === 'ប') {
            gender = 'ប';
          } else if (g === 'ស្រី' || g === 'f' || g === 'female' || g === 'ស') {
            gender = 'ស';
          } else {
            gender = String(row[genderCol]).trim();
          }
        }

        return {
          student_id: studentId,
          full_name: fullName,
          name_latin: latinName,
          gender: gender,
          class_name: targetClass.trim(),
          import_source: importSource === 'FILE' ? 'EXCEL' : 'GOOGLE_SHEET',
        };
      });

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/confirm-import`,
        { mapped_data: mappedData },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'An error occurred during import.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Wand2 className="w-5 h-5 mr-2 text-indigo-600" />
            Auto-Sync Students
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start text-sm font-bold border border-red-100">
              <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <label className="block text-sm font-black text-indigo-900 mb-2 uppercase tracking-wider">
                Target Class Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetClass}
                onChange={e => { setTargetClass(e.target.value); setError(''); }}
                placeholder="e.g. 10A, PG-B"
                className="w-full p-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-900"
              />
            </div>

            <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => { setImportSource('FILE'); setError(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${importSource === 'FILE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Excel / CSV File</button>
              <button onClick={() => { setImportSource('SHEET'); setError(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${importSource === 'SHEET' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Google Sheets</button>
            </div>

            {importSource === 'FILE' ? (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors relative cursor-pointer group">
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <UploadCloud className="w-12 h-12 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-slate-700">Click to upload Excel or CSV file</p>
                <p className="text-xs text-slate-500 mt-1">{file ? <span className="text-indigo-600 font-bold">{file.name}</span> : 'Supports .xlsx, .xls, .csv'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Google Sheets Link</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={e => { setSheetUrl(e.target.value); setError(''); }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <button
              onClick={processAndImport}
              disabled={isProcessing || !targetClass.trim() || (importSource === 'FILE' && !file) || (importSource === 'SHEET' && !sheetUrl.trim())}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all disabled:opacity-50 flex justify-center items-center shadow-xl shadow-indigo-600/20 cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <><span>Auto-Sync to Database</span> <ArrowRight className="w-5 h-5 ml-2" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};