import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, UserPlus, Trash2, Crown, RefreshCw, ArrowLeftRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AlertModal } from '../../components/ui/AlertModal';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  totalScans?: number;
  totalVerifications?: number;
  lastActive?: string;
}

export const AdminUsers = () => {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEACHER'
  });
  const [submittingUser, setSubmittingUser] = useState(false);

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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
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
      setAlertInfo({
        isOpen: true,
        type: 'error',
        title: 'បង្កើតគណនីមិនបានជោគជ័យ',
        message: err.response?.data?.message || 'Failed to create user'
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

  const totalTeachers = users.filter(u => u.role === 'TEACHER').length;
  const totalAdmins = users.filter(u => u.role === 'ADMIN').length;

  return (
    <div className="animate-slide-up max-w-6xl mx-auto pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              User Management (គ្រប់គ្រងអ្នកប្រើប្រាស់)
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            គ្រប់គ្រងគណនីគ្រូបង្រៀន និង Admin, មើលសកម្មភាពប្រើប្រាស់ និងកំណត់សិទ្ធិ
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Refresh users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 hover:-translate-y-0.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ បង្កើត Admin / Teacher ថ្មី</span>
          </button>
        </div>
      </div>

      {/* Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">អ្នកប្រើប្រាស់សរុប (Total Users)</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{users.length} នាក់</div>
          <div className="text-xs text-slate-500 mt-1">គណនីទាំងអស់ដែលមានសិទ្ធិចូលប្រើប្រព័ន្ធ</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">គ្រូបង្រៀន (Teachers)</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalTeachers} នាក់</div>
          <div className="text-xs text-slate-500 mt-1">សិទ្ធិស្គែន និងផ្ទៀងផ្ទាត់ពិន្ទុ</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">អ្នកគ្រប់គ្រង (Administrators)</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{totalAdmins} នាក់</div>
          <div className="text-xs text-slate-500 mt-1">សិទ្ធិគ្រប់គ្រងអ្នកប្រើ និងការកំណត់ប្រព័ន្ធ</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">បញ្ជីឈ្មោះអ្នកប្រើប្រាស់ និងសកម្មភាព (User Roster & Activity)</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {users.length} Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-5">ឈ្មោះ និង អ៊ីមែល (User)</th>
                <th className="py-3.5 px-4">សិទ្ធិ (Role)</th>
                <th className="py-3.5 px-4">កិច្ចការស្គែន (Scans)</th>
                <th className="py-3.5 px-4">ផ្ទៀងផ្ទាត់ពិន្ទុ (Verified)</th>
                <th className="py-3.5 px-4">សកម្មភាពចុងក្រោយ (Last Active)</th>
                <th className="py-3.5 px-5 text-right">សកម្មភាព (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isUserAdmin = u.role === 'ADMIN';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isUserAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {u.name}
                            {isSelf && (
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {isUserAdmin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          <Crown className="w-3.5 h-3.5 text-purple-600" /> Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          👨‍🏫 Teacher
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{u.totalScans || 0} batches</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{u.totalVerifications || 0} papers</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {u.lastActive
                            ? new Date(u.lastActive).toLocaleDateString('km-KH', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'មិនទាន់មាន'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
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

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                    ពុំមានទិន្នន័យគណនី (No users found)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  placeholder="e.g. Teacher Sokha"
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

