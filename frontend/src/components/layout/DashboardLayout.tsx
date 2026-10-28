import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FileText, Settings as SettingsIcon, LogOut, FileUp, AlertCircle, BookOpen, Printer, Bell, Users, CheckSquare, Menu, X } from 'lucide-react';

export const DashboardLayout = () => {
  const { isAuthenticated, logout, user, token } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/reports/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (e) {
        console.error('Failed to fetch notifications');
      }
    };
    if (token) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 10000); // poll every 10s
      return () => clearInterval(interval);
    }
  }, [token]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Assessments', path: '/assessments', icon: FileText },
    { name: 'Scan Upload', path: '/scans', icon: FileUp },
    { name: 'Verification', path: '/verification', icon: AlertCircle },
    { name: 'Gradebook', path: '/gradebook', icon: BookOpen },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] flex flex-col md:flex-row text-slate-800 print:bg-white print:h-auto print:block relative">
      {/* Mobile Top Header (Visible only on mobile/tablet) */}
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
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-extrabold text-slate-800 tracking-tight text-base">Scoring Assistant</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
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
            {user?.name?.charAt(0) || 'T'}
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

      {/* Sidebar (Drawer on mobile, fixed left bar on md+) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white md:bg-white/80 md:backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-2xl md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:z-20 print:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 md:h-20 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-600/30 shrink-0">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight whitespace-nowrap">Scoring Assistant</span>
          </div>
          {/* Close button on mobile */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 md:py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                <span className="text-white font-bold">{user?.name?.charAt(0) || 'T'}</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 leading-tight truncate w-28">{user?.name || 'Teacher'}</p>
                <p className="text-xs text-slate-500 font-medium truncate">Administrator</p>
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
                    <h3 className="font-bold text-slate-800">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <LogOut className="w-4 h-4 rotate-90" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500 font-medium">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer mb-1 last:mb-0">
                          <p className={`text-sm font-semibold ${n.type === 'error' ? 'text-red-600' : n.type === 'warning' ? 'text-amber-600' : n.type === 'info' ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{n.message}</p>
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
            className="flex items-center justify-center space-x-2 px-4 py-2.5 w-full rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-bold group shadow-sm"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-[calc(100vh-4rem)] md:h-screen overflow-hidden print:h-auto print:overflow-visible print:block bg-[#f8fafc]">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative print:p-0 print:overflow-visible">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
