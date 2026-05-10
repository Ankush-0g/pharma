import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Key, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.details || data.error || 'Login failed');
      }
    } catch (err) {
      setError('Service Unavailable: The server is not responding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl -ml-64 -mb-64" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-border-subtle overflow-hidden transition-colors">
          <div className="p-8 bg-brand-dark dark:bg-slate-950 text-white flex flex-col items-center gap-4 transition-colors">
             <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                <Pill className="w-7 h-7 text-white" />
             </div>
             <div className="text-center">
                <h1 className="text-2xl font-black tracking-tight uppercase">PharmaFlow <span className="text-blue-400">Pro</span></h1>
                <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-[0.3em] mt-1">Institutional Inventory Console</p>
             </div>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 p-5 rounded-2xl text-[11px] font-bold border border-rose-100 dark:border-rose-500/20 flex flex-col gap-2 shadow-xl shadow-rose-500/5"
              >
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 uppercase tracking-widest text-[9px] mb-1">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  Security Alert
                </div>
                <span className="leading-tight">{error}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Authorized ID (Email)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm placeholder:text-slate-500"
                    placeholder="name@pharmacy.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Access Passcode</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-12 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm placeholder:text-slate-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'START'}
            </button>

            <div className="pt-6 border-t border-border-subtle text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                 Secure Terminal Access<br />
                 Terminal ID: PRM-0081-XP
               </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
