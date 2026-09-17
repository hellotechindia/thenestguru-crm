'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateUserProfileAction } from '@/app/actions';
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Save,
  Building,
  Camera,
  Upload,
  Trash2,
  Link2,
  Sparkles,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';

interface ProfileEditProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    teamName: string;
  };
}

export default function ProfileEditClient({ user }: ProfileEditProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!isValidName(name)) {
      setError('Display Name must contain only alphabetic characters and spaces (numbers and special characters are not allowed).');
      return;
    }

    setLoading(true);
    const res = await updateUserProfileAction({
      name,
      password: password || undefined,
      avatarUrl: avatarUrl || null,
    });
    setLoading(false);

    if (res.success) {
      setMessage('Profile updated successfully!');
      setPassword('');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('crm-branding-updated', {
            detail: { avatarUrl: avatarUrl || null },
          })
        );
      }
      router.refresh();
    } else {
      setError(res.error || 'Failed to update profile.');
    }
  };

  return (
    <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
      {/* Role & Team Card */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            {user.role === 'SUPER_ADMIN' ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <UserCheck className="w-6 h-6 text-sky-400" />
            )}
          </div>
          <div>
            <div className="font-bold text-white text-base">{user.name}</div>
            <div className="text-xs text-slate-400">{user.email}</div>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              user.role === 'SUPER_ADMIN'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
            }`}
          >
            {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Team Member'}
          </span>
          <div className="text-[10px] text-slate-400 font-medium mt-1 flex items-center justify-end gap-1">
            <Building className="w-3 h-3 text-indigo-400" /> {user.teamName}
          </div>
        </div>
      </div>

      {/* Super Admin Branding Shortcut */}
      {user.role === 'SUPER_ADMIN' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Looking for CRM Branding & Logo?</div>
              <div className="text-[11px] text-slate-400">Edit CRM name, corporate logo, and system tagline</div>
            </div>
          </div>
          <Link
            href="/admin/settings"
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all shrink-0"
          >
            CRM Settings &rarr;
          </Link>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Photo Section */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <label className="block text-xs font-bold text-slate-300">Profile Photo</label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-slate-700 overflow-hidden shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <span>{name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="space-y-2 flex-1 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="profile-avatar-file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="profile-avatar-file"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 font-semibold text-xs transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="Or paste direct image URL (https://...)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(sanitizeToAlphabetsOnly(e.target.value))}
              className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address (Read-only)</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm opacity-60 cursor-not-allowed bg-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Change Password (Leave blank to keep current)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="password"
              placeholder="New password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="py-3 px-5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-semibold transition-all"
          >
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}
