import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface MatchedStudent {
  student_id?: string;
  full_name?: string;
  class_name?: string;
  avatar?: string;
  error?: boolean;
}

interface ScanContextType {
  // Class & Exam Type Division
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  selectedExamType: 'Midterm' | 'Final';
  setSelectedExamType: (type: 'Midterm' | 'Final') => void;
  classList: string[];
  addClass: (cls: string) => void;
  ensureAssessment: (cls: string, examType: string) => Promise<string>;

  // Assessment list & selection
  selectedAssessment: string;
  setSelectedAssessment: (id: string) => void;
  assessments: any[];
  setAssessments: React.Dispatch<React.SetStateAction<any[]>>;
  subjects: any[];
  setSubjects: React.Dispatch<React.SetStateAction<any[]>>;
  fetchAssessments: () => Promise<void>;

  // Uploaded files in queue
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;

  // Live Auto-Matcher preview
  matchedStudent: MatchedStudent | null;
  setMatchedStudent: React.Dispatch<React.SetStateAction<MatchedStudent | null>>;
  isMatching: boolean;
  setIsMatching: React.Dispatch<React.SetStateAction<boolean>>;
  simulateLiveMatch: (file: File) => void;

  // Background OCR Processing & Upload
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  processingBatchId: string | null;
  setProcessingBatchId: React.Dispatch<React.SetStateAction<string | null>>;
  processingStatus: any;
  setProcessingStatus: React.Dispatch<React.SetStateAction<any>>;
  uploadSuccessMsg: string | null;
  setUploadSuccessMsg: React.Dispatch<React.SetStateAction<string | null>>;
  startUpload: (assessmentId: string, filesToUpload: File[]) => Promise<void>;

  // Verification Queue state preservation
  activeVerificationIndex: number | null;
  setActiveVerificationIndex: React.Dispatch<React.SetStateAction<number | null>>;
  filterByAssessment: boolean;
  setFilterByAssessment: React.Dispatch<React.SetStateAction<boolean>>;
  draftEditScore: string;
  setDraftEditScore: React.Dispatch<React.SetStateAction<string>>;
  draftEditCode: string;
  setDraftEditCode: React.Dispatch<React.SetStateAction<string>>;
  refreshVerificationTrigger: number;
  triggerVerificationRefresh: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();

  // 1. Class & Exam Type State
  const [selectedClass, setSelectedClassState] = useState<string>(() => {
    return sessionStorage.getItem('smart_grade_selected_class') || '';
  });
  const [selectedExamType, setSelectedExamTypeState] = useState<'Midterm' | 'Final'>(() => {
    return (sessionStorage.getItem('smart_grade_selected_exam_type') as any) || 'Midterm';
  });
  const [classList, setClassList] = useState<string[]>([]);

  const setSelectedClass = useCallback((cls: string) => {
    setSelectedClassState(cls);
    sessionStorage.setItem('smart_grade_selected_class', cls);
  }, []);

  const setSelectedExamType = useCallback((type: 'Midterm' | 'Final') => {
    setSelectedExamTypeState(type);
    sessionStorage.setItem('smart_grade_selected_exam_type', type);
  }, []);

  const addClass = useCallback((cls: string) => {
    if (!cls || !cls.trim()) return;
    const clean = cls.trim();
    setClassList(prev => prev.includes(clean) ? prev : [clean, ...prev]);
    setSelectedClass(clean);
  }, [setSelectedClass]);

  // 2. Assessment Selection (persist in sessionStorage)
  const [selectedAssessment, setSelectedAssessmentState] = useState<string>(() => {
    return sessionStorage.getItem('smart_grade_selected_assessment') || '';
  });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const setSelectedAssessment = useCallback((id: string) => {
    setSelectedAssessmentState(id);
    if (id) {
      sessionStorage.setItem('smart_grade_selected_assessment', id);
    }
  }, []);

  const ensureAssessment = useCallback(async (cls: string, examType: string) => {
    if (!token || !cls) return '';
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/assessments/get-or-create`,
        { class_name: cls, exam_type: examType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const assId = res.data.id;
      setSelectedAssessmentState(assId);
      sessionStorage.setItem('smart_grade_selected_assessment', assId);
      return assId;
    } catch (e) {
      console.error('Failed to get-or-create assessment', e);
      return '';
    }
  }, [token]);

  // Auto-resolve assessment when class or exam type changes
  useEffect(() => {
    if (token && selectedClass && selectedExamType) {
      ensureAssessment(selectedClass, selectedExamType);
    }
  }, [token, selectedClass, selectedExamType, ensureAssessment]);

  // 3. Uploaded Files State (persists in memory across navigation)
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // 3. Live Auto-Matcher Preview
  const [matchedStudent, setMatchedStudent] = useState<MatchedStudent | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  const simulateLiveMatch = useCallback(async (file: File) => {
    if (!token || !file) return;
    setIsMatching(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedAssessment) {
        formData.append('assessment_id', selectedAssessment);
      }
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/scans/quick-match`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const data = response.data;
      if (data.success && data.matchResult && data.matchResult.matchedStudent) {
        const student = data.matchResult.matchedStudent;
        setMatchedStudent({
          student_id: student.student_code,
          full_name: student.khmer_name ? `${student.khmer_name} (${student.name})` : student.name,
          class_name: student.class_name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || student.student_code)}&background=random`
        });
      } else if (data.success && data.matchResult && data.matchResult.studentCode !== 'UNKNOWN') {
        setMatchedStudent({
          student_id: data.matchResult.studentCode,
          full_name: data.matchResult.studentName || data.detectedName || 'Detected Student',
          class_name: '',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.matchResult.studentCode)}&background=random`
        });
      } else {
        // Fallback: check if we have any students
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/students`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data && res.data.length > 0) {
          const fallback = res.data[0];
          setMatchedStudent({
            student_id: fallback.student_code,
            full_name: fallback.khmer_name || fallback.name,
            class_name: fallback.class_name,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fallback.name)}&background=random`
          });
        } else {
          setMatchedStudent({ error: true });
        }
      }
    } catch (e) {
      console.error('Quick match failed', e);
      setMatchedStudent({ error: true });
    } finally {
      setIsMatching(false);
    }
  }, [token, selectedAssessment]);

  // 4. Background OCR Processing
  const [uploading, setUploading] = useState(false);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(() => {
    return sessionStorage.getItem('smart_grade_active_batch_id') || null;
  });
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [refreshVerificationTrigger, setRefreshVerificationTrigger] = useState(0);

  const triggerVerificationRefresh = useCallback(() => {
    setRefreshVerificationTrigger(prev => prev + 1);
  }, []);

  // 5. Verification draft state
  const [activeVerificationIndex, setActiveVerificationIndex] = useState<number | null>(0);
  const [filterByAssessment, setFilterByAssessment] = useState(false);
  const [draftEditScore, setDraftEditScore] = useState<string>('');
  const [draftEditCode, setDraftEditCode] = useState<string>('');

  // Fetch assessments list
  const fetchAssessments = useCallback(async () => {
    if (!token) {
      setClassList([]);
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssessments(response.data);

      const subRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(subRes.data);

      const studentsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const studentClasses = Array.from(new Set(studentsRes.data.map((s: any) => s.class_name).filter(Boolean))) as string[];
      const assessmentClasses = Array.from(new Set(response.data.map((a: any) => a.class_name).filter(Boolean))) as string[];
      const combined = Array.from(new Set([...studentClasses, ...assessmentClasses])) as string[];

      setClassList(combined);

      setSelectedClassState(prev => {
        if (combined.length === 0) {
          sessionStorage.removeItem('smart_grade_selected_class');
          return '';
        }
        if (prev && combined.includes(prev)) {
          return prev;
        }
        sessionStorage.setItem('smart_grade_selected_class', combined[0]);
        return combined[0];
      });
    } catch (error) {
      console.error('Error fetching assessments', error);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAssessments();
    }
    const handleShareUpdate = () => {
      fetchAssessments();
    };
    window.addEventListener('sg_shares_updated', handleShareUpdate);
    return () => window.removeEventListener('sg_shares_updated', handleShareUpdate);
  }, [token, fetchAssessments]);

  // Background Batch Processing Poll (Continues even when user switches pages)
  useEffect(() => {
    if (!processingBatchId || !token) return;

    sessionStorage.setItem('smart_grade_active_batch_id', processingBatchId);

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/scans/${processingBatchId}/status`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProcessingStatus(response.data);

        if (response.data.status === 'COMPLETED' || response.data.status === 'FAILED') {
          clearInterval(interval);
          setUploading(false);
          setProcessingBatchId(null);
          sessionStorage.removeItem('smart_grade_active_batch_id');

          if (response.data.status === 'COMPLETED') {
            setUploadSuccessMsg(
              `ដំណើរការ OCR ជោគជ័យ! សន្លឹកកិច្ចការ ${response.data.processed_files} សន្លឹកត្រូវបានទាញយកពិន្ទុរួចរាល់។ អ្នកអាចពិនិត្យផ្ទៀងផ្ទាត់នៅខាងក្រោម!`
            );
            triggerVerificationRefresh();
          }
        }
      } catch (err) {
        console.error('Error polling background batch status', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [processingBatchId, token, triggerVerificationRefresh]);

  // Start Upload action
  const startUpload = async (assessmentId: string, filesToUpload: File[]) => {
    if (filesToUpload.length === 0 || !token) return;

    let targetAssessmentId = assessmentId;
    if (!targetAssessmentId) {
      targetAssessmentId = await ensureAssessment(selectedClass, selectedExamType);
    }
    if (!targetAssessmentId) {
      throw new Error('Please select or create an assessment before uploading.');
    }

    setUploading(true);
    setUploadSuccessMsg(null);

    const formData = new FormData();
    formData.append('assessment_id', targetAssessmentId);
    filesToUpload.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/scans/batch`, 
        formData, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const batchId = response.data.id;
      setProcessingBatchId(batchId);
      clearFiles();
    } catch (error: any) {
      setUploading(false);
      throw error;
    }
  };

  return (
    <ScanContext.Provider value={{
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
      fetchAssessments,

      files,
      setFiles,
      addFiles,
      removeFile,
      clearFiles,

      matchedStudent,
      setMatchedStudent,
      isMatching,
      setIsMatching,
      simulateLiveMatch,

      uploading,
      setUploading,
      processingBatchId,
      setProcessingBatchId,
      processingStatus,
      setProcessingStatus,
      uploadSuccessMsg,
      setUploadSuccessMsg,
      startUpload,

      activeVerificationIndex,
      setActiveVerificationIndex,
      filterByAssessment,
      setFilterByAssessment,
      draftEditScore,
      setDraftEditScore,
      draftEditCode,
      setDraftEditCode,
      refreshVerificationTrigger,
      triggerVerificationRefresh
    }}>
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
};

