'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateCrmBrandingAction, updateUserProfileAction } from '@/app/actions';
import { isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';
import {
  ShieldCheck,
  Building,
  Image,
  Upload,
  Link2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Save,
  User,
  Lock,
  Sparkles,
  Camera,
  Trash2,
} from 'lucide-react';

interface AdminSettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    teamName: string;
  };
  initialBranding: {
    crmName: string;
    crmTagline: string;
    crmLogoUrl: string;
  };
}

export default function AdminSettingsClient({
  user,
  initialBranding,
}: AdminSettingsClientProps) {
  const router = useRouter();

  // Branding state
  const [crmName, setCrmName] = useState(initialBranding.crmName);
  const [crmTagline, setCrmTagline] = useState(initialBranding.crmTagline);
  const [crmLogoUrl, setCrmLogoUrl] = useState(initialBranding.crmLogoUrl);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState('');
  const [brandingError, setBrandingError] = useState('');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Handle Logo File Upload (reads as data URL)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBrandingError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setBrandingError('Logo image size should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCrmLogoUrl(result);
        setBrandingError('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Avatar File Upload (reads as data URL)
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Avatar image size should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        setProfileError('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Branding Changes
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingMessage('');
    setBrandingError('');

    if (!crmName.trim()) {
      setBrandingError('CRM Name is required.');
      return;
    }

    setBrandingLoading(true);
    const res = await updateCrmBrandingAction({
      crmName,
      crmTagline,
      crmLogoUrl: crmLogoUrl || null,
    });
    setBrandingLoading(false);

    if (res.success) {
      setBrandingMessage('CRM Branding updated successfully!');

      // Notify AppShell of update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('crm-branding-updated', {
            detail: {
              branding: {
                crmName,
                crmTagline,
                crmLogoUrl: crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png',
              },
            },
          })
        );
      }
      router.refresh();
    } else {
      setBrandingError(res.error || 'Failed to update CRM branding.');
    }
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');

    if (!isValidName(name)) {
      setProfileError('Display Name must contain only alphabetic characters and spaces.');
      return;
    }

    setProfileLoading(true);
    const res = await updateUserProfileAction({
      name,
      password: password || undefined,
      avatarUrl: avatarUrl || null,
    });
    setProfileLoading(false);

    if (res.success) {
      setProfileMessage('Profile & Photo updated successfully!');
      setPassword('');

      // Notify AppShell of avatar update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('crm-branding-updated', {
            detail: {
              avatarUrl: avatarUrl || null,
            },
          })
        );
      }
      router.refresh();
    } else {
      setProfileError(res.error || 'Failed to update profile.');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. CRM Branding & Identity Settings */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                CRM Branding & Identity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update the CRM system name, tagline, and corporate logo shown on the sidebar and navigation
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Super Admin Only
          </span>
        </div>

        {brandingMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{brandingMessage}</span>
          </div>
        )}

        {brandingError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{brandingError}</span>
          </div>
        )}

        <form onSubmit={handleSaveBranding} className="space-y-5">
          {/* Logo Section with Live Preview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              CRM Brand Logo
            </label>

            <div className="flex flex-wrap items-center gap-4">
              {/* Preview Box */}
              <div className="w-16 h-16 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                <img
                  src={crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png'}
                  alt="CRM Logo Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://thenestguru.com/thenestgurulogo.png';
                  }}
                />
              </div>

              {/* Upload or URL Controls */}
              <div className="space-y-2 flex-1 min-w-[240px]">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Image
                  </button>

                  <button
                    type="button"
                    onClick={() => setCrmLogoUrl('https://thenestguru.com/thenestgurulogo.png')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Default
                  </button>
                </div>

                <div className="relative">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="Or paste direct image URL (https://...)"
                    value={crmLogoUrl}
                    onChange={(e) => setCrmLogoUrl(e.target.value)}
                    className="w-full glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CRM Name & Tagline Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CRM Name *
              </label>
              <input
                type="text"
                required
                value={crmName}
                onChange={(e) => setCrmName(e.target.value)}
                placeholder="e.g. TheNestGuru"
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Shown prominently in the sidebar header.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CRM Tagline / Subtitle
              </label>
              <input
                type="text"
                value={crmTagline}
                onChange={(e) => setCrmTagline(e.target.value)}
                placeholder="e.g. Loan Processing Desk"
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Subtitle displayed under the CRM name.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={brandingLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{brandingLoading ? 'Saving Branding...' : 'Save CRM Branding'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Super Admin Personal Profile & Photo */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Super Admin Profile & Photo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your personal profile picture, display name, and login credentials
              </p>
            </div>
          </div>
        </div>

        {profileMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileMessage}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar Photo Section with Preview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Profile Photo
            </label>

            <div className="flex flex-wrap items-center gap-4">
              {/* Circular Avatar Preview */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-white dark:border-slate-800 overflow-hidden shrink-0">
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

              {/* Upload Controls */}
              <div className="space-y-2 flex-1 min-w-[240px]">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Profile Photo
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Photo
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

          {/* Display Name, Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(sanitizeToAlphabetsOnly(e.target.value))}
                  className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Alphabets only.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs opacity-60 bg-slate-100 dark:bg-slate-900 cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Change Password (Leave blank to keep current)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{profileLoading ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
