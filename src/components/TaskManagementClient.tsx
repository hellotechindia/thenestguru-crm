'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createTaskAction,
  updateTaskStatusAction,
  updateTaskAction,
  deleteTaskAction,
  addTaskCommentAction,
} from '@/app/actions';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Flame,
  MessageSquare,
  ExternalLink,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  Layers,
  Send,
  Briefcase,
  Eye,
} from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  dueDate: string | null;
  assignedAt: string;
  completedAt: string | null;
  assignedToId: string;
  assignedTo: {
    id: string;
    name: string;
    role: string;
    username: string | null;
  };
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
    username: string | null;
  };
  caseId: string | null;
  case: {
    id: string;
    clientName: string;
    product: string;
    mobile: string;
  } | null;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      role: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AssignableUser {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  role: string;
  team: { id: string; name: string } | null;
}

interface ActiveCase {
  id: string;
  clientName: string;
  mobile: string;
  product: string;
  stage: number;
  status: string;
}

interface TaskManagementClientProps {
  initialTasks: TaskItem[];
  assignableUsers: AssignableUser[];
  activeCases: ActiveCase[];
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

// Elapsed time formatter
function formatElapsedTime(assignedAtDateStr: string) {
  const assignedTime = new Date(assignedAtDateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - assignedTime);

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const remainingMins = diffMins % 60;
    return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
  }
  const remainingHours = diffHours % 24;
  return remainingHours > 0 ? `${diffDays}d ${remainingHours}h ago` : `${diffDays}d ago`;
}

// Priority badge helper
const priorityConfig: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  URGENT: { label: 'Urgent', bg: 'bg-rose-50 dark:bg-rose-950/50', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', icon: Flame },
  HIGH: { label: 'High', bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle },
  MEDIUM: { label: 'Medium', bg: 'bg-sky-50 dark:bg-sky-950/50', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', icon: Clock },
  LOW: { label: 'Low', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', icon: Clock },
};

// Status badge helper
const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'Pending / To Do', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800', dot: 'bg-sky-500' },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
};

export default function TaskManagementClient({
  initialTasks,
  assignableUsers,
  activeCases,
  currentUser,
}: TaskManagementClientProps) {
  const router = useRouter();

  // Navigation & Filtering states
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'assigned_by_me'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newAssigneeId, setNewAssigneeId] = useState(assignableUsers[0]?.id || '');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCaseId, setNewCaseId] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [editStatus, setEditStatus] = useState<TaskItem['status']>('PENDING');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCaseId, setEditCaseId] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      // Tab filter
      if (activeTab === 'my' && task.assignedToId !== currentUser.id) return false;
      if (activeTab === 'assigned_by_me' && task.createdById !== currentUser.id) return false;

      // Status filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

      // Assignee filter
      if (assigneeFilter !== 'ALL' && task.assignedToId !== assigneeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const assigneeMatch = task.assignedTo.name.toLowerCase().includes(q);
        const caseMatch = task.case?.clientName.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !assigneeMatch && !caseMatch) return false;
      }

      return true;
    });
  }, [initialTasks, activeTab, statusFilter, priorityFilter, assigneeFilter, searchQuery, currentUser.id]);

  // Summary Metrics
  const stats = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    for (const t of initialTasks) {
      if (t.status === 'PENDING') pending++;
      if (t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW') inProgress++;
      if (t.status === 'COMPLETED') completed++;

      if (t.dueDate && t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
        const d = new Date(t.dueDate);
        if (d < now) overdue++;
      }
    }

    return {
      total: initialTasks.length,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }, [initialTasks]);

  // Handle Quick Status Change
  const handleQuickStatusChange = async (taskId: string, newStatus: TaskItem['status']) => {
    const res = await updateTaskStatusAction(taskId, newStatus);
    if (res.success) {
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      router.refresh();
    } else {
      alert(res.error || 'Failed to update status');
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAssigneeId) return;

    setLoading(true);
    setErrorMsg('');

    const res = await createTaskAction({
      title: newTitle,
      description: newDesc || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
      assignedToId: newAssigneeId,
      caseId: newCaseId || undefined,
    });

    setLoading(false);
    if (res.success) {
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
      setNewCaseId('');
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to create task');
    }
  };

  // Open Edit Task Modal
  const handleOpenEdit = (task: TaskItem) => {
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditAssigneeId(task.assignedToId);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setEditCaseId(task.caseId || '');
    setIsEditingTask(true);
  };

  // Handle Update Task
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const res = await updateTaskAction(selectedTask.id, {
      title: editTitle,
      description: editDesc || undefined,
      priority: editPriority,
      status: editStatus,
      dueDate: editDueDate || null,
      assignedToId: editAssigneeId,
      caseId: editCaseId || null,
    });

    setLoading(false);
    if (res.success) {
      setIsEditingTask(false);
      setSelectedTask(null);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to update task');
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete task "${title}"?`)) return;

    const res = await deleteTaskAction(taskId);
    if (res.success) {
      setSelectedTask(null);
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete task');
    }
  };

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText.trim()) return;

    setSubmittingComment(true);
    const res = await addTaskCommentAction(selectedTask.id, commentText);
    setSubmittingComment(false);

    if (res.success && res.comment) {
      setCommentText('');
      // Optimistically update local selected task comments
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, res.comment as any],
            }
          : null
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to post comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Task Management Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign, track, and monitor team activities with live elapsed time tracking and status progression
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Assign New Task
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Tasks
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.total}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pending / To Do
          </span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.pending}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            In Progress
          </span>
          <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">{stats.inProgress}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Completed
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            Overdue
          </span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats.overdue}</div>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Team Tasks ({initialTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Tasks ({initialTasks.filter((t) => t.assignedToId === currentUser.id).length})
            </button>
            <button
              onClick={() => setActiveTab('assigned_by_me')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'assigned_by_me'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Assigned by Me ({initialTasks.filter((t) => t.createdById === currentUser.id).length})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{filteredTasks.length}</strong> tasks
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, staff, cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending / To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Staff Assignees</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List / Matrix */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 space-y-2">
            <CheckSquare className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
            <p className="text-sm font-semibold">No tasks found matching current filters.</p>
            <p className="text-xs text-slate-400">Click &quot;Assign New Task&quot; above to create one.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityInfo = priorityConfig[task.priority] || priorityConfig.MEDIUM;
            const statusInfo = statusConfig[task.status] || statusConfig.PENDING;
            const PriorityIcon = priorityInfo.icon;
            const isOverdue =
              task.dueDate &&
              task.status !== 'COMPLETED' &&
              task.status !== 'CANCELLED' &&
              new Date(task.dueDate) < new Date();

            return (
              <div
                key={task.id}
                className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700/60 transition-all shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Title & Description */}
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        onClick={() => setSelectedTask(task)}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors"
                      >
                        {task.title}
                      </h3>

                      {/* Priority Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityInfo.bg} ${priorityInfo.text} ${priorityInfo.border}`}
                      >
                        <PriorityIcon className="w-2.5 h-2.5" />
                        {priorityInfo.label}
                      </span>

                      {/* Overdue Badge */}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                          <Flame className="w-2.5 h-2.5" />
                          Overdue
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Quick Status Dropdown & Action Icons */}
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${statusInfo.color}`}
                    >
                      <option value="PENDING">Pending / To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>

                    <button
                      onClick={() => setSelectedTask(task)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                      title="View Details & Comments"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {(isSuperAdmin || task.createdById === currentUser.id) && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            handleOpenEdit(task);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Task"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Metadata Footer: Elapsed Time, Assignee, Due Date, Linked Case */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                  {/* Elapsed Time Badge */}
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold"
                    title={`Exact Assignment Time: ${new Date(task.assignedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    <span>Assigned: {formatElapsedTime(task.assignedAt)}</span>
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assignee:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{task.assignedTo.name}</strong>
                    <span className="text-[10px] text-slate-400">({task.assignedTo.role})</span>
                  </div>

                  {/* Created By */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>By:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{task.createdBy.name}</span>
                  </div>

                  {/* Due Date */}
                  {task.dueDate && (
                    <div
                      className={`flex items-center gap-1 font-medium ${
                        isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}

                  {/* Linked Case */}
                  {task.case && (
                    <Link
                      href={`/cases/${task.case.id}`}
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-500 dark:text-sky-400 font-semibold hover:underline"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Case: {task.case.clientName}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  )}

                  {/* Comments Count */}
                  <div
                    onClick={() => setSelectedTask(task)}
                    className="ml-auto inline-flex items-center gap-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{task.comments.length} updates</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Assign New Task
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify salary slips & bank sanction letter for HDFC case"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Instructions / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed instructions, notes, or required deliverables..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              {/* Priority & Assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign To Staff *
                  </label>
                  <select
                    required
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900"
                  >
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Channel partners are strictly excluded.</p>
                </div>
              </div>

              {/* Due Date & Optional Case Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Link to Loan Case (Optional)
                  </label>
                  <select
                    value={newCaseId}
                    onChange={(e) => setNewCaseId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  >
                    <option value="">No Case Linked</option>
                    {activeCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.product})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Create & Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Activity Drawer / Modal */}
      {selectedTask && !isEditingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      priorityConfig[selectedTask.priority]?.bg
                    } ${priorityConfig[selectedTask.priority]?.text} ${
                      priorityConfig[selectedTask.priority]?.border
                    }`}
                  >
                    {priorityConfig[selectedTask.priority]?.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      statusConfig[selectedTask.status]?.color
                    }`}
                  >
                    {statusConfig[selectedTask.status]?.label}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedTask.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                {(isSuperAdmin || selectedTask.createdById === currentUser.id) && (
                  <button
                    onClick={() => handleOpenEdit(selectedTask)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Task"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Overview Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Assigned To</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTask.assignedTo.name}
                </div>
                <div className="text-[10px] text-slate-400">{selectedTask.assignedTo.role}</div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Elapsed Time</span>
                <div className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                  {formatElapsedTime(selectedTask.assignedAt)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(selectedTask.assignedAt).toLocaleDateString('en-IN')}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Due Date</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString('en-IN')
                    : 'No deadline'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Created By</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTask.createdBy.name}
                </div>
                <div className="text-[10px] text-slate-400">{selectedTask.createdBy.role}</div>
              </div>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Instructions:</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description}
                </div>
              </div>
            )}

            {/* Linked Case banner */}
            {selectedTask.case && (
              <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Linked Case: {selectedTask.case.clientName}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Product: {selectedTask.case.product} • Mobile: {selectedTask.case.mobile}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/cases/${selectedTask.case.id}`}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                >
                  <span>Open Case</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Update Status:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleQuickStatusChange(selectedTask.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTask.status === st
                        ? statusConfig[st].color + ' shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-sky-400'
                    }`}
                  >
                    {statusConfig[st].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments & Activity Thread */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                Progress Updates & Comments ({selectedTask.comments.length})
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedTask.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet. Post the first update below.</p>
                ) : (
                  selectedTask.comments.map((cm) => (
                    <div
                      key={cm.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {cm.user.name} <span className="font-normal text-slate-400">({cm.user.role})</span>
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(cm.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{cm.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Post progress update or notes..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditingTask && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Edit Task
              </h3>
              <button
                onClick={() => setIsEditingTask(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={editAssigneeId}
                    onChange={(e) => setEditAssigneeId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400"
                  >
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link to Loan Case
                </label>
                <select
                  value={editCaseId}
                  onChange={(e) => setEditCaseId(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">No Case Linked</option>
                  {activeCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.product})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
