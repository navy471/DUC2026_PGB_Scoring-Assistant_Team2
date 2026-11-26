import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BookOpen } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('teacher@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/login`, {
        email,
        password,
      });
      login(response.data.user, response.data.access_token);
      navigate('/');
    } catch (error: any) {
      if (error?.response?.status === 401) {
        alert('Login failed: អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Invalid email or password)');
      } else if (!error?.response) {
        alert(`មិនអាចទាក់ទងទៅ Backend Server បានឡើយ (${import.meta.env.VITE_API_URL || 'http://localhost:3000'})\nសូមប្រាកដថា Backend កំពុងដំណើរការ!`);
      } else {
        alert(error?.response?.data?.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md p-8 glass-panel animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 mt-2">Sign in to Scoring Assistant</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/50 backdrop-blur-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/50 backdrop-blur-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600 font-medium">
            មិនទាន់មានគណនីមែនទេ?{' '}
            <Link
              to="/register"
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline ml-1"
            >
              បង្កើតគណនីថ្មី (Create Account)
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500 mb-2.5 text-center">គណនីសម្រាប់សាកល្បងចូល (Quick Fill Test Accounts):</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@duc.edu.kh');
                setPassword('admin123');
              }}
              className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 font-bold transition-all text-left flex flex-col"
            >
              <span className="flex items-center gap-1 font-extrabold">👑 គណនី Admin</span>
              <span className="text-[10px] text-indigo-500 font-mono mt-0.5">admin@duc.edu.kh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('teacher@example.com');
                setPassword('password123');
              }}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-all text-left flex flex-col"
            >
              <span className="flex items-center gap-1 font-extrabold">👨‍🏫 គណនី Teacher</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">teacher@example.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
