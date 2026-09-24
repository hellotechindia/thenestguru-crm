'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  StickyNote,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Flame,
  Star,
  ExternalLink,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  createSelfTaskAction,
  updateTaskStatusAction,
  deleteTaskAction,
  updateTaskEisenhowerAction,
} from '@/app/actions';

interface SelfTaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  isUrgent?: boolean;
  isImportant?: boolean;
  createdAt: string | Date;
  dueDate?: string | Date | null;
}

export default function DashboardStickyNotes({
  initialTasks = [],
  currentUserId,
}: {
  initialTasks: SelfTaskItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<SelfTaskItem[]>(initialTasks);
  const [newNote, setNewNote] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setLoading(true);
    const res = await createSelfTaskAction({
      title: newNote.trim(),
      isUrgent,
      isImportant,
    });
    setLoading(false);

    if (res.success && res.task) {
      setTasks([res.task as any, ...tasks]);
      setNewNote('');
      setIsUrgent(false);
      setIsImportant(false);
      router.refresh();
    } else {
      alert(res.error || 'Failed to add note');
    }
  };

  const handleToggleStatus = async (task: SelfTaskItem) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const res = await updateTaskStatusAction(task.id, nextStatus);
    if (res.success) {
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      router.refresh();
    }
  };

  const handleToggleEisenhower = async (task: SelfTaskItem, field: 'urgent' | 'important') => {
    const newUrgent = field === 'urgent' ? !task.isUrgent : !!task.isUrgent;
    const newImportant = field === 'important' ? !task.isImportant : !!task.isImportant;

    const res = await updateTaskEisenhowerAction(task.id, {
      isUrgent: newUrgent,
      isImportant: newImportant,
    });

    if (res.success) {
      setTasks(
        tasks.map((t) =>
          t.id === task.id ? { ...t, isUrgent: newUrgent, isImportant: newImportant } : t
        )
      );
      router.refresh();
    }
  };

  const handleDelete = async (taskId: string) => {
    const res = await deleteTaskAction(taskId);
    if (res.success) {
      setTasks(tasks.filter((t) => t.id !== taskId));
      router.refresh();
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Personal Sticky Notes & Eisenhower Quick-Pad
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quick thoughts, call follow-ups, and urgent tasks for today
            </p>
          </div>
        </div>

        <Link
          href="/tasks"
          className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 flex items-center gap-1 hover:underline"
        >
          <span>Full Matrix View</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Jot down a quick personal reminder or to-do..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={loading || !newNote.trim()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pin Note</span>
          </button>
        </div>

        {/* Quick Urgent / Important Tags */}
        <div className="flex items-center gap-3 text-[11px] px-1 text-slate-600 dark:text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-rose-600">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 text-xs cursor-pointer"
            />
            <span className="font-semibold flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Urgent
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-amber-600">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 text-xs cursor-pointer"
            />
            <span className="font-semibold flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" /> Important
            </span>
          </label>
        </div>
      </form>

      {/* Notes Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="col-span-full p-4 text-center text-xs text-slate-400 italic">
            No sticky notes yet. Type above to pin your first quick reminder!
          </div>
        ) : (
          tasks.map((t) => {
            const isDone = t.status === 'COMPLETED';
            return (
              <div
                key={t.id}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 text-xs shadow-sm ${
                  isDone
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : t.isUrgent && t.isImportant
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : t.isUrgent
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(t)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <span
                    className={`font-semibold flex-1 leading-snug break-words ${
                      isDone
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {t.title}
                  </span>
                </div>

                {/* Footer Badges & Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleEisenhower(t, 'urgent')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                        t.isUrgent
                          ? 'bg-rose-100 text-rose-700 border-rose-300'
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-rose-600'
                      }`}
                      title="Toggle Urgent"
                    >
                      🔥 Urgent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEisenhower(t, 'important')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                        t.isImportant
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-amber-600'
                      }`}
                      title="Toggle Important"
                    >
                      ⭐ Important
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
