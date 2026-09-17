'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Users,
  Briefcase
} from 'lucide-react';
import { 
  createProfileAction, 
  updateProfileAction, 
  deleteProfileAction 
} from '@/app/actions';

interface ProfileItem {
  id: string;
  name: string;
  createdAt: Date | string;
}

export default function ProfileManagementClient({ initialProfiles }: { initialProfiles: ProfileItem[] }) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileItem[]>(initialProfiles);
  const [newProfileName, setNewProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal State
  const [editingProfile, setEditingProfile] = useState<ProfileItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await createProfileAction(newProfileName);
      setLoading(false);
      if (res.success && res.profile) {
        setProfiles([...profiles, res.profile].sort((a, b) => a.name.localeCompare(b.name)));
        setNewProfileName('');
        setSuccessMsg('Customer profile added successfully.');
        router.refresh();
      } else {
        setError(res.error || 'Failed to add profile.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Error adding profile.');
    }
  };

  const handleOpenEdit = (p: ProfileItem) => {
    setEditingProfile(p);
    setEditName(p.name);
    setEditError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editName.trim()) return;

    setEditLoading(true);
    setEditError('');

    try {
      const res = await updateProfileAction(editingProfile.id, editName);
      setEditLoading(false);
      if (res.success && res.profile) {
        setProfiles(
          profiles.map((item) => (item.id === editingProfile.id ? res.profile! : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingProfile(null);
        router.refresh();
      } else {
        setEditError(res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setEditLoading(false);
      setEditError(err.message || 'Error updating profile.');
    }
  };

  const handleDelete = async (p: ProfileItem) => {
    if (!confirm(`Are you sure you want to delete "${p.name}"?`)) return;

    try {
      const res = await deleteProfileAction(p.id);
      if (res.success) {
        setProfiles(profiles.filter((item) => item.id !== p.id));
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete profile.');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting profile.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Checklist Matrix Configuration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Customer Profiles Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure customer employment & tax profiles (Salaried, Self Employed, NRI, etc.). Automatically drives checklist requirements and applicant categorization.
          </p>
        </div>
      </div>

      {/* Add Profile Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-purple-500" /> Add New Customer Profile
        </h2>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="e.g. Salaried, Self Employed Professional, Doctor, NRI"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="flex-1 glass-input px-4 py-2.5 rounded-xl text-xs font-semibold"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all hover:scale-[1.01] disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Adding...' : 'Add Profile'}</span>
          </button>
        </form>
      </div>

      {/* Profiles Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" /> Active Profiles ({profiles.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Managed customer profiles in checklist & case intake
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4 font-bold">Profile Name</th>
                <th className="py-3 px-4 font-bold">System Identifier</th>
                <th className="py-3 px-4 font-bold">Created Date</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No customer profiles found. Add your first profile above.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Profile Name"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete Profile"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-purple-500" /> Edit Customer Profile Name
              </h3>
              <button
                onClick={() => setEditingProfile(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                  placeholder="e.g. Salaried"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
