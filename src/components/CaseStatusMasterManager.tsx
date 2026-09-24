'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCaseStatusMasterAction,
  updateCaseStatusMasterAction,
  deleteCaseStatusMasterAction,
} from '@/app/actions';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  ShieldAlert,
  Pencil,
  ArrowUpDown,
  Palette,
  FileText,
  Sparkles,
} from 'lucide-react';

export interface CaseStatusItem {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  displayOrder: number;
  isDefault?: boolean;
}

interface Props {
  initialStatuses: CaseStatusItem[];
}

const PRESET_COLORS = [
  { name: 'Amber', hex: '#f59e0b', bgClass: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { name: 'Sky', hex: '#0284c7', bgClass: 'bg-sky-500/10 text-sky-600 border-sky-500/30' },
  { name: 'Purple', hex: '#8b5cf6', bgClass: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { name: 'Emerald', hex: '#10b981', bgClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  { name: 'Green', hex: '#059669', bgClass: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { name: 'Rose', hex: '#ef4444', bgClass: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
  { name: 'Indigo', hex: '#6366f1', bgClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  { name: 'Slate', hex: '#64748b', bgClass: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
];

export default function CaseStatusMasterManager({ initialStatuses = [] }: Props) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<CaseStatusItem[]>(initialStatuses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Status Form State
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [displayOrder, setDisplayOrder] = useState<number>(statuses.length + 1);
  const [description, setDescription] = useState('');

  // Edit State
  const [editingStatus, setEditingStatus] = useState<CaseStatusItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#0284c7');
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(1);
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    const res = await createCaseStatusMasterAction({
      name: name.trim(),
      color: color.trim() || '#3b82f6',
      displayOrder: Number(displayOrder) || 0,
      description: description.trim() || undefined,
    });
    setLoading(false);

    if (res.success && res.status) {
      setStatuses([...statuses, res.status].sort((a, b) => a.displayOrder - b.displayOrder));
      setIsModalOpen(false);
      setName('');
      setColor('#0284c7');
      setDisplayOrder(statuses.length + 2);
      setDescription('');
      setSuccess('Case overall status created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create status.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus || !editName.trim()) return;

    setEditLoading(true);
    setEditError('');
    const res = await updateCaseStatusMasterAction(editingStatus.id, {
      name: editName.trim(),
      color: editColor.trim() || '#3b82f6',
      displayOrder: Number(editDisplayOrder) || 0,
      description: editDescription.trim() || undefined,
    });
    setEditLoading(false);

    if (res.success && res.status) {
      setStatuses(
        statuses
          .map((s) => (s.id === editingStatus.id ? res.status! : s))
          .sort((a, b) => a.displayOrder - b.displayOrder)
      );
      setEditingStatus(null);
      setSuccess('Case overall status updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this case status? Cases with this status will retain their label.')) {
      return;
    }

    setDeletingId(id);
    const res = await deleteCaseStatusMasterAction(id);
    setDeletingId(null);

    if (res.success) {
      setStatuses(statuses.filter((s) => s.id !== id));
      setSuccess('Case status deleted successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete status.');
    }
  };

  const startEdit = (st: CaseStatusItem) => {
    setEditingStatus(st);
    setEditName(st.name);
    setEditColor(st.color || '#0284c7');
    setEditDisplayOrder(st.displayOrder);
    setEditDescription(st.description || '');
    setEditError('');
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Action Bar & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white">
              Configured Statuses ({statuses.length})
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Drop-down statuses used across Case Intake, Directory Filters & Case Updates
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setDisplayOrder(statuses.length + 1);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Status</span>
        </button>
      </div>

      {/* Statuses Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-16 text-center">Order</th>
                <th className="py-3 px-4">Status Name & Tag Preview</th>
                <th className="py-3 px-4">Color Swatch</th>
                <th className="py-3 px-4">Description / Guidance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {statuses.map((st) => (
                <tr
                  key={st.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                      {st.displayOrder}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs inline-flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${st.color || '#3b82f6'}18`,
                          color: st.color || '#3b82f6',
                          borderColor: `${st.color || '#3b82f6'}40`,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: st.color || '#3b82f6' }}
                        />
                        {st.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: st.color || '#3b82f6' }}
                      />
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {st.color || '#3b82f6'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    <span className="text-slate-600 dark:text-slate-300 text-xs">
                      {st.description || <span className="text-slate-400 italic">No description</span>}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => startEdit(st)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition-colors"
                        title="Edit Status"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(st.id)}
                        disabled={deletingId === st.id || statuses.length <= 1}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-40"
                        title="Delete Status"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {statuses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No statuses found. Click "Add New Status" to create your first status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Add Overall Case Status
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Configure a new pipeline status for loan cases
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Title / Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valuation Pending, Login Done"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full glass-input px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Hex Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#0284c7"
                      className="w-full glass-input px-2.5 py-1.5 rounded-xl font-mono text-xs border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quick Color Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setColor(p.hex)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                        color.toLowerCase() === p.hex.toLowerCase()
                          ? 'ring-2 ring-sky-500 scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${p.hex}18`,
                        color: p.hex,
                        borderColor: `${p.hex}40`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.hex }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Operational Meaning
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain when this status should be selected by credit or ops team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-black text-slate-400 block mb-1.5">
                  Live Tag Preview
                </span>
                <span
                  className="px-3 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-2"
                  style={{
                    backgroundColor: `${color}18`,
                    color: color,
                    borderColor: `${color}40`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {name || 'Status Name Preview'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Create Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Edit Overall Case Status
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Modifying the title will safely update existing cases
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStatus(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Title / Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editDisplayOrder}
                    onChange={(e) => setEditDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full glass-input px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Hex Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-full glass-input px-2.5 py-1.5 rounded-xl font-mono text-xs border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quick Color Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setEditColor(p.hex)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                        editColor.toLowerCase() === p.hex.toLowerCase()
                          ? 'ring-2 ring-sky-500 scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${p.hex}18`,
                        color: p.hex,
                        borderColor: `${p.hex}40`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.hex }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Operational Meaning
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-black text-slate-400 block mb-1.5">
                  Live Tag Preview
                </span>
                <span
                  className="px-3 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-2"
                  style={{
                    backgroundColor: `${editColor}18`,
                    color: editColor,
                    borderColor: `${editColor}40`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editColor }} />
                  {editName || 'Status Name Preview'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStatus(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
