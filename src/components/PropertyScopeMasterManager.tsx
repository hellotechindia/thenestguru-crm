'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPropertyScopeAction,
  updatePropertyScopeAction,
  deletePropertyScopeAction,
} from '@/app/actions';
import {
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  ShieldAlert,
  Pencil,
  Search,
  FileText,
  Sparkles,
  Layers,
} from 'lucide-react';

export interface PropertyScopeItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface Props {
  initialScopes: PropertyScopeItem[];
}

export default function PropertyScopeMasterManager({ initialScopes = [] }: Props) {
  const router = useRouter();
  const [scopes, setScopes] = useState<PropertyScopeItem[]>(initialScopes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingId(null);
    setError('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (scope: PropertyScopeItem) => {
    setName(scope.name);
    setDescription(scope.description || '');
    setEditingId(scope.id);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a valid property scope name.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        const res = await updatePropertyScopeAction(editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
        });

        if (!res.success) {
          setError(res.error || 'Failed to update property scope.');
          setLoading(false);
          return;
        }

        setScopes((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, name: name.trim(), description: description.trim() || null } : s))
        );
        setSuccess(`Property scope "${name}" updated successfully!`);
      } else {
        const res = await createPropertyScopeAction({
          name: name.trim(),
          description: description.trim() || undefined,
        });

        if (!res.success) {
          setError(res.error || 'Failed to create property scope.');
          setLoading(false);
          return;
        }

        if (res.scope) {
          setScopes((prev) => [...prev, res.scope as PropertyScopeItem].sort((a, b) => a.name.localeCompare(b.name)));
        }
        setSuccess(`Property scope "${name}" created successfully!`);
      }

      setIsModalOpen(false);
      resetForm();
      router.refresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scope: PropertyScopeItem) => {
    if (scopes.length <= 1) {
      alert('Cannot delete the last remaining property scope. The system requires at least one.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete property scope "${scope.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await deletePropertyScopeAction(scope.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete property scope.');
        return;
      }

      setScopes((prev) => prev.filter((s) => s.id !== scope.id));
      setSuccess(`Property scope "${scope.name}" removed successfully.`);
      router.refresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error deleting property scope.');
    } finally {
      setLoading(false);
    }
  };

  const filteredScopes = scopes.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Alert Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Action Bar & Statistics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search property scopes by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{scopes.length} Scopes Configured</span>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property Scope</span>
          </button>
        </div>
      </div>

      {/* Property Scopes Table Card */}
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Property Scope Name</th>
                <th className="py-3.5 px-4">Description / Matching Rule</th>
                <th className="py-3.5 px-4 w-32 text-center">Created At</th>
                <th className="py-3.5 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredScopes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 opacity-60" />
                    <p className="font-semibold">No property scopes found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery ? 'Try clearing your search query' : 'Click "Add Property Scope" to create your first scope.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredScopes.map((scope, index) => (
                  <tr
                    key={scope.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-200 dark:border-indigo-800/50">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs block">
                            {scope.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {scope.id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                      {scope.description ? (
                        <span>{scope.description}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Matches cases categorized under {scope.name}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                      {new Date(scope.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(scope)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          title="Edit Scope"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(scope)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Scope"
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

      {/* Add / Edit Property Scope Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingId ? 'Edit Property Scope' : 'Add New Property Scope'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Define property type scopes used in case checklists and matrix matching.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Scope Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Resale, Direct Allotment - Plot, Commercial Property"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Unique name for the property category (e.g. Resale, Takeover / Seller BT, Commercial Property).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Documentation Criteria (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter criteria or notes for documents required under this property scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />}
                  <span>{editingId ? 'Save Changes' : 'Create Scope'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
