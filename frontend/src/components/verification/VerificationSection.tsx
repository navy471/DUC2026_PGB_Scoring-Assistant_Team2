import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useScan } from '../../context/ScanContext';
import { 
  Check, FileImage, AlertTriangle, Trash2, ChevronDown, ChevronUp, 
  RotateCw, ZoomIn, Eye, Sparkles, Filter, CheckCircle2, X, Users, BookOpen
} from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AlertModal } from '../ui/AlertModal';

export interface VerificationSectionRef {
  refresh: () => void;
}

interface VerificationSectionProps {
  selectedAssessmentId?: string;
  selectedAssessmentName?: string;
}

export const VerificationSection = forwardRef<VerificationSectionRef, VerificationSectionProps>(({
  selectedAssessmentId,
  selectedAssessmentName
}, ref) => {
  const { 
    selectedClass,
    selectedExamType,
    classList,
    activeVerificationIndex, 
    setActiveVerificationIndex,
    filterByAssessment, 
    setFilterByAssessment,
    draftEditScore, 
    setDraftEditScore,
    draftEditCode, 
    setDraftEditCode,
    refreshVerificationTrigger
  } = useScan();

  const [activeClassFilter, setActiveClassFilter] = useState<string>(selectedClass || 'ALL');
  const [activeExamFilter, setActiveExamFilter] = useState<string>(selectedExamType || 'ALL');
  const [vClassOpen, setVClassOpen] = useState(false);
  const [vExamOpen, setVExamOpen] = useState(false);

  useEffect(() => {
    if (selectedClass) setActiveClassFilter(selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    if (selectedExamType) setActiveExamFilter(selectedExamType);
  }, [selectedExamType]);

  const [pendingResults, setPendingResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; 
    type: 'error' | 'success'; 
    title: string; 
    message: string;
  }>({
    isOpen: false, 
    type: 'error', 
    title: '', 
    message: ''
  });

  const { token } = useAuth();

  // Local state for editing the active result
  const [editScore, setEditScore] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  useEffect(() => {
    if (!token) return;
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setAllStudents(res.data)).catch(console.error);
  }, [token]);

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/verification/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingResults(res.data);
      if (res.data.length > 0 && activeVerificationIndex === null) {
        setActiveVerificationIndex(0);
      } else if (res.data.length > 0 && activeVerificationIndex !== null && activeVerificationIndex >= res.data.length) {
        setActiveVerificationIndex(Math.max(0, res.data.length - 1));
      } else if (res.data.length === 0) {
        setActiveVerificationIndex(null);
      }
    } catch (e) {
      console.error('Failed to fetch pending scans', e);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchPending();
    }
  }));

  useEffect(() => {
    if (token) {
      fetchPending();
    }
  }, [token, refreshVerificationTrigger]);

  const availableClasses = useMemo(() => {
    const fromScans = pendingResults.map((r: any) => r.ScannedPaper?.ScanBatch?.Assessment?.class_name).filter(Boolean);
    return Array.from(new Set([...classList, ...fromScans]));
  }, [pendingResults, classList]);

  // Filtered results based on Class and Exam Type (Midterm / Final)
  const displayedResults = useMemo(() => {
    return pendingResults.filter((r: any) => {
      const pClass = r.ScannedPaper?.ScanBatch?.Assessment?.class_name;
      const pName = r.ScannedPaper?.ScanBatch?.Assessment?.name || '';
      if (activeClassFilter !== 'ALL' && pClass !== activeClassFilter) {
        return false;
      }
      if (activeExamFilter !== 'ALL' && !pName.toLowerCase().includes(activeExamFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [pendingResults, activeClassFilter, activeExamFilter]);

  // Sync edit form when active item changes, restoring drafts if available
  useEffect(() => {
    if (displayedResults.length > 0 && activeVerificationIndex !== null && displayedResults[activeVerificationIndex]) {
      const current = displayedResults[activeVerificationIndex];
      setEditScore(draftEditScore || current.detected_score?.toString() || '');
      setEditCode(draftEditCode || current.detected_student_code || '');
    }
  }, [activeVerificationIndex, displayedResults]);

  const handleScoreChange = (val: string) => {
    setEditScore(val);
    setDraftEditScore(val);
  };

  const handleCodeChange = (val: string) => {
    setEditCode(val);
    setDraftEditCode(val);
  };

  const handleApprove = async () => {
    if (activeVerificationIndex === null) return;
    const current = displayedResults[activeVerificationIndex];
    if (!current) return;
    
    if (!editCode.trim()) {
      showAlert("Missing ID", "Student ID is required to verify this result.", "error");
      return;
    }

    setApprovingId(current.id);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/verification/${current.id}/approve`, {
        finalScore: parseFloat(editScore) || 0,
        finalStudentCode: editCode.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showAlert("Verified!", `Score of ${editScore} saved for student ${editCode}.`, "success");
      setDraftEditScore('');
      setDraftEditCode('');
      await fetchPending();
    } catch (e: any) {
      showAlert("Verification Failed", e.response?.data?.message || 'Failed to approve result. Please ensure the student code exists.', "error");
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveAllConfident = async () => {
    // Collect all items in displayedResults that have student_code or matched student and confidence >= 0.75 without duplicate/exceeds warnings
    const readyItems = displayedResults.filter((r: any) => {
      const hasStudent = r.ScannedPaper?.Student || (r.detected_student_code && r.detected_student_code !== 'UNKNOWN');
      const noSevereWarning = !r.warnings?.includes('EXCEEDS_MAX_SCORE') && !r.warnings?.includes('DUPLICATE_PAPER');
      return hasStudent && r.detected_score != null && noSevereWarning;
    });

    if (readyItems.length === 0) {
      showAlert("No Ready Papers", "There are no confident papers ready for auto-approval. Please review items manually.", "error");
      return;
    }

    setIsApprovingAll(true);
    try {
      const resultIds = readyItems.map((r: any) => r.id);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/verification/approve-batch`, {
        resultIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showAlert("Batch Approved!", `Successfully approved and synced ${res.data.approved} of ${readyItems.length} papers to Gradebook.`, "success");
      await fetchPending();
    } catch (e: any) {
      showAlert("Batch Approval Failed", e.response?.data?.message || 'Failed to approve batch.', "error");
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/verification/${resultId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteTargetId(null);
      setSelectedResultIds(prev => prev.filter(id => id !== resultId));
      showAlert("Deleted", "Scan result removed successfully.", "success");
      await fetchPending();
    } catch (e) {
      showAlert("Error", "Failed to delete result. Please try again.", "error");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedResultIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/verification/reject-batch`, {
        resultIds: selectedResultIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsBatchDeleteConfirmOpen(false);
      showAlert("Deleted", `បានលុបសន្លឹកកិច្ចការចំនួន ${selectedResultIds.length} ដោយជោគជ័យ។`, "success");
      setSelectedResultIds([]);
      await fetchPending();
    } catch (e: any) {
      showAlert("Error", e.response?.data?.message || 'Failed to delete selected scans. Please try again.', "error");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const isAllSelected = displayedResults.length > 0 && displayedResults.every((r: any) => selectedResultIds.includes(r.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const displayedIds = new Set(displayedResults.map((r: any) => r.id));
      setSelectedResultIds(prev => prev.filter(id => !displayedIds.has(id)));
    } else {
      const displayedIds = displayedResults.map((r: any) => r.id);
      setSelectedResultIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedResultIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div id="verification-section" className="mt-12 pt-8 border-t border-slate-200 animate-slide-up">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
              <CheckCircle2 className="w-6 h-6 mr-2 text-indigo-600" />
              Verification Queue
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 shadow-xs">
              {pendingResults.length} Pending
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review and confirm extracted scores before they are permanently synced into Gradebook.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Batch Delete Button */}
          {selectedResultIds.length > 0 && (
            <button
              onClick={() => setIsBatchDeleteConfirmOpen(true)}
              disabled={isBatchDeleting}
              className="flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 animate-fade-in"
              title="លុបសន្លឹកកិច្ចការដែលបានជ្រើសរើស (Delete Selected)"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isBatchDeleting ? 'Deleting...' : `Delete Selected (${selectedResultIds.length})`}
            </button>
          )}

          {displayedResults.length > 0 && (
            <button
              onClick={handleApproveAllConfident}
              disabled={isApprovingAll}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              title="Approve all confident matches in current view"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 mr-1.5 ${isApprovingAll ? 'animate-spin' : ''}`} />
              {isApprovingAll ? 'Approving...' : 'Approve All Confident (អនុម័តទាំងអស់)'}
            </button>
          )}

          {selectedAssessmentId && (
            <button
              onClick={() => setFilterByAssessment(!filterByAssessment)}
              className={`flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                filterByAssessment 
                  ? 'bg-indigo-600 text-white shadow-indigo-500/20' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              {filterByAssessment ? `This Assessment (${displayedResults.length})` : 'All Assessments'}
            </button>
          )}

          <button
            onClick={fetchPending}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50"
            title="Refresh list"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Verification Filter: Single-Choice Dropdowns (បង្ហាញតែមួយដែលបានជ្រើសរើស) */}
      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Class Filter Dropdown */}
          <div className="relative">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              ថ្នាក់ (Class)៖
            </span>
            <div 
              onClick={() => {
                setVClassOpen(!vClassOpen);
                setVExamOpen(false);
              }}
              className="px-3.5 py-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer text-xs font-black text-slate-800 shadow-xs hover:border-slate-300 min-w-[150px]"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>{activeClassFilter === 'ALL' ? 'គ្រប់ថ្នាក់' : `ថ្នាក់ ${activeClassFilter}`}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${vClassOpen ? 'rotate-180' : ''}`} />
            </div>

            {vClassOpen && (
              <div className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 min-w-[170px] animate-fade-in divide-y divide-slate-50">
                <div
                  onClick={() => {
                    setActiveClassFilter('ALL');
                    setVClassOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer ${
                    activeClassFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>គ្រប់ថ្នាក់ (All Classes)</span>
                  {activeClassFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                {availableClasses.map(cls => (
                  <div
                    key={cls}
                    onClick={() => {
                      setActiveClassFilter(cls);
                      setVClassOpen(false);
                    }}
                    className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer ${
                      activeClassFilter === cls ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>ថ្នាក់ {cls}</span>
                    {activeClassFilter === cls && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exam Type Filter Dropdown */}
          <div className="relative">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              ប្រភេទប្រឡង (Exam)៖
            </span>
            <div 
              onClick={() => {
                setVExamOpen(!vExamOpen);
                setVClassOpen(false);
              }}
              className="px-3.5 py-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer text-xs font-black text-slate-800 shadow-xs hover:border-slate-300 min-w-[150px]"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {activeExamFilter === 'ALL' ? 'គ្រប់ប្រភេទ' : activeExamFilter === 'Midterm' ? '📝 Midterm' : '🎓 Final'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${vExamOpen ? 'rotate-180' : ''}`} />
            </div>

            {vExamOpen && (
              <div className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 min-w-[170px] animate-fade-in divide-y divide-slate-50">
                <div
                  onClick={() => {
                    setActiveExamFilter('ALL');
                    setVExamOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer ${
                    activeExamFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>គ្រប់ប្រភេទ (All Exams)</span>
                  {activeExamFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div
                  onClick={() => {
                    setActiveExamFilter('Midterm');
                    setVExamOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer ${
                    activeExamFilter === 'Midterm' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>📝 Midterm (ពាក់កណ្ដាលឆមាស)</span>
                  {activeExamFilter === 'Midterm' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div
                  onClick={() => {
                    setActiveExamFilter('Final');
                    setVExamOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer ${
                    activeExamFilter === 'Final' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>🎓 Final (បញ្ចប់ឆមាស)</span>
                  {activeExamFilter === 'Final' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Counter */}
        <div className="text-xs font-bold text-slate-500 self-end sm:self-center">
          បង្ហាញ៖ <span className="text-indigo-600 font-black">{displayedResults.length}</span> សន្លឹកកិច្ចការ
        </div>
      </div>

      {/* Empty State */}
      {displayedResults.length === 0 ? (
        <div className="glass-panel p-10 text-center border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[220px]">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {filterByAssessment ? 'No pending scans for this assessment' : 'All Caught Up!'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mt-1">
            {filterByAssessment 
              ? `There are no papers waiting for verification in "${selectedAssessmentName || 'selected assessment'}".`
              : 'There are no scanned papers waiting for review right now. Upload graded papers above to start AI verification.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Table Headers */}
          <div className="grid grid-cols-12 px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider items-center">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                title="Select / Deselect All (ជ្រើសរើសទាំងអស់)"
              />
            </div>
            <div className="col-span-3">Scanned File</div>
            <div className="col-span-2">Detected ID</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Rows */}
          {displayedResults.map((result: any, index: number) => {
            const isActive = index === activeVerificationIndex;
            const hasWarnings = result.warnings && result.warnings.length > 0;
            const assessmentName = result.ScannedPaper?.ScanBatch?.Assessment?.name;
            const assessmentClass = result.ScannedPaper?.ScanBatch?.Assessment?.class_name;
            const imageUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${result.ScannedPaper?.file_url || ''}`;

            return (
              <div 
                key={result.id} 
                className={`flex flex-col rounded-2xl transition-all duration-300 overflow-hidden ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10' 
                    : 'bg-white border border-slate-100 shadow-sm hover:border-indigo-200 text-slate-700'
                }`}
              >
                {/* Row Header */}
                <div 
                  className="grid grid-cols-12 px-6 py-4 items-center cursor-pointer relative z-10"
                  onClick={() => setActiveVerificationIndex(isActive ? null : index)}
                >
                  {/* Row Checkbox */}
                  <div 
                    className="col-span-1 flex items-center" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedResultIds.includes(result.id)}
                      onChange={(e) => handleToggleSelectRow(result.id, e)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      title="ជ្រើសរើសសន្លឹកនេះ (Select)"
                    />
                  </div>

                  <div className="col-span-3 flex items-center gap-3 font-medium">
                    <div className={`p-2 rounded-full shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                      <FileImage className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div className="truncate pr-2">
                      <p className="truncate font-bold text-sm leading-tight">
                        {result.ScannedPaper?.file_url?.split('/').pop()}
                      </p>
                      {assessmentName && (
                        <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {assessmentName} {assessmentClass ? `(${assessmentClass})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-2 font-bold text-sm">
                    {result.detected_student_code || (
                      <span className={`text-xs ${isActive ? 'text-amber-200' : 'text-amber-600'}`}>
                        ⚠️ Missing ID
                      </span>
                    )}
                  </div>
                  
                  <div className="col-span-2 font-black text-base">
                    {result.detected_score != null ? result.detected_score : '—'}
                  </div>
                  
                  <div className="col-span-2 flex items-center">
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white' : (hasWarnings ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : (hasWarnings ? 'bg-amber-500' : 'bg-emerald-500')}`}></div>
                      <span>{hasWarnings ? 'Needs Review' : 'Ready'}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    {/* Quick Single Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(result.id);
                      }}
                      className={`p-2 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-white/20 text-white hover:bg-rose-500 hover:text-white' 
                          : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                      title="លុបសន្លឹកនេះ (Delete this scan)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content (Accordion) */}
                {isActive && (
                  <div className="bg-slate-50 border-t border-indigo-400/20 p-4 flex flex-col md:flex-row items-start gap-4 text-slate-800 animate-fade-in relative z-0">
                    {/* Left: Scanned Image Preview */}
                    <div className="flex-1 w-full bg-white rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 border border-slate-200 shadow-sm relative group">
                      <div className="w-full flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-slate-500 flex items-center">
                          <Eye className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Paper Preview
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(imageUrl)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <ZoomIn className="w-3 h-3 mr-1" /> Zoom Full
                        </button>
                      </div>

                      <div className="relative w-full max-h-80 overflow-hidden flex items-center justify-center bg-slate-100 rounded-lg">
                        <img 
                          src={imageUrl}
                          alt="Scanned Paper"
                          className="w-full h-full object-contain rounded cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                          onClick={() => setZoomedImage(imageUrl)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e2e8f0/475569?text=Image+Not+Found';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Right: Verification Form */}
                    <div className="w-full md:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0">
                      {/* AI Confidence Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                            <Sparkles className="w-3 h-3 mr-1 text-indigo-500" /> AI Confidence
                          </span>
                          <span className={`text-xs font-black ${hasWarnings ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {Math.round((result.confidence || 0) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              hasWarnings 
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500' 
                                : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            }`}
                            style={{ width: `${(result.confidence || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Warnings if any */}
                      {hasWarnings && (
                        <div className="mb-3 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                          <h4 className="text-[10px] font-bold text-amber-800 flex items-center mb-1 uppercase tracking-wide">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-500"/> Warnings Detected
                          </h4>
                          <ul className="text-xs font-medium text-amber-700 space-y-0.5 pl-4 list-disc marker:text-amber-400">
                            {result.warnings.map((w: string, i: number) => (
                              <li key={i}>{w.replace(/_/g, ' ')}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Student Info Card */}
                      <div className="mb-4">
                        {result.ScannedPaper?.Student ? (
                          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center">
                                <Check className="w-3 h-3 mr-1"/> Matched Student
                              </span>
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                {result.ScannedPaper.Student.class_name}
                              </span>
                            </div>
                            <div className="font-black text-slate-900 text-sm">
                              {result.ScannedPaper.Student.khmer_name || result.ScannedPaper.Student.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {result.ScannedPaper.Student.name} • {result.ScannedPaper.Student.student_code}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1"/> Unknown Student
                              </span>
                            </div>
                            <p className="text-xs font-medium text-rose-600">
                              No student found for this code. Please enter the correct Student ID below.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Input fields */}
                      <div className="space-y-3 mb-4">
                        <div className="relative">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center justify-between">
                            <span>Student ID (លេខកូដសិស្ស)</span>
                            <span className="text-[9px] text-indigo-500 font-semibold lowercase">type or pick</span>
                          </label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={editCode} 
                              onFocus={() => setShowStudentDropdown(true)}
                              onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                              onChange={e => {
                                handleCodeChange(e.target.value);
                                setShowStudentDropdown(true);
                              }}
                              placeholder="Search by code or student name..."
                              className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-slate-50 focus:bg-white text-slate-900 uppercase transition-all"
                            />
                            {editCode && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleCodeChange('');
                                  setShowStudentDropdown(true);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Autocomplete Dropdown */}
                          {showStudentDropdown && allStudents.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto animate-fade-in divide-y divide-slate-100">
                              {allStudents
                                .filter(s => {
                                  // Prioritize current assessment class if not filtered out
                                  const targetClass = result.ScannedPaper?.ScanBatch?.Assessment?.class_name;
                                  if (!editCode.trim() && targetClass && s.class_name !== targetClass) {
                                    return false;
                                  }
                                  if (!editCode.trim()) return true;
                                  const q = editCode.trim().toLowerCase();
                                  const text = `${s.student_code} ${s.name} ${s.khmer_name || ''} ${s.class_name}`.toLowerCase();
                                  return text.includes(q);
                                })
                                .sort((a, b) => {
                                  const targetClass = result.ScannedPaper?.ScanBatch?.Assessment?.class_name;
                                  if (targetClass) {
                                    if (a.class_name === targetClass && b.class_name !== targetClass) return -1;
                                    if (b.class_name === targetClass && a.class_name !== targetClass) return 1;
                                  }
                                  return (a.name || '').localeCompare(b.name || '');
                                })
                                .slice(0, 15)
                                .map(student => (
                                  <div
                                    key={student.id}
                                    onMouseDown={() => {
                                      handleCodeChange(student.student_code);
                                      setShowStudentDropdown(false);
                                      if (result && result.ScannedPaper) {
                                        result.ScannedPaper.Student = student;
                                      }
                                    }}
                                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between text-left"
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 leading-tight">
                                        {student.khmer_name || student.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {student.student_code} • {student.name}
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {student.class_name}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                            Verified Score (ពិន្ទុ)
                          </label>
                          <input 
                            type="number" 
                            step="0.5"
                            value={editScore} 
                            onChange={e => handleScoreChange(e.target.value)}
                            className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-indigo-50/50 text-indigo-700 text-center transition-all"
                          />
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        <button 
                          onClick={handleApprove}
                          disabled={approvingId === result.id}
                          className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 mr-1.5" /> 
                          {approvingId === result.id ? 'Saving...' : 'Confirm & Sync'}
                        </button>
                        
                        <button 
                          onClick={() => setDeleteTargetId(result.id)}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-xs"
                          title="Reject Scan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedImage} 
              alt="Full Preview" 
              className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain bg-white"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Single) */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="លុបសន្លឹកកិច្ចការ?"
        message="តើអ្នកប្រាកដជាចង់លុបសន្លឹកកិច្ចការនេះមែនទេ? វានឹងត្រូវដកចេញពី Verification Queue។"
        confirmText="លុប (Delete)"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) handleDelete(deleteTargetId);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Batch Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBatchDeleteConfirmOpen}
        title="លុបសន្លឹកកិច្ចការដែលបានជ្រើសរើស?"
        message={`តើអ្នកប្រាកដជាចង់លុបសន្លឹកកិច្ចការទាំង ${selectedResultIds.length} ដែលបានជ្រើសរើសនេះមែនទេ? ពួកវានឹងត្រូវដកចេញពី Verification Queue។`}
        confirmText={`លុបទាំង ${selectedResultIds.length}`}
        isDestructive={true}
        onConfirm={handleBatchDelete}
        onCancel={() => setIsBatchDeleteConfirmOpen(false)}
      />
      
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
});

VerificationSection.displayName = 'VerificationSection';

