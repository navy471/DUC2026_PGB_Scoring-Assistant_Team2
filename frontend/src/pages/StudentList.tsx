import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, Download, Filter, ChevronLeft, User, X, Users, Printer, Upload } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { StudentImportModal } from '../components/students/StudentImportModal';

const idCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const StudentList = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  type ViewMode = 'classes' | 'class-detail' | 'all';
  const [viewMode, setViewMode] = useState<ViewMode>('classes');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Class Management State
  const [editingClass, setEditingClass] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState<string | null>(null);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  const [form, setForm] = useState({
    student_code: '',
    name: '',
    khmer_name: '',
    name_latin: '',
    class_name: '',
    gender: ''
  });

  const { token } = useAuth();

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) fetchStudents();
  }, [token]);

  const formatGender = (gender?: string | null) => {
    if (!gender) return '-';
    const g = String(gender).trim().toLowerCase();
    if (g === 'ស' || g === 'ស្រី' || g === 'f' || g === 'female') return 'ស';
    if (g === 'ប' || g === 'ប្រុស' || g === 'm' || g === 'male') return 'ប';
    return gender;
  };

  // 🛠️ Updated Helper function to robustly extract ID, Khmer Name, and Latin Name
  const getStudentDisplayNames = (s: any) => {
    const isKhmerText = (str?: string) => Boolean(str && /[\u1780-\u17FF]/.test(str));

    let khmerName = s.khmer_name || s.name_kh || '';
    let latinName = s.name_latin || s.latin_name || '';
    const mainName = s.name || s.full_name || '';

    if (!khmerName && isKhmerText(mainName)) {
      khmerName = mainName;
    }
    if (!latinName && !isKhmerText(mainName) && mainName) {
      latinName = mainName;
    }
    if (!latinName && s.name && !isKhmerText(s.name)) {
      latinName = s.name;
    }

    return {
      studentId: s.student_code || s.student_id || s.code || '-',
      khmer: khmerName || (isKhmerText(mainName) ? mainName : '-'),
      latin: latinName || '-'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        student_code: form.student_code.trim(),
        name: (form.name_latin || form.name || form.khmer_name).trim(),
        khmer_name: form.khmer_name.trim() || null,
        name_latin: form.name_latin.trim() || null,
        class_name: form.class_name.trim(),
        gender: form.gender || null
      };

      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowModal(false);
      setForm({ student_code: '', name: '', khmer_name: '', name_latin: '', class_name: '', gender: '' });
      setEditingId(null);
      fetchStudents();
    } catch (e: any) {
      alert('Error saving student: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleEdit = (student: any) => {
    const { khmer, latin, studentId } = getStudentDisplayNames(student);
    setEditingId(student.id);
    setForm({
      student_code: studentId !== '-' ? studentId : '',
      name: latin !== '-' ? latin : (student.name || ''),
      khmer_name: khmer !== '-' ? khmer : (student.khmer_name || ''),
      name_latin: latin !== '-' ? latin : '',
      class_name: student.class_name || '',
      gender: formatGender(student.gender) !== '-' ? formatGender(student.gender) : (student.gender || '')
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchStudents();
    } catch (e: any) {
      alert('មិនអាចលុបសិស្សបានទេ៖ ' + (e.response?.data?.message || e.message || 'មានបញ្ហាមិនស្គាល់'));
    } finally {
      setDeleteTargetId(null); // ConfirmModal មិនបិទដោយខ្លួនឯង
    }
  };

  const handleRenameClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.newName.trim()) return;
    setIsSubmittingClass(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/class/${encodeURIComponent(editingClass.oldName)}`,
        { new_class_name: editingClass.newName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (selectedClass === editingClass.oldName) {
        setSelectedClass(editingClass.newName.trim());
      }
      setEditingClass(null);
      fetchStudents();
    } catch (e: any) {
      alert('Error renaming class: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleDeleteClassConfirm = async () => {
    if (!deleteClassTarget) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/students/class/${encodeURIComponent(deleteClassTarget)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (selectedClass === deleteClassTarget) {
        setSelectedClass(null);
        setViewMode('classes');
      }
      setDeleteClassTarget(null);
      fetchStudents();
    } catch (e: any) {
      alert('Error deleting class: ' + (e.response?.data?.message || e.message));
    }
  };

  // Extract unique classes for the filter dropdown
  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class_name).filter(Boolean));
    return Array.from(classes).sort();
  }, [students]);

  const classStats = useMemo(() => {
    const stats: Record<string, { total: number, male: number, female: number }> = {};
    uniqueClasses.forEach(c => {
      stats[c] = { total: 0, male: 0, female: 0 };
    });
    students.forEach(s => {
      if (s.class_name && stats[s.class_name]) {
        stats[s.class_name].total++;
        const g = formatGender(s.gender);
        if (g === 'ប') stats[s.class_name].male++;
        else if (g === 'ស') stats[s.class_name].female++;
      }
    });
    return stats;
  }, [students, uniqueClasses]);

  // Filter students based on search and class filter
  const filtered = useMemo(() => {
    let result = students;
    if (viewMode === 'class-detail' && selectedClass) {
      result = result.filter(s => s.class_name === selectedClass);
    } else if (viewMode === 'all' && classFilter) {
      result = result.filter(s => s.class_name === classFilter);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(s =>
        (s.name && s.name.toLowerCase().includes(lowerSearch)) ||
        (s.khmer_name && s.khmer_name.toLowerCase().includes(lowerSearch)) ||
        (s.name_latin && s.name_latin.toLowerCase().includes(lowerSearch)) ||
        (s.full_name && s.full_name.toLowerCase().includes(lowerSearch)) ||
        (s.student_code && String(s.student_code).toLowerCase().includes(lowerSearch)) ||
        (s.student_id && String(s.student_id).toLowerCase().includes(lowerSearch))
      );
    }
    return [...result].sort((a, b) =>
      idCollator.compare(getStudentDisplayNames(a).studentId, getStudentDisplayNames(b).studentId)
    );
  }, [students, search, classFilter, viewMode, selectedClass]);

  const handleExport = () => {
    const csvCell = (value: unknown) => {
      const text = value == null ? '' : String(value);
      const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Student ID (អត្តលេខ)', 'Khmer Name (ឈ្មោះខ្មែរ)', 'Latin Name (ឈ្មោះឡាតាំង)', 'Gender (ភេទ)', 'Class (ថ្នាក់)'],
      ...filtered.map(student => {
        const { khmer, latin, studentId } = getStudentDisplayNames(student);
        return [studentId, khmer === '-' ? '' : khmer, latin === '-' ? '' : latin, formatGender(student.gender), student.class_name];
      })
    ];
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    const activeClass = viewMode === 'class-detail' ? selectedClass : viewMode === 'all' ? classFilter : '';
    const fileScope = (activeClass || 'all').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'all';
    link.download = `students-${fileScope}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
      <div className="sticky -top-8 -mt-8 pt-8 -mx-8 px-8 bg-[#f8fafc] z-30 pb-6 border-b border-transparent shadow-none transition-shadow print:static print:p-0 print:m-0 print:bg-transparent">
        <header className="mb-6 flex justify-between items-end print:hidden">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Roster </h1>
            <p className="text-slate-500 mt-1 font-medium">Manage students, classes, and IDs</p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
              title="Download the visible student list as CSV"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
              title="Print Student Roster"
            >
              <Printer className="w-5 h-5 text-slate-500" />
              <span>Print Table</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-5 h-5" />
              <span>Import / Sync</span>
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setForm({
                  student_code: '',
                  name: '',
                  khmer_name: '',
                  name_latin: '',
                  class_name: selectedClass || '',
                  gender: ''
                });
                setShowModal(true);
              }}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Add Student</span>
            </button>
          </div>
        </header>

        {/* View Mode Toggle */}
        <div className="flex space-x-2 mb-6 bg-slate-200/50 p-1 rounded-xl w-fit print:hidden">
          <button
            onClick={() => { setViewMode('classes'); setSelectedClass(null); setSearch(''); }}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${viewMode === 'classes' || viewMode === 'class-detail' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            By Class
          </button>
          <button
            onClick={() => { setViewMode('all'); setSearch(''); }}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${viewMode === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All Students
          </button>
        </div>

        {/* Toolbar */}
        {(viewMode === 'all' || viewMode === 'class-detail') && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4 print:hidden">
            {viewMode === 'class-detail' && (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => { setViewMode('classes'); setSelectedClass(null); setSearch(''); }}
                  className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 font-bold px-4 py-3 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                {selectedClass && (
                  <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                    <span className="font-extrabold text-slate-800 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm border border-indigo-100">
                      ថ្នាក់: {selectedClass}
                    </span>
                    <button
                      onClick={() => setEditingClass({ oldName: selectedClass, newName: selectedClass })}
                      className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                      title="Rename this class"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => setDeleteClassTarget(selectedClass)}
                      className="flex items-center space-x-1.5 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                      title="Delete this class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខសិស្ស (Search by name or ID)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {viewMode === 'all' && (
              <div className="w-64 relative">
                <Filter className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="">All Classes (គ្រប់ថ្នាក់)</option>
                  {uniqueClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Class Overview Cards */}
      {viewMode === 'classes' && (
        <div className="mt-4 flex flex-col space-y-2 pb-8">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_180px] gap-4 px-8 py-3 text-slate-500 font-black text-xs uppercase tracking-widest">
            <div>Class Name</div>
            <div>Total Students</div>
            <div>Male (ប)</div>
            <div>Female (ស)</div>
            <div className="text-right pr-2">Actions</div>
          </div>

          {uniqueClasses.map(c => (
            <div
              key={c}
              onClick={() => { setViewMode('class-detail'); setSelectedClass(c); }}
              className="grid grid-cols-[1.4fr_1fr_1fr_1fr_180px] gap-4 px-8 py-2.5 items-center bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 group hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 hover:border-indigo-500 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0 shadow-inner">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 group-hover:text-white transition-colors text-lg">
                  {c}
                </span>
              </div>

              <div className="font-bold text-slate-600 group-hover:text-indigo-100 transition-colors">
                {classStats[c]?.total || 0} Students
              </div>

              <div>
                <span className="inline-flex px-3 py-1 rounded-lg text-sm font-bold border border-blue-100 bg-blue-50 text-blue-700 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-colors">
                  ប: {classStats[c]?.male || 0}
                </span>
              </div>

              <div>
                <span className="inline-flex px-3 py-1 rounded-lg text-sm font-bold border border-pink-100 bg-pink-50 text-pink-700 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-colors">
                  ស: {classStats[c]?.female || 0}
                </span>
              </div>

              <div className="flex justify-end items-center space-x-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setViewMode('class-detail'); setSelectedClass(c); }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-all group-hover:bg-indigo-500 group-hover:text-white group-hover:hover:bg-white group-hover:hover:text-indigo-600 shadow-sm cursor-pointer"
                  title="View Students"
                >
                  View Table
                </button>
                <button
                  onClick={() => setEditingClass({ oldName: c, newName: c })}
                  className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg transition-all group-hover:bg-indigo-500 group-hover:text-white group-hover:hover:bg-white group-hover:hover:text-amber-600 shadow-sm cursor-pointer"
                  title="Edit Class Name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteClassTarget(c)}
                  className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-all group-hover:bg-indigo-500 group-hover:text-white group-hover:hover:bg-white group-hover:hover:text-red-600 shadow-sm cursor-pointer"
                  title="Delete Class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {uniqueClasses.length === 0 && (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
              <p className="text-slate-500 font-medium text-lg">No classes found. Add some students first.</p>
            </div>
          )}
        </div>
      )}

      {/* Cambodian Standard Student Roster Table View */}
      {(viewMode === 'all' || viewMode === 'class-detail') && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          {viewMode === 'class-detail' && selectedClass && (
            <div className="p-4 bg-slate-50/70 border-b border-slate-300 flex items-center justify-between print:py-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-800 text-lg">
                  តារាងបញ្ជីរាយនាមសិស្សថ្នាក់៖ <span className="text-indigo-700 font-black">{selectedClass}</span>
                </span>
                <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-full">
                  សរុប {filtered.length} នាក់ (ស្រី {filtered.filter(s => formatGender(s.gender) === 'ស').length} នាក់)
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-slate-900 border-collapse border border-slate-300">
              <thead>
                {/* Header Row 1 */}
                <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 text-base">
                  <th rowSpan={2} className="w-16 py-3 px-3 text-center border-r border-slate-300 font-bold">
                    ល.រ
                  </th>
                  <th rowSpan={2} className="w-36 py-3 px-3 text-center border-r border-slate-300 font-bold">
                    អត្តលេខ
                  </th>
                  <th colSpan={2} className="py-2.5 px-4 text-center border-r border-b border-slate-300 font-bold">
                    នាម និងគោត្តនាម
                  </th>
                  <th rowSpan={2} className="w-20 py-3 px-3 text-center border-r border-slate-300 font-bold">
                    ភេទ
                  </th>
                  {viewMode === 'all' && (
                    <th rowSpan={2} className="w-28 py-3 px-3 text-center border-r border-slate-300 font-bold">
                      ថ្នាក់
                    </th>
                  )}
                  <th rowSpan={2} className="w-28 py-3 px-3 text-center font-bold print:hidden">
                    សកម្មភាព
                  </th>
                </tr>

                {/* Header Row 2 (Sub-headers for Name) */}
                <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 text-sm">
                  <th className="py-2 px-4 text-center border-r border-slate-300 font-bold min-w-[180px]">
                    អក្សរខ្មែរ
                  </th>
                  <th className="py-2 px-4 text-center border-r border-slate-300 font-bold min-w-[180px]">
                    អក្សរឡាតាំង
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((s, index) => {
                    const { khmer, latin, studentId } = getStudentDisplayNames(s);
                    const genderChar = formatGender(s.gender);

                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-300 hover:bg-indigo-50/40 transition-colors odd:bg-white even:bg-slate-50/30"
                      >
                        {/* 1. ល.រ (Row Number) */}
                        <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-300 text-base">
                          {index + 1}
                        </td>

                        {/* 2. អត្តលេខ (Student ID) */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 border-r border-slate-300 text-base">
                          {studentId}
                        </td>

                        {/* 3. អក្សរខ្មែរ (Khmer Name) */}
                        <td className="py-3 px-4 text-left font-bold text-slate-900 border-r border-slate-300 text-base tracking-wide">
                          {khmer}
                        </td>

                        {/* 4. អក្សរឡាតាំង (Latin Name) */}
                        <td className="py-3 px-4 text-left font-semibold text-slate-800 uppercase tracking-wider border-r border-slate-300 text-sm">
                          {latin}
                        </td>

                        {/* 5. ភេទ (Gender: ស / ប) */}
                        <td className="py-3 px-3 text-center font-bold text-base border-r border-slate-300">
                          <span className={genderChar === 'ស' ? 'text-pink-600' : genderChar === 'ប' ? 'text-blue-600' : 'text-slate-700'}>
                            {genderChar}
                          </span>
                        </td>

                        {/* Optional ថ្នាក់ (Class) */}
                        {viewMode === 'all' && (
                          <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-300 text-sm">
                            {s.class_name}
                          </td>
                        )}

                        {/* Actions (Hidden on print) */}
                        <td className="py-2.5 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(s)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="កែប្រែព័ត៌មាន (Edit)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(s.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="លុបសិស្ស (Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={viewMode === 'all' ? 7 : 6} className="py-16 text-center text-slate-500 font-medium">
                      មិនមានទិន្នន័យសិស្សត្រូវបង្ហាញឡើយ (No students found)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-slide-up">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editingId ? 'កែប្រែព័ត៌មានសិស្ស' : 'បន្ថែមសិស្សថ្មី'}</h2>
                <p className="text-xs text-slate-500 font-medium">Student Profile Information</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-1 tracking-wide">
                  អត្តលេខសិស្ស (Student ID) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={form.student_code}
                  onChange={e => setForm({ ...form, student_code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-mono font-bold text-slate-700 transition-all"
                  placeholder="ឧ. DIT2024528"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1 tracking-wide">
                  នាម និងគោត្តនាម ជាអក្សរខ្មែរ (Khmer Name)
                </label>
                <input
                  type="text"
                  value={form.khmer_name}
                  onChange={e => setForm({ ...form, khmer_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all"
                  placeholder="ឧ. ពៅ រដ្ឋា"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-1 tracking-wide">
                  នាម និងគោត្តនាម ជាអក្សរឡាតាំង (Latin Name)
                </label>
                <input
                  type="text"
                  value={form.name_latin}
                  onChange={e => setForm({ ...form, name_latin: e.target.value, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 uppercase transition-all"
                  placeholder="e.g. POV RATHA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1 tracking-wide">
                    ថ្នាក់ (Class) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={form.class_name}
                    onChange={e => setForm({ ...form, class_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-700 transition-all"
                    placeholder="ឧ. PGB, 10A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1 tracking-wide">
                    ភេទ (Gender)
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- ជ្រើសរើស (Select) --</option>
                    <option value="ប">ប (ប្រុស / Male)</option>
                    <option value="ស">ស (ស្រី / Female)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Remove Student?"
        message="This permanently removes the student and their grades. Saved scans will remain but be unlinked from the student. This action cannot be undone."
        confirmText="Remove"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) handleDelete(deleteTargetId);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Edit Class Name Modal */}
      {editingClass && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Edit Class Name</h2>
                  <p className="text-xs text-slate-500 font-medium">Rename this class across all students</p>
                </div>
              </div>
              <button
                onClick={() => setEditingClass(null)}
                className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenameClassSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Class Name</label>
                  <input
                    type="text"
                    value={editingClass.oldName}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">New Class Name</label>
                  <input
                    type="text"
                    value={editingClass.newName}
                    onChange={e => setEditingClass({ ...editingClass, newName: e.target.value })}
                    placeholder="e.g. 10A, PGB"
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass || !editingClass.newName.trim() || editingClass.newName.trim() === editingClass.oldName}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {isSubmittingClass ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Class Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteClassTarget !== null}
        title={`Delete Class "${deleteClassTarget}"?`}
        message={`Are you sure you want to delete class "${deleteClassTarget}"? This will remove all ${deleteClassTarget ? (classStats[deleteClassTarget]?.total || 0) : 0} student(s) in this class. This action cannot be undone.`}
        confirmText="Delete Class"
        isDestructive={true}
        onConfirm={handleDeleteClassConfirm}
        onCancel={() => setDeleteClassTarget(null)}
      />

      <StudentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => { fetchStudents(); setShowImportModal(false); }}
      />
    </div>
  );
};