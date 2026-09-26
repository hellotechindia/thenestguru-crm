'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createVisitRecordAction,
  updateVisitRecordAction,
  updateVisitStatusAction,
  addVisitFollowUpAction,
  deleteVisitRecordAction,
} from '@/app/actions';
import {
  MapPin, Calendar, Clock, Plus, Search, CheckCircle2,
  AlertCircle, User, Building, Phone, ArrowRight, ExternalLink, X,
  Briefcase, MessageSquare, IndianRupee, Timer, AlertTriangle, Send, Check, History, Edit3, Trash2, RotateCcw
} from 'lucide-react';
import { sanitizeTo10Digits, sanitizeToAlphabetsOnly } from '@/lib/validations';

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface ActiveCase {
  id: string;
  clientName: string;
  mobile: string;
  product: string;
}

export interface VisitFollowUpItem {
  id: string;
  visitId: string;
  remark: string;
  authorName: string;
  authorRole: string | null;
  createdAt: string | Date;
}

export interface VisitItem {
  id: string;
  caseId: string | null;
  case: { id: string; clientName: string; product: string } | null;
  clientName: string;
  clientPhone: string | null;
  projectName: string | null;
  projectPrice: number | null;
  propertyAddress: string | null;
  visitDate: string | Date;
  visitTime: string | null;
  staffUserId: string;
  staff: StaffUser;
  visitType: string;
  status: string;
  remarks: string | null;
  lastRemarkAt: string | Date | null;
  followUps?: VisitFollowUpItem[];
  createdAt: string | Date;
}

interface Props {
  initialVisits: VisitItem[];
  staffUsers: StaffUser[];
  activeCases: ActiveCase[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

export function formatIndianCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '';
  const num = Number(amount);
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `₹${cr} Cr`;
  }
  if (num >= 100000) {
    const lk = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${lk} Lakh`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export function getFollowUpTimerInfo(visit: VisitItem): {
  isOverdue: boolean;
  isUrgent: boolean;
  badgeText: string;
  subText: string;
  badgeClass: string;
} {
  if (visit.status === 'COMPLETED') {
    return {
      isOverdue: false,
      isUrgent: false,
      badgeText: 'Completed',
      subText: 'Follow-ups closed',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    };
  }

  if (visit.status === 'CANCELLED') {
    return {
      isOverdue: false,
      isUrgent: false,
      badgeText: 'Cancelled',
      subText: 'Visit cancelled',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
    };
  }

  // Baseline time: When newly scheduled, baseline is visitDate.
  // When a remark is added, baseline resets to lastRemarkAt (or latest follow-up date).
  let baselineMs: number;
  if (visit.lastRemarkAt) {
    baselineMs = new Date(visit.lastRemarkAt).getTime();
  } else if (visit.followUps && visit.followUps.length > 0) {
    baselineMs = new Date(visit.followUps[0].createdAt).getTime();
  } else {
    baselineMs = new Date(visit.visitDate).getTime();
  }

  if (isNaN(baselineMs)) {
    baselineMs = new Date(visit.createdAt).getTime();
  }

  // 3-Day Cycle Timer (72 Hours)
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const deadlineMs = baselineMs + THREE_DAYS_MS;
  const nowMs = Date.now();
  const diffMs = deadlineMs - nowMs;

  if (diffMs <= 0) {
    // Overdue -> Red Mark
    const overdueMs = Math.abs(diffMs);
    const overdueDays = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
    const overdueHours = Math.floor((overdueMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const timeStr = overdueDays > 0 ? `${overdueDays}d ${overdueHours}h overdue` : `${overdueHours}h overdue`;

    return {
      isOverdue: true,
      isUrgent: true,
      badgeText: '🔴 Overdue: Add Remark',
      subText: timeStr,
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20 animate-pulse font-bold',
    };
  }

  const remainingHours = Math.floor(diffMs / (60 * 60 * 1000));
  const remainingDays = Math.floor(remainingHours / 24);
  const remHoursAfterDays = remainingHours % 24;

  if (remainingHours <= 24) {
    return {
      isOverdue: false,
      isUrgent: true,
      badgeText: `⚠️ Due Soon: ${remainingHours}h left`,
      subText: 'Add follow-up remark',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 font-semibold',
    };
  }

  return {
    isOverdue: false,
    isUrgent: false,
    badgeText: `⏳ Timer: ${remainingDays}d ${remHoursAfterDays}h left`,
    subText: 'Next follow-up due',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium',
  };
}

export default function VisitTrackerClient({
  initialVisits = [],
  staffUsers,
  activeCases,
  currentUserId,
  isSuperAdmin,
}: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitItem[]>(initialVisits);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [priceRangeFilter, setPriceRangeFilter] = useState('ALL');

  // Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    caseId: '',
    clientName: '',
    clientPhone: '',
    projectName: '',
    projectPrice: '',
    propertyAddress: '',
    visitDate: '',
    visitTime: '11:00',
    staffUserId: staffUsers[0]?.id || currentUserId,
    visitType: 'PROPERTY_VERIFICATION',
    remarks: '',
  });

  // Edit Modal State
  const [editingVisit, setEditingVisit] = useState<VisitItem | null>(null);
  const [editForm, setEditForm] = useState({
    id: '',
    caseId: '',
    clientName: '',
    clientPhone: '',
    projectName: '',
    projectPrice: '',
    propertyAddress: '',
    visitDate: '',
    visitTime: '11:00',
    staffUserId: '',
    visitType: 'PROPERTY_VERIFICATION',
    status: 'SCHEDULED',
    remarks: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Follow-Up & Remarks Drawer State
  const [activeFollowUpVisit, setActiveFollowUpVisit] = useState<VisitItem | null>(null);
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [markCompleteOnRemark, setMarkCompleteOnRemark] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState('');

  // Extract Unique Project Names for Filter Dropdown
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    visits.forEach((v) => {
      if (v.projectName && v.projectName.trim()) {
        set.add(v.projectName.trim());
      }
    });
    return Array.from(set).sort();
  }, [visits]);

  // Auto-populate when selecting a case in Schedule Modal
  const handleCaseSelect = (caseId: string) => {
    setForm((prev) => {
      if (!caseId) return { ...prev, caseId: '' };
      const matched = activeCases.find((c) => c.id === caseId);
      return {
        ...prev,
        caseId,
        clientName: matched ? matched.clientName : prev.clientName,
        clientPhone: matched ? matched.mobile : prev.clientPhone,
      };
    });
  };

  // Auto-populate when selecting a case in Edit Modal
  const handleEditCaseSelect = (caseId: string) => {
    setEditForm((prev) => {
      if (!caseId) return { ...prev, caseId: '' };
      const matched = activeCases.find((c) => c.id === caseId);
      return {
        ...prev,
        caseId,
        clientName: matched ? matched.clientName : prev.clientName,
        clientPhone: matched ? matched.mobile : prev.clientPhone,
      };
    });
  };

  const handleOpenEdit = (v: VisitItem) => {
    let formattedDate = '';
    try {
      const d = new Date(v.visitDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().slice(0, 10);
      }
    } catch {}

    setEditingVisit(v);
    setEditForm({
      id: v.id,
      caseId: v.caseId || '',
      clientName: v.clientName,
      clientPhone: v.clientPhone || '',
      projectName: v.projectName || '',
      projectPrice: v.projectPrice !== null && v.projectPrice !== undefined ? String(v.projectPrice) : '',
      propertyAddress: v.propertyAddress || '',
      visitDate: formattedDate,
      visitTime: v.visitTime || '11:00',
      staffUserId: v.staffUserId,
      visitType: v.visitType,
      status: v.status,
      remarks: v.remarks || '',
    });
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.clientName.trim() || !editForm.visitDate) {
      setEditError('Please provide Client Name and Visit Date.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    const res = await updateVisitRecordAction({
      id: editForm.id,
      caseId: editForm.caseId || undefined,
      clientName: editForm.clientName.trim(),
      clientPhone: editForm.clientPhone ? editForm.clientPhone.trim() : undefined,
      projectName: editForm.projectName ? editForm.projectName.trim() : undefined,
      projectPrice: editForm.projectPrice ? parseFloat(editForm.projectPrice) : undefined,
      propertyAddress: editForm.propertyAddress ? editForm.propertyAddress.trim() : undefined,
      visitDate: editForm.visitDate,
      visitTime: editForm.visitTime || undefined,
      staffUserId: editForm.staffUserId,
      visitType: editForm.visitType,
      status: editForm.status,
      remarks: editForm.remarks || undefined,
    });

    setEditLoading(false);

    if (res.success && res.visit) {
      const assignedStaff = staffUsers.find((u) => u.id === editForm.staffUserId);
      const linkedCase = activeCases.find((c) => c.id === editForm.caseId);
      const updatedItem: VisitItem = {
        ...(res.visit as any),
        staff: assignedStaff || { id: editForm.staffUserId, name: 'Staff', role: 'MEMBER' },
        case: linkedCase ? { id: linkedCase.id, clientName: linkedCase.clientName, product: linkedCase.product } : null,
      };

      setVisits((prev) => prev.map((v) => (v.id === updatedItem.id ? updatedItem : v)));
      setEditingVisit(null);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update visit.');
    }
  };

  const handleDeleteVisit = async (id: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete the visit record for "${clientName}"?`)) {
      return;
    }

    const res = await deleteVisitRecordAction(id);
    if (res.success) {
      setVisits((prev) => prev.filter((v) => v.id !== id));
      if (activeFollowUpVisit && activeFollowUpVisit.id === id) {
        setActiveFollowUpVisit(null);
      }
      router.refresh();
    } else {
      alert('Failed to delete visit record');
    }
  };

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Status Filter
      if (statusFilter === 'OVERDUE') {
        const timer = getFollowUpTimerInfo(v);
        if (!timer.isOverdue) return false;
      } else if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      // Project Name Filter
      if (projectFilter !== 'ALL') {
        if ((v.projectName || '').toLowerCase() !== projectFilter.toLowerCase()) {
          return false;
        }
      }

      // Project Price Range Filter
      if (priceRangeFilter !== 'ALL') {
        const price = v.projectPrice !== null && v.projectPrice !== undefined ? Number(v.projectPrice) : 0;
        if (priceRangeFilter === 'UNDER_25L' && price >= 2500000) return false;
        if (priceRangeFilter === '25L_50L' && (price < 2500000 || price > 5000000)) return false;
        if (priceRangeFilter === '50L_1CR' && (price < 5000000 || price > 10000000)) return false;
        if (priceRangeFilter === '1CR_2.5CR' && (price < 10000000 || price > 25000000)) return false;
        if (priceRangeFilter === '2.5CR_5CR' && (price < 25000000 || price > 50000000)) return false;
        if (priceRangeFilter === 'ABOVE_5CR' && price <= 50000000) return false;
        if (priceRangeFilter === 'PRICE_NOT_SPECIFIED' && price > 0) return false;
      }

      // Free Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchClient = (v.clientName || '').toLowerCase().includes(q);
        const matchAddress = (v.propertyAddress || '').toLowerCase().includes(q);
        const matchProject = (v.projectName || '').toLowerCase().includes(q);
        const matchStaff = (v.staff?.name || '').toLowerCase().includes(q);
        const matchRemark = (v.remarks || '').toLowerCase().includes(q);
        if (!matchClient && !matchAddress && !matchProject && !matchStaff && !matchRemark) {
          return false;
        }
      }

      return true;
    });
  }, [visits, statusFilter, projectFilter, priceRangeFilter, searchTerm]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;
    let overdueFollowUps = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayVisits = 0;

    visits.forEach((v) => {
      if (v.status === 'SCHEDULED') {
        scheduled++;
        const timer = getFollowUpTimerInfo(v);
        if (timer.isOverdue) overdueFollowUps++;
      }
      if (v.status === 'COMPLETED') completed++;
      if (v.status === 'CANCELLED') cancelled++;
      try {
        const vDate = new Date(v.visitDate);
        if (!isNaN(vDate.getTime()) && vDate.toISOString().slice(0, 10) === todayStr) {
          todayVisits++;
        }
      } catch {}
    });

    return { scheduled, completed, cancelled, todayVisits, overdueFollowUps, total: visits.length };
  }, [visits]);

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.visitDate) {
      setError('Please provide Client Name and Visit Date.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await createVisitRecordAction({
      caseId: form.caseId || undefined,
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone ? form.clientPhone.trim() : undefined,
      projectName: form.projectName ? form.projectName.trim() : undefined,
      projectPrice: form.projectPrice ? parseFloat(form.projectPrice) : undefined,
      propertyAddress: form.propertyAddress ? form.propertyAddress.trim() : undefined,
      visitDate: form.visitDate,
      visitTime: form.visitTime || undefined,
      staffUserId: form.staffUserId,
      visitType: form.visitType,
      remarks: form.remarks || undefined,
    });

    setLoading(false);

    if (res.success && res.visit) {
      const assignedStaff = staffUsers.find((u) => u.id === form.staffUserId);
      const linkedCase = activeCases.find((c) => c.id === form.caseId);
      const newVisitItem: VisitItem = {
        ...res.visit,
        staff: assignedStaff || { id: form.staffUserId, name: 'Staff', role: 'MEMBER' },
        case: linkedCase ? { id: linkedCase.id, clientName: linkedCase.clientName, product: linkedCase.product } : null,
      } as any;

      setVisits([newVisitItem, ...visits]);
      setIsModalOpen(false);
      setForm({
        caseId: '',
        clientName: '',
        clientPhone: '',
        projectName: '',
        projectPrice: '',
        propertyAddress: '',
        visitDate: '',
        visitTime: '11:00',
        staffUserId: staffUsers[0]?.id || currentUserId,
        visitType: 'PROPERTY_VERIFICATION',
        remarks: '',
      });
      router.refresh();
    } else {
      setError(res.error || 'Failed to schedule visit.');
    }
  };

  const handleUpdateStatus = async (visitId: string, newStatus: string) => {
    const res = await updateVisitStatusAction(visitId, newStatus);
    if (res.success && res.visit) {
      setVisits((prev) =>
        prev.map((v) => (v.id === visitId ? { ...v, status: newStatus } : v))
      );
      if (activeFollowUpVisit && activeFollowUpVisit.id === visitId) {
        setActiveFollowUpVisit((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      router.refresh();
    } else {
      alert(res.error || 'Failed to update visit status');
    }
  };

  // Add Follow-Up Remark & Reset the 3-day timer cycle
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUpVisit || !followUpRemark.trim()) {
      setFollowUpError('Please enter a follow-up remark or meeting summary.');
      return;
    }

    setFollowUpLoading(true);
    setFollowUpError('');

    const res = await addVisitFollowUpAction({
      visitId: activeFollowUpVisit.id,
      remark: followUpRemark.trim(),
      markCompleted: markCompleteOnRemark,
    });

    setFollowUpLoading(false);

    if (res.success && res.visit) {
      const updatedVisit = res.visit as any;
      setVisits((prev) =>
        prev.map((v) => (v.id === updatedVisit.id ? updatedVisit : v))
      );
      setActiveFollowUpVisit(updatedVisit);
      setFollowUpRemark('');
      setMarkCompleteOnRemark(false);
      router.refresh();
    } else {
      setFollowUpError(res.error || 'Failed to submit follow-up remark.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Total Visits Logged
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.total}</div>
          <span className="text-[10px] text-slate-400">All recorded site & client visits</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Scheduled / Pending
          </span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.scheduled}</div>
          <span className="text-[10px] text-amber-600/70">Upcoming field verifications</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Completed Visits
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600/70">Verified & successfully closed</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Today's Visits
          </span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.todayVisits}</div>
          <span className="text-[10px] text-indigo-600/70">Scheduled for today</span>
        </div>

        {/* 3-Day Overdue Alerts Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`glass-panel p-5 rounded-2xl border space-y-1 cursor-pointer transition-all ${
            stats.overdueFollowUps > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:shadow-md hover:border-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 3-Day Overdue
            </span>
            {stats.overdueFollowUps > 0 && (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats.overdueFollowUps}
          </div>
          <span className="text-[10px] text-rose-500 font-medium">
            {stats.overdueFollowUps > 0 ? 'Click to view overdue visits' : 'All follow-ups on time'}
          </span>
        </div>
      </div>

      {/* Filter & Action Bar: Search, Status, Project Name, and Price Range */}
      <div className="p-4 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Free Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search client, project, staff, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="OVERDUE">🔴 3-Day Overdue Only</option>
              <option value="SCHEDULED">Scheduled / Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Project Name Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[220px]"
            >
              <option value="ALL">All Projects ({uniqueProjects.length})</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>
                  🏢 {p}
                </option>
              ))}
            </select>

            {/* Project Price Range Filter */}
            <select
              value={priceRangeFilter}
              onChange={(e) => setPriceRangeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Price Ranges</option>
              <option value="UNDER_25L">Under ₹25 Lakhs</option>
              <option value="25L_50L">₹25 L - ₹50 Lakhs</option>
              <option value="50L_1CR">₹50 L - ₹1 Crore</option>
              <option value="1CR_2.5CR">₹1 Cr - ₹2.5 Crores</option>
              <option value="2.5CR_5CR">₹2.5 Cr - ₹5 Crores</option>
              <option value="ABOVE_5CR">Above ₹5 Crores</option>
              <option value="PRICE_NOT_SPECIFIED">Price Not Specified</option>
            </select>

            {(statusFilter !== 'ALL' || projectFilter !== 'ALL' || priceRangeFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setProjectFilter('ALL');
                  setPriceRangeFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-[11px] text-rose-600 hover:underline px-2 py-1 font-semibold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>

          {/* Schedule Visit Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Schedule Visit
          </button>
        </div>

        {/* Filter Summary Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
          <span>Showing <strong className="text-slate-800 dark:text-slate-200">{filteredVisits.length}</strong> of {visits.length} visits</span>
          {projectFilter !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Project: {projectFilter}
            </span>
          )}
          {priceRangeFilter !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Price: {priceRangeFilter.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Visits Table */}
      <div className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs border-collapse">
            <colgroup>
              <col className="w-[20%] min-w-[200px]" />
              <col className="w-[18%] min-w-[180px]" />
              <col className="w-[12%] min-w-[120px]" />
              <col className="w-[12%] min-w-[120px]" />
              <col className="w-[16%] min-w-[160px]" />
              <col className="w-[8%] min-w-[90px]" />
              <col className="w-[14%] min-w-[160px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] tracking-wider bg-slate-50/80 dark:bg-slate-800/60 select-none">
                <th className="py-3.5 px-4 text-left">Client & Contact</th>
                <th className="py-3.5 px-4 text-left">Project & Property</th>
                <th className="py-3.5 px-4 text-left">Visit Date & Time</th>
                <th className="py-3.5 px-4 text-left">Assigned Staff</th>
                <th className="py-3.5 px-4 text-center">3-Day Follow-Up Timer</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVisits.length > 0 ? (
                filteredVisits.map((v) => {
                  let dateStr = '--';
                  try {
                    const vd = new Date(v.visitDate);
                    if (!isNaN(vd.getTime())) {
                      dateStr = vd.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                    }
                  } catch {}

                  const timerInfo = getFollowUpTimerInfo(v);
                  const followUpCount = v.followUps?.length || (v.remarks ? 1 : 0);

                  return (
                    <tr
                      key={v.id}
                      className={`transition ${
                        timerInfo.isOverdue
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/40 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Client Info */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                              {v.clientName}
                            </span>
                            {v.case && (
                              <Link
                                href={`/cases/${v.case.id}`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:underline"
                              >
                                <span>{v.case.product}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            )}
                          </div>
                          {v.clientPhone && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{v.clientPhone}</span>
                            </div>
                          )}
                          <div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {v.visitType.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Project & Property Details */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1">
                          {v.projectName && (
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-xs">
                              <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{v.projectName}</span>
                            </div>
                          )}
                          {v.projectPrice ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              <IndianRupee className="w-2.5 h-2.5" />
                              {formatIndianCurrency(v.projectPrice)}
                            </div>
                          ) : null}
                          {v.propertyAddress ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[180px]" title={v.propertyAddress}>{v.propertyAddress}</span>
                            </div>
                          ) : (
                            !v.projectName && <span className="text-[10px] text-slate-400 italic">No details specified</span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                          {v.visitTime && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>{v.visitTime}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{v.staff?.name || 'Staff Member'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 pl-4">{v.staff?.role || 'Staff'}</div>
                        </div>
                      </td>

                      {/* 3-Day Follow-Up Timer / Red Overdue Indicator */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setActiveFollowUpVisit(v);
                            setFollowUpRemark('');
                            setFollowUpError('');
                          }}
                          title="Click to view history or add follow-up remark"
                          className={`inline-flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border text-[11px] transition-all hover:scale-[1.02] shadow-xs cursor-pointer ${timerInfo.badgeClass}`}
                        >
                          <span className="font-bold">{timerInfo.badgeText}</span>
                          <span className="text-[9px] opacity-85 mt-0.5">{timerInfo.subText}</span>
                        </button>
                        {v.status === 'SCHEDULED' && timerInfo.isOverdue && (
                          <div className="text-[9px] text-rose-600 dark:text-rose-400 font-extrabold mt-1 animate-pulse">
                            ⚠️ Remark Overdue
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-xs ${
                            v.status === 'COMPLETED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : v.status === 'CANCELLED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Follow-Up / Remarks Modal Trigger */}
                          <button
                            onClick={() => {
                              setActiveFollowUpVisit(v);
                              setFollowUpRemark('');
                              setFollowUpError('');
                            }}
                            title="View Follow-Up Timeline & Add Remarks"
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer ${
                              timerInfo.isOverdue
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-500/30'
                                : 'bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Follow-Up ({followUpCount})</span>
                          </button>

                          {/* Edit Visit Button */}
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="Edit Visit Details"
                            className="p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-sky-500" />
                            <span>Edit</span>
                          </button>

                          {v.status === 'SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(v.id, 'COMPLETED')}
                                title="Mark visit complete"
                                className="p-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Done</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(v.id, 'CANCELLED')}
                                title="Cancel visit"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] transition cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {v.status !== 'SCHEDULED' && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'SCHEDULED')}
                              title="Re-open visit"
                              className="p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-medium transition cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-500" />
                              <span>Reopen</span>
                            </button>
                          )}

                          {/* Delete Button (Super Admin or Staff) */}
                          <button
                            onClick={() => handleDeleteVisit(v.id, v.clientName)}
                            title="Delete Visit Record"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 italic text-xs">
                    No visit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Visit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Schedule Client / Property Visit
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleScheduleVisit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link to Existing Case <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={form.caseId}
                  onChange={(e) => handleCaseSelect(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">-- Standalone Visit / No Case --</option>
                  {activeCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.product}) - {c.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Client Name"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: sanitizeToAlphabetsOnly(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={form.clientPhone}
                    onChange={(e) => setForm({ ...form, clientPhone: sanitizeTo10Digits(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Project Name and Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-indigo-500" /> Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DLF The Arbour, Godrej Woods..."
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-500" /> Project Price (₹)
                    </label>
                    {form.projectPrice && (
                      <span className="text-[10px] font-bold text-emerald-600 font-mono">
                        {formatIndianCurrency(Number(form.projectPrice))}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="1000"
                    placeholder="e.g. 8500000"
                    value={form.projectPrice}
                    onChange={(e) => setForm({ ...form, projectPrice: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Address / Visit Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Palm Heights, Sector 62, Noida"
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.visitDate}
                    onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Time
                  </label>
                  <input
                    type="time"
                    value={form.visitTime}
                    onChange={(e) => setForm({ ...form, visitTime: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Staff Executive *
                  </label>
                  <select
                    required
                    value={form.staffUserId}
                    onChange={(e) => setForm({ ...form, staffUserId: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Objective / Type
                  </label>
                  <select
                    value={form.visitType}
                    onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  >
                    <option value="PROPERTY_VERIFICATION">Property Verification</option>
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="DOCUMENT_COLLECTION">Document Collection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Remarks / Meeting Agenda <span className="text-slate-400 font-normal">(Starts 3-day timer)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about verification requirements or visit briefing..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
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
                  {loading ? 'Scheduling...' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Visit Modal */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-600" />
                Edit Visit Record
              </h3>
              <button
                onClick={() => setEditingVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link to Existing Case <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={editForm.caseId}
                  onChange={(e) => handleEditCaseSelect(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">-- Standalone Visit / No Case --</option>
                  {activeCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.product}) - {c.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Client Name"
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({ ...editForm, clientName: sanitizeToAlphabetsOnly(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={editForm.clientPhone}
                    onChange={(e) => setEditForm({ ...editForm, clientPhone: sanitizeTo10Digits(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Project Name and Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-indigo-500" /> Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DLF The Arbour, Godrej Woods..."
                    value={editForm.projectName}
                    onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-500" /> Project Price (₹)
                    </label>
                    {editForm.projectPrice && (
                      <span className="text-[10px] font-bold text-emerald-600 font-mono">
                        {formatIndianCurrency(Number(editForm.projectPrice))}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="1000"
                    placeholder="e.g. 8500000"
                    value={editForm.projectPrice}
                    onChange={(e) => setEditForm({ ...editForm, projectPrice: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Address / Visit Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Palm Heights, Sector 62, Noida"
                  value={editForm.propertyAddress}
                  onChange={(e) => setEditForm({ ...editForm, propertyAddress: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.visitDate}
                    onChange={(e) => setEditForm({ ...editForm, visitDate: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Time
                  </label>
                  <input
                    type="time"
                    value={editForm.visitTime}
                    onChange={(e) => setEditForm({ ...editForm, visitTime: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Staff Executive *
                  </label>
                  <select
                    required
                    value={editForm.staffUserId}
                    onChange={(e) => setEditForm({ ...editForm, staffUserId: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-sky-600"
                  >
                    <option value="SCHEDULED">Scheduled / Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Visit Objective / Type
                </label>
                <select
                  value={editForm.visitType}
                  onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                >
                  <option value="PROPERTY_VERIFICATION">Property Verification</option>
                  <option value="CLIENT_MEETING">Client Meeting</option>
                  <option value="DOCUMENT_COLLECTION">Document Collection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Meeting Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about verification requirements or visit briefing..."
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editLoading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-Up & Remarks Timeline Modal / Drawer */}
      {activeFollowUpVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    Follow-Up & Remarks Timeline
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeFollowUpVisit.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}
                  >
                    {activeFollowUpVisit.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: <strong className="text-slate-700 dark:text-slate-200">{activeFollowUpVisit.clientName}</strong>
                  {activeFollowUpVisit.projectName && ` • Project: ${activeFollowUpVisit.projectName}`}
                </p>
              </div>
              <button
                onClick={() => setActiveFollowUpVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current 3-Day Cycle Timer Banner */}
            {(() => {
              const timer = getFollowUpTimerInfo(activeFollowUpVisit);
              return (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between shrink-0 ${
                    timer.isOverdue
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20'
                      : timer.isUrgent
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold">{timer.badgeText}</span>
                      <span className="text-[11px] block opacity-85">{timer.subText}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-right">
                    <span>Cycle: <strong>3 Days</strong> per Remark</span>
                    <span className="block opacity-75">Resets when remark is added</span>
                  </div>
                </div>
              );
            })()}

            {/* Timeline of Previous Remarks */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Previous Follow-Ups & Remarks History
              </div>

              {activeFollowUpVisit.followUps && activeFollowUpVisit.followUps.length > 0 ? (
                <div className="space-y-2.5">
                  {activeFollowUpVisit.followUps.map((fu, idx) => {
                    let formattedDate = '--';
                    try {
                      formattedDate = new Date(fu.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    } catch {}

                    return (
                      <div
                        key={fu.id || idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            👤 {fu.authorName} {fu.authorRole ? `(${fu.authorRole})` : ''}
                          </span>
                          <span className="font-mono">{formattedDate}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {fu.remark}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : activeFollowUpVisit.remarks ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold text-slate-700 dark:text-slate-300">
                    Initial Remark
                  </div>
                  <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                    {activeFollowUpVisit.remarks}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs italic">
                  No follow-ups recorded yet. Add the first remark below to start the timeline!
                </div>
              )}
            </div>

            {/* Add Follow-Up Form */}
            <form onSubmit={handleAddFollowUp} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
              {followUpError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {followUpError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Add New Follow-Up Remark * <span className="font-normal text-slate-400">(Resets 3-day timer)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter detailed client discussion, visit outcome, or next steps..."
                  value={followUpRemark}
                  onChange={(e) => setFollowUpRemark(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markCompleteOnRemark}
                    onChange={(e) => setMarkCompleteOnRemark(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Mark visit as <strong>COMPLETED</strong> (resolves follow-ups)</span>
                </label>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveFollowUpVisit(null)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={followUpLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {followUpLoading ? 'Saving...' : 'Add Remark & Reset Timer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
