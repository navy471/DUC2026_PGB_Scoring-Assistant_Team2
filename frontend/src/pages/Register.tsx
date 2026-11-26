import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, UserPlus, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក (Please enter your full name)');
      return;
    }

    if (!email.trim()) {
      setError('សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែល (Please enter your email)');
      return;
    }

    if (password.length < 6) {
      setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ (Password must be at least 6 characters)');
      return;
    }

    if (password !== confirmPassword) {
      setError('ពាក្យសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ (Passwords do not match)');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/register`,
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }
      );

      // Log user in directly upon successful registration
      login(response.data.user, response.data.access_token);
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(`អ៊ីមែល ${email} ត្រូវបានចុះឈ្មោះរួចហើយ! សូមប្រើអ៊ីមែលផ្សេង ឬចូលប្រើ (Email is already registered)`);
      } else {
        setError(err.response?.data?.message || 'ការចុះឈ្មោះមិនបានសម្រេច សូមព្យាយាមម្តងទៀត។');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-10 px-4">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md p-8 glass-panel animate-fade-in relative z-10 bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            បង្កើតគណនីថ្មី (Create Account)
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            ចុះឈ្មោះដើម្បីប្រើប្រាស់ប្រព័ន្ធស្គែន និងបញ្ចូលពិន្ទុស្វ័យប្រវត្តិ
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start space-x-2.5 text-red-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ឈ្មោះពេញ (Full Name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Sokha Chan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/70"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              អ៊ីមែល (Email Address) *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. sokha@duc.edu.kh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/70"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ពាក្យសម្ងាត់ (Password - យ៉ាងតិច ៦ ខ្ទង់) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/70 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              បញ្ជាក់ពាក្យសម្ងាត់ (Confirm Password) *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/70"
            />
          </div>

          {/* Role Notice */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center space-x-2 text-indigo-800 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>គណនីថ្មីរបស់អ្នកនឹងទទួលបានសិទ្ធិជា <strong>👨‍🏫 គ្រូបង្រៀន (Teacher)</strong> ដោយស្វ័យប្រវត្តិ។</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200 text-sm flex items-center justify-center space-x-2 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'កំពុងបង្កើតគណនី...' : 'ចុះឈ្មោះបង្កើតគណនី (Sign Up)'}</span>
          </button>
        </form>

        {/* Footer / Switch to Login */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 text-center">
          <p className="text-xs text-slate-600 font-medium">
            មានគណនីរួចហើយមែនទេ?{' '}
            <Link
              to="/login"
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline ml-1"
            >
              ចូលប្រើប្រាស់ (Sign In)
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

