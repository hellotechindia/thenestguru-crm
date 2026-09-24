'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCustomerTypeAction,
  updateCustomerTypeAction,
  deleteCustomerTypeAction,
} from '@/app/actions';
import {
  Users2,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  ShieldCheck,
  Building,
  User,
  ShieldAlert,
  Pencil,
} from 'lucide-react';

export interface CustomerTypeItem {
  id: string;
  name: string;
  description?: string | null;
}

interface Props {
  initialTypes: CustomerTypeItem[];
}

export default function CustomerTypeEntityManager({ initialTypes = [] }: Props) {
  const router = useRouter();
  const [types, setTypes] = useState<CustomerTypeItem[]>(initialTypes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Edit State
  const [editingType, setEditingType] = useState<CustomerTypeItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    const res = await createCustomerTypeAction({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setLoading(false);

    if (res.success && res.type) {
      setTypes([...types, res.type].sort((a, b) => a.name.localeCompare(b.name)));
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setSuccess('Customer Entity Type saved successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setError(res.error || 'Failed to save entity type.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !editName.trim()) return;

    setEditLoading(true);
    setEditError('');
    const res = await updateCustomerTypeAction(editingType.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
    setEditLoading(false);

    if (res.success && res.type) {
      setTypes(
        types
          .map((t) => (t.id === editingType.id ? res.type! : t))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingType(null);
      setSuccess('Customer Entity Type updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update entity type.');
    }
  };

  const handleDelete = async (id: string, entityName: string) => {
    if (!confirm(`Are you sure you want to delete entity "${entityName}"?`)) return;

    const res = await deleteCustomerTypeAction(id);
    if (res.success) {
      setTypes(types.filter((t) => t.id !== id));
      setSuccess('Entity deleted successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete entity');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-600" />
            Customer Entity Types & KYC Rules Master
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure applicant entities (Individual, Partnership, Pvt Ltd, HUF, etc.) dynamically linked to Case Intake & Checklist rules
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Entity Type
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Entity Types Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {types.map((t) => (
          <div
            key={t.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {t.name.toLowerCase().includes('individual') ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Building className="w-4 h-4" />
                  )}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingType(t);
                      setEditName(t.name);
                      setEditDescription(t.description || '');
                      setEditError('');
                    }}
                    className="p-1 rounded-lg hover:bg-sky-500/10 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
                    title="Edit Entity"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {types.length > 1 && (
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Delete Entity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3 leading-snug">
                {t.name}
              </h3>
              {t.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {t.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Active in Lead Intake
            </div>
          </div>
        ))}
      </div>

      {/* Add Entity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-600" />
                Add Customer Entity / Type
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trust / Society / AOP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Eligibility Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Requires Trust Deed, Registration certificate, and Trustee resolutions"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Entity Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entity Modal */}
      {editingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky-500" />
                Edit Customer Entity / Type
              </h3>
              <button
                onClick={() => setEditingType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Limited Liability Partnership (LLP)"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Eligibility Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Requires LLP agreement, registration certificate, and partner KYC"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {editLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
