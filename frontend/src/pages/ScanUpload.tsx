import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useScan } from '../context/ScanContext';
import { useSystemSettings } from '../context/SystemSettingsContext';
import { 
  UploadCloud, FileImage, X, Search, CheckCircle, AlertTriangle, 
  Plus, Camera, Loader2, Sparkles, Info, BookOpen, Users, ChevronDown, Check 
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { VerificationSection, type VerificationSectionRef } from '../components/verification/VerificationSection';

export const ScanUpload = () => {
  const {
    selectedClass,
    setSelectedClass,
    selectedExamType,
    setSelectedExamType,
    classList,
    addClass,
    ensureAssessment,

    selectedAssessment,
    setSelectedAssessment,
    assessments,
    setAssessments,
    subjects,
    setSubjects,
    files,
    addFiles,
    removeFile,
    clearFiles,
    matchedStudent,
    isMatching,
    simulateLiveMatch,
    uploading,
    processingBatchId,
    processingStatus,
    uploadSuccessMsg,
    setUploadSuccessMsg,
    startUpload,
    refreshVerificationTrigger
  } = useScan();

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const isScanAllowed = user?.role === 'ADMIN' || settings?.features?.allowScanUpload;
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewingIndex, setPreviewingIndex] = useState<number>(0);
  const [newAssessment, setNewAssessment] = useState({
    name: '', subject_id: '', class_name: '', max_score: 100, passing_score: 50, exam_date: new Date().toISOString().split('T')[0]
  });
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });

  const verificationRef = useRef<VerificationSectionRef>(null);
  const { token } = useAuth();
  const location = useLocation();

  // Handle URL hash navigation (e.g. /scans#verification or navigating from Verification link)
  useEffect(() => {
    if (location.hash === '#verification' || location.pathname === '/verification') {
      setTimeout(() => {
        const el = document.getElementById('verification-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [location]);

  // When background batch completes, scroll to verification
  useEffect(() => {
    if (refreshVerificationTrigger > 0) {
      verificationRef.current?.refresh();
      setTimeout(() => {
        const el = document.getElementById('verification-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [refreshVerificationTrigger]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
      setPreviewingIndex(0);
      simulateLiveMatch(selectedFiles[0]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    addFiles(droppedFiles);
    if (droppedFiles.length > 0) {
      setPreviewingIndex(0);
      simulateLiveMatch(droppedFiles[0]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !selectedAssessment) return;
    try {
      await startUpload(selectedAssessment, files);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Upload failed');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.code) return;
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/subjects`, newSubject, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const createdSub = response.data;
      setSubjects([...subjects, createdSub]);
      setNewAssessment({...newAssessment, subject_id: createdSub.id});
      setIsCreatingSubject(false);
      setNewSubject({ name: '', code: '' });
    } catch (e) {
      alert('Failed to create subject');
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/assessments`, {
        ...newAssessment,
        max_score: Number(newAssessment.max_score),
        passing_score: Number(newAssessment.passing_score),
        created_by: 'teacher-123'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssessments([response.data, ...assessments]);
      setSelectedAssessment(response.data.id);
      setShowCreateModal(false);
      setNewAssessment({ 
        name: '', 
        subject_id: subjects[0] ? subjects[0].id : '', 
        class_name: '', 
        max_score: 100, 
        passing_score: 50, 
        exam_date: new Date().toISOString().split('T')[0] 
      });
    } catch (e) {
      alert('Failed to create assessment');
    }
  };

  const selectedAssessmentObj = assessments.find((a: any) => a.id === selectedAssessment);

  return (
    <div className="animate-slide-up max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload Scans & Verification</h1>
        <p className="text-slate-500 mt-2">Upload graded papers to extract scores and verify results in one seamless page</p>
      </header>

      {/* Upload Card */}
      <div className="glass-panel p-4 sm:p-6 md:p-8 mb-8 border border-slate-200 rounded-3xl shadow-sm bg-white/90">
        {/* Single-Choice Dropdowns: Class & Exam Type (បង្ហាញតែមួយដែលបានជ្រើសរើស) */}
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-slate-200 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Class Dropdown (ជ្រើសរើសថ្នាក់) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center">
                  <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" /> ថ្នាក់ (Select Class)
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <Plus className="w-3 h-3 mr-0.5" /> បន្ថែមថ្នាក់ថ្មី
                </button>
              </div>

              {/* Dropdown Trigger Button - Only shows the currently selected class! */}
              <div 
                onClick={() => {
                  setClassDropdownOpen(!classDropdownOpen);
                  setExamDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 bg-white rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-xs ${
                  classDropdownOpen 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-black text-sm text-slate-900 truncate">
                    {selectedClass ? `ថ្នាក់ ${selectedClass}` : 'ជ្រើសរើសថ្នាក់ (Select Class)'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${classDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
              </div>

              {/* Dropdown Menu - Opens on click, closes when selected */}
              {classDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-56 overflow-y-auto animate-fade-in divide-y divide-slate-50">
                  {classList.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                      ពុំទាន់មានថ្នាក់នៅឡើយទេ (No classes yet)
                    </div>
                  ) : (
                    classList.map(cls => {
                      const isSelected = selectedClass === cls;
                      return (
                        <div
                          key={cls}
                          onClick={() => {
                            setSelectedClass(cls);
                            setClassDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Users className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="text-sm">ថ្នាក់ {cls}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                      );
                    })
                  )}
                  <div
                    onClick={() => {
                      setClassDropdownOpen(false);
                      setShowAddClassModal(true);
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center border-t border-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> + បន្ថែមថ្នាក់ថ្មី (Add Class)...
                  </div>
                </div>
              )}
            </div>

            {/* 2. Exam Type Dropdown (ប្រភេទការប្រឡង) */}
            <div className="relative">
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" /> ប្រភេទការប្រឡង (Exam Type)
              </label>

              {/* Dropdown Trigger Button - Only shows the currently selected exam type! */}
              <div 
                onClick={() => {
                  setExamDropdownOpen(!examDropdownOpen);
                  setClassDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 bg-white rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-xs ${
                  examDropdownOpen 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedExamType === 'Midterm' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {selectedExamType === 'Midterm' ? '📝' : '🎓'}
                  </div>
                  <span className="font-black text-sm text-slate-900 truncate">
                    {selectedExamType === 'Midterm' ? 'Midterm (ពាក់កណ្ដាលឆមាស)' : 'Final (បញ្ចប់ឆមាស)'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${examDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
              </div>

              {/* Dropdown Menu - Opens on click, closes when selected */}
              {examDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-fade-in divide-y divide-slate-50">
                  <div
                    onClick={() => {
                      setSelectedExamType('Midterm');
                      setExamDropdownOpen(false);
                    }}
                    className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedExamType === 'Midterm' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>📝</span>
                      <span className="text-sm">Midterm (ពាក់កណ្ដាលឆមាស)</span>
                    </div>
                    {selectedExamType === 'Midterm' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>

                  <div
                    onClick={() => {
                      setSelectedExamType('Final');
                      setExamDropdownOpen(false);
                    }}
                    className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedExamType === 'Final' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>🎓</span>
                      <span className="text-sm">Final (បញ្ចប់ឆមាស)</span>
                    </div>
                    {selectedExamType === 'Final' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Active Target Banner */}
          <div className="mt-4 px-3.5 py-2 bg-white rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>គោលដៅ Scan បច្ចុប្បន្ន៖</span>
              {selectedClass ? (
                <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  ថ្នាក់ {selectedClass} • {selectedExamType} Exam
                </span>
              ) : (
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  សូមចុច "+ បន្ថែមថ្នាក់ថ្មី" ឬជ្រើសរើសថ្នាក់សិន
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              (សន្លឹកកិច្ចការទាំងអស់នឹងត្រូវរក្សាទុកដាច់ដោយឡែកសម្រាប់ថ្នាក់នេះ)
            </span>
          </div>
        </div>

        {/* Feature Lock Notice if Scan Upload is disabled by Admin */}
        {!isScanAllowed && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start space-x-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">មុខងារស្គែនត្រូវបានបិទបណ្តោះអាសន្ន (Scan Upload Locked):</span> អ្នកគ្រប់គ្រង (Administrator) បានកំណត់ផ្អាកមុខងារ Upload/Capture សន្លឹកកិច្ចការសម្រាប់គ្រូបង្រៀន។ ប្រសិនបើលោកអ្នកត្រូវការស្គែន សូមទាក់ទង Admin ដើម្បីបើកសិទ្ធិ។
            </div>
          </div>
        )}

        {/* Dropzone */}
        <div 
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center text-center transition-colors ${
            !isScanAllowed 
              ? 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed' 
              : 'border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/20'
          }`}
          onDragOver={(e) => isScanAllowed && e.preventDefault()}
          onDrop={isScanAllowed ? handleFileDrop : undefined}
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Upload or Capture Scans</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">Drag and drop files here, or choose an option below to add your students' papers.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
             <button 
               disabled={!isScanAllowed}
               onClick={(e) => { e.preventDefault(); if (isScanAllowed) document.getElementById('fileUpload')?.click(); }}
               className={`flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                 !isScanAllowed
                   ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                   : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'
               }`}
             >
               <FileImage className="w-4 h-4 mr-2" /> Browse Files
             </button>
             <button 
               disabled={!isScanAllowed}
               onClick={(e) => { e.preventDefault(); if (isScanAllowed) document.getElementById('cameraUpload')?.click(); }}
               className={`flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                 !isScanAllowed
                   ? 'bg-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                   : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20 hover:-translate-y-0.5'
               }`}
             >
               <Camera className="w-4 h-4 mr-2" /> Take Photo
             </button>
          </div>

          <input 
            type="file" 
            id="fileUpload" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <input 
            type="file" 
            id="cameraUpload" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={handleFileChange} 
          />
        </div>

        {/* Selected files preview */}
        {files.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Selected Files ({files.length})</h4>
              <button 
                onClick={clearFiles} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {files.map((file, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setPreviewingIndex(idx);
                    simulateLiveMatch(file);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    previewingIndex === idx 
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  title="ចុចដើម្បីមើល Preview កូដសិស្សលើ file នេះ"
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <FileImage className={`w-4 h-4 shrink-0 ${previewingIndex === idx ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {previewingIndex === idx && (
                      <span className="text-[9px] font-black text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                        View
                      </span>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                        if (previewingIndex === idx && files.length > 1) {
                          const nextIdx = idx === 0 ? 0 : idx - 1;
                          setPreviewingIndex(nextIdx);
                          simulateLiveMatch(files[nextIdx]);
                        }
                      }} 
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">បានជ្រើសរើស {files.length} សន្លឹក៖</span> ចុចលើប៊ូតុងខាងស្ដាំ ដើម្បីឱ្យ AI ស្គែន និងស្រង់ពិន្ទុលើសន្លឹកកិច្ចការទាំង {files.length} សន្លឹកព្រមគ្នា!
              </div>
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:-translate-y-0.5 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center shrink-0"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    កំពុង Upload {files.length} សន្លឹក...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Process All {files.length} Scans
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Inline Progress Bar for batch OCR processing */}
        {processingBatchId && processingStatus && (
          <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">AI កំពុងដំណើរការស្គែនសន្លឹកកិច្ចការ...</h4>
                  <p className="text-xs text-slate-500">កំពុងអានកូដសិស្ស ឈ្មោះ និងស្រង់ពិន្ទុពីក្រដាសប្រឡង</p>
                </div>
              </div>
              <span className="text-xs font-black text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-xs">
                {processingStatus.processed_files} / {processingStatus.total_files} សន្លឹកជោគជ័យ
              </span>
            </div>

            <div className="w-full bg-indigo-100/70 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${processingStatus.total_files > 0 ? (processingStatus.processed_files / processingStatus.total_files) * 100 : 15}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Upload success notification */}
        {uploadSuccessMsg && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-fade-in shadow-xs">
            <div className="flex items-center text-emerald-800 text-sm font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-600 mr-2 shrink-0" />
              <span>{uploadSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setUploadSuccessMsg(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Auto-Matcher Preview during upload */}
        {(isMatching || matchedStudent) && (
          <div className="mt-6 border-t border-slate-100 pt-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center">
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                Quick Preview លើរូបភាពទី {previewingIndex + 1} នៃ {files.length} ({files[previewingIndex]?.name})
              </h4>
              <span className="text-[11px] text-slate-400">
                (ចុចលើ file ណាមួយក្នុងចំណោម {files.length} ខាងលើដើម្បីប្ដូរមើល Preview)
              </span>
            </div>
            
            {isMatching ? (
              <div className="bg-indigo-50 p-4 rounded-xl flex items-center border border-indigo-100">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mr-3" />
                <span className="text-sm font-bold text-indigo-900">កំពុងអានកូដសិស្សពី File ទី {previewingIndex + 1}...</span>
              </div>
            ) : matchedStudent?.error ? (
              <div className="bg-amber-50 p-4 rounded-xl flex items-center border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 mr-3" />
                <div>
                  <h5 className="font-bold text-amber-900 text-sm">Match Not Found លើ File ទី {previewingIndex + 1}</h5>
                  <p className="text-xs text-amber-700">មិនទាន់រកឃើញកូដសិស្សច្បាស់លាស់។ អ្នកអាចជ្រើសរើសសិស្សក្នុង Verification Queue ខាងក្រោមបាន។</p>
                </div>
              </div>
            ) : matchedStudent ? (
              <div className="bg-emerald-50 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-200 shadow-xs">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mr-3 shrink-0" />
                  <div>
                    <h5 className="font-bold text-emerald-900 text-sm">Exact Match Found: {matchedStudent.student_id}</h5>
                    <p className="text-xs text-emerald-700">ផ្គូផ្គងត្រូវជាមួយសិស្សក្នុងប្រព័ន្ធ។ ចុច <strong>"Process All {files.length} Scans"</strong> ខាងលើ ដើម្បីដំណើរការទាំងអស់!</p>
                  </div>
                </div>
                <div className="flex items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-emerald-100 shrink-0">
                  <img src={matchedStudent.avatar} alt="Avatar" className="w-9 h-9 rounded-full mr-2.5" />
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-tight">{matchedStudent.full_name}</p>
                    <p className="text-[10px] font-bold text-indigo-600">{matchedStudent.class_name} • {matchedStudent.student_id}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Verification Queue directly underneath Upload Scans */}
      <VerificationSection 
        ref={verificationRef}
        selectedAssessmentId={selectedAssessment}
        selectedAssessmentName={selectedAssessmentObj?.name}
      />

      {/* Add New Class Modal */}
      {showAddClassModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" /> បន្ថែមថ្នាក់ថ្មី (Add Class)
              </h3>
              <button onClick={() => setShowAddClassModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              បញ្ចូលឈ្មោះថ្នាក់ (ឧទាហរណ៍៖ Class A, Class B, 10A, PGC...)៖
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (newClassNameInput.trim()) {
                addClass(newClassNameInput.trim());
                setNewClassNameInput('');
                setShowAddClassModal(false);
              }
            }}>
              <input 
                autoFocus
                type="text" 
                value={newClassNameInput}
                onChange={e => setNewClassNameInput(e.target.value)}
                placeholder="e.g. Class A, Class B..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all mb-4 text-sm"
              />

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newClassNameInput.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  Save & Select Class
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* New Assessment Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-800">New Assessment</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAssessment} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Assessment Name</label>
                <input 
                  required 
                  type="text" 
                  value={newAssessment.name} 
                  onChange={e => setNewAssessment({...newAssessment, name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all" 
                  placeholder="e.g. Midterm 1" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Subject</label>
                  {!isCreatingSubject && (
                    <button type="button" onClick={() => setIsCreatingSubject(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-1 rounded-lg transition-colors">
                      <Plus className="w-3 h-3 mr-1" /> New Subject
                    </button>
                  )}
                </div>
                
                {isCreatingSubject ? (
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <input type="text" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder="Name (e.g. History)" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800 bg-white" />
                      </div>
                      <div>
                        <input type="text" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} placeholder="Code (e.g. HIS101)" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800 bg-white" />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button type="button" onClick={() => setIsCreatingSubject(false)} className="text-xs px-3 py-1.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
                      <button type="button" onClick={handleCreateSubject} className="text-xs px-3 py-1.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">Save Subject</button>
                    </div>
                  </div>
                ) : (
                  <select required value={newAssessment.subject_id} onChange={e => setNewAssessment({...newAssessment, subject_id: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all cursor-pointer">
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Class</label>
                <input required type="text" value={newAssessment.class_name} onChange={e => setNewAssessment({...newAssessment, class_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all" placeholder="e.g. 10B" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Max Score</label>
                  <input required type="number" value={newAssessment.max_score} onChange={e => setNewAssessment({...newAssessment, max_score: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Exam Date</label>
                  <input required type="date" value={newAssessment.exam_date} onChange={e => setNewAssessment({...newAssessment, exam_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white font-bold text-slate-800 transition-all" />
                </div>
              </div>
              
              <div className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5">Save & Use</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
