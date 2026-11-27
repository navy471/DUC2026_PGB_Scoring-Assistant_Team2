import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  FileUp,
  AlertCircle,
  BookOpen,
  Bell,
  Users,
  Menu,
  X,
  Shield,
  Sliders,
  ArrowLeftRight,
  Eye,
  Crown,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export const DashboardLayout = () => {
  const { isAuthenticated, logout, user, token } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // View mode for Admin (allows Admin to preview Teacher workspace or stay in Admin Portal)
  const [viewMode, setViewMode] = useState<'admin' | 'teacher'>(
    user?.role === 'ADMIN' ? 'admin' : 'teacher'
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Sync viewMode if user role changes
    if (user?.role === 'ADMIN') {
      // Keep admin mode as default for admins unless toggled
    } else {
      setViewMode('teacher');
    }
  }, [user?.role]);

  const [pendingShareCount, setPendingShareCount] = useState<number>(0);
  const [latestShareSender, setLatestShareSender] = useState<string>('');

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const notifRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/reports/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Also fetch share requests
        let shareNotifs: any[] = [];
        try {
          const shareRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/shares`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const rec = shareRes.data?.receivedRequests || [];
          setPendingShareCount(rec.length);
          if (rec.length > 0) {
            setLatestShareSender(`${rec[0].sender_name} (${rec[0].sender_email})`);
            shareNotifs = rec.map((r: any) => ({
              id: `share_${r.id}`,
              title: '📩 សំណើចែករំលែកទិន្នន័យ (Data Share)',
              message: `${r.sender_name} (${r.sender_email}) បានផ្ញើសំណើចែករំលែកទិន្នន័យមកកាន់អ្នក!`,
              type: 'info'
            }));
          } else {
            setLatestShareSender('');
          }
        } catch (e) {
          // ignore shares error if any
        }

        setNotifications([...shareNotifs, ...(notifRes.data || [])]);
      } catch (e) {
        // Silently catch
      }
    };
    if (token) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Navigation items based on role and view mode
  const adminNavItems = [
    { name: 'Admin Overview', path: '/admin', icon: Shield },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Feature Controls', path: '/admin/features', icon: Sliders },
    { name: 'School Gradebook', path: '/gradebook', icon: BookOpen },
    { name: 'System Settings', path: '/settings', icon: SettingsIcon },
  ];

  const teacherNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Assessments', path: '/assessments', icon: FileText },
    { name: 'Scan Upload', path: '/scans', icon: FileUp },
    { name: 'Gradebook', path: '/gradebook', icon: BookOpen },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const currentNavItems = (user?.role === 'ADMIN' && viewMode === 'admin')
    ? adminNavItems
    : teacherNavItems;

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] flex flex-col md:flex-row text-slate-800 print:bg-white print:h-auto print:block relative">
      {/* Mobile Top Header */}
      <header className="md:hidden h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between z-30 shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <img src="/scoring-assistant-icon.webp?v=2" alt="" className="w-8 h-8 object-cover rounded-lg" />
            <span className="font-extrabold text-slate-800 tracking-tight text-base">
              {user?.role === 'ADMIN' && viewMode === 'admin' ? 'Admin Portal' : 'Scoring Assistant'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ThemeToggle className="border-transparent bg-transparent px-2 text-slate-500 shadow-none hover:bg-slate-100" />
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-indigo-600 transition-all rounded-xl hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && notifications[0].type !== 'success' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm text-white font-bold text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white md:bg-white/80 md:backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-2xl md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:z-20 print:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 md:h-20 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center">
            <img src="/scoring-assistant-icon.webp?v=2" alt="" className="w-10 h-10 object-cover rounded-xl mr-3 shrink-0" />
            <div>
              <span className="text-base font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight whitespace-nowrap block">
                {user?.role === 'ADMIN' && viewMode === 'admin' ? 'Admin Portal' : 'Scoring Assistant'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                {user?.role === 'ADMIN' && viewMode === 'admin' ? 'System Administration' : 'Teacher Workspace'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Mode Switcher Pill */}
        {user?.role === 'ADMIN' && (
          <div className="mx-4 mt-3.5 p-2 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 pl-1">
              {viewMode === 'admin' ? (
                <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-purple-600" /> Admin Mode
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" /> Teacher View
                </span>
              )}
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'admin' ? 'teacher' : 'admin')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-xs transition-all flex items-center gap-1.5"
              title="Toggle between Admin Portal and Teacher Workspace"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>{viewMode === 'admin' ? 'មើលជាគ្រូ' : 'ទៅ Admin'}</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 md:py-5 space-y-1.5 overflow-y-auto">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40">
          <ThemeToggle className="mb-3 w-full" showLabel />
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                <span className="text-white font-bold">{user?.name?.charAt(0) || 'U'}</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 leading-tight truncate w-28">{user?.name || 'User'}</p>
                <div className="mt-0.5">
                  {user?.role === 'ADMIN' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                      👑 Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      👨‍🏫 Teacher
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-white border border-transparent hover:border-slate-200 shadow-sm"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && notifications[0].type !== 'success' && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute bottom-full left-0 mb-3 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-slide-up">
                  <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      ✕
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 font-medium">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer mb-1 last:mb-0">
                          <p className={`text-xs font-semibold ${n.type === 'error' ? 'text-red-600' : n.type === 'warning' ? 'text-amber-600' : n.type === 'info' ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center space-x-2 px-4 py-2 w-full rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-bold group shadow-xs text-xs"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-[calc(100vh-4rem)] md:h-screen overflow-hidden print:h-auto print:overflow-visible print:block bg-[#f8fafc]">
        {/* Pending Share Request Alert Banner */}
        {pendingShareCount > 0 && location.pathname !== '/settings' && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md shrink-0 z-20 animate-fade-in">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping shrink-0" />
              <span>📩 លោកគ្រូ/អ្នកគ្រូ <strong>{latestShareSender}</strong> បានផ្ញើសំណើចែករំលែកទិន្នន័យមកកាន់អ្នក!</span>
            </div>
            <Link
              to="/settings"
              className="text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-lg shadow-xs transition-transform hover:scale-105 self-end sm:self-auto shrink-0"
            >
              ពិនិត្យមើល & យល់ព្រម (Review) →
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative print:p-0 print:overflow-visible">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
