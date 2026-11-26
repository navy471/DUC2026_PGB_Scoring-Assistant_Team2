import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSystemSettings } from '../context/SystemSettingsContext';
import { Download, Users, Sparkles, Lock, Edit2, Check, X, Loader2 } from 'lucide-react';

export const Gradebook = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedExamType, setSelectedExamType] = useState<string>('ALL');
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const { token, user } = useAuth();
  const { settings } = useSystemSettings();
  const isExportAllowed = user?.role === 'ADMIN' || settings?.features?.allowExcelExport;

  const fetchGrades = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClass !== 'ALL') params.append('class_name', selectedClass);
      if (selectedExamType !== 'ALL') params.append('exam_type', selectedExamType);

      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/grades?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEdit = (grade: any) => {
    setEditingGradeId(grade.id);
    setEditScoreValue(grade.score?.toString() || '0');
  };

  const handleCancelEdit = () => {
    setEditingGradeId(null);
    setEditScoreValue('');
  };

  const handleSaveEdit = async (gradeId: string) => {
    const num = parseFloat(editScoreValue);
    if (isNaN(num) || num < 0) {
      alert('Please enter a valid positive score');
      return;
    }
    setIsSavingEdit(true);
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/grades/${gradeId}`, {
        score: num
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingGradeId(null);
      await fetchGrades();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update score');
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    if (token) fetchGrades();
  }, [token, selectedClass, selectedExamType]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const unique = Array.from(new Set(res.data.map((s: any) => s.class_name).filter(Boolean))) as string[];
      setAllClasses(unique);
    }).catch(console.error);
  }, [token]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClass !== 'ALL') params.append('class_name', selectedClass);
      if (selectedExamType !== 'ALL') params.append('exam_type', selectedExamType);

      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/grades/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = selectedClass !== 'ALL'
        ? `grades_${selectedClass}_${selectedExamType.toLowerCase()}.xlsx`
        : 'grades_export.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to export grades');
    }
  };

  return (
    <div className="animate-slide-up max-w-6xl mx-auto pb-16">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gradebook (តារាងពិន្ទុ)</h1>
          <p className="text-slate-500 mt-1">Finalized and verified student scores separated by class and exam</p>
        </div>
        <button 
          onClick={isExportAllowed ? handleExport : undefined}
          disabled={!isExportAllowed}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all self-start sm:self-auto shadow-md ${
            !isExportAllowed
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:-translate-y-0.5'
          }`}
          title={!isExportAllowed ? 'Export is disabled by Administrator' : ''}
        >
          {!isExportAllowed ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          <span>{isExportAllowed ? `Export Excel ${selectedClass !== 'ALL' ? `(${selectedClass})` : ''}` : 'Export Locked'}</span>
        </button>
      </header>

      {/* Class & Exam Type Filter Bar (បែងចែកតាមថ្នាក់ និង Midterm / Final) */}
      <div className="mb-6 p-4 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        {/* Class Filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center">
            <Users className="w-3 h-3 mr-1 text-indigo-600" /> តម្រៀបតាមថ្នាក់ (Filter by Class)៖
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedClass('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${
                selectedClass === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              គ្រប់ថ្នាក់ (All)
            </button>
            {allClasses.map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs flex items-center gap-1 ${
                  selectedClass === cls
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>ថ្នាក់ {cls}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Exam Type Filter */}
        <div className="flex flex-col gap-1.5 md:items-end">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center">
            <Sparkles className="w-3 h-3 mr-1 text-indigo-600" /> ប្រភេទការប្រឡង (Exam Type)៖
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelectedExamType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${
                selectedExamType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ទាំងអស់
            </button>
            <button
              onClick={() => setSelectedExamType('Midterm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${
                selectedExamType === 'Midterm'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📝 Midterm
            </button>
            <button
              onClick={() => setSelectedExamType('Final')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${
                selectedExamType === 'Final'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🎓 Final
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Student Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Assessment</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4 text-right">Score</th>
              <th className="px-6 py-4 text-right">Percentage</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {grades.map((grade: any) => {
              const isEditing = editingGradeId === grade.id;

              return (
                <tr key={grade.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{grade.Student?.student_code}</td>
                  <td className="px-6 py-4 text-slate-800 font-bold">
                    {grade.Student?.khmer_name || grade.Student?.name}
                    {grade.Student?.khmer_name && (
                      <span className="block text-[11px] text-slate-400 font-normal">{grade.Student?.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                      {grade.Assessment?.class_name || grade.Student?.class_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-semibold">{grade.Assessment?.name}</td>
                  <td className="px-6 py-4 text-slate-500">{grade.Assessment?.Subject?.name}</td>
                  <td className="px-6 py-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          value={editScoreValue}
                          onChange={e => setEditScoreValue(e.target.value)}
                          className="w-16 px-2 py-1 text-sm font-black text-center bg-indigo-50 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700"
                          autoFocus
                        />
                        <span className="text-slate-400 text-xs">/ {grade.Assessment?.max_score}</span>
                      </div>
                    ) : (
                      <>
                        <span className="font-black text-slate-900 text-base">{grade.score}</span>
                        <span className="text-slate-400 ml-1 text-xs">/ {grade.Assessment?.max_score}</span>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      grade.percentage >= grade.Assessment?.passing_score 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {grade.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(grade.id)}
                          disabled={isSavingEdit}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs disabled:opacity-50"
                          title="Save changes"
                        >
                          {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all shadow-xs"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(grade)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                        title="Edit score"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {grades.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  មិនទាន់មានពិន្ទុដែលបានផ្ទៀងផ្ទាត់សម្រាប់ថ្នាក់ {selectedClass} ({selectedExamType}) នៅឡើយទេ។
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
