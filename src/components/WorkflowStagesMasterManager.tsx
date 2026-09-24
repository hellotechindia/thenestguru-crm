'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createWorkflowStageAction,
  updateWorkflowStageAction,
  deleteWorkflowStageAction,
} from '@/app/actions';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  IndianRupee,
  Sparkles,
  ArrowUpDown,
  ShieldAlert,
} from 'lucide-react';

export interface WorkflowStageItem {
  id: string;
  stageNumber: number;
  name: string;
  description?: string | null;
  color?: string | null;
  incentiveAmount: number;
  isActive: boolean;
}

interface Props {
  initialStages: WorkflowStageItem[];
}

export default function WorkflowStagesMasterManager({ initialStages = [] }: Props) {
  const router = useRouter();
  const [stages, setStages] = useState<WorkflowStageItem[]>(initialStages);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStageItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Stage Form
  const [form, setForm] = useState({
    stageNumber: initialStages.length + 1,
    name: '',
    description: '',
    color: '#0284c7',
    incentiveAmount: '500',
  });

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.stageNumber) {
      setError('Stage Number and Name are required.');
      return;
    }

    setLoading(true);
    setError('');
    const res = await createWorkflowStageAction({
      stageNumber: Number(form.stageNumber),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color,
      incentiveAmount: parseFloat(form.incentiveAmount) || 0,
    });
    setLoading(false);

    if (res.success && res.stage) {
      setStages([...stages, res.stage].sort((a, b) => a.stageNumber - b.stageNumber));
      setIsModalOpen(false);
      setForm({
        stageNumber: stages.length + 2,
        name: '',
        description: '',
        color: '#0284c7',
        incentiveAmount: '500',
      });
      setSuccess('New Workflow Stage created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create stage.');
    }
  };

  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage || !editingStage.name.trim()) return;

    setLoading(true);
    setError('');
    const res = await updateWorkflowStageAction(editingStage.id, {
      stageNumber: Number(editingStage.stageNumber),
      name: editingStage.name.trim(),
      description: editingStage.description || undefined,
      color: editingStage.color || '#0284c7',
      incentiveAmount: Number(editingStage.incentiveAmount) || 0,
      isActive: editingStage.isActive,
    });
    setLoading(false);

    if (res.success && res.stage) {
      setStages(
        stages
          .map((s) => (s.id === editingStage.id ? res.stage : s))
          .sort((a, b) => a.stageNumber - b.stageNumber)
      );
      setEditingStage(null);
      setSuccess('Stage updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update stage.');
    }
  };

  const handleDeleteStage = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete stage "${name}"? Existing cases at this stage might need review.`)) return;

    const res = await deleteWorkflowStageAction(id);
    if (res.success) {
      setStages(stages.filter((s) => s.id !== id));
      setSuccess('Stage deleted successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete stage');
    }
  };

  const PRESET_COLORS = [
    '#0284c7', // Sky blue
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ef4444', // Red
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Dynamic Workflow Stages & Automated Incentives
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Super Admin Portal: Add, reorder, rename workflow stages, set stage badge colors, and define automated staff incentives
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Stage
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Stages Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3 relative overflow-hidden group"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: stage.color || '#3b82f6' }}
            />

            <div className="flex items-start justify-between gap-2 pt-1">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-sm"
                style={{ backgroundColor: stage.color || '#3b82f6' }}
              >
                Stage {stage.stageNumber}
              </span>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                <button
                  onClick={() => {
                    setEditingStage(stage);
                    setError('');
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                  title="Edit Stage"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {stages.length > 1 && (
                  <button
                    onClick={() => handleDeleteStage(stage.id, stage.name)}
                    className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500"
                    title="Delete Stage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                {stage.name}
              </h3>
              {stage.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {stage.description}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Staff Incentive
              </span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <IndianRupee className="w-3 h-3" />
                {stage.incentiveAmount?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Stage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Create New Workflow Stage
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

            <form onSubmit={handleCreateStage} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage No. *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={20}
                    value={form.stageNumber}
                    onChange={(e) => setForm({ ...form, stageNumber: parseInt(e.target.value, 10) || 1 })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Legal & Search Report"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Deliverables
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what documents or tasks happen at this stage..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Automated Incentive (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min={0}
                      value={form.incentiveAmount}
                      onChange={(e) => setForm({ ...form, incentiveAmount: e.target.value })}
                      className="w-full glass-input pl-8 pr-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          form.color === c ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
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
                  {loading ? 'Creating...' : 'Save Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {editingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Edit Workflow Stage {editingStage.stageNumber}
              </h3>
              <button
                onClick={() => setEditingStage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateStage} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage No. *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingStage.stageNumber}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, stageNumber: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStage.name}
                    onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingStage.description || ''}
                  onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage Incentive (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min={0}
                      value={editingStage.incentiveAmount}
                      onChange={(e) =>
                        setEditingStage({ ...editingStage, incentiveAmount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full glass-input pl-8 pr-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingStage({ ...editingStage, color: c })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          editingStage.color === c ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
