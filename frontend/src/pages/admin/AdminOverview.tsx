import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Shield, Users, Sliders, BookOpen, FileText, CheckCircle2, AlertTriangle, ArrowRight, Activity, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';

export const AdminOverview = ({ onSwitchToTeacher }: { onSwitchToTeacher?: () => void }) => {
  const { token, user } = useAuth();
  const { settings } = useSystemSettings();
  const [stats, setStats] = useState<any>(null);
  const [usersCount, setUsersCount] = useState({ total: 0, teachers: 0, admins: 0 });
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, usersRes] = await Promise.all([
          axios.get(`${apiUrl}/reports/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${apiUrl}/users`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setStats(dashRes.data);
        const users = usersRes.data || [];
        setUsersCount({
          total: users.length,
          teachers: users.filter((u: any) => u.role === 'TEACHER').length,
          admins: users.filter((u: any) => u.role === 'ADMIN').length
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const activeFeaturesCount = Object.values(settings.features).filter(Boolean).length;
  const totalFeaturesCount = Object.keys(settings.features).length;

  return (
    <div className="animate-slide-up max-w-6xl mx-auto pb-16 space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <Shield className="w-80 h-80" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-bold mb-3 border border-white/10">
            <Shield className="w-3.5 h-3.5" /> Administrator Control Center
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            សូមស្វាគមន៍មកកាន់ Admin Portal!
          </h1>
          <p className="text-indigo-200 text-sm mt-2 leading-relaxed">
            ផ្ទាំងគ្រប់គ្រងសម្រាប់អ្នកគ្រប់គ្រងប្រព័ន្ធ៖ គ្រប់គ្រងគណនីគ្រូបង្រៀន, បើក/បិទ Feature សម្រាប់អ្នកប្រើប្រាស់ និងតាមដានរបាយការណ៍ពិន្ទុទូទាំងសាលា។
          </p>

          {onSwitchToTeacher && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={onSwitchToTeacher}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition-all border border-white/20"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>មើលទិដ្ឋភាពគ្រូបង្រៀន (Switch to Teacher View)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">អ្នកប្រើប្រាស់ (Users)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">{usersCount.total} នាក់</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold">{usersCount.teachers} គ្រូ</span> • 
            <span className="text-indigo-600 font-semibold">{usersCount.admins} Admin</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">សិស្សសរុប (Students)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><BookOpen className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">{stats?.summary?.totalStudents || 0} នាក់</div>
          <div className="text-xs text-slate-500 mt-1">បានចុះឈ្មោះក្នុងប្រព័ន្ធ</div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ពិន្ទុដែលបានស្គែន (Graded)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">{stats?.summary?.totalGraded || 0} សន្លឹក</div>
          <div className="text-xs text-slate-500 mt-1">
            មធ្យមភាគសរុប {stats?.summary?.averagePercentage ? stats.summary.averagePercentage.toFixed(1) : 0}%
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feature Controls</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Sliders className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">
            {activeFeaturesCount} / {totalFeaturesCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">មុខងារបើកឱ្យគ្រូប្រើប្រាស់</div>
        </div>
      </div>

      {/* Two Column Section: Quick Management + Feature Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Administrative Shortcuts */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> ការងារគ្រប់គ្រងចម្បង (Administrative Actions)
          </h2>

          <div className="space-y-3">
            <Link
              to="/admin/users"
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                    គ្រប់គ្រងគណនីគ្រូ និង Admin (User Management)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">បង្កើតគណនីថ្មី, កែប្រែ Role, លុបគណនី និងមើលសកម្មភាព</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/admin/features"
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                    កំណត់ Feature សម្រាប់គ្រូបង្រៀន (Feature Permissions)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">បើក/បិទ Scan, Google Sheets, Edit Gradebook, និង Export</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/gradebook"
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    តារាងពិន្ទុទូទាំងសាលា (School Master Gradebook)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ត្រួតពិនិត្យពិន្ទុគ្រប់ថ្នាក់ Midterm & Final និងទាញយករបាយការណ៍</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>

        {/* Current Feature Status Overview */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" /> ស្ថានភាព Feature បច្ចុប្បន្ន (Live Feature Status)
            </h2>
            <Link to="/admin/features" className="text-xs font-bold text-indigo-600 hover:underline">
              កែប្រែ (Configure)
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-700">📷 Scan Upload & Camera</span>
              {settings.features.allowScanUpload ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Enabled</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Locked</span>
              )}
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-700">🌐 Google Sheets Auto-Sync</span>
              {settings.features.allowGoogleSheetsSync ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Enabled</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Locked</span>
              )}
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-700">✏️ Manual Grade Editing in Gradebook</span>
              {settings.features.allowManualGradeEdit ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Enabled</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Locked</span>
              )}
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-700">📥 Export to Excel / CSV</span>
              {settings.features.allowExcelExport ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Enabled</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Locked</span>
              )}
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-700">🎯 AI Confidence Threshold</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                {settings.aiConfig.confidenceThreshold}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

