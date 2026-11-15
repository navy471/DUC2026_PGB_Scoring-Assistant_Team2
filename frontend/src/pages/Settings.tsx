import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Save, Sliders, CheckCircle2, Shield, UserPlus, Trash2, Crown, Users, 
  AlertCircle, RefreshCw, ArrowLeftRight, Share2, Mail, Send, Check, X, 
  Link2, Unlink, Clock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface ShareOverview {
  receivedRequests: Array<{
    id: string;
    created_at: string;
    sender_id: string;
    sender_name: string;
    sender_email: string;
    status: string;
  }>;
  sentRequests: Array<{
    id: string;
    created_at: string;
    receiver_id: string;
    receiver_name: string;
    receiver_email: string;
    status: string;
  }>;
  activeCollaborators: Array<{
    share_id: string;
    connected_at: string;
    partner_id: string;
    partner_name: string;
    partner_email: string;
    partner_role: string;
    role_in_request: string;
  }>;
}

export const Settings = () => {
  const { user: currentUser, token } = useAuth();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    gradingScale: 'percentage', // percentage, letter
    confidenceThreshold: 80,
    autoApprove: false,
    exportFormat: 'excel'
  });

  // User Management State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEACHER'
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  // Peer Data Sharing State
  const [shares, setShares] = useState<ShareOverview | null>(null);
  const [loadingShares, setLoadingShares] = useState(false);
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [sendingShare, setSendingShare] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{
    isOpen: boolean;
    shareId: string;
    partnerName: string;
    partnerEmail: string;
  }>({
    isOpen: false,
    shareId: '',
    partnerName: '',
    partnerEmail: ''
  });

  // Modals state
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; userId: string; userEmail: string }>({
    isOpen: false,
    userId: '',
    userEmail: ''
  });
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean; type: 'error' | 'success'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const savedSettings = localStorage.getItem('sg_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error(e);
      }
    }
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
    fetchShares();
  }, [token, currentUser?.role]);

  const fetchUsers = async () => {
    if (!token || currentUser?.role !== 'ADMIN') return;
    setLoadingUsers(true);
    try {
      const res = await axios.get(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('sg_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'ព័ត៌មានមិនគ្រប់គ្រាន់ (Incomplete Form)',
        message: 'សូមបំពេញឈ្មោះ អ៊ីមែល និងពាក្យសម្ងាត់ឱ្យបានត្រឹមត្រូវ។'
      });
      return;
    }

    setSubmittingUser(true);
    try {
      await axios.post(
        `${apiUrl}/users`,
        {
          name: newUserData.name.trim(),
          email: newUserData.email.trim().toLowerCase(),
          password: newUserData.password.trim(),
          role: newUserData.role
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowAddModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'TEACHER' });
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'បង្កើតគណនីជោគជ័យ! (Account Created)',
        message: `គណនី ${newUserData.role === 'ADMIN' ? '👑 Admin' : '👨‍🏫 Teacher'} ត្រូវបានបង្កើតដោយជោគជ័យ។`
      });
      fetchUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'មិនអាចបង្កើតគណនីបានទេ (Failed to create account)';
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'បង្កើតគណនីមិនបានជោគជ័យ',
        message: errorMsg
      });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleRole = async (targetUser: SystemUser) => {
    const newRole = targetUser.role === 'ADMIN' ? 'TEACHER' : 'ADMIN';
    try {
      await axios.patch(
        `${apiUrl}/users/${targetUser.id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'កែប្រែសិទ្ធិជោគជ័យ (Role Updated)',
        message: `គណនី ${targetUser.email} ត្រូវបានផ្លាស់ប្តូរទៅជា ${newRole === 'ADMIN' ? '👑 Administrator' : '👨‍🏫 Teacher'}។`
      });
      fetchUsers();
    } catch (err: any) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'បរាជ័យក្នុងការផ្លាស់ប្តូរ Role',
        message: err.response?.data?.message || 'Failed to update user role'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete.userId) return;
    try {
      await axios.delete(`${apiUrl}/users/${confirmDelete.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'លុបគណនីជោគជ័យ (User Deleted)',
        message: `គណនី ${confirmDelete.userEmail} ត្រូវបានលុបចេញពីប្រព័ន្ធ។`
      });
      fetchUsers();
    } catch (err: any) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'មិនអាចលុបគណនីបានទេ',
        message: err.response?.data?.message || 'Failed to delete user'
      });
    } finally {
      setConfirmDelete({ isOpen: false, userId: '', userEmail: '' });
    }
  };

  const fetchShares = async () => {
    if (!token) return;
    setLoadingShares(true);
    try {
      const res = await axios.get(`${apiUrl}/shares`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShares(res.data);
    } catch (err: any) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleSendShareRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmailInput.trim()) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'សូមបញ្ចូលអ៊ីមែលដៃគូ (Email Required)',
        message: 'សូមបញ្ចូល Gmail / Email របស់លោកគ្រូ/អ្នកគ្រូដែលអ្នកចង់ចែករំលែកទិន្នន័យជាមួយ។'
      });
      return;
    }

    setSendingShare(true);
    try {
      const res = await axios.post(
        `${apiUrl}/shares/request`,
        { email: shareEmailInput.trim().toLowerCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShareEmailInput('');
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'ផ្ញើសំណើជោគជ័យ (Share Request Sent)',
        message: res.data.message || 'សំណើចែករំលែកទិន្នន័យត្រូវបានផ្ញើរួចរាល់។'
      });
      fetchShares();
    } catch (err: any) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'មិនអាចផ្ញើសំណើបានទេ (Failed to Send Request)',
        message: err.response?.data?.message || 'Failed to send share request'
      });
    } finally {
      setSendingShare(false);
    }
  };

  const handleAcceptShare = async (requestId: string) => {
    try {
      const res = await axios.patch(
        `${apiUrl}/shares/${requestId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'បានយល់ព្រមចែករំលែក (Collaboration Accepted)',
        message: res.data.message || 'អ្នកនិងដៃគូអាចមើល និងប្រើប្រាស់ទិន្នន័យរួមគ្នាបានចាប់ពីពេលនេះតទៅ!'
      });
      fetchShares();
      // Dispatch event to inform other pages or context to reload
      window.dispatchEvent(new Event('sg_shares_updated'));
    } catch (err: any) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'បរាជ័យ (Failed)',
        message: err.response?.data?.message || 'Failed to accept share request'
      });
    }
  };

  const handleRejectShare = async (requestId: string) => {
    try {
      await axios.patch(
        `${apiUrl}/shares/${requestId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchShares();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRevokeShare = async () => {
    if (!confirmRevoke.shareId) return;
    try {
      await axios.delete(`${apiUrl}/shares/${confirmRevoke.shareId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlertInfo({
        isOpen: true,
        type: 'success',
        title: 'បានផ្តាច់ការចែករំលែក (Disconnected)',
        message: `ការចែករំលែកទិន្នន័យជាមួយ ${confirmRevoke.partnerEmail} ត្រូវបានបញ្ចប់។ អ្នកទាំងពីរនឹងឃើញតែទិន្នន័យផ្ទាល់ខ្លួនរៀងៗខ្លួន។`
      });
      fetchShares();
      window.dispatchEvent(new Event('sg_shares_updated'));
    } catch (err: any) {
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'បរាជ័យ (Failed)',
        message: err.response?.data?.message || 'Failed to disconnect share'
      });
    } finally {
      setConfirmRevoke({ isOpen: false, shareId: '', partnerName: '', partnerEmail: '' });
    }
  };

  const handleCancelSentRequest = async (requestId: string) => {
    try {
      await axios.delete(`${apiUrl}/shares/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchShares();
    } catch (err: any) {
      console.error(err);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="animate-slide-up max-w-5xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Settings {isAdmin ? '& Accounts' : ''}</h1>
          <p className="text-slate-500 mt-1">
            {isAdmin 
              ? 'គ្រប់គ្រងការកំណត់ប្រព័ន្ធ ពិន្ទុ និងគណនីអ្នកប្រើប្រាស់ (Admin & Teacher)' 
              : 'គ្រប់គ្រងការចែករំលែកទិន្នន័យ និងការកំណត់ប្រព័ន្ធស្គែនពិន្ទុ'}
          </p>
        </div>

        {/* Current User Badge */}
        <div className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser?.name}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{currentUser?.email}</div>
          </div>
          <div className="ml-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Crown className="w-3 h-3 text-indigo-600" /> Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                👨‍🏫 Teacher
              </span>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1: User & Admin Management (Only visible to Administrator) */}
      {isAdmin && (
        <div className="glass-panel p-6 sm:p-8 border border-slate-200 shadow-sm rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">ការគ្រប់គ្រងគណនី Admin & គ្រូបង្រៀន (User Management)</h2>
                <p className="text-xs text-slate-500 mt-0.5">បង្កើតគណនីថ្មី, កំណត់សិទ្ធិជា Administrator ឬ Teacher និងគ្រប់គ្រងគណនី</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                title="Refresh users"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 hover:-translate-y-0.5 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ បង្កើត Admin / Teacher ថ្មី</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-4">ឈ្មោះ និង អ៊ីមែល (User)</th>
                  <th className="py-3.5 px-4">សិទ្ធិ (Role)</th>
                  <th className="py-3.5 px-4">កាលបរិច្ឆេទបង្កើត</th>
                  <th className="py-3.5 px-4 text-right">សកម្មភាព (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isUserAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isUserAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border border-slate-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            <Crown className="w-3.5 h-3.5 text-purple-600" /> Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            👨‍🏫 Teacher
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString('km-KH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Toggle Role Button */}
                          <button
                            onClick={() => handleToggleRole(u)}
                            className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                            title={isUserAdmin ? 'Switch role to Teacher' : 'Promote to Admin'}
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>{isUserAdmin ? 'ដាក់ជា Teacher' : 'តម្លើងជា Admin'}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setConfirmDelete({ isOpen: true, userId: u.id, userEmail: u.email })}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                : 'border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200'
                            }`}
                            title={isSelf ? 'Cannot delete current account' : 'Delete user'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && !loadingUsers && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                      ពុំមានទិន្នន័យគណនី (No users found)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: Peer Data Sharing & Collaboration */}
      <div className="glass-panel p-6 sm:p-8 border border-slate-200 shadow-sm rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-2xl">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">ការចែករំលែកទិន្នន័យរវាងគ្រូ (Peer Data Sharing & Collaboration)</h2>
                {shares?.activeCollaborators && shares.activeCollaborators.length > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {shares.activeCollaborators.length} ដៃគូសកម្ម
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ស្នើសុំចែករំលែកទិន្នន័យសិស្ស បញ្ជីពិន្ទុ និងការស្គែនជាមួយលោកគ្រូ/អ្នកគ្រូដទៃទៀតតាមរយៈ Gmail/Email
              </p>
            </div>
          </div>

          <button
            onClick={fetchShares}
            disabled={loadingShares}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors self-end sm:self-auto"
            title="Refresh sharing status"
          >
            <RefreshCw className={`w-4 h-4 ${loadingShares ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Send Share Request Form */}
        <form onSubmit={handleSendShareRequest} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            ✉️ ផ្ញើសំណើចែករំលែកទិន្នន័យទៅកាន់គ្រូដទៃ (Send Request via Email)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                placeholder="បញ្ចូល Gmail / Email របស់ដៃគូ (ឧ. panha@duc.edu.kh)..."
                value={shareEmailInput}
                onChange={(e) => setShareEmailInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={sendingShare || !shareEmailInput.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{sendingShare ? 'កំពុងផ្ញើ...' : 'ផ្ញើសំណើ (Send Request)'}</span>
            </button>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start space-x-2 text-blue-900 text-xs">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>របៀបដំណើរការ៖</strong> បញ្ចូល Email របស់គ្រូដែលបានចុះឈ្មោះក្នុងប្រព័ន្ធ។ នៅពេលភាគីម្ខាងទៀតចុច <strong>"យល់ព្រម (Accept)"</strong> អ្នកទាំងពីរនឹងអាចមើល ស្គែន និងគ្រប់គ្រងទិន្នន័យរួមគ្នាបានភ្លាមៗ! អ្នកទាំងពីរក៏អាចចុចផ្តាច់ការចែករំលែកវិញបានគ្រប់ពេល។
            </div>
          </div>
        </form>

        {/* Incoming Requests (Received) */}
        {shares?.receivedRequests && shares.receivedRequests.length > 0 && (
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-sm font-bold text-amber-900">
                  🔔 សំណើបានទទួល - កំពុងរង់ចាំអ្នកយល់ព្រម ({shares.receivedRequests.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                Action Required
              </span>
            </div>

            <div className="space-y-2.5">
              {shares.receivedRequests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm shadow-xs">
                      {req.sender_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {req.sender_name}
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.2 rounded-md">
                          ចង់ចែករំលែកទិន្នន័យជាមួយអ្នក
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{req.sender_email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        បានផ្ញើកាលពី: {new Date(req.created_at).toLocaleString('km-KH')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleAcceptShare(req.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:-translate-y-0.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>យល់ព្រម (Accept)</span>
                    </button>
                    <button
                      onClick={() => handleRejectShare(req.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-semibold rounded-xl transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>បដិសេធ (Decline)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Collaborators */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span>ដៃគូដែលកំពុងចែករំលែកទិន្នន័យ (Active Collaborators)</span>
          </h3>

          {shares?.activeCollaborators && shares.activeCollaborators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shares.activeCollaborators.map(c => (
                <div key={c.share_id} className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {c.partner_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        {c.partner_name}
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Active Connection" />
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{c.partner_email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ភ្ជាប់តាំងពី: {new Date(c.connected_at).toLocaleDateString('km-KH')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmRevoke({
                      isOpen: true,
                      shareId: c.share_id,
                      partnerName: c.partner_name,
                      partnerEmail: c.partner_email
                    })}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition-colors"
                    title="ផ្តាច់ការចែករំលែក (Disconnect / Revoke)"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>ផ្តាច់</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
              ពុំទាន់មានដៃគូចែករំលែកទិន្នន័យនៅឡើយទេ។ សូមបញ្ចូល Gmail ដៃគូនៅខាងលើដើម្បីចាប់ផ្តើមចែករំលែក!
            </div>
          )}
        </div>

        {/* Sent Pending Requests */}
        {shares?.sentRequests && shares.sentRequests.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>សំណើដែលអ្នកបានផ្ញើ - កំពុងរង់ចាំដៃគូយល់ព្រម ({shares.sentRequests.length})</span>
            </h3>

            <div className="space-y-2">
              {shares.sentRequests.map(sent => (
                <div key={sent.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px]">
                      ⏳ កំពុងរង់ចាំ (Pending)
                    </span>
                    <span className="font-bold text-slate-700">{sent.receiver_name}</span>
                    <span className="text-slate-400 font-mono">({sent.receiver_email})</span>
                  </div>
                  <button
                    onClick={() => handleCancelSentRequest(sent.id)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-semibold hover:underline"
                  >
                    បោះបង់សំណើ (Cancel)
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: AI & OCR Recognition */}
      <div className="glass-panel p-6 sm:p-8 border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">AI / OCR Recognition Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Confidence Threshold ({settings.confidenceThreshold}%)
            </label>
            <p className="text-xs text-slate-500 mb-4">
              កម្រិតទំនុកចិត្ត AI ទាបជាងនេះ នឹងត្រូវសម្គាល់ជា "Low Confidence" ដើម្បីឱ្យគ្រូត្រួតពិនិត្យដោយផ្ទាល់។
            </p>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.confidenceThreshold}
              onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
              <span>50% (Loose)</span>
              <span>100% (Strict)</span>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={settings.autoApprove}
                onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-700">Auto-Approve High Confidence</span>
            </label>
            <p className="text-xs text-slate-500 mt-2 ml-8">
              អនុម័តពិន្ទុដោយស្វ័យប្រវត្តិចូលទៅកាន់ Gradebook ប្រសិនបើ AI Confidence លើស 95% និង Validation ត្រឹមត្រូវ។
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Grading & Reports */}
      <div className="glass-panel p-6 sm:p-8 border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Grading & Reports Format</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Score Display Format</label>
            <select
              value={settings.gradingScale}
              onChange={(e) => setSettings({ ...settings, gradingScale: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            >
              <option value="percentage">Percentage (e.g. 85%)</option>
              <option value="raw">Raw Score (e.g. 17/20)</option>
              <option value="letter">Letter Grade (A, B, C, D, F)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Default Export Format</label>
            <select
              value={settings.exportFormat}
              onChange={(e) => setSettings({ ...settings, exportFormat: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            >
              <option value="excel">Microsoft Excel (.xlsx)</option>
              <option value="csv">Comma Separated Values (.csv)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="flex items-center justify-end space-x-4">
        {saved && (
          <span className="text-emerald-600 font-medium animate-fade-in flex items-center text-sm">
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> រក្សាទុកជោគជ័យ (Settings Saved)
          </span>
        )}
        <button
          onClick={handleSaveSettings}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-0.5 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes (រក្សាទុកការកំណត់)</span>
        </button>
      </div>

      {/* Modal: Add User / Admin */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up relative">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">បង្កើតគណនីថ្មី (Create Account)</h3>
                  <p className="text-xs text-slate-500">បន្ថែម Admin ឬ គ្រូបង្រៀនចូលក្នុងប្រព័ន្ធ</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ឈ្មោះពេញ (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sokha Chan"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  អ៊ីមែល (Email Address) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sokha@duc.edu.kh"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ពាក្យសម្ងាត់ (Password) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  សិទ្ធិប្រើប្រាស់ (Account Role) *
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="TEACHER">👨‍🏫 Teacher (គ្រូបង្រៀន - ស្គែន និងបញ្ចូលពិន្ទុ)</option>
                  <option value="ADMIN">👑 Administrator (Admin - សិទ្ធិគ្រប់គ្រងពេញលេញ)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition-all hover:-translate-y-0.5"
                >
                  {submittingUser ? 'កំពុងបង្កើត...' : 'បង្កើតគណនី (Create)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="បញ្ជាក់ការលុបគណនី (Delete User)"
        message={`តើអ្នកពិតជាចង់លុបគណនី "${confirmDelete.userEmail}" ចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`}
        confirmText="លុបគណនី (Delete)"
        isDestructive={true}
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirmDelete({ isOpen: false, userId: '', userEmail: '' })}
      />

      {/* Confirm Revoke Share Modal */}
      <ConfirmModal
        isOpen={confirmRevoke.isOpen}
        title="បញ្ជាក់ការផ្តាច់ការចែករំលែកទិន្នន័យ (Revoke Share)"
        message={`តើអ្នកពិតជាចង់ផ្តាច់ការចែករំលែកទិន្នន័យជាមួយ "${confirmRevoke.partnerName}" (${confirmRevoke.partnerEmail}) មែនទេ? បន្ទាប់ពីផ្តាច់ អ្នកទាំងពីរនឹងឃើញតែទិន្នន័យផ្ទាល់ខ្លួនរៀងៗខ្លួន។`}
        confirmText="ផ្តាច់ការចែករំលែក (Disconnect)"
        isDestructive={true}
        onConfirm={handleRevokeShare}
        onCancel={() => setConfirmRevoke({ isOpen: false, shareId: '', partnerName: '', partnerEmail: '' })}
      />

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
