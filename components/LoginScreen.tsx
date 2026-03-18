
import React, { useState } from 'react';
import { Lock, User, LogIn, Database, Zap, Chrome } from 'lucide-react';
import { login } from '../services/authService';
import { UserAccount } from '../types';
import { db, DEFAULT_ADMIN } from '../services/db';
import { getSupabase, isSupabaseConfigured } from '../supabase';

interface Props {
  onLoginSuccess: (user: UserAccount) => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        const user = await login(username, password);
        if (user) onLoginSuccess(user);
        else setError('Username atau password salah.');
      } else {
        if (!username.trim() || !password.trim()) {
          setError('Username dan password wajib diisi.');
          return;
        }
        const ok = await db.users.register({ username, password });
        if (ok) {
          setSuccess('Registrasi berhasil! Silakan login.');
          setActiveTab('login');
          setPassword('');
        } else {
          setError('Username sudah digunakan atau terjadi kesalahan.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAccess = () => {
    onLoginSuccess(DEFAULT_ADMIN);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#F3E8FF] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
             <Database className="w-10 h-10 text-[#7C3AED]" />
          </div>
          <h1 className="text-3xl font-black text-[#4C1D95] uppercase tracking-tight mb-1">TCM WuXing Pro</h1>
          <p className="text-[#A78BFA] text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Clinical Decision Support System</p>
        </div>

        <div className="bg-[#F9F5FF] p-1.5 rounded-2xl flex mb-8">
          <button 
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'login' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-[#A78BFA] hover:text-[#7C3AED]'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'register' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-[#A78BFA] hover:text-[#7C3AED]'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C4B5FD]" />
            <input 
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white border border-[#EDE9FE] rounded-2xl py-5 pl-14 pr-5 text-[#4C1D95] placeholder-[#C4B5FD] focus:border-[#7C3AED] outline-none transition-all shadow-sm"
              placeholder="Username Klinik"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C4B5FD]" />
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-[#EDE9FE] rounded-2xl py-5 pl-14 pr-5 text-[#4C1D95] placeholder-[#C4B5FD] focus:border-[#7C3AED] outline-none transition-all shadow-sm"
              placeholder="Password"
              required
            />
          </div>
          {error && <p className="text-rose-500 text-[10px] font-bold text-center uppercase tracking-wider">{error}</p>}
          {success && <p className="text-emerald-500 text-[10px] font-bold text-center uppercase tracking-wider">{success}</p>}
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#7C3AED] text-white font-black py-5 rounded-2xl shadow-xl shadow-purple-200 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-50"
          >
             {isLoading ? 'Processing...' : activeTab === 'login' ? 'Login Klinik' : 'Daftar Akun'}
          </button>
        </form>

        <div className="pt-8 space-y-6">
           <div className="space-y-3">
             <p className="text-[9px] text-center font-black text-[#A78BFA] uppercase tracking-widest">
               Info: Gunakan akun klinik Anda untuk mengakses data pasien
             </p>
             <p className="text-[9px] text-center font-black text-[#A78BFA] uppercase tracking-widest">
               dan fitur diagnosa profesional Enterprise.
             </p>
           </div>
           
           <div className="flex justify-center">
             <button 
               onClick={handleQuickAccess}
               className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:underline"
             >
               Quick Access (Demo Mode)
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
