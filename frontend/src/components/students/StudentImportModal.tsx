import React, { useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { X, UploadCloud, Link as LinkIcon, AlertTriangle, ArrowRight, ArrowLeft, Wand2, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import {
  type ImportPreview,
  fetchGoogleSheetMatrix,
  mapStudentRows,
  matrixFromBackend,
  readCsvFileMatrix,
} from './studentImportMapper';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { token, user } = useAuth();
  const { settings } = useSystemSettings();
  const isSheetAllowed = user?.role === 'ADMIN' || settings?.features?.allowGoogleSheetsSync;
  const [importSource, setImportSource] = useState<'FILE' | 'SHEET'>('FILE');
  const [sheetUrl, setSheetUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetClass, setTargetClass] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  /** ជំហាន ១: អានឯកសារ / Google Sheet ហើយបង្ហាញ preview */
  const readAndPreview = async () => {
    setError('');
    if (!targetClass.trim()) {
      setError('សូមបញ្ចូលឈ្មោះថ្នាក់គោលដៅ (ឧ. 10A, PGB)');
      return;
    }
    setIsProcessing(true);
    try {
      let matrix: unknown[][];
      if (importSource === 'FILE') {
        if (!file) throw new Error('សូមជ្រើសរើសឯកសារ Excel ឬ CSV');
        if (/\.csv$/i.test(file.name)) {
          matrix = await readCsvFileMatrix(file);
        } else {
          const formData = new FormData();
          formData.append('file', file);
          const res = await axios.post(`${API}/students/import-file`, formData, { headers: authHeaders });
          matrix = matrixFromBackend(res.data);
        }
      } else {
        if (!isSheetAllowed) {
          throw new Error('Google Sheets sync is disabled by Administrator');
        }
        if (!sheetUrl.trim()) throw new Error('សូមបញ្ចូលតំណ Google Sheets');
        try {
          // ទាញផ្ទាល់ពី browser (sheet ត្រូវ share ជា "Anyone with the link – Viewer")
          matrix = await fetchGoogleSheetMatrix(sheetUrl.trim());
        } catch (e: any) {
          if (e.message !== 'GSHEET_FETCH_FAILED') throw e;
          // បម្រុង: ឲ្យ backend ទាញ (ប្រើបាន ទោះ sheet ជា private ប្រសិនបើ backend មាន credential)
          try {
            const res = await axios.post(`${API}/students/import-google-sheet`, { sheet_url: sheetUrl.trim() }, { headers: authHeaders });
            matrix = matrixFromBackend(res.data);
          } catch {
            throw new Error(
              'មិនអាចទាញ Google Sheet បានទេ។ សូមបើក Share → "Anyone with the link" (Viewer) រួចព្យាយាមម្តងទៀត ឬនាំចេញជា .xlsx',
            );
          }
        }
      }
      setPreview(mapStudentRows(matrix, targetClass, importSource === 'FILE' ? 'EXCEL' : 'GOOGLE_SHEET'));
    } catch (e: any) {
      setError(e.message || 'មានបញ្ហាពេលអានទិន្នន័យ');
    } finally {
      setIsProcessing(false);
    }
  };

  /** ជំហាន ២: បញ្ជាក់ ហើយរក្សាទុកចូល Database */
  const confirmImport = async () => {
    if (!preview) return;
    setError('');
    setIsProcessing(true);
    try {
      await axios.post(`${API}/students/confirm-import`, { mapped_data: preview.students }, { headers: authHeaders });
      setPreview(null);
      setFile(null);
      setSheetUrl('');
      onSuccess();
      onClose();
    } catch (e: any) {
      if (e.message === 'Network Error' || e.code === 'ERR_NETWORK') {
        setError('មិនអាចភ្ជាប់ទៅកាន់ Backend Server បានឡើយ។ សូមប្រាកដថា Backend កំពុងដំណើរការលើ Port 3001!');
      } else {
        const msg = e.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : msg || e.message || 'មានបញ្ហាពេលនាំចូល');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const sample = preview?.students.slice(0, 6) ?? [];

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

          {preview ? (
            <div className="space-y-5">
              <div className="flex items-center text-emerald-700 font-bold">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                រកឃើញសិស្ស {preview.students.length} នាក់ សម្រាប់ថ្នាក់ {targetClass.trim()}
                {preview.skipped > 0 && <span className="ml-2 text-xs text-slate-500 font-medium">(រំលង {preview.skipped} ជួរទទេ)</span>}
              </div>

              {preview.warnings.length > 0 && (
                <ul className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium space-y-1">
                  {preview.warnings.map(w => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              )}

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                {preview.mapping.map(m => (
                  <div key={m.field} className="flex justify-between px-4 py-2">
                    <span className="font-bold text-slate-700">{m.field}</span>
                    <span className="text-slate-500 text-right">{m.column}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">អត្តលេខ</th>
                      <th className="px-3 py-2 text-left">អក្សរខ្មែរ</th>
                      <th className="px-3 py-2 text-left">អក្សរឡាតាំង</th>
                      <th className="px-3 py-2 text-center">ភេទ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sample.map(s => (
                      <tr key={s.student_id}>
                        <td className="px-3 py-2 font-mono font-bold">{s.student_id}</td>
                        <td className="px-3 py-2">{s.khmer_name || '-'}</td>
                        <td className="px-3 py-2 uppercase">{s.name_latin || '-'}</td>
                        <td className="px-3 py-2 text-center font-bold">{s.gender || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.students.length > sample.length && (
                  <p className="px-3 py-2 text-xs text-slate-500 bg-slate-50">… និងសិស្សផ្សេងទៀត {preview.students.length - sample.length} នាក់</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setPreview(null); setError(''); }}
                  disabled={isProcessing}
                  className="px-5 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> ត្រឡប់ក្រោយ
                </button>
                <button
                  onClick={confirmImport}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all disabled:opacity-50 flex justify-center items-center shadow-xl shadow-indigo-600/20 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `នាំចូលសិស្ស ${preview.students.length} នាក់`}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <label className="block text-sm font-black text-indigo-900 mb-2 uppercase tracking-wider">
                  Target Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={targetClass}
                  onChange={e => { setTargetClass(e.target.value); setError(''); }}
                  placeholder="e.g. 10A, PGB"
                  className="w-full p-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-900"
                />
              </div>

              <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => { setImportSource('FILE'); setError(''); }} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${importSource === 'FILE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Excel / CSV File
                </button>
                <button 
                  type="button"
                  disabled={!isSheetAllowed}
                  onClick={() => {
                    if (isSheetAllowed) {
                      setImportSource('SHEET');
                      setError('');
                    }
                  }} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    !isSheetAllowed 
                      ? 'opacity-40 cursor-not-allowed text-slate-400' 
                      : importSource === 'SHEET' 
                        ? 'bg-white text-indigo-600 shadow-sm cursor-pointer' 
                        : 'text-slate-500 cursor-pointer'
                  }`}
                  title={!isSheetAllowed ? 'Google Sheets sync is disabled by Administrator' : ''}
                >
                  {!isSheetAllowed && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Google Sheets {!isSheetAllowed ? '(Locked)' : ''}</span>
                </button>
              </div>

              {importSource === 'FILE' ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors relative cursor-pointer group">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
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
                  <p className="text-xs text-slate-500">
                    ត្រូវ Share ជា "Anyone with the link – Viewer"។ ប្រសិនបើមានច្រើន tab សូមបើក tab ដែលត្រូវការ ហើយចម្លងតំណដែលមាន <code>gid=</code>។
                  </p>
                </div>
              )}

              <button
                onClick={readAndPreview}
                disabled={isProcessing || !targetClass.trim() || (importSource === 'FILE' && !file) || (importSource === 'SHEET' && !sheetUrl.trim())}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all disabled:opacity-50 flex justify-center items-center shadow-xl shadow-indigo-600/20 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <><span>អាន និងពិនិត្យទិន្នន័យ</span> <ArrowRight className="w-5 h-5 ml-2" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
