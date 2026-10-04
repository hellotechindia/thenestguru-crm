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
  createBuilderAction,
  updateBuilderAction,
  deleteBuilderAction,
} from '@/app/actions';
import {
  MapPin, Calendar, Clock, Plus, Search, CheckCircle2,
  AlertCircle, User, Building, Phone, ArrowRight, ExternalLink, X,
  Briefcase, MessageSquare, IndianRupee, Timer, AlertTriangle, Send, Check, History, Edit3, Trash2, RotateCcw,
  Download, Eye, Flame, Snowflake, Zap, Layers, Landmark, FileText, UserCheck, ShieldCheck,
  Building2, ChevronDown, ChevronUp, FolderPlus
} from 'lucide-react';
import { sanitizeTo10Digits, sanitizeToAlphabetsOnly } from '@/lib/validations';
import DatePickerInput from './DatePickerInput';
import { exportToCSV } from '@/lib/excel-export';

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

  // Client's Specifications
  builderId?: string | null;
  builderName?: string | null;
  projectType?: string | null;
  projectLaunchDate?: string | null;
  reraStatus?: string | null;
  approvedBanks?: string | null;
  priceRange?: string | null;
  totalUnits?: string | null;
  unitsSold?: string | null;
  paymentPlan?: string | null;
  concernedPersonName?: string | null;
  concernedPersonDesignation?: string | null;
  concernedPersonContact?: string | null;
  officeAddress?: string | null;
  cpName?: string | null;
  cpContact?: string | null;
  cpAddress?: string | null;
  visitFrequency?: string | null;
  nextFollowUpDate?: string | Date | null;
  leadType?: string | null;
}

export interface BuilderItem {
  id: string;
  name: string;
  contactPerson?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  officeAddress?: string | null;
  reraNumber?: string | null;
  approvedBanks?: string | null;
  notes?: string | null;
  _count?: {
    visits: number;
  };
}

interface Props {
  initialVisits: VisitItem[];
  staffUsers: StaffUser[];
  activeCases: ActiveCase[];
  currentUserId: string;
  isSuperAdmin: boolean;
  isTeamLeader?: boolean;
  builders?: BuilderItem[];
  channelPartners?: Array<{
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }>;
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

  let baselineMs: number;
  if (visit.lastRemarkAt) {
    baselineMs = new Date(visit.lastRemarkAt).getTime();
  } else if (visit.followUps && visit.followUps.length > 0) {
    baselineMs = new Date(visit.followUps[0].createdAt).getTime();
  } else {
    baselineMs = new Date(visit.visitDate).getTime();
  }

  const nowMs = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const deadlineMs = baselineMs + threeDaysMs;
  const remainingMs = deadlineMs - nowMs;

  if (remainingMs <= 0) {
    const overdueDays = Math.floor(Math.abs(remainingMs) / (24 * 60 * 60 * 1000));
    return {
      isOverdue: true,
      isUrgent: true,
      badgeText: overdueDays === 0 ? 'Due Today' : `${overdueDays}d Overdue`,
      subText: 'Follow-up Required!',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse font-bold',
    };
  }

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  if (remainingHours <= 24) {
    return {
      isOverdue: false,
      isUrgent: true,
      badgeText: `${remainingHours}h remaining`,
      subText: 'Add Remark Soon',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 font-semibold',
    };
  }

  return {
    isOverdue: false,
    isUrgent: false,
    badgeText: `${remainingDays}d remaining`,
    subText: 'Cycle active',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  };
}

interface VisitObjective {
  id: string;
  name: string;
}

const DEFAULT_OBJECTIVES: VisitObjective[] = [
  { id: 'PROPERTY_VERIFICATION', name: 'Property Verification' },
  { id: 'CLIENT_MEETING', name: 'Client Meeting' },
  { id: 'DOCUMENT_COLLECTION', name: 'Document Collection' },
];

export default function VisitTrackerClient({
  initialVisits = [],
  staffUsers,
  activeCases,
  currentUserId,
  isSuperAdmin,
  isTeamLeader = false,
  builders = [],
  channelPartners = [],
}: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitItem[]>(initialVisits);
  const [buildersList, setBuildersList] = useState<BuilderItem[]>(builders);

  // Dynamic Visit Objectives State
  const [objectives, setObjectives] = useState<VisitObjective[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nestguru_visit_objectives');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return DEFAULT_OBJECTIVES;
  });
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [newObjectiveName, setNewObjectiveName] = useState('');
  const [editingObjective, setEditingObjective] = useState<VisitObjective | null>(null);

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveName.trim()) return;
    const id = newObjectiveName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const updated = [...objectives, { id, name: newObjectiveName.trim() }];
    setObjectives(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nestguru_visit_objectives', JSON.stringify(updated));
    }
    setNewObjectiveName('');
  };

  const handleUpdateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingObjective || !editingObjective.name.trim()) return;
    const updated = objectives.map((o) =>
      o.id === editingObjective.id ? { ...o, name: editingObjective.name.trim() } : o
    );
    setObjectives(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nestguru_visit_objectives', JSON.stringify(updated));
    }
    setEditingObjective(null);
  };

  const handleDeleteObjective = (id: string) => {
    if (objectives.length <= 1) {
      alert('At least one visit objective is required.');
      return;
    }
    const updated = objectives.filter((o) => o.id !== id);
    setObjectives(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nestguru_visit_objectives', JSON.stringify(updated));
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [leadTypeFilter, setLeadTypeFilter] = useState('ALL');
  const [projectTypeFilter, setProjectTypeFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [priceRangeFilter, setPriceRangeFilter] = useState('ALL');
  const [builderFilter, setBuilderFilter] = useState('ALL');

  // View Mode: 'LIST' | 'BUILDER_GROUPED'
  const [viewMode, setViewMode] = useState<'LIST' | 'BUILDER_GROUPED'>('LIST');
  const [expandedBuilders, setExpandedBuilders] = useState<Record<string, boolean>>({});

  // Builder Management Modal (Super Admin & Team Leader)
  const canManageBuilders = isSuperAdmin || isTeamLeader;
  const [isBuilderMasterOpen, setIsBuilderMasterOpen] = useState(false);
  const [builderEditingId, setBuilderEditingId] = useState<string | null>(null);
  const [builderForm, setBuilderForm] = useState({
    name: '',
    contactPerson: '',
    designation: '',
    phone: '',
    email: '',
    officeAddress: '',
    reraNumber: '',
    approvedBanks: '',
    notes: '',
  });
  const [builderActionLoading, setBuilderActionLoading] = useState(false);
  const [builderActionError, setBuilderActionError] = useState('');
  const [builderActionSuccess, setBuilderActionSuccess] = useState('');
  const [builderSearch, setBuilderSearch] = useState('');

  // Specs View Modal
  const [viewSpecsVisit, setViewSpecsVisit] = useState<VisitItem | null>(null);

  // Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'CORE' | 'BUILDER' | 'PERSON' | 'STRATEGY'>('CORE');
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

    // Client Specifications
    builderName: '',
    projectType: 'Residential',
    projectLaunchDate: '',
    reraStatus: '',
    approvedBanks: '',
    priceRange: '',
    totalUnits: '',
    unitsSold: '',
    paymentPlan: '',
    concernedPersonName: '',
    concernedPersonDesignation: '',
    concernedPersonContact: '',
    officeAddress: '',
    cpName: '',
    cpContact: '',
    cpAddress: '',
    visitFrequency: '',
    nextFollowUpDate: '',
    leadType: 'Warm',
  });

  // Edit Modal State
  const [editingVisit, setEditingVisit] = useState<VisitItem | null>(null);
  const [editModalTab, setEditModalTab] = useState<'CORE' | 'BUILDER' | 'PERSON' | 'STRATEGY'>('CORE');
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

    // Client Specifications
    builderName: '',
    projectType: 'Residential',
    projectLaunchDate: '',
    reraStatus: '',
    approvedBanks: '',
    priceRange: '',
    totalUnits: '',
    unitsSold: '',
    paymentPlan: '',
    concernedPersonName: '',
    concernedPersonDesignation: '',
    concernedPersonContact: '',
    officeAddress: '',
    cpName: '',
    cpContact: '',
    cpAddress: '',
    visitFrequency: '',
    nextFollowUpDate: '',
    leadType: 'Warm',
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

  // Handle Selecting a Builder from Directory Dropdown
  const handleSelectBuilder = (builderName: string, isEdit: boolean = false) => {
    const matched = buildersList.find((b) => b.name === builderName);
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        builderName,
        concernedPersonName: prev.concernedPersonName || matched?.contactPerson || '',
        concernedPersonDesignation: prev.concernedPersonDesignation || matched?.designation || '',
        concernedPersonContact: prev.concernedPersonContact || matched?.phone || '',
        officeAddress: prev.officeAddress || matched?.officeAddress || '',
        approvedBanks: prev.approvedBanks || matched?.approvedBanks || '',
        reraStatus: prev.reraStatus || (matched?.reraNumber ? `RERA: ${matched.reraNumber}` : ''),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        builderName,
        concernedPersonName: prev.concernedPersonName || matched?.contactPerson || '',
        concernedPersonDesignation: prev.concernedPersonDesignation || matched?.designation || '',
        concernedPersonContact: prev.concernedPersonContact || matched?.phone || '',
        officeAddress: prev.officeAddress || matched?.officeAddress || '',
        approvedBanks: prev.approvedBanks || matched?.approvedBanks || '',
        reraStatus: prev.reraStatus || (matched?.reraNumber ? `RERA: ${matched.reraNumber}` : ''),
      }));
    }
  };

  const toggleBuilderExpand = (builderKey: string) => {
    setExpandedBuilders((prev) => ({
      ...prev,
      [builderKey]: !prev[builderKey],
    }));
  };

  const handleSaveBuilder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderForm.name.trim()) {
      setBuilderActionError('Builder Name is required.');
      return;
    }
    setBuilderActionLoading(true);
    setBuilderActionError('');
    setBuilderActionSuccess('');

    try {
      if (builderEditingId) {
        const res = await updateBuilderAction({
          id: builderEditingId,
          ...builderForm,
        });
        if (res.success && res.builder) {
          setBuildersList((prev) =>
            prev.map((b) => (b.id === builderEditingId ? { ...b, ...res.builder } : b))
          );
          setBuilderActionSuccess('Builder details updated successfully!');
          setTimeout(() => {
            setBuilderEditingId(null);
            setBuilderForm({ name: '', contactPerson: '', designation: '', phone: '', email: '', officeAddress: '', reraNumber: '', approvedBanks: '', notes: '' });
            setBuilderActionSuccess('');
          }, 1000);
        } else {
          setBuilderActionError(res.error || 'Failed to update builder.');
        }
      } else {
        const res = await createBuilderAction(builderForm);
        if (res.success && res.builder) {
          setBuildersList((prev) => [...prev, res.builder as any].sort((a, b) => a.name.localeCompare(b.name)));
          setBuilderActionSuccess(`Builder "${res.builder.name}" added to directory!`);
          setBuilderForm({ name: '', contactPerson: '', designation: '', phone: '', email: '', officeAddress: '', reraNumber: '', approvedBanks: '', notes: '' });
          setTimeout(() => setBuilderActionSuccess(''), 2000);
        } else {
          setBuilderActionError(res.error || 'Failed to create builder.');
        }
      }
    } catch (err: any) {
      setBuilderActionError(err.message || 'An error occurred.');
    } finally {
      setBuilderActionLoading(false);
    }
  };

  const handleDeleteBuilder = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete builder "${name}" from directory?`)) return;
    try {
      const res = await deleteBuilderAction(id);
      if (res.success) {
        setBuildersList((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert(res.error || 'Failed to delete builder.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete builder.');
    }
  };

  const handleEditBuilderClick = (b: BuilderItem) => {
    setBuilderEditingId(b.id);
    setBuilderForm({
      name: b.name || '',
      contactPerson: b.contactPerson || '',
      designation: b.designation || '',
      phone: b.phone || '',
      email: b.email || '',
      officeAddress: b.officeAddress || '',
      reraNumber: b.reraNumber || '',
      approvedBanks: b.approvedBanks || '',
      notes: b.notes || '',
    });
  };

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

    let formattedNextFuDate = '';
    if (v.nextFollowUpDate) {
      try {
        const d = new Date(v.nextFollowUpDate);
        if (!isNaN(d.getTime())) {
          formattedNextFuDate = d.toISOString().slice(0, 10);
        }
      } catch {}
    }

    setEditingVisit(v);
    setEditModalTab('CORE');
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

      builderName: v.builderName || '',
      projectType: v.projectType || 'Residential',
      projectLaunchDate: v.projectLaunchDate || '',
      reraStatus: v.reraStatus || '',
      approvedBanks: v.approvedBanks || '',
      priceRange: v.priceRange || '',
      totalUnits: v.totalUnits || '',
      unitsSold: v.unitsSold || '',
      paymentPlan: v.paymentPlan || '',
      concernedPersonName: v.concernedPersonName || '',
      concernedPersonDesignation: v.concernedPersonDesignation || '',
      concernedPersonContact: v.concernedPersonContact || '',
      officeAddress: v.officeAddress || '',
      cpName: v.cpName || '',
      cpContact: v.cpContact || '',
      cpAddress: v.cpAddress || '',
      visitFrequency: v.visitFrequency || '',
      nextFollowUpDate: formattedNextFuDate,
      leadType: v.leadType || 'Warm',
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

      builderName: editForm.builderName || undefined,
      projectType: editForm.projectType || undefined,
      projectLaunchDate: editForm.projectLaunchDate || undefined,
      reraStatus: editForm.reraStatus || undefined,
      approvedBanks: editForm.approvedBanks || undefined,
      priceRange: editForm.priceRange || undefined,
      totalUnits: editForm.totalUnits || undefined,
      unitsSold: editForm.unitsSold || undefined,
      paymentPlan: editForm.paymentPlan || undefined,
      concernedPersonName: editForm.concernedPersonName || undefined,
      concernedPersonDesignation: editForm.concernedPersonDesignation || undefined,
      concernedPersonContact: editForm.concernedPersonContact || undefined,
      officeAddress: editForm.officeAddress || undefined,
      cpName: editForm.cpName || undefined,
      cpContact: editForm.cpContact || undefined,
      cpAddress: editForm.cpAddress || undefined,
      visitFrequency: editForm.visitFrequency || undefined,
      nextFollowUpDate: editForm.nextFollowUpDate || undefined,
      leadType: editForm.leadType || undefined,
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
      if (viewSpecsVisit && viewSpecsVisit.id === id) {
        setViewSpecsVisit(null);
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

      // Lead Type Filter
      if (leadTypeFilter !== 'ALL') {
        if ((v.leadType || '').toLowerCase() !== leadTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // Project Type Filter
      if (projectTypeFilter !== 'ALL') {
        if ((v.projectType || '').toLowerCase() !== projectTypeFilter.toLowerCase()) {
          return false;
        }
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

      // Builder Filter
      if (builderFilter !== 'ALL') {
        if ((v.builderName || '').toLowerCase() !== builderFilter.toLowerCase()) {
          return false;
        }
      }

      // Free Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchClient = (v.clientName || '').toLowerCase().includes(q);
        const matchAddress = (v.propertyAddress || '').toLowerCase().includes(q);
        const matchProject = (v.projectName || '').toLowerCase().includes(q);
        const matchBuilder = (v.builderName || '').toLowerCase().includes(q);
        const matchCp = (v.cpName || '').toLowerCase().includes(q);
        const matchConcerned = (v.concernedPersonName || '').toLowerCase().includes(q);
        const matchStaff = (v.staff?.name || '').toLowerCase().includes(q);
        const matchRemark = (v.remarks || '').toLowerCase().includes(q);
        if (!matchClient && !matchAddress && !matchProject && !matchBuilder && !matchCp && !matchConcerned && !matchStaff && !matchRemark) {
          return false;
        }
      }

      return true;
    });
  }, [visits, statusFilter, leadTypeFilter, projectTypeFilter, projectFilter, priceRangeFilter, builderFilter, searchTerm]);

  // Group visits by Builder Name for Multi-Sales Combine View
  const groupedVisitsByBuilder = useMemo(() => {
    const map = new Map<string, {
      builderName: string;
      builderInfo?: BuilderItem;
      visits: VisitItem[];
      totalVisits: number;
      uniqueStaff: StaffUser[];
      uniqueProjects: string[];
      leadBreakdown: { hot: number; warm: number; cold: number };
      latestVisitDate?: Date;
    }>();

    // First populate registered builders
    buildersList.forEach((b) => {
      map.set(b.name.trim().toLowerCase(), {
        builderName: b.name,
        builderInfo: b,
        visits: [],
        totalVisits: 0,
        uniqueStaff: [],
        uniqueProjects: [],
        leadBreakdown: { hot: 0, warm: 0, cold: 0 },
      });
    });

    // Populate with filtered visits
    filteredVisits.forEach((v) => {
      const bName = v.builderName?.trim() || 'Independent / Unassigned Builder';
      const key = bName.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          builderName: bName,
          visits: [],
          totalVisits: 0,
          uniqueStaff: [],
          uniqueProjects: [],
          leadBreakdown: { hot: 0, warm: 0, cold: 0 },
        };
        map.set(key, entry);
      }

      entry.visits.push(v);
      entry.totalVisits++;

      if (v.staff && !entry.uniqueStaff.some((s) => s.id === v.staff.id)) {
        entry.uniqueStaff.push(v.staff);
      }
      if (v.projectName?.trim() && !entry.uniqueProjects.includes(v.projectName.trim())) {
        entry.uniqueProjects.push(v.projectName.trim());
      }

      const lt = (v.leadType || '').toUpperCase();
      if (lt === 'HOT') entry.leadBreakdown.hot++;
      else if (lt === 'COLD') entry.leadBreakdown.cold++;
      else entry.leadBreakdown.warm++;
    });

    // Sort visits chronologically inside each builder (latest first)
    map.forEach((entry) => {
      entry.visits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      if (entry.visits.length > 0) {
        entry.latestVisitDate = new Date(entry.visits[0].visitDate);
      }
    });

    // If builderFilter is set to something specific, filter to that builder
    let result = Array.from(map.values());
    if (builderFilter !== 'ALL') {
      result = result.filter((item) => item.builderName.toLowerCase() === builderFilter.toLowerCase());
    }

    return result.sort((a, b) => {
      if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
      return a.builderName.localeCompare(b.builderName);
    });
  }, [filteredVisits, buildersList, builderFilter]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;
    let overdueFollowUps = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayVisits = 0;

    let hotLeads = 0;
    let warmLeads = 0;
    let coldLeads = 0;

    visits.forEach((v) => {
      if (v.status === 'SCHEDULED') {
        scheduled++;
        const timer = getFollowUpTimerInfo(v);
        if (timer.isOverdue) overdueFollowUps++;
      }
      if (v.status === 'COMPLETED') completed++;
      if (v.status === 'CANCELLED') cancelled++;

      const lType = (v.leadType || '').toUpperCase();
      if (lType === 'HOT') hotLeads++;
      else if (lType === 'COLD') coldLeads++;
      else warmLeads++;

      try {
        const vDate = new Date(v.visitDate);
        if (!isNaN(vDate.getTime()) && vDate.toISOString().slice(0, 10) === todayStr) {
          todayVisits++;
        }
      } catch {}
    });

    return {
      scheduled,
      completed,
      cancelled,
      todayVisits,
      overdueFollowUps,
      total: visits.length,
      hotLeads,
      warmLeads,
      coldLeads,
    };
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

      builderName: form.builderName || undefined,
      projectType: form.projectType || undefined,
      projectLaunchDate: form.projectLaunchDate || undefined,
      reraStatus: form.reraStatus || undefined,
      approvedBanks: form.approvedBanks || undefined,
      priceRange: form.priceRange || undefined,
      totalUnits: form.totalUnits || undefined,
      unitsSold: form.unitsSold || undefined,
      paymentPlan: form.paymentPlan || undefined,
      concernedPersonName: form.concernedPersonName || undefined,
      concernedPersonDesignation: form.concernedPersonDesignation || undefined,
      concernedPersonContact: form.concernedPersonContact || undefined,
      officeAddress: form.officeAddress || undefined,
      cpName: form.cpName || undefined,
      cpContact: form.cpContact || undefined,
      cpAddress: form.cpAddress || undefined,
      visitFrequency: form.visitFrequency || undefined,
      nextFollowUpDate: form.nextFollowUpDate || undefined,
      leadType: form.leadType || undefined,
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
      setModalTab('CORE');
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

        builderName: '',
        projectType: 'Residential',
        projectLaunchDate: '',
        reraStatus: '',
        approvedBanks: '',
        priceRange: '',
        totalUnits: '',
        unitsSold: '',
        paymentPlan: '',
        concernedPersonName: '',
        concernedPersonDesignation: '',
        concernedPersonContact: '',
        officeAddress: '',
        cpName: '',
        cpContact: '',
        cpAddress: '',
        visitFrequency: '',
        nextFollowUpDate: '',
        leadType: 'Warm',
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
      if (viewSpecsVisit && viewSpecsVisit.id === visitId) {
        setViewSpecsVisit((prev) => (prev ? { ...prev, status: newStatus } : null));
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

  const handleExportVisitsCSV = () => {
    if (filteredVisits.length === 0) {
      alert('No visit records found to export.');
      return;
    }

    const rows = filteredVisits.map((v) => {
      let visitDateStr = '';
      try {
        const d = new Date(v.visitDate);
        if (!isNaN(d.getTime())) visitDateStr = d.toLocaleDateString('en-IN');
      } catch {}

      let nextFuStr = '';
      if (v.nextFollowUpDate) {
        try {
          const d = new Date(v.nextFollowUpDate);
          if (!isNaN(d.getTime())) nextFuStr = d.toLocaleDateString('en-IN');
        } catch {}
      }

      return {
        'Client Name': v.clientName,
        'Client Phone': v.clientPhone || '',
        'Status': v.status,
        'Visit Date': visitDateStr,
        'Visit Time': v.visitTime || '',
        'Assigned Staff': v.staff?.name || '',
        'Lead Type': v.leadType || 'Warm',
        'Builder Name': v.builderName || '',
        'Project Name': v.projectName || '',
        'Project Type': v.projectType || '',
        'Project Launch Date': v.projectLaunchDate || '',
        'RERA Status': v.reraStatus || '',
        'Approved Banks': v.approvedBanks || '',
        'Price Range': v.priceRange || (v.projectPrice ? formatIndianCurrency(v.projectPrice) : ''),
        'Total Units': v.totalUnits || '',
        'Units Sold': v.unitsSold || '',
        'Payment Plan': v.paymentPlan || '',
        'Concerned Person Name': v.concernedPersonName || '',
        'Concerned Person Designation': v.concernedPersonDesignation || '',
        'Concerned Person Contact': v.concernedPersonContact || '',
        'Office Address': v.officeAddress || '',
        'CP Name': v.cpName || '',
        'CP Contact': v.cpContact || '',
        'CP Address': v.cpAddress || '',
        'Visit Frequency': v.visitFrequency || '',
        'Next Follow-Up Date': nextFuStr,
        'Property Address': v.propertyAddress || '',
        'Remarks': v.remarks || '',
      };
    });

    exportToCSV(`visits_report_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Total Visits
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.total}</div>
          <span className="text-[10px] text-slate-400">All recorded visits</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Scheduled / Active
          </span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.scheduled}</div>
          <span className="text-[10px] text-amber-600/70">In progress / pending</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Completed Visits
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600/70">Verified & closed</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Today's Visits
          </span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.todayVisits}</div>
          <span className="text-[10px] text-indigo-600/70">Scheduled today</span>
        </div>

        {/* Lead Temperature Metric */}
        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Hot Leads
          </span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats.hotLeads}</div>
          <span className="text-[10px] text-slate-400">Warm: {stats.warmLeads} • Cold: {stats.coldLeads}</span>
        </div>

        {/* 3-Day Overdue Alerts Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`glass-panel p-4 rounded-2xl border space-y-1 cursor-pointer transition-all ${
            stats.overdueFollowUps > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:shadow-md hover:border-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 3-Day Overdue
            </span>
            {stats.overdueFollowUps > 0 && (
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats.overdueFollowUps}
          </div>
          <span className="text-[10px] text-rose-500 font-medium truncate block">
            {stats.overdueFollowUps > 0 ? 'Click to filter overdue' : 'All follow-ups on track'}
          </span>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="p-4 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        {/* View Mode Switcher & Directory Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>📋 Individual Visits</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
                {filteredVisits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('BUILDER_GROUPED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'BUILDER_GROUPED'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Combined by Builder</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-extrabold">
                {groupedVisitsByBuilder.length} Builders
              </span>
            </button>
          </div>

          {canManageBuilders && (
            <button
              type="button"
              onClick={() => {
                setBuilderEditingId(null);
                setBuilderForm({ name: '', contactPerson: '', designation: '', phone: '', email: '', officeAddress: '', reraNumber: '', approvedBanks: '', notes: '' });
                setIsBuilderMasterOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-sky-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition border border-indigo-500/30 cursor-pointer shadow-xs"
              title="Manage dynamic Builders Directory (Add/Edit/Delete)"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>🏢 Manage Builders ({buildersList.length})</span>
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Free Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search client, project, builder, CP, staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Builder Filter Dropdown */}
            <select
              value={builderFilter}
              onChange={(e) => setBuilderFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[170px]"
            >
              <option value="ALL">🏢 All Builders ({buildersList.length})</option>
              {buildersList.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="OVERDUE">🔴 3-Day Overdue Only</option>
              <option value="SCHEDULED">Scheduled / Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Lead Type Filter (Hot/Warm/Cold) */}
            <select
              value={leadTypeFilter}
              onChange={(e) => setLeadTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Lead Types</option>
              <option value="Hot">🔥 Hot Lead</option>
              <option value="Warm">⚡ Warm Lead</option>
              <option value="Cold">❄️ Cold Lead</option>
            </select>

            {/* Project Type Filter (Residential/Commercial/Industrial) */}
            <select
              value={projectTypeFilter}
              onChange={(e) => setProjectTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Project Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
            </select>

            {/* Project Name Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[170px]"
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
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
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

            {(statusFilter !== 'ALL' || leadTypeFilter !== 'ALL' || projectTypeFilter !== 'ALL' || projectFilter !== 'ALL' || priceRangeFilter !== 'ALL' || builderFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setLeadTypeFilter('ALL');
                  setProjectTypeFilter('ALL');
                  setProjectFilter('ALL');
                  setPriceRangeFilter('ALL');
                  setBuilderFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-[11px] text-rose-600 hover:underline px-2 py-1 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Action Buttons: Export & Schedule */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportVisitsCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
              title="Export filtered visits to Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setModalTab('CORE');
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition shrink-0"
            >
              <Plus className="w-4 h-4" /> Schedule Visit
            </button>
          </div>
        </div>

        {/* Filter Summary Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
          <span>Showing <strong className="text-slate-800 dark:text-slate-200">{filteredVisits.length}</strong> of {visits.length} visits</span>
          {leadTypeFilter !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold">
              Lead: {leadTypeFilter}
            </span>
          )}
          {projectTypeFilter !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold">
              Type: {projectTypeFilter}
            </span>
          )}
          {projectFilter !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Project: {projectFilter}
            </span>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: INDIVIDUAL VISITS TABLE */}
      {viewMode === 'LIST' && (
        <div className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-xs border-collapse">
            <colgroup>
              <col className="w-[18%] min-w-[190px]" />
              <col className="w-[20%] min-w-[210px]" />
              <col className="w-[14%] min-w-[150px]" />
              <col className="w-[12%] min-w-[130px]" />
              <col className="w-[13%] min-w-[140px]" />
              <col className="w-[8%] min-w-[90px]" />
              <col className="w-[15%] min-w-[170px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] tracking-wider bg-slate-50/80 dark:bg-slate-800/60 select-none">
                <th className="py-3.5 px-4 text-left">Client & Contact</th>
                <th className="py-3.5 px-4 text-left">Builder & Project</th>
                <th className="py-3.5 px-4 text-left">CP & Next FU</th>
                <th className="py-3.5 px-4 text-left">Visit Date & Staff</th>
                <th className="py-3.5 px-4 text-center">3-Day Timer</th>
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

                  let nextFuStr = '';
                  if (v.nextFollowUpDate) {
                    try {
                      const nfd = new Date(v.nextFollowUpDate);
                      if (!isNaN(nfd.getTime())) {
                        nextFuStr = nfd.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                      }
                    } catch {}
                  }

                  const timerInfo = getFollowUpTimerInfo(v);
                  const followUpCount = v.followUps?.length || (v.remarks ? 1 : 0);

                  const lead = (v.leadType || 'Warm').toLowerCase();
                  const leadBadge =
                    lead === 'hot' ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <Flame className="w-2.5 h-2.5 text-rose-600 fill-rose-500" /> Hot
                      </span>
                    ) : lead === 'cold' ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                        <Snowflake className="w-2.5 h-2.5 text-sky-600" /> Cold
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Zap className="w-2.5 h-2.5 text-amber-600" /> Warm
                      </span>
                    );

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
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                              {v.clientName}
                            </span>
                            {leadBadge}
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

                      {/* Builder & Project Details */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          {/* Project & Builder */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.projectName ? (
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-xs">
                                <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate max-w-[170px]" title={v.projectName}>{v.projectName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No Project</span>
                            )}
                            {v.projectType && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                {v.projectType}
                              </span>
                            )}
                          </div>

                          {/* Builder Name */}
                          {v.builderName && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                              <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">Builder: {v.builderName}</span>
                            </div>
                          )}

                          {/* Source Indicator */}
                          <div className="pt-0.5">
                            {v.builderName ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Source: 🏢 Builder ({v.builderName})
                              </span>
                            ) : v.cpName ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                Source: 🤝 CP ({v.cpName})
                              </span>
                            ) : v.case ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                Source: 📁 Case ({v.case.clientName})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Source: Direct Client
                              </span>
                            )}
                          </div>

                          {/* Price Range */}
                          {(v.priceRange || v.projectPrice) && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              <IndianRupee className="w-2.5 h-2.5" />
                              <span>{v.priceRange || formatIndianCurrency(v.projectPrice)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Channel Partner (CP) & Next Follow-Up */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          {v.cpName ? (
                            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="truncate max-w-[140px]" title={`${v.cpName} ${v.cpContact ? `(${v.cpContact})` : ''}`}>
                                {v.cpName}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">No CP Assigned</div>
                          )}

                          {nextFuStr ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>Next: {nextFuStr}</span>
                            </div>
                          ) : null}

                          {v.visitFrequency && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              Freq: {v.visitFrequency}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Visit Date & Assigned Staff */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
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
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                            <User className="w-2.5 h-2.5 text-slate-400" />
                            <span>{v.staff?.name || 'Staff Member'}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3-Day Follow-Up Timer */}
                      <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
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
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
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
                      <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Specs Modal Trigger */}
                          <button
                            onClick={() => setViewSpecsVisit(v)}
                            title="View all Builder, Project & CP details"
                            className="p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-indigo-500" />
                            <span>Specs</span>
                          </button>

                          {/* Follow-Up / Remarks Modal Trigger */}
                          <button
                            onClick={() => {
                              setActiveFollowUpVisit(v);
                              setFollowUpRemark('');
                              setFollowUpError('');
                            }}
                            title="View Follow-Up Timeline & Add Remarks"
                            className={`p-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer ${
                              timerInfo.isOverdue
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>FU ({followUpCount})</span>
                          </button>

                          {/* Edit Visit Button */}
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="Edit Visit Details"
                            className="p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-sky-500" />
                          </button>

                          {v.status === 'SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(v.id, 'COMPLETED')}
                                title="Mark visit complete"
                                className="p-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
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
                            </button>
                          )}

                          {/* Delete Button */}
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
      )}

      {/* VIEW MODE 2: COMBINED MULTI-SALES GROUPED BY BUILDER */}
      {viewMode === 'BUILDER_GROUPED' && (
        <div className="space-y-4">
          {groupedVisitsByBuilder.length === 0 ? (
            <div className="p-12 text-center text-slate-400 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">No builder visits found matching current filters.</p>
            </div>
          ) : (
            groupedVisitsByBuilder.map((group) => {
              const bKey = group.builderName.toLowerCase();
              const isExpanded = !!expandedBuilders[bKey];
              const bInfo = group.builderInfo;

              return (
                <div
                  key={group.builderName}
                  className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Builder Header Card */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-indigo-50/30 dark:from-slate-800/40 dark:via-slate-900 dark:to-indigo-950/20 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>{group.builderName}</span>
                            {bInfo?.reraNumber && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                                RERA: {bInfo.reraNumber}
                              </span>
                            )}
                          </h3>
                          {bInfo?.officeAddress && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{bInfo.officeAddress}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Builder Contact & Banks Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
                        {bInfo?.contactPerson && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <strong>{bInfo.contactPerson}</strong>
                            {bInfo.designation && <span className="text-slate-400">({bInfo.designation})</span>}
                          </span>
                        )}
                        {bInfo?.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{bInfo.phone}</span>
                          </span>
                        )}
                        {bInfo?.approvedBanks && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                            <Landmark className="w-3 h-3 text-sky-500" />
                            <span>Banks: {bInfo.approvedBanks}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Combined Metrics & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                      {/* KPI Summary Block */}
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        {/* Total Combined Visits */}
                        <div className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Combined Visits
                          </div>
                          <div className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                            {group.totalVisits}
                          </div>
                          <div className="text-[9px] text-slate-400">multi-sales team</div>
                        </div>

                        {/* Sales Reps Involved */}
                        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Sales Reps
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            {group.uniqueStaff.length}
                          </div>
                          <div className="text-[9px] text-slate-400">team members</div>
                        </div>

                        {/* Lead Breakdown */}
                        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center col-span-2 sm:col-span-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Lead Heat
                          </div>
                          <div className="text-xs font-black flex items-center justify-center gap-1.5 mt-1">
                            <span className="text-rose-600 font-mono">🔥 {group.leadBreakdown.hot}</span>
                            <span className="text-amber-600 font-mono">⚡ {group.leadBreakdown.warm}</span>
                            <span className="text-sky-600 font-mono">❄️ {group.leadBreakdown.cold}</span>
                          </div>
                          <div className="text-[9px] text-slate-400">hot / warm / cold</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              builderName: group.builderName,
                              concernedPersonName: bInfo?.contactPerson || prev.concernedPersonName,
                              concernedPersonDesignation: bInfo?.designation || prev.concernedPersonDesignation,
                              concernedPersonContact: bInfo?.phone || prev.concernedPersonContact,
                              officeAddress: bInfo?.officeAddress || prev.officeAddress,
                              approvedBanks: bInfo?.approvedBanks || prev.approvedBanks,
                            }));
                            setModalTab('CORE');
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Schedule Visit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleBuilderExpand(bKey)}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>{isExpanded ? 'Hide Visits' : `View ${group.totalVisits} Visits`}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Sales Team Members Badges Bar */}
                  <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Sales Reps Visiting:
                      </span>
                      {group.uniqueStaff.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No sales team visits yet</span>
                      ) : (
                        group.uniqueStaff.map((staff) => {
                          const staffVisitCount = group.visits.filter((v) => v.staffUserId === staff.id).length;
                          return (
                            <span
                              key={staff.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-semibold"
                            >
                              <User className="w-3 h-3 text-sky-500" />
                              <span>{staff.name}</span>
                              <span className="px-1 py-0.2 rounded-full bg-sky-200 dark:bg-sky-800 text-[9px] font-bold">
                                {staffVisitCount}
                              </span>
                            </span>
                          );
                        })
                      )}
                    </div>

                    {group.uniqueProjects.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                          Projects:
                        </span>
                        {group.uniqueProjects.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold"
                          >
                            <Building className="w-3 h-3 text-purple-500" />
                            <span>{p}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expandable Multi-Sales Visit History Timeline */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 space-y-3">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-indigo-500" />
                        <span>Combined Multi-Sales Visit Records for {group.builderName}</span>
                      </div>

                      {group.visits.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                          No visits logged for this builder yet. Click "Schedule Visit" to log the first visit!
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold text-[10px] uppercase">
                                <th className="py-2.5 px-3">Date & Time</th>
                                <th className="py-2.5 px-3">Sales Rep</th>
                                <th className="py-2.5 px-3">Client & Contact</th>
                                <th className="py-2.5 px-3">Project / Units</th>
                                <th className="py-2.5 px-3 text-center">Lead Type</th>
                                <th className="py-2.5 px-3 text-center">Status</th>
                                <th className="py-2.5 px-3 text-center">3-Day Timer</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {group.visits.map((v) => {
                                const timerInfo = getFollowUpTimerInfo(v);
                                const vLead = (v.leadType || 'Warm').toLowerCase();
                                const fuCount = v.followUps?.length || (v.remarks ? 1 : 0);

                                return (
                                  <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                      <div>{new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                      <div className="text-[10px] text-slate-400">{v.visitTime || '--'}</div>
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                      <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold">
                                        👤 {v.staff?.name || 'Staff'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-bold text-slate-900 dark:text-white">{v.clientName}</div>
                                      {v.clientPhone && <div className="text-[10px] text-slate-400 font-mono">{v.clientPhone}</div>}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-semibold text-slate-800 dark:text-slate-200">{v.projectName || '--'}</div>
                                      <div className="text-[10px] text-emerald-600 font-mono">{v.priceRange || (v.projectPrice ? formatIndianCurrency(v.projectPrice) : '')}</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        vLead === 'hot' ? 'bg-rose-100 text-rose-700' : vLead === 'cold' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {vLead === 'hot' ? '🔥 Hot' : vLead === 'cold' ? '❄️ Cold' : '⚡ Warm'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        v.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                        v.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                        'bg-sky-50 text-sky-600 border border-sky-200'
                                      }`}>
                                        {v.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${timerInfo.badgeClass}`}>
                                        {timerInfo.badgeText}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => setViewSpecsVisit(v)}
                                          title="View Specs"
                                          className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveFollowUpVisit(v);
                                            setFollowUpRemark('');
                                          }}
                                          title="Follow-ups"
                                          className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" /> ({fuCount})
                                        </button>
                                        <button
                                          onClick={() => handleOpenEdit(v)}
                                          title="Edit Visit"
                                          className="p-1 rounded text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950 cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View Specs & Details Modal */}
      {viewSpecsVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {viewSpecsVisit.clientName}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        viewSpecsVisit.status === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : viewSpecsVisit.status === 'CANCELLED'
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                      }`}
                    >
                      {viewSpecsVisit.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Visit Record #{viewSpecsVisit.id.slice(-8).toUpperCase()} • Objective: <strong className="text-slate-700 dark:text-slate-300">{viewSpecsVisit.visitType}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewSpecsVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Core Visit & Client Details (Step 1 Info) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> 1. Core Visit & Client Information
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Client Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewSpecsVisit.clientName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Client Contact</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {viewSpecsVisit.clientPhone || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Visit Date & Time</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(viewSpecsVisit.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {viewSpecsVisit.visitTime || '11:00 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Assigned Executive</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {viewSpecsVisit.staff?.name || 'Staff'} {viewSpecsVisit.staff?.role ? `(${viewSpecsVisit.staff.role})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Visit Objective</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {viewSpecsVisit.visitType}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Linked Loan Case</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {viewSpecsVisit.case ? `${viewSpecsVisit.case.clientName} (${viewSpecsVisit.case.product})` : 'Standalone / Direct'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Property Address / Visit Location</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {viewSpecsVisit.propertyAddress || '--'}
                  </span>
                </div>
              </div>

              {/* Card 2: Builder / CP & Project Specifications (Step 2 Info) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> 2. Builder / CP & Project Specifications
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Builder Name / CP</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {viewSpecsVisit.builderName ? (
                        <>🏢 {viewSpecsVisit.builderName}</>
                      ) : viewSpecsVisit.cpName ? (
                        <>🤝 {viewSpecsVisit.cpName} (CP)</>
                      ) : (
                        '--'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Project Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.projectName || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Project Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.projectType || 'Residential'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Launch Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.projectLaunchDate || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">RERA Status</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.reraStatus || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Approved Banks</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.approvedBanks || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Price Range</span>
                    <span className="font-semibold text-emerald-600 font-mono">
                      {viewSpecsVisit.priceRange || (viewSpecsVisit.projectPrice ? formatIndianCurrency(viewSpecsVisit.projectPrice) : '--')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Units (Total / Sold)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.totalUnits || '--'} / {viewSpecsVisit.unitsSold || '--'}</span>
                  </div>
                </div>
                {viewSpecsVisit.paymentPlan && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Payment Plan</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.paymentPlan}</span>
                  </div>
                )}
              </div>

              {/* Card 3: Concerned Authority / Office Details (Step 3 Info) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="font-bold text-teal-600 dark:text-teal-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> 3. Concerned Person & Office Details
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Concerned Person Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {viewSpecsVisit.concernedPersonName || (viewSpecsVisit.cpName ? viewSpecsVisit.cpName : '--')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Designation</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {viewSpecsVisit.concernedPersonDesignation || (viewSpecsVisit.cpName ? 'Channel Partner' : '--')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Contact Details (Mobile / Email)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {viewSpecsVisit.concernedPersonContact || viewSpecsVisit.cpContact || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Office / Business Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewSpecsVisit.officeAddress || viewSpecsVisit.cpAddress || '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Strategy & Follow-up (Step 4 Info) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" /> 4. Strategy, Timeline & Next Follow-Up
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Lead Classification</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewSpecsVisit.leadType === 'Hot'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : viewSpecsVisit.leadType === 'Cold'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {viewSpecsVisit.leadType || 'Warm'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Frequency of Visit</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{viewSpecsVisit.visitFrequency || '--'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Next Follow-Up Date</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {viewSpecsVisit.nextFollowUpDate ? new Date(viewSpecsVisit.nextFollowUpDate).toLocaleDateString('en-IN') : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Initial / General Remarks</span>
                    <p className="text-slate-700 dark:text-slate-300 italic">{viewSpecsVisit.remarks || 'No remarks recorded.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = viewSpecsVisit;
                  setViewSpecsVisit(null);
                  handleOpenEdit(target);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Visit Details
              </button>
              <button
                type="button"
                onClick={() => setViewSpecsVisit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Schedule New Visit & Project Information
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs for form sections */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('CORE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  modalTab === 'CORE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                1. Core Visit Info *
              </button>
              <button
                type="button"
                onClick={() => setModalTab('BUILDER')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  modalTab === 'BUILDER'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                2. Builder & Project Specs
              </button>
              <button
                type="button"
                onClick={() => setModalTab('PERSON')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  modalTab === 'PERSON'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                3. Concerned Person & Office
              </button>
              <button
                type="button"
                onClick={() => setModalTab('STRATEGY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  modalTab === 'STRATEGY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                4. Strategy & Next FU
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold shrink-0">
                {error}
              </div>
            )}

            <form onSubmit={handleScheduleVisit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* TAB 1: CORE VISIT INFO */}
              {modalTab === 'CORE' && (
                <div className="space-y-3 animate-in fade-in">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Visit Date * (DD/MM/YYYY)
                      </label>
                      <DatePickerInput
                        required
                        value={form.visitDate}
                        onChange={(val) => setForm({ ...form, visitDate: val })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                        minYear={1990}
                        maxYear={2050}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Visit Objective / Type
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsObjectiveModalOpen(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          + Manage Objectives
                        </button>
                      </div>
                      <select
                        value={form.visitType}
                        onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                      >
                        {objectives.map((obj) => (
                          <option key={obj.id} value={obj.id}>
                            {obj.name}
                          </option>
                        ))}
                      </select>
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
                </div>
              )}

              {/* TAB 2: BUILDER & PROJECT DETAILS (Item 1) */}
              {modalTab === 'BUILDER' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
                    <strong>Builder & Project Data:</strong> Enter all structural details, RERA compliance, launch dates, and pricing.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Builder Name / CP *
                        </label>
                        {canManageBuilders && (
                          <button
                            type="button"
                            onClick={() => setIsBuilderMasterOpen(true)}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                          >
                            <Building2 className="w-3 h-3" />
                            + Manage Builders
                          </button>
                        )}
                      </div>
                      <select
                        value={form.builderName ? `BUILDER:${form.builderName}` : (form.cpName ? `CP:${form.cpName}` : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setForm({ ...form, builderName: '', cpName: '', cpContact: '', cpAddress: '' });
                          } else if (val.startsWith('BUILDER:')) {
                            const bName = val.replace('BUILDER:', '');
                            handleSelectBuilder(bName, false);
                            setForm((prev) => ({ ...prev, cpName: '', cpContact: '', cpAddress: '' }));
                          } else if (val.startsWith('CP:')) {
                            const cpVal = val.replace('CP:', '');
                            const cp = channelPartners.find((c) => (c.name || c.id) === cpVal || c.id === cpVal || c.name === cpVal);
                            setForm((prev) => ({
                              ...prev,
                              builderName: '',
                              cpName: cp?.name || cpVal,
                              cpContact: cp?.phone || '',
                              cpAddress: cp?.address || '',
                              concernedPersonName: prev.concernedPersonName || cp?.name || '',
                              concernedPersonContact: prev.concernedPersonContact || cp?.phone || '',
                              officeAddress: prev.officeAddress || cp?.address || '',
                            }));
                          }
                        }}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                      >
                        <option value="">-- Select Builder or Channel Partner --</option>
                        <optgroup label="🏢 Builders">
                          {buildersList.map((b) => (
                            <option key={b.id} value={`BUILDER:${b.name}`}>
                              🏢 {b.name} {b.reraNumber ? `(RERA: ${b.reraNumber})` : ''}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🤝 Channel Partners (CP)">
                          {channelPartners.map((cp) => (
                            <option key={cp.id} value={`CP:${cp.name || cp.id}`}>
                              🤝 {cp.name || 'Unnamed CP'} {cp.phone ? `(${cp.phone})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {form.builderName && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                          <span>🏢 Selected Builder: <strong>{form.builderName}</strong></span>
                        </div>
                      )}
                      {form.cpName && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                          <span>🤝 Selected Channel Partner: <strong>{form.cpName}</strong></span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Project Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. The Arbour, Sector 63"
                        value={form.projectName}
                        onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Type of Project
                      </label>
                      <select
                        value={form.projectType}
                        onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Launch / Expected Date
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jan 2025 or DD/MM/YYYY"
                        value={form.projectLaunchDate}
                        onChange={(e) => setForm({ ...form, projectLaunchDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        RERA Status
                      </label>
                      <input
                        type="text"
                        placeholder="Received / Expected by Dec..."
                        value={form.reraStatus}
                        onChange={(e) => setForm({ ...form, reraStatus: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Bank's Name Approved
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SBI, HDFC, ICICI, Axis Bank"
                        value={form.approvedBanks}
                        onChange={(e) => setForm({ ...form, approvedBanks: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Price Range
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹75 L - ₹1.5 Cr"
                        value={form.priceRange}
                        onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total No. of Units
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 450"
                        value={form.totalUnits}
                        onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Units Sold (If Any)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 180"
                        value={form.unitsSold}
                        onChange={(e) => setForm({ ...form, unitsSold: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Plan
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10:90, CLP, Subvention"
                        value={form.paymentPlan}
                        onChange={(e) => setForm({ ...form, paymentPlan: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONCERNED PERSON & OFFICE */}
              {modalTab === 'PERSON' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3 bg-sky-50/50 dark:bg-sky-950/30 rounded-xl text-xs text-sky-700 dark:text-sky-300">
                    <strong>Concerned Person Details:</strong> Builder / Developer sales head, site manager, or official contact person.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Concerned Person Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Rajesh Sharma"
                        value={form.concernedPersonName}
                        onChange={(e) => setForm({ ...form, concernedPersonName: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VP Sales / Site Manager"
                        value={form.concernedPersonDesignation}
                        onChange={(e) => setForm({ ...form, concernedPersonDesignation: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Details (Mobile / E-mail ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9811223344 / rajesh@builder.com"
                      value={form.concernedPersonContact}
                      onChange={(e) => setForm({ ...form, concernedPersonContact: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Office Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Corporate Office, 5th Floor, Tower B, Cyber City, Gurugram"
                      value={form.officeAddress}
                      onChange={(e) => setForm({ ...form, officeAddress: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: STRATEGY & NEXT FU */}
              {modalTab === 'STRATEGY' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                    <strong>Strategy & Follow-Up:</strong> Set lead temperature, frequency of visits, and next scheduled action.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Lead Type *
                      </label>
                      <select
                        value={form.leadType}
                        onChange={(e) => setForm({ ...form, leadType: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="Hot">🔥 Hot (High Intent)</option>
                        <option value="Warm">⚡ Warm (Considering)</option>
                        <option value="Cold">❄️ Cold (Early Stage)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Frequency of Visit (days / Month)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Once a week, 15 days, Monthly"
                        value={form.visitFrequency}
                        onChange={(e) => setForm({ ...form, visitFrequency: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Next FU Date (DD/MM/YYYY)
                      </label>
                      <DatePickerInput
                        value={form.nextFollowUpDate}
                        onChange={(val) => setForm({ ...form, nextFollowUpDate: val })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                        minYear={1990}
                        maxYear={2050}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Remarks / Agenda <span className="text-slate-400 font-normal">(Starts 3-day follow-up timer)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Notes about verification requirements or visit briefing..."
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Navigation & Submit Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  {modalTab !== 'CORE' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'STRATEGY') setModalTab('PERSON');
                        else if (modalTab === 'PERSON') setModalTab('BUILDER');
                        else if (modalTab === 'BUILDER') setModalTab('CORE');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ← Previous
                    </button>
                  )}
                  {modalTab !== 'STRATEGY' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'CORE') setModalTab('BUILDER');
                        else if (modalTab === 'BUILDER') setModalTab('PERSON');
                        else if (modalTab === 'PERSON') setModalTab('STRATEGY');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      Next Section →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
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
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {loading ? 'Scheduling...' : 'Save & Schedule Visit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Visit Modal */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-600" />
                Edit Visit & Project Record
              </h3>
              <button
                onClick={() => setEditingVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs for Edit */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setEditModalTab('CORE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  editModalTab === 'CORE'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                1. Core Info
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('BUILDER')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  editModalTab === 'BUILDER'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                2. Builder & Project Specs
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('PERSON')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  editModalTab === 'PERSON'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                3. Concerned Person
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('STRATEGY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  editModalTab === 'STRATEGY'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                4. Strategy & Next FU
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold shrink-0">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* TAB 1: CORE VISIT INFO */}
              {editModalTab === 'CORE' && (
                <div className="space-y-3 animate-in fade-in">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Visit Date * (DD/MM/YYYY)
                      </label>
                      <DatePickerInput
                        required
                        value={editForm.visitDate}
                        onChange={(val) => setEditForm({ ...editForm, visitDate: val })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                        minYear={1990}
                        maxYear={2050}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Visit Objective / Type
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsObjectiveModalOpen(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          + Manage
                        </button>
                      </div>
                      <select
                        value={editForm.visitType}
                        onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                      >
                        {objectives.map((obj) => (
                          <option key={obj.id} value={obj.id}>
                            {obj.name}
                          </option>
                        ))}
                      </select>
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
                </div>
              )}

              {/* TAB 2: BUILDER & PROJECT DETAILS */}
              {editModalTab === 'BUILDER' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Builder Name / CP
                        </label>
                        {canManageBuilders && (
                          <button
                            type="button"
                            onClick={() => setIsBuilderMasterOpen(true)}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                          >
                            <Building2 className="w-3 h-3" />
                            + Manage Builders
                          </button>
                        )}
                      </div>
                      <select
                        value={editForm.builderName ? `BUILDER:${editForm.builderName}` : editForm.cpName ? `CP:${editForm.cpName}` : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setEditForm({ ...editForm, builderName: '', cpName: '', cpContact: '', cpAddress: '' });
                            return;
                          }
                          if (val.startsWith('BUILDER:')) {
                            const bName = val.replace('BUILDER:', '');
                            handleSelectBuilder(bName, true);
                            setEditForm((prev) => ({ ...prev, cpName: '', cpContact: '', cpAddress: '' }));
                          } else if (val.startsWith('CP:')) {
                            const cpVal = val.replace('CP:', '');
                            const cp = channelPartners.find((c) => (c.name || c.id) === cpVal || c.id === cpVal || c.name === cpVal);
                            setEditForm((prev) => ({
                              ...prev,
                              builderName: '',
                              cpName: cp?.name || cpVal,
                              cpContact: cp?.phone || '',
                              cpAddress: cp?.address || '',
                              concernedPersonName: prev.concernedPersonName || cp?.name || '',
                              concernedPersonContact: prev.concernedPersonContact || cp?.phone || '',
                              officeAddress: prev.officeAddress || cp?.address || '',
                            }));
                          }
                        }}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                      >
                        <option value="">-- Select Builder or Channel Partner --</option>
                        <optgroup label="🏢 Builders">
                          {buildersList.map((b) => (
                            <option key={b.id} value={`BUILDER:${b.name}`}>
                              🏢 {b.name} {b.reraNumber ? `(RERA: ${b.reraNumber})` : ''}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🤝 Channel Partners (CP)">
                          {channelPartners.map((cp) => (
                            <option key={cp.id} value={`CP:${cp.name || cp.id}`}>
                              🤝 {cp.name || 'Unnamed CP'} {cp.phone ? `(${cp.phone})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {editForm.builderName && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                          <span>🏢 Selected Builder: <strong>{editForm.builderName}</strong></span>
                        </div>
                      )}
                      {editForm.cpName && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                          <span>🤝 Selected Channel Partner: <strong>{editForm.cpName}</strong></span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Project Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. The Arbour, Sector 63"
                        value={editForm.projectName}
                        onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Type of Project
                      </label>
                      <select
                        value={editForm.projectType}
                        onChange={(e) => setEditForm({ ...editForm, projectType: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Launch / Expected Date
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jan 2025 or DD/MM/YYYY"
                        value={editForm.projectLaunchDate}
                        onChange={(e) => setEditForm({ ...editForm, projectLaunchDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        RERA Status
                      </label>
                      <input
                        type="text"
                        placeholder="Received / Expected by Dec..."
                        value={editForm.reraStatus}
                        onChange={(e) => setEditForm({ ...editForm, reraStatus: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Bank's Name Approved
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SBI, HDFC, ICICI, Axis Bank"
                        value={editForm.approvedBanks}
                        onChange={(e) => setEditForm({ ...editForm, approvedBanks: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Price Range
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹75 L - ₹1.5 Cr"
                        value={editForm.priceRange}
                        onChange={(e) => setEditForm({ ...editForm, priceRange: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total No. of Units
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 450"
                        value={editForm.totalUnits}
                        onChange={(e) => setEditForm({ ...editForm, totalUnits: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Units Sold
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 180"
                        value={editForm.unitsSold}
                        onChange={(e) => setEditForm({ ...editForm, unitsSold: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Plan
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10:90, CLP, Subvention"
                        value={editForm.paymentPlan}
                        onChange={(e) => setEditForm({ ...editForm, paymentPlan: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONCERNED PERSON */}
              {editModalTab === 'PERSON' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Concerned Person Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Rajesh Sharma"
                        value={editForm.concernedPersonName}
                        onChange={(e) => setEditForm({ ...editForm, concernedPersonName: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VP Sales / Site Manager"
                        value={editForm.concernedPersonDesignation}
                        onChange={(e) => setEditForm({ ...editForm, concernedPersonDesignation: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Details (Mobile / E-mail ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9811223344 / rajesh@builder.com"
                      value={editForm.concernedPersonContact}
                      onChange={(e) => setEditForm({ ...editForm, concernedPersonContact: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Office Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Corporate Office, 5th Floor, Tower B, Cyber City, Gurugram"
                      value={editForm.officeAddress}
                      onChange={(e) => setEditForm({ ...editForm, officeAddress: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: STRATEGY & NEXT FU */}
              {editModalTab === 'STRATEGY' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Lead Type
                      </label>
                      <select
                        value={editForm.leadType}
                        onChange={(e) => setEditForm({ ...editForm, leadType: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="Hot">🔥 Hot (High Intent)</option>
                        <option value="Warm">⚡ Warm (Considering)</option>
                        <option value="Cold">❄️ Cold (Early Stage)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Frequency of Visit (days / Month)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Weekly, 15 days, Monthly"
                        value={editForm.visitFrequency}
                        onChange={(e) => setEditForm({ ...editForm, visitFrequency: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Next FU Date (DD/MM/YYYY)
                      </label>
                      <DatePickerInput
                        value={editForm.nextFollowUpDate}
                        onChange={(val) => setEditForm({ ...editForm, nextFollowUpDate: val })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                        minYear={1990}
                        maxYear={2050}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Remarks / Meeting Agenda
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Notes about verification requirements or visit briefing..."
                      value={editForm.remarks}
                      onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Navigation & Submit Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  {editModalTab !== 'CORE' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editModalTab === 'STRATEGY') setEditModalTab('PERSON');
                        else if (editModalTab === 'PERSON') setEditModalTab('BUILDER');
                        else if (editModalTab === 'BUILDER') setEditModalTab('CORE');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ← Previous
                    </button>
                  )}
                  {editModalTab !== 'STRATEGY' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editModalTab === 'CORE') setEditModalTab('BUILDER');
                        else if (editModalTab === 'BUILDER') setEditModalTab('PERSON');
                        else if (editModalTab === 'PERSON') setEditModalTab('STRATEGY');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      Next Section →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
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
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
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
      {/* ========================================================================= */}
      {/* BUILDER MASTER DIRECTORY MODAL (Super Admin & Team Leader)                */}
      {/* ========================================================================= */}
      {isBuilderMasterOpen && canManageBuilders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800/60 dark:to-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Builder Master Directory
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800">
                      {isSuperAdmin ? 'Super Admin' : 'Team Leader'} Access
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add, edit, or remove builder companies. All visits across sales team will dynamically sync with these records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBuilderMasterOpen(false);
                  setBuilderEditingId(null);
                  setBuilderForm({ name: '', contactPerson: '', designation: '', phone: '', email: '', officeAddress: '', reraNumber: '', approvedBanks: '', notes: '' });
                  setBuilderActionError('');
                  setBuilderActionSuccess('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {builderActionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {builderActionError}
                </div>
              )}
              {builderActionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {builderActionSuccess}
                </div>
              )}

              {/* Add / Edit Form Card */}
              <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                    {builderEditingId ? <Edit3 className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
                    {builderEditingId ? 'Edit Builder Details' : 'Add New Builder Company'}
                  </h4>
                  {builderEditingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderEditingId(null);
                        setBuilderForm({ name: '', contactPerson: '', designation: '', phone: '', email: '', officeAddress: '', reraNumber: '', approvedBanks: '', notes: '' });
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveBuilder} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Builder / Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DLF, Godrej Properties..."
                        value={builderForm.name}
                        onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={builderForm.contactPerson}
                        onChange={(e) => setBuilderForm({ ...builderForm, contactPerson: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VP Sales / Site Head"
                        value={builderForm.designation}
                        onChange={(e) => setBuilderForm({ ...builderForm, designation: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone / Mobile
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9811122233"
                        value={builderForm.phone}
                        onChange={(e) => setBuilderForm({ ...builderForm, phone: sanitizeTo10Digits(e.target.value) })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        placeholder="sales@builder.com"
                        value={builderForm.email}
                        onChange={(e) => setBuilderForm({ ...builderForm, email: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        RERA Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UPRERAPRJ12345"
                        value={builderForm.reraNumber}
                        onChange={(e) => setBuilderForm({ ...builderForm, reraNumber: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Corporate / Site Office Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sector 62, Golf Course Road, Gurugram"
                        value={builderForm.officeAddress}
                        onChange={(e) => setBuilderForm({ ...builderForm, officeAddress: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Approved Banks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SBI, HDFC, ICICI, Axis Bank"
                        value={builderForm.approvedBanks}
                        onChange={(e) => setBuilderForm({ ...builderForm, approvedBanks: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={builderActionLoading}
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {builderActionLoading ? 'Saving...' : builderEditingId ? 'Update Builder Details' : 'Add to Directory'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Directory Listing */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Existing Builders in Directory ({buildersList.length})
                  </h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search builder or contact..."
                      value={builderSearch}
                      onChange={(e) => setBuilderSearch(e.target.value)}
                      className="w-full glass-input pl-8 pr-3 py-1.5 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                    {buildersList
                      .filter((b) => {
                        if (!builderSearch.trim()) return true;
                        const s = builderSearch.toLowerCase();
                        return (
                          b.name.toLowerCase().includes(s) ||
                          (b.contactPerson || '').toLowerCase().includes(s) ||
                          (b.phone || '').includes(s) ||
                          (b.officeAddress || '').toLowerCase().includes(s)
                        );
                      })
                      .map((b) => (
                        <div key={b.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3 transition">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {b.name}
                              </span>
                              {b.reraNumber && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
                                  {b.reraNumber}
                                </span>
                              )}
                              {b._count && b._count.visits > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-800">
                                  {b._count.visits} visit(s)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                              {b.contactPerson && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {b.contactPerson} {b.designation ? `(${b.designation})` : ''}
                                </span>
                              )}
                              {b.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {b.phone}
                                </span>
                              )}
                              {b.officeAddress && (
                                <span className="flex items-center gap-1 truncate max-w-[260px]">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  {b.officeAddress}
                                </span>
                              )}
                            </div>
                            {b.approvedBanks && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Landmark className="w-3 h-3 text-slate-400" />
                                <span>Banks: {b.approvedBanks}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditBuilderClick(b)}
                              title="Edit builder"
                              className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-lg transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBuilder(b.id, b.name)}
                              title="Delete builder"
                              className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => {
                  setIsBuilderMasterOpen(false);
                  setBuilderEditingId(null);
                  setBuilderForm({ name: '', contactPerson: '', designation: '', phone: '', email: '', officeAddress: '', reraNumber: '', approvedBanks: '', notes: '' });
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Visit Objectives Master Modal */}
      {isObjectiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Manage Visit Objectives
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add, edit, or remove custom visit purposes
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsObjectiveModalOpen(false);
                  setEditingObjective(null);
                  setNewObjectiveName('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Form to add or edit */}
              <form onSubmit={editingObjective ? handleUpdateObjective : handleAddObjective} className="flex gap-2">
                <input
                  type="text"
                  placeholder={editingObjective ? "Edit objective name..." : "e.g. Agreement Signing / Token"}
                  value={editingObjective ? editingObjective.name : newObjectiveName}
                  onChange={(e) => {
                    if (editingObjective) {
                      setEditingObjective({ ...editingObjective, name: e.target.value });
                    } else {
                      setNewObjectiveName(e.target.value);
                    }
                  }}
                  className="flex-1 glass-input px-3 py-2 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition shrink-0"
                >
                  {editingObjective ? 'Save' : '+ Add'}
                </button>
                {editingObjective && (
                  <button
                    type="button"
                    onClick={() => setEditingObjective(null)}
                    className="px-2.5 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                  >
                    Cancel
                  </button>
                )}
              </form>

              {/* List of Objectives */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {obj.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingObjective(obj)}
                        title="Edit name"
                        className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteObjective(obj.id)}
                        title="Delete objective"
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => {
                  setIsObjectiveModalOpen(false);
                  setEditingObjective(null);
                  setNewObjectiveName('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
