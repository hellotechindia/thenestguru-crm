'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createTaskAction,
  createTaskWithMultipleAssigneesAction,
  updateTaskStatusAction,
  updateTaskAction,
  deleteTaskAction,
  addTaskCommentAction,
  editTaskCommentAction,
  createSelfTaskAction,
  updateTaskEisenhowerAction,
  logTaskTimeSpentAction,
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
  LayoutGrid,
  List,
  Timer,
  Check,
  Zap,
  StickyNote,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import DatePickerInput from './DatePickerInput';

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  dueDate: string | null;
  dueTime?: string | null;
  assignedAt: string;
  completedAt: string | null;
  completedById?: string | null;
  completedBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
  assignedToId: string;
  assignedTo: {
    id: string;
    name: string;
    role: string;
    username: string | null;
  };
  isUrgent?: boolean;
  isImportant?: boolean;
  isSelfTask?: boolean;
  timeSpentMinutes?: number;
  assignees?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      role: string;
    };
  }>;
  activityLogs?: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      role: string;
    };
  }>;
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
    isEdited?: boolean;
    editedAt?: string | null;
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
    isTeamLeader?: boolean;
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

// Eisenhower Time Management Matrix Quadrant definition
export type EisenhowerQuadrantKey = 'DO_FIRST' | 'SCHEDULE' | 'DELEGATE' | 'ELIMINATE';

export const EISENHOWER_MATRIX_QUADRANTS: {
  id: EisenhowerQuadrantKey;
  qNumber: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  tag: string;
  fullTitle: string;
  desc: string;
  isUrgent: boolean;
  isImportant: boolean;
  suggestedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  icon: typeof Flame;
  color: {
    badge: string;
    border: string;
    activeBg: string;
    hoverBg: string;
    text: string;
    tagText: string;
    dot: string;
    chipBg: string;
  };
}[] = [
  {
    id: 'DO_FIRST',
    qNumber: 'Q1',
    title: 'Do First',
    tag: 'Urgent & Important',
    fullTitle: 'Do First (Urgent & Important)',
    desc: 'Crises, critical deadlines, urgent approvals',
    isUrgent: true,
    isImportant: true,
    suggestedPriority: 'URGENT',
    icon: Flame,
    color: {
      badge: 'bg-rose-600 text-white',
      border: 'border-rose-500',
      activeBg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/30 shadow-sm',
      hoverBg: 'hover:border-rose-400 hover:bg-rose-50/30',
      text: 'text-rose-600 dark:text-rose-400',
      tagText: 'text-rose-600 dark:text-rose-400 font-bold',
      dot: 'bg-rose-600',
      chipBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    },
  },
  {
    id: 'SCHEDULE',
    qNumber: 'Q2',
    title: 'Schedule',
    tag: 'Important, Not Urgent',
    fullTitle: 'Schedule (Important, Not Urgent)',
    desc: 'Planning, milestones, strategy & prevention',
    isUrgent: false,
    isImportant: true,
    suggestedPriority: 'HIGH',
    icon: Calendar,
    color: {
      badge: 'bg-emerald-600 text-white',
      border: 'border-emerald-500',
      activeBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-sm',
      hoverBg: 'hover:border-emerald-400 hover:bg-emerald-50/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      tagText: 'text-emerald-600 dark:text-emerald-400 font-bold',
      dot: 'bg-emerald-600',
      chipBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    },
  },
  {
    id: 'DELEGATE',
    qNumber: 'Q3',
    title: 'Delegate',
    tag: 'Urgent, Not Important',
    fullTitle: 'Delegate (Urgent, Not Important)',
    desc: 'Time-sensitive routine tasks, queries & follow-ups',
    isUrgent: true,
    isImportant: false,
    suggestedPriority: 'MEDIUM',
    icon: Zap,
    color: {
      badge: 'bg-amber-500 text-white',
      border: 'border-amber-500',
      activeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/30 shadow-sm',
      hoverBg: 'hover:border-amber-400 hover:bg-amber-50/30',
      text: 'text-amber-600 dark:text-amber-400',
      tagText: 'text-amber-600 dark:text-amber-400 font-bold',
      dot: 'bg-amber-500',
      chipBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    },
  },
  {
    id: 'ELIMINATE',
    qNumber: 'Q4',
    title: 'Eliminate / Backlog',
    tag: 'Not urgent, not important',
    fullTitle: 'Eliminate / Backlog (Not urgent, not important)',
    desc: 'Low-priority backlog, optional research, non-pressing',
    isUrgent: false,
    isImportant: false,
    suggestedPriority: 'LOW',
    icon: Clock,
    color: {
      badge: 'bg-slate-500 text-white',
      border: 'border-slate-500',
      activeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-500 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/30 shadow-sm',
      hoverBg: 'hover:border-slate-400 hover:bg-slate-50/40',
      text: 'text-slate-500 dark:text-slate-400',
      tagText: 'text-slate-500 dark:text-slate-400 font-bold',
      dot: 'bg-slate-500',
      chipBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
  },
];

export function getEisenhowerQuadrant(isUrgent?: boolean | null, isImportant?: boolean | null) {
  if (isUrgent && isImportant) return EISENHOWER_MATRIX_QUADRANTS[0];
  if (!isUrgent && isImportant) return EISENHOWER_MATRIX_QUADRANTS[1];
  if (isUrgent && !isImportant) return EISENHOWER_MATRIX_QUADRANTS[2];
  return EISENHOWER_MATRIX_QUADRANTS[3];
}

function EisenhowerSelector({
  isUrgent,
  isImportant,
  onChange,
  onPriorityChange,
}: {
  isUrgent: boolean;
  isImportant: boolean;
  onChange: (urgent: boolean, important: boolean) => void;
  onPriorityChange?: (priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => void;
}) {
  const currentQuad = getEisenhowerQuadrant(isUrgent, isImportant);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            Priority Tags (Eisenhower Time Management Matrix)
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select quadrant to classify task by urgency and importance:
          </p>
        </div>
        <span
          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-xs ${currentQuad.color.chipBg}`}
        >
          {currentQuad.qNumber}: {currentQuad.fullTitle}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {EISENHOWER_MATRIX_QUADRANTS.map((quad) => {
          const isSelected = currentQuad.id === quad.id;
          const Icon = quad.icon;
          return (
            <button
              key={quad.id}
              type="button"
              onClick={() => {
                onChange(quad.isUrgent, quad.isImportant);
                if (onPriorityChange) {
                  onPriorityChange(quad.suggestedPriority);
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 relative ${
                isSelected
                  ? quad.color.activeBg
                  : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 ${quad.color.hoverBg}`
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${quad.color.badge}`}>
                    {quad.qNumber}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{quad.title}</span>
                </div>
                <span className={`text-[10px] ${quad.color.tagText}`}>
                  {quad.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {quad.desc}
              </p>
              {isSelected && (
                <div className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${quad.color.dot} ring-2 ring-white dark:ring-slate-900`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskManagementClient({
  initialTasks,
  assignableUsers,
  activeCases,
  currentUser,
}: TaskManagementClientProps) {
  const router = useRouter();

  // Role permissions
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isTeamLeader = currentUser.role === 'TEAM_LEADER' || currentUser.role === 'SALES' || currentUser.role === 'OPERATION' || !!currentUser.isTeamLeader;
  const canAssignTask = isSuperAdmin || isTeamLeader;

  // Navigation & Filtering states: Super admin sees all, other roles default to their own tasks
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'assigned_by_me'>(isSuperAdmin ? 'all' : 'my');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [eisenhowerFilter, setEisenhowerFilter] = useState<'ALL' | EisenhowerQuadrantKey>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSelfModalOpen, setIsSelfModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Self-Task form state
  const [selfTitle, setSelfTitle] = useState('');
  const [selfDesc, setSelfDesc] = useState('');
  const [selfDueDate, setSelfDueDate] = useState('');
  const [selfDueTime, setSelfDueTime] = useState('');
  const [selfIsUrgent, setSelfIsUrgent] = useState(false);
  const [selfIsImportant, setSelfIsImportant] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('LOW');
  const [newIsUrgent, setNewIsUrgent] = useState(false);
  const [newIsImportant, setNewIsImportant] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newCaseId, setNewCaseId] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [editIsUrgent, setEditIsUrgent] = useState(false);
  const [editIsImportant, setEditIsImportant] = useState(false);
  const [editStatus, setEditStatus] = useState<TaskItem['status']>('PENDING');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editStaffSearchQuery, setEditStaffSearchQuery] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editCaseId, setEditCaseId] = useState('');

  // Time logging in drawer
  const [timeMinutesInput, setTimeMinutesInput] = useState('');
  const [loggingTime, setLoggingTime] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Base scoped tasks for the active tab & user role (before status filtering)
  const scopedTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      // Strict Role Isolation: Non-super-admin can ONLY see tasks assigned to them or created by them
      if (!isSuperAdmin) {
        const isAssigned = task.assignedToId === currentUser.id || task.assignees?.some((a) => a.userId === currentUser.id);
        const isCreator = task.createdById === currentUser.id;
        if (!isAssigned && !isCreator) return false;
      }

      // Tab filter
      if (activeTab === 'my') {
        const isAssignedToMe = task.assignedToId === currentUser.id || task.assignees?.some((a) => a.userId === currentUser.id);
        if (!isAssignedToMe) return false;
      }
      if (activeTab === 'assigned_by_me' && task.createdById !== currentUser.id) return false;

      return true;
    });
  }, [initialTasks, isSuperAdmin, activeTab, currentUser.id]);

  // Live status counts according to active tab scope
  const statusCounts = useMemo(() => {
    let all = scopedTasks.length;
    let pending = 0;
    let inProgress = 0;
    let inReview = 0;
    let completed = 0;
    let cancelled = 0;

    for (const t of scopedTasks) {
      if (t.status === 'PENDING') pending++;
      else if (t.status === 'IN_PROGRESS') inProgress++;
      else if (t.status === 'IN_REVIEW') inReview++;
      else if (t.status === 'COMPLETED') completed++;
      else if (t.status === 'CANCELLED') cancelled++;
    }

    return { all, pending, inProgress, inReview, completed, cancelled };
  }, [scopedTasks]);

  // Filter tasks with latest-to-oldest sorting
  const filteredTasks = useMemo(() => {
    return scopedTasks
      .filter((task) => {
        // Status filter
        if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

        // Priority filter
        if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

        // Eisenhower Matrix Tag Filter
        if (eisenhowerFilter !== 'ALL') {
          const quad = getEisenhowerQuadrant(task.isUrgent, task.isImportant);
          if (quad.id !== eisenhowerFilter) return false;
        }

        // Assignee filter
        if (assigneeFilter !== 'ALL') {
          const hasAssignee = task.assignedToId === assigneeFilter || task.assignees?.some((a) => a.userId === assigneeFilter);
          if (!hasAssignee) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = (task.title || '').toLowerCase().includes(q);
          const descMatch = task.description?.toLowerCase().includes(q);
          const assigneeMatch =
            (task.assignedTo?.name || '').toLowerCase().includes(q) ||
            task.assignees?.some((a) => a.user?.name?.toLowerCase().includes(q));
          const caseMatch = (task.case?.clientName || '').toLowerCase().includes(q);
          if (!titleMatch && !descMatch && !assigneeMatch && !caseMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Strictly Latest to Oldest
        const timeA = new Date(a.createdAt || a.assignedAt).getTime();
        const timeB = new Date(b.createdAt || b.assignedAt).getTime();
        return timeB - timeA;
      });
  }, [scopedTasks, statusFilter, priorityFilter, eisenhowerFilter, assigneeFilter, searchQuery]);

  // Summary Metrics dynamically updated based on active tab & filters
  const baseFilteredForStats = useMemo(() => {
    return scopedTasks.filter((task) => {
      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

      // Eisenhower Matrix Tag Filter
      if (eisenhowerFilter !== 'ALL') {
        const quad = getEisenhowerQuadrant(task.isUrgent, task.isImportant);
        if (quad.id !== eisenhowerFilter) return false;
      }

      // Assignee filter
      if (assigneeFilter !== 'ALL') {
        const hasAssignee = task.assignedToId === assigneeFilter || task.assignees?.some((a) => a.userId === assigneeFilter);
        if (!hasAssignee) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const assigneeMatch =
          (task.assignedTo?.name || '').toLowerCase().includes(q) ||
          task.assignees?.some((a) => a.user?.name?.toLowerCase().includes(q));
        const caseMatch = (task.case?.clientName || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !assigneeMatch && !caseMatch) return false;
      }

      return true;
    });
  }, [scopedTasks, priorityFilter, eisenhowerFilter, assigneeFilter, searchQuery]);

  const stats = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    for (const t of baseFilteredForStats) {
      if (t.status === 'PENDING') pending++;
      if (t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW') inProgress++;
      if (t.status === 'COMPLETED') completed++;

      if (t.dueDate && t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
        const d = new Date(t.dueDate);
        if (d < now) overdue++;
      }
    }

    const total = statusFilter === 'ALL' ? baseFilteredForStats.length : filteredTasks.length;

    return {
      total,
      pending: statusFilter === 'ALL' || statusFilter === 'PENDING' ? pending : 0,
      inProgress: statusFilter === 'ALL' || statusFilter === 'IN_PROGRESS' || statusFilter === 'IN_REVIEW' ? inProgress : 0,
      completed: statusFilter === 'ALL' || statusFilter === 'COMPLETED' ? completed : 0,
      overdue: statusFilter === 'ALL' ? overdue : filteredTasks.filter((t) => t.dueDate && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && new Date(t.dueDate) < now).length,
    };
  }, [baseFilteredForStats, filteredTasks, statusFilter]);

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

  // Handle Create Self Task
  const handleCreateSelfTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfTitle.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const res = await createSelfTaskAction({
      title: selfTitle.trim(),
      description: selfDesc.trim() || undefined,
      dueDate: selfDueDate || undefined,
      dueTime: selfDueTime || undefined,
      isUrgent: selfIsUrgent,
      isImportant: selfIsImportant,
    });

    setLoading(false);
    if (res.success) {
      setIsSelfModalOpen(false);
      setSelfTitle('');
      setSelfDesc('');
      setSelfDueDate('');
      setSelfDueTime('');
      setSelfIsUrgent(false);
      setSelfIsImportant(false);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to create self task');
    }
  };

  // Handle Eisenhower Quick Toggle
  const handleToggleEisenhower = async (
    taskId: string,
    currentUrgent: boolean,
    currentImportant: boolean,
    field: 'urgent' | 'important'
  ) => {
    const newUrgent = field === 'urgent' ? !currentUrgent : currentUrgent;
    const newImportant = field === 'important' ? !currentImportant : currentImportant;

    const res = await updateTaskEisenhowerAction(taskId, {
      isUrgent: newUrgent,
      isImportant: newImportant,
    });

    if (res.success) {
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) =>
          prev ? { ...prev, isUrgent: newUrgent, isImportant: newImportant } : null
        );
      }
      router.refresh();
    } else {
      alert(res.error || 'Failed to update Eisenhower flags');
    }
  };

  // Handle Log Time Spent
  const handleLogTimeSpent = async (taskId: string, minutes: number) => {
    if (minutes <= 0) return;
    setLoggingTime(true);

    const res = await logTaskTimeSpentAction(taskId, minutes);
    setLoggingTime(false);

    if (res.success) {
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) =>
          prev ? { ...prev, timeSpentMinutes: (prev.timeSpentMinutes || 0) + minutes } : null
        );
      }
      setTimeMinutesInput('');
      router.refresh();
    } else {
      alert(res.error || 'Failed to log time spent');
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAssignees = newAssigneeIds.length > 0 ? newAssigneeIds : (newAssigneeId ? [newAssigneeId] : []);
    
    if (!newTitle.trim()) {
      setErrorMsg('Task Title is required.');
      return;
    }
    if (!newDesc.trim()) {
      setErrorMsg('Detailed Instructions / Remarks are required.');
      return;
    }
    if (!newPriority) {
      setErrorMsg('Priority Level is required.');
      return;
    }
    if (targetAssignees.length === 0) {
      setErrorMsg('Please select at least one staff member.');
      return;
    }
    if (!newDueDate) {
      setErrorMsg('Due Date is required.');
      return;
    }
    if (!newDueTime) {
      setErrorMsg('Due Time is required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await createTaskWithMultipleAssigneesAction({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      isUrgent: newIsUrgent,
      isImportant: newIsImportant,
      dueDate: newDueDate,
      dueTime: newDueTime,
      assigneeIds: targetAssignees,
      caseId: newCaseId || undefined,
    });

    setLoading(false);
    if (res.success) {
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
      setNewDueTime('');
      setNewCaseId('');
      setNewIsUrgent(false);
      setNewIsImportant(false);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to create task');
    }
  };

  // Handle Edit Comment
  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    const res = await editTaskCommentAction(commentId, editCommentText);
    if (res.success && selectedTask) {
      setSelectedTask({
        ...selectedTask,
        comments: selectedTask.comments.map((c) =>
          c.id === commentId ? { ...c, content: editCommentText.trim() } : c
        ),
      });
      setEditCommentId(null);
      setEditCommentText('');
      router.refresh();
    } else {
      alert(res.error || 'Failed to edit comment');
    }
  };

  // Open Edit Task Modal
  const handleOpenEdit = (task: TaskItem) => {
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(task.priority);
    setEditStatus(task.status);
    const existingAssigneeIds =
      task.assignees && task.assignees.length > 0
        ? task.assignees.map((a) => a.userId)
        : task.assignedToId
        ? [task.assignedToId]
        : assignableUsers[0]?.id
        ? [assignableUsers[0].id]
        : [];
    setEditAssigneeIds(existingAssigneeIds);
    setEditAssigneeId(task.assignedToId || assignableUsers[0]?.id || '');
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setEditDueTime(task.dueTime || '');
    setEditCaseId(task.caseId || '');
    setEditIsUrgent(!!task.isUrgent);
    setEditIsImportant(!!task.isImportant);
    setIsEditingTask(true);
  };

  // Quick helper to extend/increase deadline by hours or days
  const extendEditDeadline = (type: 'hour' | 'day', amount: number) => {
    let base: Date;
    if (editDueDate) {
      const parts = editDueDate.split('-').map(Number);
      base = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      base = new Date();
    }

    if (editDueTime) {
      const [h, m] = editDueTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        base.setHours(h, m, 0, 0);
      }
    } else {
      // Default to 18:00 (6 PM) if no time set yet
      base.setHours(18, 0, 0, 0);
    }

    if (type === 'day') {
      base.setDate(base.getDate() + amount);
    } else if (type === 'hour') {
      base.setHours(base.getHours() + amount);
    }

    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    const hh = String(base.getHours()).padStart(2, '0');
    const min = String(base.getMinutes()).padStart(2, '0');

    setEditDueDate(`${yyyy}-${mm}-${dd}`);
    setEditDueTime(`${hh}:${min}`);
  };

  // Handle Update Task
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;

    const targetAssignees =
      editAssigneeIds.length > 0
        ? editAssigneeIds
        : editAssigneeId
        ? [editAssigneeId]
        : [];

    if (targetAssignees.length === 0) {
      setErrorMsg('Please select at least one staff member.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await updateTaskAction(selectedTask.id, {
      title: editTitle,
      description: editDesc || undefined,
      priority: editPriority,
      status: editStatus,
      isUrgent: editIsUrgent,
      isImportant: editIsImportant,
      dueDate: editDueDate || null,
      dueTime: editDueTime || null,
      assignedToId: targetAssignees[0],
      assigneeIds: targetAssignees,
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

  // Eisenhower Matrix grouping (Active tasks in Q1-Q4, completed tasks in Completed section)
  const activeEisenhowerTasks = useMemo(
    () => filteredTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'),
    [filteredTasks]
  );
  const q1Tasks = useMemo(
    () => activeEisenhowerTasks.filter((t) => (t.isUrgent && t.isImportant) || t.priority === 'URGENT'),
    [activeEisenhowerTasks]
  );
  const q2Tasks = useMemo(
    () => activeEisenhowerTasks.filter((t) => !t.isUrgent && (t.isImportant || t.priority === 'HIGH')),
    [activeEisenhowerTasks]
  );
  const q3Tasks = useMemo(
    () => activeEisenhowerTasks.filter((t) => t.isUrgent && !t.isImportant && t.priority !== 'URGENT'),
    [activeEisenhowerTasks]
  );
  const q4Tasks = useMemo(
    () => activeEisenhowerTasks.filter((t) => !t.isUrgent && !t.isImportant && t.priority !== 'HIGH' && t.priority !== 'URGENT'),
    [activeEisenhowerTasks]
  );
  const completedEisenhowerTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'COMPLETED'),
    [filteredTasks]
  );

  return (
    <div className="space-y-6">
      {/* Header & Create Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Task Management Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign, track, and prioritize team & personal activities with live elapsed time, time-spent tracking and Eisenhower matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Personal Self-Task button available to ALL staff */}
          <button
            type="button"
            onClick={() => setIsSelfModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-bold text-xs transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            + Personal Self-Task
          </button>

          {canAssignTask && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Assign Team Task
            </button>
          )}
        </div>
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
        {/* Navigation Tabs & View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Company Tasks ({initialTasks.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Assigned Tasks ({initialTasks.filter((t) => t.assignedToId === currentUser.id || t.assignees?.some((a) => a.userId === currentUser.id)).length})
            </button>
            <button
              type="button"
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

          <div className="flex items-center gap-3">
            {/* View Mode Toggle: List vs Eisenhower Matrix */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" /> List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Eisenhower Matrix
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900 dark:text-white">{filteredTasks.length}</strong> tasks
            </div>
          </div>
        </div>

        {/* Status Filter Tabs with Counts (Pending, In Progress, In Review, Completed, Cancelled) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span>All Statuses</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {statusCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25 ring-2 ring-amber-500/20'
                : 'bg-amber-500/10 border-amber-300/70 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'PENDING' ? 'bg-white' : 'bg-amber-500'}`} />
            <span>Pending / To Do</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-700/50 text-white'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
              }`}
            >
              {statusCounts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-sky-600 text-white border-sky-700 shadow-sm shadow-sky-500/25 ring-2 ring-sky-500/20'
                : 'bg-sky-500/10 border-sky-300/70 dark:border-sky-700/50 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'IN_PROGRESS' ? 'bg-white' : 'bg-sky-500'}`} />
            <span>In Progress</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-sky-800/50 text-white'
                  : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'
              }`}
            >
              {statusCounts.inProgress}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_REVIEW')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              statusFilter === 'IN_REVIEW'
                ? 'bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-500/25 ring-2 ring-purple-500/20'
                : 'bg-purple-500/10 border-purple-300/70 dark:border-purple-700/50 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'IN_REVIEW' ? 'bg-white' : 'bg-purple-500'}`} />
            <span>In Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'IN_REVIEW'
                  ? 'bg-purple-800/50 text-white'
                  : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
              }`}
            >
              {statusCounts.inReview}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                : 'bg-emerald-500/10 border-emerald-300/70 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'COMPLETED' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>Completed</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-800/50 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {statusCounts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CANCELLED')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              statusFilter === 'CANCELLED'
                ? 'bg-slate-600 text-white border-slate-700 shadow-sm shadow-slate-500/25 ring-2 ring-slate-500/20'
                : 'bg-slate-500/10 border-slate-300/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusFilter === 'CANCELLED' ? 'bg-white' : 'bg-slate-400'}`} />
            <span>Cancelled</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'CANCELLED'
                  ? 'bg-slate-800/50 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {statusCounts.cancelled}
            </span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
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

          {/* Status Filter Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses ({statusCounts.all})</option>
              <option value="PENDING">Pending / To Do ({statusCounts.pending})</option>
              <option value="IN_PROGRESS">In Progress ({statusCounts.inProgress})</option>
              <option value="IN_REVIEW">In Review ({statusCounts.inReview})</option>
              <option value="COMPLETED">Completed ({statusCounts.completed})</option>
              <option value="CANCELLED">Cancelled ({statusCounts.cancelled})</option>
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

          {/* Eisenhower Matrix Tag Filter */}
          <div>
            <select
              value={eisenhowerFilter}
              onChange={(e) => setEisenhowerFilter(e.target.value as any)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Matrix Priority Tags</option>
              <option value="DO_FIRST">🔥 Q1: Do First (Urgent &amp; Important)</option>
              <option value="SCHEDULE">⭐ Q2: Schedule (Important, Not Urgent)</option>
              <option value="DELEGATE">⚡ Q3: Delegate (Urgent, Not Important)</option>
              <option value="ELIMINATE">📦 Q4: Eliminate / Backlog (Not urgent, not important)</option>
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

      {/* Task List or Eisenhower Matrix */}
      {viewMode === 'matrix' ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <strong>Eisenhower Time Management Matrix</strong> — Categorizes tasks by Urgency and Importance
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Click Urgent / Important chips to seamlessly shift tasks between quadrants
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quadrant 1: Urgent & Important (DO FIRST) */}
            <div className="glass-panel p-4 rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200 dark:border-rose-900/40">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase">Q1</span>
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-600" />
                    Do First (Urgent &amp; Important)
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-2.5 py-0.5 rounded-full">
                  {q1Tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">Crises, urgent approvals, critical deadlines</p>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {q1Tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No active tasks in Q1 (Clear!)</p>
                ) : (
                  q1Tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-2 hover:border-rose-400 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => setSelectedTask(task)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-rose-600 cursor-pointer line-clamp-2"
                        >
                          {task.title}
                        </h4>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {task.assignedTo?.name || 'Unassigned'}
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                          <Timer className="w-3 h-3 text-indigo-500" />
                          <span>{task.timeSpentMinutes || 0}m</span>
                        </div>
                        {(task.dueDate || task.dueTime) && (
                          <div className="flex items-center gap-1 font-mono text-[9px] text-amber-600 dark:text-amber-400">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : ''}
                              {task.dueTime ? ` ${task.dueTime}` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'urgent')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isUrgent ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Urgent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'important')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isImportant ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Important
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quadrant 2: Not Urgent & Important (SCHEDULE) */}
            <div className="glass-panel p-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900/40">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white uppercase">Q2</span>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Schedule (Important, Not Urgent)
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
                  {q2Tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">Planning, relationship building, preparation</p>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {q2Tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No active tasks in Q2</p>
                ) : (
                  q2Tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-2 hover:border-emerald-400 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => setSelectedTask(task)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-emerald-600 cursor-pointer line-clamp-2"
                        >
                          {task.title}
                        </h4>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {task.assignedTo?.name || 'Unassigned'}
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                          <Timer className="w-3 h-3 text-indigo-500" />
                          <span>{task.timeSpentMinutes || 0}m</span>
                        </div>
                        {(task.dueDate || task.dueTime) && (
                          <div className="flex items-center gap-1 font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : ''}
                              {task.dueTime ? ` ${task.dueTime}` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'urgent')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isUrgent ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Urgent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'important')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isImportant ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Important
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quadrant 3: Urgent & Not Important (DELEGATE) */}
            <div className="glass-panel p-4 rounded-2xl border-2 border-sky-300 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-900/40">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-600 text-white uppercase">Q3</span>
                  <h3 className="text-sm font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-sky-600" />
                    Delegate (Urgent, Not Important)
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50 px-2.5 py-0.5 rounded-full">
                  {q3Tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-sky-700/80 dark:text-sky-400/80">Routine follow-ups, minor interruptions, quick requests</p>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {q3Tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No active tasks in Q3</p>
                ) : (
                  q3Tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 shadow-sm space-y-2 hover:border-sky-400 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => setSelectedTask(task)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-sky-600 cursor-pointer line-clamp-2"
                        >
                          {task.title}
                        </h4>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {task.assignedTo?.name || 'Unassigned'}
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                          <Timer className="w-3 h-3 text-indigo-500" />
                          <span>{task.timeSpentMinutes || 0}m</span>
                        </div>
                        {(task.dueDate || task.dueTime) && (
                          <div className="flex items-center gap-1 font-mono text-[9px] text-sky-600 dark:text-sky-400">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : ''}
                              {task.dueTime ? ` ${task.dueTime}` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'urgent')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isUrgent ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Urgent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'important')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isImportant ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Important
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quadrant 4: Not Urgent & Not Important (ELIMINATE) */}
            <div className="glass-panel p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500 text-white uppercase">Q4</span>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Eliminate / Backlog (Neither)
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                  {q4Tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Low-priority backlog, optional research, non-pressing items</p>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {q4Tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No active tasks in Q4</p>
                ) : (
                  q4Tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-slate-400 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => setSelectedTask(task)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-slate-600 cursor-pointer line-clamp-2"
                        >
                          {task.title}
                        </h4>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {task.assignedTo?.name || 'Unassigned'}
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                          <Timer className="w-3 h-3 text-indigo-500" />
                          <span>{task.timeSpentMinutes || 0}m</span>
                        </div>
                        {(task.dueDate || task.dueTime) && (
                          <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : ''}
                              {task.dueTime ? ` ${task.dueTime}` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'urgent')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isUrgent ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Urgent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'important')}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${task.isImportant ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            Important
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Completed Tasks Section in Eisenhower View */}
          <div className="glass-panel p-4 md:p-5 rounded-2xl border-2 border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900/40">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white uppercase">DONE</span>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Completed Tasks
                </h3>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
                {completedEisenhowerTasks.length} Completed
              </span>
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              Tasks marked as &quot;Completed&quot; are automatically moved here out of the 4 active quadrants.
            </p>

            {completedEisenhowerTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No completed tasks yet. Mark tasks as Completed in Q1-Q4 above to move them here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {completedEisenhowerTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-2 opacity-95 hover:opacity-100 transition-all hover:border-emerald-400"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        onClick={() => setSelectedTask(task)}
                        className="text-xs font-bold text-slate-700 dark:text-slate-300 line-through decoration-emerald-500 hover:text-emerald-600 cursor-pointer line-clamp-2"
                      >
                        {task.title}
                      </h4>
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickStatusChange(task.id, e.target.value as any)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                      >
                        <option value="COMPLETED">Completed</option>
                        <option value="PENDING">Re-open (Pending)</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">Review</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {task.assignedTo?.name || 'Unassigned'}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Done</span>
                      </div>
                      {task.timeSpentMinutes ? (
                        <div className="flex items-center gap-1 font-mono text-indigo-500">
                          <Timer className="w-3 h-3 text-indigo-500" />
                          <span>{task.timeSpentMinutes}m</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 space-y-2">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
              <p className="text-sm font-semibold">No tasks found matching current filters.</p>
              <p className="text-xs text-slate-400">Click &quot;+ Personal Self-Task&quot; or &quot;Assign Team Task&quot; above to create one.</p>
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

                        {/* Eisenhower Matrix Tag Badge */}
                        {(() => {
                          const quad = getEisenhowerQuadrant(task.isUrgent, task.isImportant);
                          const Icon = quad.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${quad.color.chipBg}`}
                              title={`Eisenhower Classification: ${quad.fullTitle}`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              <span>{quad.qNumber}: {quad.fullTitle}</span>
                            </span>
                          );
                        })()}

                        {/* Self Task Badge */}
                        {task.isSelfTask && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <StickyNote className="w-2.5 h-2.5 text-amber-600" />
                            Personal
                          </span>
                        )}

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

                  {/* Metadata Footer: Elapsed Time, Assignee, Due Date, Time Spent, Eisenhower Toggles */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                    {/* Elapsed Time Badge */}
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold"
                      title={`Exact Assignment Time: ${new Date(task.assignedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                    >
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      <span>Assigned: {formatElapsedTime(task.assignedAt)}</span>
                    </div>

                    {/* Time Spent Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold">
                      <Timer className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Time: {task.timeSpentMinutes || 0}m</span>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Assignee:</span>
                      {task.assignees && task.assignees.length > 1 ? (
                        <span className="flex items-center gap-1" title={task.assignees.map((a) => a.user?.name).filter(Boolean).join(', ')}>
                          <strong className="text-slate-800 dark:text-slate-200">{task.assignedTo?.name || task.assignees[0]?.user?.name}</strong>
                          <span className="px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-200 dark:border-sky-800">
                            +{task.assignees.length - 1} more
                          </span>
                        </span>
                      ) : (
                        <>
                          <strong className="text-slate-800 dark:text-slate-200">{task.assignedTo?.name || 'Unassigned'}</strong>
                          <span className="text-[10px] text-slate-400">({task.assignedTo?.role || ''})</span>
                        </>
                      )}
                    </div>

                    {/* Due Date & Time */}
                    {(task.dueDate || task.dueTime) && (
                      <div
                        className={`flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'Today'}
                          {task.dueTime ? ` (${task.dueTime})` : ''}
                        </span>
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

                    {/* Eisenhower Quick Toggles */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'urgent')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                          task.isUrgent
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                        }`}
                        title="Toggle Urgent flag"
                      >
                        Urgent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEisenhower(task.id, !!task.isUrgent, !!task.isImportant, 'important')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                          task.isImportant
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                        }`}
                        title="Toggle Important flag"
                      >
                        Important
                      </button>
                    </div>

                    {/* Completed By Badge */}
                    {task.status === 'COMPLETED' && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completed by: {task.completedBy?.name || 'Staff'}{task.completedAt ? ` on ${new Date(task.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}` : ''}</span>
                      </div>
                    )}

                    {/* Comments Count */}
                    <div
                      onClick={() => setSelectedTask(task)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
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
      )}

      {/* Personal Self-Task Modal (For ALL Staff) */}
      {isSelfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                Add Personal Self-Task
              </h3>
              <button
                type="button"
                onClick={() => setIsSelfModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs shrink-0">
                {errorMsg}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateSelfTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Task / Reminder Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Call Rajesh Ji at 3 PM regarding HDFC salary slip"
                    value={selfTitle}
                    onChange={(e) => setSelfTitle(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quick Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any specific note or reminder for yourself..."
                    value={selfDesc}
                    onChange={(e) => setSelfDesc(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-500" />
                        Due Date
                      </span>
                      {selfDueDate && (
                        <button
                          type="button"
                          onClick={() => setSelfDueDate('')}
                          className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <DatePickerInput
                      value={selfDueDate}
                      onChange={(val) => setSelfDueDate(val)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      minYear={2024}
                      maxYear={2035}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Due Time
                      </span>
                      {selfDueTime && (
                        <button
                          type="button"
                          onClick={() => setSelfDueTime('')}
                          className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <input
                      type="time"
                      value={selfDueTime}
                      onChange={(e) => setSelfDueTime(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Eisenhower Matrix tags */}
                <EisenhowerSelector
                  isUrgent={selfIsUrgent}
                  isImportant={selfIsImportant}
                  onChange={(urgent, important) => {
                    setSelfIsUrgent(urgent);
                    setSelfIsImportant(important);
                  }}
                />
              </div>

              {/* Fixed Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSelfModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Personal Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-[800px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Assign New Task
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs shrink-0">
                {errorMsg}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Task Title <span className="text-rose-500 font-bold">*</span>
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
                    Detailed Instructions / Remarks <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed instructions, notes, or required deliverables (Mandatory)..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                {/* Priority & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      required
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Assign To Staff (Select Multiple) <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        newAssigneeIds.length > 0
                          ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800'
                          : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
                      }`}>
                        {newAssigneeIds.length > 0 ? `${newAssigneeIds.length} Selected` : 'Select at least 1 *'}
                      </span>
                    </div>

                    {/* Staff Search Box */}
                    <div className="relative mb-1.5">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search staff by name or role..."
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="max-h-28 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                      {assignableUsers
                        .filter((u) => {
                          if (!staffSearchQuery.trim()) return true;
                          const q = staffSearchQuery.toLowerCase();
                          return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
                        })
                        .map((u) => {
                          const isChecked = newAssigneeIds.includes(u.id);
                          return (
                            <label key={u.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    newAssigneeIds.length > 1
                                      ? setNewAssigneeIds(newAssigneeIds.filter(id => id !== u.id))
                                      : setNewAssigneeIds([]);
                                  } else {
                                    setNewAssigneeIds([...newAssigneeIds, u.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 shrink-0"
                              />
                              <span className="font-semibold truncate">{u.name}</span>
                              <span className="text-[10px] text-slate-400 truncate">({u.role})</span>
                            </label>
                          );
                        })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">One task can be assigned to multiple staff members simultaneously.</p>
                  </div>
                </div>

                {/* Due Date, Due Time & Case Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Due Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <DatePickerInput
                      required
                      value={newDueDate}
                      onChange={(val) => setNewDueDate(val)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      minYear={2024}
                      maxYear={2035}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Due Time (hh:mm) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={newDueTime}
                      onChange={(e) => setNewDueTime(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Link to Loan Case <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={newCaseId}
                      onChange={(e) => setNewCaseId(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">{activeCases.length > 0 ? '-- None / General Task (Optional) --' : 'No active cases'}</option>
                      {activeCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clientName} ({c.product})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Eisenhower Matrix tags */}
                <EisenhowerSelector
                  isUrgent={newIsUrgent}
                  isImportant={newIsImportant}
                  onChange={(urgent, important) => {
                    setNewIsUrgent(urgent);
                    setNewIsImportant(important);
                  }}
                  onPriorityChange={(p) => setNewPriority(p)}
                />
              </div>

              {/* Fixed Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Assigning...' : 'Create & Assign Task'}
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
                  {/* Eisenhower Classification Badge */}
                  {(() => {
                    const quad = getEisenhowerQuadrant(selectedTask.isUrgent, selectedTask.isImportant);
                    const Icon = quad.icon;
                    return (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${quad.color.chipBg}`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        <span>{quad.qNumber}: {quad.fullTitle}</span>
                      </span>
                    );
                  })()}
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  Assigned To {selectedTask.assignees && selectedTask.assignees.length > 1 ? `(${selectedTask.assignees.length})` : ''}
                </span>
                {selectedTask.assignees && selectedTask.assignees.length > 1 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedTask.assignees.map((a) => (
                      <span
                        key={a.id || a.userId}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                      >
                        {a.user?.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedTask.assignedTo?.name || 'Unassigned'}
                    </div>
                    <div className="text-[10px] text-slate-400">{selectedTask.assignedTo?.role || ''}</div>
                  </>
                )}
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
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Due Date & Time</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString('en-IN')
                    : 'No deadline'}
                  {selectedTask.dueTime && (
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-sky-500" />
                      {selectedTask.dueTime}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Time Spent</span>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1 font-mono">
                  <Timer className="w-3.5 h-3.5" />
                  {selectedTask.timeSpentMinutes || 0}m
                </div>
                <div className="text-[10px] text-slate-400">
                  {Math.floor((selectedTask.timeSpentMinutes || 0) / 60)}h {(selectedTask.timeSpentMinutes || 0) % 60}m
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Created By</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTask.createdBy?.name || 'Admin'}
                </div>
                <div className="text-[10px] text-slate-400">{selectedTask.createdBy?.role || ''}</div>
              </div>

              {/* Eisenhower Matrix Classification Banner */}
              <div className="col-span-2 sm:col-span-5 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Eisenhower Time Management Matrix:</span>
                </div>
                {(() => {
                  const quad = getEisenhowerQuadrant(selectedTask.isUrgent, selectedTask.isImportant);
                  const Icon = quad.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${quad.color.chipBg}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{quad.qNumber}: {quad.fullTitle}</span>
                    </span>
                  );
                })()}
              </div>

              {selectedTask.status === 'COMPLETED' && (
                <div className="col-span-2 sm:col-span-5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Marked Completed by:</strong> {selectedTask.completedBy?.name || 'Staff Member'}</span>
                  </div>
                  {selectedTask.completedAt && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                      {new Date(selectedTask.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Work Time Spent Logger */}
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Log Time Spent on this Task
                </span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono">
                  Total Logged: {selectedTask.timeSpentMinutes || 0} mins
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLogTimeSpent(selectedTask.id, 15)}
                  disabled={loggingTime}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  +15 mins
                </button>
                <button
                  type="button"
                  onClick={() => handleLogTimeSpent(selectedTask.id, 30)}
                  disabled={loggingTime}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  +30 mins
                </button>
                <button
                  type="button"
                  onClick={() => handleLogTimeSpent(selectedTask.id, 60)}
                  disabled={loggingTime}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  +1 hour
                </button>
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="number"
                    min="1"
                    placeholder="Mins"
                    value={timeMinutesInput}
                    onChange={(e) => setTimeMinutesInput(e.target.value)}
                    className="w-16 px-2 py-1 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const m = parseInt(timeMinutesInput);
                      if (m > 0) handleLogTimeSpent(selectedTask.id, m);
                    }}
                    disabled={loggingTime || !timeMinutesInput}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loggingTime ? 'Saving...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Eisenhower Priority Classification Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                Eisenhower Priority Classification:
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer text-rose-600 dark:text-rose-400">
                  <input
                    type="checkbox"
                    checked={!!selectedTask.isUrgent}
                    onChange={() =>
                      handleToggleEisenhower(
                        selectedTask.id,
                        !!selectedTask.isUrgent,
                        !!selectedTask.isImportant,
                        'urgent'
                      )
                    }
                    className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Urgent</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer text-emerald-600 dark:text-emerald-400">
                  <input
                    type="checkbox"
                    checked={!!selectedTask.isImportant}
                    onChange={() =>
                      handleToggleEisenhower(
                        selectedTask.id,
                        !!selectedTask.isUrgent,
                        !!selectedTask.isImportant,
                        'important'
                      )
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Important</span>
                </label>
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
                  selectedTask.comments.map((cm: any) => (
                    <div
                      key={cm.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {cm.user.name} <span className="font-normal text-slate-400">({cm.user.role})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono">
                            {new Date(cm.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            {cm.isEdited && <span className="text-amber-500 ml-1 font-sans">(edited)</span>}
                          </span>
                          {(cm.user.id === currentUser.id || isSuperAdmin) && editCommentId !== cm.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditCommentId(cm.id);
                                setEditCommentText(cm.content);
                              }}
                              className="text-slate-400 hover:text-sky-500 p-0.5"
                              title="Edit this comment"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {editCommentId === cm.id ? (
                        <div className="space-y-1.5 pt-1">
                          <textarea
                            rows={2}
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditCommentId(null)}
                              className="px-2 py-0.5 rounded text-[10px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditComment(cm.id)}
                              className="px-2.5 py-0.5 rounded text-[10px] bg-sky-600 text-white font-bold hover:bg-sky-500"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{cm.content}</p>
                      )}
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

            {/* Task Activity & Audit Trail Log */}
            <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                Task Activity & Audit Log ({selectedTask.activityLogs?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {!selectedTask.activityLogs || selectedTask.activityLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No activity logs recorded yet.</p>
                ) : (
                  selectedTask.activityLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                            {log.user?.name || 'Staff'}
                            <span className="font-normal text-slate-400 text-[10px] ml-1">({log.user?.role || 'User'})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">{log.details}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditingTask && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-[800px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Edit Task
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingTask(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs shrink-0">
                {errorMsg}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleUpdateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title *
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

                {/* Priority & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                {/* Multi-Staff Assignment Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assign To Staff (Select Multiple) *
                    </label>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 shrink-0">
                      {editAssigneeIds.length} Selected
                    </span>
                  </div>

                  {/* Edit Staff Search Box */}
                  <div className="relative mb-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search staff by name or role..."
                      value={editStaffSearchQuery}
                      onChange={(e) => setEditStaffSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    {assignableUsers
                      .filter((u) => {
                        if (!editStaffSearchQuery.trim()) return true;
                        const q = editStaffSearchQuery.toLowerCase();
                        return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
                      })
                      .map((u) => {
                      const isChecked = editAssigneeIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                            isChecked
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-medium'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  if (editAssigneeIds.length > 1) {
                                    setEditAssigneeIds(editAssigneeIds.filter((id) => id !== u.id));
                                  }
                                } else {
                                  setEditAssigneeIds([...editAssigneeIds, u.id]);
                                }
                              }}
                              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-semibold">{u.name}</span>{' '}
                              <span className="text-[10px] text-slate-400">({u.role})</span>
                            </div>
                          </div>
                          {isChecked && (
                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 shrink-0 ml-2">
                              Assigned
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    One task can be assigned to multiple staff members simultaneously.
                  </p>
                </div>

                {/* Due Date, Due Time & Optional Case Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Due Date</span>
                      {editDueDate && (
                        <button
                          type="button"
                          onClick={() => setEditDueDate('')}
                          className="text-[10px] text-slate-400 hover:text-rose-500"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <DatePickerInput
                      value={editDueDate}
                      onChange={(val) => setEditDueDate(val)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      minYear={2024}
                      maxYear={2035}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Due Time (hh:mm)</span>
                      {editDueTime && (
                        <button
                          type="button"
                          onClick={() => setEditDueTime('')}
                          className="text-[10px] text-slate-400 hover:text-rose-500"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <input
                      type="time"
                      value={editDueTime}
                      onChange={(e) => setEditDueTime(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
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
                </div>

                {/* Quick Increase / Extend Deadline Buttons */}
                <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200">
                    <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Quick Increase / Extend Deadline:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => extendEditDeadline('hour', 1)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 transition-all shadow-xs active:scale-95"
                    >
                      +1 Hr
                    </button>
                    <button
                      type="button"
                      onClick={() => extendEditDeadline('hour', 3)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 transition-all shadow-xs active:scale-95"
                    >
                      +3 Hrs
                    </button>
                    <button
                      type="button"
                      onClick={() => extendEditDeadline('day', 1)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 transition-all shadow-xs active:scale-95"
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => extendEditDeadline('day', 2)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 transition-all shadow-xs active:scale-95"
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => extendEditDeadline('day', 7)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 transition-all shadow-xs active:scale-95"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>

                {/* Eisenhower Matrix tags */}
                <EisenhowerSelector
                  isUrgent={editIsUrgent}
                  isImportant={editIsImportant}
                  onChange={(urgent, important) => {
                    setEditIsUrgent(urgent);
                    setEditIsImportant(important);
                  }}
                  onPriorityChange={(p) => setEditPriority(p)}
                />
              </div>

              {/* Fixed Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
