import React, { useState } from 'react';
import { Sliders, Camera, FileSpreadsheet, Edit3, Download, Users, CheckCircle2, Save, ShieldAlert, Cpu } from 'lucide-react';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { AlertModal } from '../../components/ui/AlertModal';

export const AdminFeatures = () => {
  const { settings, updateSettings, refreshSettings } = useSystemSettings();

  const [features, setFeatures] = useState(settings.features);
  const [aiConfig, setAiConfig] = useState(settings.aiConfig);
  const [general, setGeneral] = useState(settings.general);
  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Sync state if settings update
  React.useEffect(() => {
    setFeatures(settings.features);
    setAiConfig(settings.aiConfig);
    setGeneral(settings.general);
  }, [settings]);

  const handleToggle = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        features,
        aiConfig,
        general,
      });
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'រក្សាទុកការកំណត់ជោគជ័យ! (Settings Saved)',
        message: 'មុខងារ និងសិទ្ធិប្រើប្រាស់សម្រាប់គ្រូបង្រៀន (Teachers) ត្រូវបានធ្វើបច្ចុប្បន្នភាពរួចរាល់។',
      });
      await refreshSettings();
    } catch (err: any) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'បរាជ័យក្នុងការរក្សាទុក (Save Failed)',
        message: err.response?.data?.message || 'មិនអាចរក្សាទុកការកំណត់បានឡើយ។',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up max-w-5xl mx-auto pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Feature Controls & Permissions (កំណត់ Feature សម្រាប់អ្នកប្រើ)
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            បើក ឬបិទ Feature ជាក់លាក់សម្រាប់គ្រូបង្រៀន (Teachers) និងកំណត់លក្ខខណ្ឌប្រព័ន្ធ
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:-translate-y-0.5 transition-all self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការផ្លាស់ប្តូរ (Save)'}</span>
        </button>
      </div>

      {/* Feature Toggles List */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">សិទ្ធិប្រើប្រាស់ Feature របស់គ្រូបង្រៀន (Teacher Permissions)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Admin អាចជ្រើសរើស Feature ណាដែលអនុញ្ញាតឱ្យគ្រូប្រើប្រាស់ ឬបិទបណ្តោះអាសន្ន</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Feature Flags
          </span>
        </div>

        <div className="space-y-4">
          {/* Toggle 1: Scan Upload */}
          <div className="flex items-start justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50 transition-all">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  📷 Scan Upload & Camera (មុខងារស្គែនសន្លឹកកិច្ចការ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  អនុញ្ញាតឱ្យគ្រូបង្រៀនអាច Upload រូបភាពសន្លឹកប្រឡង ឬថតរូបដើម្បីស្គែនពិន្ទុ។ ប្រសិនបើបិទ គ្រូនឹងមិនអាចស្គែនបន្ថែមបានឡើយ។
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={features.allowScanUpload}
                onChange={() => handleToggle('allowScanUpload')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Toggle 2: Google Sheets Sync */}
          <div className="flex items-start justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50 transition-all">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  🌐 Google Sheets Auto-Sync (ការទាញទិន្នន័យពី Google Sheets)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  អនុញ្ញាតឱ្យគ្រូ Sync បញ្ជីឈ្មោះសិស្សដោយផ្ទាល់ពី Google Sheets URL។ ប្រសិនបើបិទ គ្រូអាចប្រើតែ Excel/CSV Offline ប៉ុណ្ណោះ។
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={features.allowGoogleSheetsSync}
                onChange={() => handleToggle('allowGoogleSheetsSync')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Toggle 3: Manual Grade Editing in Gradebook */}
          <div className="flex items-start justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50 transition-all">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-0.5">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  ✏️ Manual Grade Editing in Gradebook (កែប្រែពិន្ទុផ្ទាល់ក្នុងតារាង Gradebook)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  អនុញ្ញាតឱ្យគ្រូបង្រៀនចុចកែប្រែពិន្ទុដោយដៃលើតារាង Gradebook។ ប្រសិនបើបិទ ពិន្ទុនឹងក្លាយជា Read-Only បន្ទាប់ពីផ្ទៀងផ្ទាត់រួច។
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={features.allowManualGradeEdit}
                onChange={() => handleToggle('allowManualGradeEdit')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Toggle 4: Export to Excel */}
          <div className="flex items-start justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50 transition-all">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0 mt-0.5">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  📥 Export to Excel / CSV (ការទាញយករបាយការណ៍ពិន្ទុ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  អនុញ្ញាតឱ្យគ្រូទាញយកតារាងពិន្ទុជាឯកសារ Excel (.xlsx) ឬ CSV ទៅកាន់កុំព្យូទ័រ។
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={features.allowExcelExport}
                onChange={() => handleToggle('allowExcelExport')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Toggle 5: Student Roster Edit */}
          <div className="flex items-start justify-between p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50 transition-all">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  👥 Student Roster Management (ការបន្ថែម/កែប្រែបញ្ជីសិស្ស)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  អនុញ្ញាតឱ្យគ្រូបន្ថែមសិស្សថ្មី, កែប្រែឈ្មោះថ្នាក់ ឬលុបសិស្សចេញពីបញ្ជី។
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={features.allowStudentRosterEdit}
                onChange={() => handleToggle('allowStudentRosterEdit')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* AI / OCR Recognition Thresholds */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-violet-100 text-violet-700 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">AI / OCR Recognition Settings</h2>
            <p className="text-xs text-slate-500">កំណត់កម្រិតភាពត្រឹមត្រូវនៃបញ្ញាសិប្បនិម្មិត (AI Accuracy & Auto-Approve)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Confidence Threshold (កម្រិតទំនុកចិត្ត AI)
              </label>
              <span className="text-sm font-extrabold text-indigo-600 font-mono">
                {aiConfig.confidenceThreshold}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              លទ្ធផលស្គែនណាដែលមាន Confidence ទាបជាងនេះ នឹងត្រូវប្រព័ន្ធសម្គាល់ជា "Needs Review" ដើម្បីឱ្យគ្រូត្រួតពិនិត្យដោយផ្ទាល់។
            </p>
            <input
              type="range"
              min="50"
              max="100"
              value={aiConfig.confidenceThreshold}
              onChange={(e) => setAiConfig({ ...aiConfig, confidenceThreshold: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
              <span>50% (Loose)</span>
              <span>80% (Recommended)</span>
              <span>100% (Strict)</span>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={aiConfig.autoApprove}
                onChange={(e) => setAiConfig({ ...aiConfig, autoApprove: e.target.checked })}
                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-800">Auto-Approve High Confidence</span>
            </label>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed ml-8">
              អនុម័តពិន្ទុដោយស្វ័យប្រវត្តិចូលទៅកាន់ Gradebook ប្រសិនបើ AI រកឃើញ ID សិស្ស និងពិន្ទុត្រឹមត្រូវ 100% ដោយមិនចាំបាច់រង់ចាំការចុច Approve ដោយដៃ។
            </p>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end space-x-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកំណត់ទាំងអស់ (Save All Settings)'}</span>
        </button>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertInfo.isOpen}
        type={alertInfo.type}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
      />
    </div>
  );
};

