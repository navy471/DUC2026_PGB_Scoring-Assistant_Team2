import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScanProvider } from './context/ScanContext';
import { SystemSettingsProvider } from './context/SystemSettingsContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AssessmentSetup } from './pages/AssessmentSetup';
import { ScanUpload } from './pages/ScanUpload';
import { ScanProcessing } from './pages/ScanProcessing';
import { Verification } from './pages/Verification';
import { Gradebook } from './pages/Gradebook';
import { Settings } from './pages/Settings';
import { StudentList } from './pages/StudentList';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminFeatures } from './pages/admin/AdminFeatures';

// Intelligently render Admin Overview for Admins, and Teacher Dashboard for Teachers
const RootPage = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <AdminOverview />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <SystemSettingsProvider>
        <BrowserRouter>
          <ScanProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<RootPage />} />
                
                {/* Admin Specific Routes */}
                <Route path="/admin" element={<AdminOverview />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/features" element={<AdminFeatures />} />

                {/* Teacher & Shared Routes */}
                <Route path="/assessments" element={<AssessmentSetup />} />
                <Route path="/students" element={<StudentList />} />
                <Route path="/scans" element={<ScanUpload />} />
                <Route path="/scans/processing/:id" element={<ScanProcessing />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/gradebook" element={<Gradebook />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ScanProvider>
        </BrowserRouter>
      </SystemSettingsProvider>
    </AuthProvider>
  );
}

export default App;
