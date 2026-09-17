'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Lock, Mail, ShieldCheck, UserCheck, ArrowRight, CheckCircle2, Sun, Moon, Eye, EyeOff, AtSign } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid username/email or password');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const setDemoUser = (userType: 'admin' | 'agent') => {
    if (userType === 'admin') {
      setEmail('admin');
      setPassword('admin123');
    } else {
      setEmail('channel');
      setPassword('agent123');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Top Corner Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2.5 rounded-xl glass-panel text-amber-400 hover:text-amber-300 transition-all flex items-center gap-2 text-xs font-semibold"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        </button>
      </div>

      <div className="max-w-md w-full space-y-8 glass-panel p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-white dark:bg-slate-900">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-white p-2 items-center justify-center shadow-md border border-slate-200 mb-4 overflow-hidden shrink-0">
            <img
              src="https://thenestguru.com/thenestgurulogo.png"
              alt="TheNestGuru Official Logo"
              className="w-full h-full max-w-full max-h-full object-contain shrink-0"
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">TheNestGuru Loan Desk</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-Tenant Dynamic Checklist & Case Processing</p>
        </div>

        {/* Demo Account Quick Select */}
        <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Quick Login Presets</span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">Click to fill credentials</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDemoUser('admin')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-xs font-medium transition-all text-left"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <div>
                <div className="font-semibold leading-tight text-slate-900 dark:text-white">Super Admin</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Login: admin</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoUser('agent')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-xs font-medium transition-all text-left"
            >
              <UserCheck className="w-4 h-4 shrink-0 text-sky-600" />
              <div>
                <div className="font-semibold leading-tight text-slate-900 dark:text-white">Team Member</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Login: channel</div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Username or Email Address
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin or admin@thenestguru.com"
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input pl-9 pr-10 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-sky-500" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-center text-xs text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
            Extensible to Multi-Tenant SSO & Bank Integrations
          </p>
        </div>
      </div>
    </div>
  );
}
