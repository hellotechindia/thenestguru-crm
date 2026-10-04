'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  PlusCircle,
  Edit3,
  X,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Layers,
  Users,
  Calendar,
  Clock,
  Plus,
  Loader2,
  Save,
  Palette,
} from 'lucide-react';
import {
  deleteCaseAction,
  updateCaseIntakeDetailsAction,
  createWorkflowStageAction,
  updateWorkflowStageAction,
  deleteWorkflowStageAction,
} from '@/app/actions';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/excel-export';
import { isValid10DigitPhone, isValidEmail, sanitizeTo10Digits, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';
import { INDIAN_STATES, getCitiesForIndianState } from '@/lib/india-data';
import DatePickerInput from './DatePickerInput';
import MultiSelectDropdown from './MultiSelectDropdown';

export interface WorkflowStageItem {
  id: string;
  stageNumber: number;
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface CoApplicantInfo {
  name: string;
  relationship?: string;
  mobile: string;
  email: string;
  gender?: string;
  state: string;
  city?: string;
  dob?: string;
  customerType?: string;
  customerTypes?: string[];
  incomeTypes?: string[];
  incomeRequired: boolean;
}

export interface CaseItem {
  id: string;
  clientName: string;
  mobile: string;
  email: string | null;
  gender?: string | null;
  clientState?: string | null;
  clientCity?: string | null;
  clientDob?: string | null;
  product: string;
  subProduct?: string | null;
  customerType: string;
  incomeTypes?: string | null;
  propertyType: string;
  propertyState?: string | null;
  propertyCity?: string | null;
  coApplicantCount: number;
  coApplicantsData?: string | null;
  stage: number;
  status: string;
  channelUserId?: string | null;
  salesUserId?: string | null;
  operationUserId?: string | null;
  assignedTeamId?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdByRole?: string | null;
  createdAt: string;
  updatedAt?: string;
  checklistCount: number;
  receivedCount: number;
  assignedTeamName: string;
}

interface CaseListTableProps {
  cases: CaseItem[];
  userRole: string;
  teams?: Array<{ id: string; name: string }>;
  states?: Array<{ id: string; name: string; cities?: Array<{ id: string; name: string }> }>;
  users?: Array<{ id: string; name: string; role: string; email?: string | null; username?: string | null }>;
  products?: Array<{ id: string; name: string }>;
  subProducts?: Array<{ id: string; name: string; productId: string }>;
  profiles?: Array<{ id: string; name: string }>;
  caseStatuses?: Array<{ id: string; name: string; color?: string | null; description?: string | null; displayOrder?: number }>;
  workflowStages?: WorkflowStageItem[];
  propertyScopes?: Array<{ id: string; name: string }>;
  targetCategories?: Array<{ id: string; name: string }>;
}

const DEFAULT_STATUSES = [
  { id: '1', name: 'Pending Documents', color: '#f59e0b' },
  { id: '2', name: 'Ready for Submission', color: '#0284c7' },
  { id: '3', name: 'In Review', color: '#8b5cf6' },
  { id: '4', name: 'Approved', color: '#10b981' },
  { id: '5', name: 'Disbursed', color: '#059669' },
  { id: '6', name: 'Rejected', color: '#ef4444' },
];

const DEFAULT_WORKFLOW_STAGES: WorkflowStageItem[] = [
  { id: '1', stageNumber: 1, name: 'Lead Intake & KYC Verification', color: '#0284c7' },
  { id: '2', stageNumber: 2, name: 'Property Legal & Technical Verification', color: '#8b5cf6' },
  { id: '3', stageNumber: 3, name: 'Bank Login & Credit Underwriting', color: '#f59e0b' },
  { id: '4', stageNumber: 4, name: 'Sanction & Final Disbursement', color: '#10b981' },
];

export default function CaseListTable({
  cases,
  userRole,
  teams = [],
  states = [],
  users = [],
  products = [],
  subProducts = [],
  profiles = [],
  caseStatuses = [],
  workflowStages = [],
  propertyScopes = [],
  targetCategories = [],
}: CaseListTableProps) {
  const router = useRouter();
  const availableStatuses = caseStatuses && caseStatuses.length > 0 ? caseStatuses : DEFAULT_STATUSES;
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Dynamic Processing Stages State
  const [stagesList, setStagesList] = useState<WorkflowStageItem[]>(
    workflowStages && workflowStages.length > 0 ? workflowStages : DEFAULT_WORKFLOW_STAGES
  );

  useEffect(() => {
    if (workflowStages && workflowStages.length > 0) {
      setStagesList(workflowStages);
    }
  }, [workflowStages]);

  // Stage Manager Modal State
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageData, setEditStageData] = useState({ stageNumber: 1, name: '', description: '', color: '#3b82f6' });
  const [newStageData, setNewStageData] = useState({
    stageNumber: 5,
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const [stageManagerLoading, setStageManagerLoading] = useState(false);
  const [stageManagerError, setStageManagerError] = useState('');
  const [stageManagerSuccess, setStageManagerSuccess] = useState('');

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageData.name.trim() || !newStageData.stageNumber) {
      setStageManagerError('Stage Number and Name are required.');
      return;
    }
    setStageManagerLoading(true);
    setStageManagerError('');
    const res = await createWorkflowStageAction({
      stageNumber: Number(newStageData.stageNumber),
      name: newStageData.name.trim(),
      description: newStageData.description?.trim() || undefined,
      color: newStageData.color,
    });
    setStageManagerLoading(false);
    if (res.success && res.stage) {
      const updated = [...stagesList, res.stage].sort((a, b) => a.stageNumber - b.stageNumber);
      setStagesList(updated);
      setNewStageData({
        stageNumber: Math.max(...updated.map((s) => s.stageNumber), 0) + 1,
        name: '',
        description: '',
        color: '#3b82f6',
      });
      setStageManagerSuccess('New Processing Stage added successfully!');
      setTimeout(() => setStageManagerSuccess(''), 3000);
      router.refresh();
    } else {
      setStageManagerError(res.error || 'Failed to add stage.');
    }
  };

  const handleStartEditStage = (stg: WorkflowStageItem) => {
    setEditingStageId(stg.id);
    setEditStageData({
      stageNumber: stg.stageNumber,
      name: stg.name,
      description: stg.description || '',
      color: stg.color || '#3b82f6',
    });
    setStageManagerError('');
  };

  const handleSaveEditStage = async (id: string) => {
    if (!editStageData.name.trim() || !editStageData.stageNumber) {
      setStageManagerError('Stage Number and Name are required.');
      return;
    }
    setStageManagerLoading(true);
    setStageManagerError('');
    const res = await updateWorkflowStageAction(id, {
      stageNumber: Number(editStageData.stageNumber),
      name: editStageData.name.trim(),
      description: editStageData.description?.trim() || undefined,
      color: editStageData.color,
    });
    setStageManagerLoading(false);
    if (res.success && res.stage) {
      const updated = stagesList
        .map((s) => (s.id === id ? { ...s, ...res.stage } : s))
        .sort((a, b) => a.stageNumber - b.stageNumber);
      setStagesList(updated);
      setEditingStageId(null);
      setStageManagerSuccess('Processing Stage updated successfully!');
      setTimeout(() => setStageManagerSuccess(''), 3000);
      router.refresh();
    } else {
      setStageManagerError(res.error || 'Failed to update stage.');
    }
  };

  const handleDeleteStage = async (id: string, stageNumber: number, name: string) => {
    if (!confirm(`Are you sure you want to delete Stage ${stageNumber} (${name})?`)) return;
    setStageManagerLoading(true);
    setStageManagerError('');
    const res = await deleteWorkflowStageAction(id);
    setStageManagerLoading(false);
    if (res.success) {
      const updated = stagesList.filter((s) => s.id !== id);
      setStagesList(updated);
      setStageManagerSuccess(`Stage ${stageNumber} deleted successfully.`);
      setTimeout(() => setStageManagerSuccess(''), 3000);
      router.refresh();
    } else {
      setStageManagerError(res.error || 'Failed to delete stage.');
    }
  };

  // Edit Modal State
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
  const [isCustomCityEdit, setIsCustomCityEdit] = useState(false);
  const [isCustomPropCityEdit, setIsCustomPropCityEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    mobile: '',
    email: '',
    gender: 'MALE',
    clientState: '',
    clientCity: '',
    clientDob: '',
    product: products[0]?.name || 'Home Loan',
    subProduct: '',
    customerType: targetCategories[0]?.name || profiles[0]?.name || 'Individual',
    customerTypes: [] as string[],
    incomeTypes: [] as string[],
    propertyType: propertyScopes[0]?.name || 'Resale',
    propertyState: '',
    propertyCity: '',
    coApplicantCount: 0,
    stage: 1,
    status: 'Pending Documents',
    assignedTeamId: '',
    channelUserId: '',
    channelUserIds: [] as string[],
    salesUserId: '',
    salesUserIds: [] as string[],
    operationUserId: '',
    operationUserIds: [] as string[],
  });
  const [editCoApplicants, setEditCoApplicants] = useState<CoApplicantInfo[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Real-time synchronization when tab is focused
  useEffect(() => {
    const handleFocus = () => {
      router.refresh();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [router]);

  const filterPropertyScopes = useMemo(() => {
    return propertyScopes && propertyScopes.length > 0
      ? propertyScopes
      : [
          { id: '1', name: 'Resale' },
          { id: '2', name: 'Takeover / Seller BT' },
          { id: '3', name: 'Direct Allotment (Under Construction)' },
        ];
  }, [propertyScopes]);

  const availablePropertyScopes = useMemo(() => {
    const list = propertyScopes && propertyScopes.length > 0
      ? [...propertyScopes]
      : [
          { id: '1', name: 'Resale' },
          { id: '2', name: 'Takeover / Seller BT' },
          { id: '3', name: 'Direct Allotment (Under Construction)' },
        ];
    if (editFormData.propertyType && !list.some((p) => p.name.toLowerCase() === editFormData.propertyType.toLowerCase())) {
      list.push({ id: 'current', name: editFormData.propertyType });
    }
    return list;
  }, [propertyScopes, editFormData.propertyType]);

  const availableCustomerTypes = useMemo(() => {
    const list = targetCategories && targetCategories.length > 0
      ? [...targetCategories]
      : profiles && profiles.length > 0
      ? [...profiles]
      : [
          { id: '1', name: 'Individual' },
          { id: '2', name: 'Salaried' },
          { id: '3', name: 'Self Employed Professional' },
          { id: '4', name: 'Business / Non-Professional' },
        ];
    if (editFormData.customerType && !list.some((c) => c.name.toLowerCase() === editFormData.customerType.toLowerCase())) {
      list.push({ id: 'current', name: editFormData.customerType });
    }
    return list;
  }, [targetCategories, profiles, editFormData.customerType]);

  const availableProducts = useMemo(() => {
    const list = products && products.length > 0
      ? [...products]
      : [
          { id: '1', name: 'Home Loan' },
          { id: '2', name: 'Loan Against Property' },
          { id: '3', name: 'MSME Business Loan' },
        ];
    if (editFormData.product && !list.some((p) => p.name.toLowerCase() === editFormData.product.toLowerCase())) {
      list.push({ id: 'current', name: editFormData.product });
    }
    return list;
  }, [products, editFormData.product]);

  const channelUsers = users.filter((u) => u.role === 'CHANNEL');
  const salesUsers = users.filter((u) => u.role === 'SALES');
  const operationUsers = users.filter((u) => u.role === 'OPERATION' || u.role === 'TEAM_MEMBER');

  const selectedEditProductObj = availableProducts.find(
    (p) => p.name.toLowerCase() === editFormData.product.toLowerCase()
  );
  const filteredEditSubProducts = (subProducts || []).filter((sp) => {
    if (!selectedEditProductObj) return false;
    return sp.productId === (selectedEditProductObj as any).id;
  });

  const filteredCases = cases.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    const opsUserNames = (c.operationUserId || '')
      .split(',')
      .map((id) => (userMap.get(id.trim())?.name || '').toLowerCase())
      .join(' ');
    const salesUserNames = (c.salesUserId || '')
      .split(',')
      .map((id) => (userMap.get(id.trim())?.name || '').toLowerCase())
      .join(' ');
    const channelUserNames = (c.channelUserId || '')
      .split(',')
      .map((id) => (userMap.get(id.trim())?.name || '').toLowerCase())
      .join(' ');
    const teamName = (c.assignedTeamName || '').toLowerCase();

    const matchesSearch =
      c.clientName.toLowerCase().includes(searchLower) ||
      c.mobile.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchLower)) ||
      opsUserNames.includes(searchLower) ||
      salesUserNames.includes(searchLower) ||
      channelUserNames.includes(searchLower) ||
      teamName.includes(searchLower);

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesStage = stageFilter === 'ALL' || String(c.stage) === stageFilter;
    const matchesProperty = propertyFilter === 'ALL' || c.propertyType === propertyFilter;
    const matchesAssignee =
      assigneeFilter === 'ALL' ||
      (c.operationUserId && c.operationUserId.split(',').map((s) => s.trim()).includes(assigneeFilter)) ||
      (c.salesUserId && c.salesUserId.split(',').map((s) => s.trim()).includes(assigneeFilter)) ||
      (c.channelUserId && c.channelUserId.split(',').map((s) => s.trim()).includes(assigneeFilter));

    return matchesSearch && matchesStatus && matchesStage && matchesProperty && matchesAssignee;
  });

  const handleExportFilteredCases = () => {
    const rows = filteredCases.map((c) => ({
      'Case ID': c.id,
      'Client Name': c.clientName,
      'Mobile Number': c.mobile,
      'Email': c.email || 'N/A',
      'Client State': c.clientState || 'N/A',
      'Client City': c.clientCity || 'N/A',
      'Client DOB': c.clientDob || 'N/A',
      'Loan Product': c.product,
      'Customer Profile': c.customerType,
      'Property Scope': c.propertyType,
      'Co-Applicants Count': c.coApplicantCount,
      'Processing Stage': (() => {
        const stg = stagesList.find((s) => s.stageNumber === c.stage);
        return stg ? `Stage ${c.stage} - ${stg.name}` : `Stage ${c.stage}`;
      })(),
      'Case Filing Status': c.status,
      'Assigned Operations Lead': (c.operationUserId ? c.operationUserId.split(',').map((id) => userMap.get(id.trim())?.name).filter(Boolean).join(', ') : '') || 'N/A',
      'Assigned Sales Lead': (c.salesUserId ? c.salesUserId.split(',').map((id) => userMap.get(id.trim())?.name).filter(Boolean).join(', ') : '') || 'N/A',
      'Channel Partner': (c.channelUserId ? c.channelUserId.split(',').map((id) => userMap.get(id.trim())?.name).filter(Boolean).join(', ') : '') || 'N/A',
      'Assigned Team': c.assignedTeamName,
      'Documents Received': `${c.receivedCount}/${c.checklistCount}`,
      'Checklist Progress (%)': c.checklistCount > 0 ? `${Math.round((c.receivedCount / c.checklistCount) * 100)}%` : '0%',
      'Created Date': c.createdAt.slice(0, 10),
    }));
    exportToCSV(`TheNestGuru_Filtered_Cases_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleDelete = async (id: string, name: string) => {
    if (userRole !== 'SUPER_ADMIN') {
      setErrorMessage('Permission Denied: Only Super Admin can delete cases.');
      return;
    }

    if (!confirm(`Are you sure you want to delete case for "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    setErrorMessage('');
    const res = await deleteCaseAction(id);
    setDeletingId(null);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to delete case.');
    } else {
      setSuccessMessage(`Case for "${name}" deleted successfully.`);
      router.refresh();
    }
  };

  const handleOpenEdit = (c: CaseItem) => {
    setEditError('');
    setEditingCase(c);

    let parsedCoApps: any[] = [];
    try {
      if (c.coApplicantsData) {
        parsedCoApps = JSON.parse(c.coApplicantsData);
      }
    } catch (e) {
      parsedCoApps = [];
    }

    const fullCoApps: CoApplicantInfo[] = [];
    for (let i = 0; i < c.coApplicantCount; i++) {
      const co = parsedCoApps[i] || {};
      const coCustTypes = Array.isArray(co.customerTypes)
        ? co.customerTypes
        : (co.customerType ? co.customerType.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      const coIncTypes = Array.isArray(co.incomeTypes)
        ? co.incomeTypes
        : [];
      fullCoApps.push({
        name: co.name || '',
        relationship: co.relationship || 'Spouse',
        mobile: co.mobile || '',
        email: co.email || '',
        gender: co.gender || 'MALE',
        state: co.state || (states[0]?.name || ''),
        city: co.city || '',
        dob: co.dob || '',
        customerType: coCustTypes.join(', ') || co.customerType || '',
        customerTypes: coCustTypes,
        incomeTypes: coIncTypes,
        incomeRequired: co.incomeRequired !== false,
      });
    }
    setEditCoApplicants(fullCoApps);

    const parsedCustomerTypes = c.customerType
      ? c.customerType.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let parsedIncomeTypes: string[] = [];
    if (c.incomeTypes) {
      try {
        const parsed = JSON.parse(c.incomeTypes);
        parsedIncomeTypes = Array.isArray(parsed) ? parsed : [c.incomeTypes];
      } catch {
        parsedIncomeTypes = c.incomeTypes.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const channelUserIds = c.channelUserId
      ? c.channelUserId.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const salesUserIds = c.salesUserId
      ? c.salesUserId.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const operationUserIds = c.operationUserId
      ? c.operationUserId.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    setIsCustomCityEdit(false);
    setIsCustomPropCityEdit(false);
    setEditFormData({
      clientName: c.clientName,
      mobile: c.mobile,
      email: c.email || '',
      gender: c.gender || 'MALE',
      clientState: c.clientState || (states[0]?.name || ''),
      clientCity: c.clientCity || '',
      clientDob: c.clientDob || '',
      product: c.product,
      subProduct: c.subProduct || '',
      customerType: c.customerType,
      customerTypes: parsedCustomerTypes,
      incomeTypes: parsedIncomeTypes,
      propertyType: c.propertyType,
      propertyState: c.propertyState || (states[0]?.name || ''),
      propertyCity: c.propertyCity || '',
      coApplicantCount: c.coApplicantCount,
      stage: c.stage,
      status: c.status,
      assignedTeamId: c.assignedTeamId || (teams[0]?.id || ''),
      channelUserId: c.channelUserId || '',
      channelUserIds,
      salesUserId: c.salesUserId || '',
      salesUserIds,
      operationUserId: c.operationUserId || '',
      operationUserIds,
    });
  };

  const handleCoApplicantCountChange = (count: number) => {
    const newCount = Math.max(0, count);
    const updated = [...editCoApplicants];
    if (newCount > updated.length) {
      for (let i = updated.length; i < newCount; i++) {
        updated.push({
          name: '',
          relationship: 'Spouse',
          mobile: '',
          email: '',
          gender: 'MALE',
          state: states[0]?.name || '',
          city: '',
          dob: '',
          customerType: '',
          customerTypes: [],
          incomeTypes: [],
          incomeRequired: false,
        });
      }
    } else {
      updated.splice(newCount);
    }
    setEditCoApplicants(updated);
    setEditFormData((prev) => ({ ...prev, coApplicantCount: newCount }));
  };

  const handleCoApplicantFieldChange = (index: number, field: keyof CoApplicantInfo, value: any) => {
    const updated = [...editCoApplicants];
    updated[index] = { ...updated[index], [field]: value };
    setEditCoApplicants(updated);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    if (!editFormData.clientName.trim() || !editFormData.mobile.trim()) {
      setEditError('Client Name and Mobile Number are required.');
      return;
    }

    if (!isValidName(editFormData.clientName)) {
      setEditError('Client Full Name must contain only alphabets and spaces (no numbers or special characters).');
      return;
    }

    if (!isValid10DigitPhone(editFormData.mobile)) {
      setEditError('Client Mobile Number must be exactly 10 digits.');
      return;
    }

    if (editFormData.email && !isValidEmail(editFormData.email)) {
      setEditError('Please enter a valid Client Email Address.');
      return;
    }

    for (let i = 0; i < editCoApplicants.length; i++) {
      const coApp = editCoApplicants[i];
      if (coApp.name && !isValidName(coApp.name)) {
        setEditError(`Co-Applicant ${i + 1} Name must contain only alphabets and spaces (no numbers or special characters).`);
        return;
      }
      if (coApp.mobile && !isValid10DigitPhone(coApp.mobile)) {
        setEditError(`Co-Applicant ${i + 1} (${coApp.name || 'Co-Applicant'}) mobile number must be exactly 10 digits.`);
        return;
      }
      if (coApp.email && !isValidEmail(coApp.email)) {
        setEditError(`Co-Applicant ${i + 1} (${coApp.name || 'Co-Applicant'}) email address is invalid.`);
        return;
      }
    }

    setEditLoading(true);
    setEditError('');

    const finalCustType = editFormData.customerTypes.length > 0
      ? editFormData.customerTypes.join(', ')
      : editFormData.customerType;

    const channelUserId = editFormData.channelUserIds.length > 0
      ? editFormData.channelUserIds.join(',')
      : (editFormData.channelUserId || null);
    const salesUserId = editFormData.salesUserIds.length > 0
      ? editFormData.salesUserIds.join(',')
      : (editFormData.salesUserId || null);
    const operationUserId = editFormData.operationUserIds.length > 0
      ? editFormData.operationUserIds.join(',')
      : (editFormData.operationUserId || null);

    const res = await updateCaseIntakeDetailsAction(editingCase.id, {
      clientName: editFormData.clientName,
      mobile: editFormData.mobile,
      email: editFormData.email || null,
      gender: editFormData.gender || 'MALE',
      clientState: editFormData.clientState || null,
      clientCity: editFormData.clientCity || null,
      clientDob: editFormData.clientDob || null,
      product: editFormData.product,
      subProduct: editFormData.subProduct || null,
      customerType: finalCustType,
      incomeTypes: editFormData.incomeTypes,
      propertyType: editFormData.propertyType,
      propertyState: editFormData.propertyState || null,
      propertyCity: editFormData.propertyCity || null,
      coApplicantCount: editCoApplicants.length,
      coApplicantsData: editCoApplicants.map((co) => ({
        ...co,
        customerType: co.customerTypes && co.customerTypes.length > 0 ? co.customerTypes.join(', ') : co.customerType,
      })),
      stage: editFormData.stage,
      status: editFormData.status,
      assignedTeamId: editFormData.assignedTeamId || null,
      channelUserId,
      salesUserId,
      operationUserId,
    });

    setEditLoading(false);

    if (!res.success) {
      setEditError(res.error || 'Failed to update case details.');
    } else {
      setEditingCase(null);
      setSuccessMessage(`Case details for "${editFormData.clientName}" updated successfully!`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
        </div>
      )}

      {/* Controls: Search & Filter & Excel Export */}
      <div className="glass-panel p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-sm overflow-x-auto">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-[280px] flex-1 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client name, mobile, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs"
          />
        </div>

        {/* Filters & Export & Add Case (All on single line) */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500 font-medium">Case Filing Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Filing Statuses</option>
              {availableStatuses.map((st) => (
                <option key={st.id || st.name} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <span className="text-slate-500 font-medium">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              {stagesList.map((stg) => (
                <option key={stg.id || stg.stageNumber} value={String(stg.stageNumber)}>
                  Stage {stg.stageNumber} ({stg.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <span className="text-slate-500 font-medium">Property:</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              {filterPropertyScopes.map((ps) => (
                <option key={ps.id || ps.name} value={ps.name}>
                  {ps.name}
                </option>
              ))}
            </select>
          </div>

          {userRole === 'SUPER_ADMIN' && users.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
              <span className="text-slate-500 font-medium">Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-transparent text-sky-600 dark:text-sky-400 font-semibold focus:outline-none max-w-[120px] cursor-pointer"
              >
                <option value="ALL">All Staff</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportFilteredCases}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm shrink-0 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>

          <Link
            href="/cases/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Case
          </Link>
        </div>
      </div>

      {/* Cases Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Client Details</th>
                <th className="py-2.5 px-3">Product / Profile</th>
                <th className="py-2.5 px-2.5">Property</th>
                <th className="py-2.5 px-2 text-center">Co-Applicants</th>
                <th className="py-2.5 px-2.5">Timeline / Age</th>
                <th className="py-2.5 px-2.5">Assigned To</th>
                <th className="py-2.5 px-2 text-center">Stage</th>
                <th className="py-2.5 px-2.5 text-center">Checklist Progress</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const progressPct =
                    c.checklistCount > 0 ? Math.round((c.receivedCount / c.checklistCount) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <Link href={`/cases/${c.id}`} className="font-bold text-slate-900 dark:text-white hover:text-sky-600 text-xs line-clamp-1">
                          {c.clientName}
                        </Link>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.mobile}</div>
                        {c.email && <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{c.email}</div>}
                        {(c.clientCity || c.clientState) && (
                          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5 truncate max-w-[140px]">
                            📍 {c.clientCity ? `${c.clientCity}, ${c.clientState || ''}` : c.clientState}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-sky-600 dark:text-sky-400 block truncate max-w-[120px]">{c.product}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">{c.customerType}</span>
                      </td>
                      <td className="py-3 px-2.5 text-slate-700 dark:text-slate-300 font-medium text-[11px] leading-snug">
                        <span className="block max-w-[110px] break-words">{c.propertyType}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                        {c.coApplicantCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 text-[10px] whitespace-nowrap">
                            {c.coApplicantCount} Co-App
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[10px] whitespace-nowrap">Sole Applicant</span>
                        )}
                      </td>
                      <td className="py-3 px-2.5">
                        <div className="flex flex-col gap-1 whitespace-nowrap">
                          {/* Intake Date */}
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            <Calendar className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>
                              {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Created By Staff & Role */}
                          {c.createdByName && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={`Created by: ${c.createdByName} (${c.createdByRole || 'Staff'})`}>
                              By: <strong className="text-slate-700 dark:text-slate-200">{c.createdByName}</strong>
                              {c.createdByRole && (
                                <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold ml-0.5">
                                  ({c.createdByRole.replace('_', ' ')})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Dynamic Age Badge */}
                          <div className="flex items-center">
                            {(() => {
                              const created = new Date(c.createdAt);
                              const now = new Date();
                              const diffMs = now.getTime() - created.getTime();
                              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

                              let badgeText = '';
                              let badgeClass = '';

                              if (diffDays === 0) {
                                badgeText = diffHours <= 1 ? 'Fresh (Today)' : `Today (${diffHours}h)`;
                                badgeClass = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
                              } else if (diffDays === 1) {
                                badgeText = '1 day old';
                                badgeClass = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
                              } else if (diffDays <= 7) {
                                badgeText = `${diffDays} days old`;
                                badgeClass = 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30';
                              } else if (diffDays <= 15) {
                                badgeText = `${diffDays} days old`;
                                badgeClass = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
                              } else {
                                badgeText = `${diffDays} days old`;
                                badgeClass = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
                              }

                              return (
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border ${badgeClass}`}
                                  title={c.updatedAt ? `Updated: ${new Date(c.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : undefined}
                                >
                                  ⏱ {badgeText}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      {/* Assigned Staff Column */}
                      <td className="py-3 px-2.5">
                        <div className="flex flex-col gap-1 text-[11px] whitespace-nowrap">
                          {/* Ops Lead(s) */}
                          {(() => {
                            const ids = (c.operationUserId || '').split(',').map((s) => s.trim()).filter(Boolean);
                            const names = ids.map((id) => userMap.get(id)?.name).filter(Boolean);
                            if (names.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1" title={`Operations: ${names.join(', ')}`}>
                                <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                  Ops{names.length > 1 ? ` (${names.length})` : ''}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[95px]">
                                  {names.join(', ')}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Sales Lead(s) */}
                          {(() => {
                            const ids = (c.salesUserId || '').split(',').map((s) => s.trim()).filter(Boolean);
                            const names = ids.map((id) => userMap.get(id)?.name).filter(Boolean);
                            if (names.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1" title={`Sales: ${names.join(', ')}`}>
                                <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                  Sales{names.length > 1 ? ` (${names.length})` : ''}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[95px]">
                                  {names.join(', ')}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Channel Partner(s) */}
                          {(() => {
                            const ids = (c.channelUserId || '').split(',').map((s) => s.trim()).filter(Boolean);
                            const names = ids.map((id) => userMap.get(id)?.name).filter(Boolean);
                            if (names.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1" title={`Channel: ${names.join(', ')}`}>
                                <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                  CP{names.length > 1 ? ` (${names.length})` : ''}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[95px]">
                                  {names.join(', ')}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Fallback if no specific staff is assigned */}
                          {!c.operationUserId && !c.salesUserId && !c.channelUserId && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[100px]" title={c.assignedTeamName ? `Team: ${c.assignedTeamName}` : 'Unassigned'}>
                              {c.assignedTeamName ? `Team: ${c.assignedTeamName}` : 'Unassigned'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {(() => {
                          const matchedStage = stagesList.find((s) => s.stageNumber === c.stage);
                          const stageColor = matchedStage?.color || '#6366f1';
                          return (
                            <span
                              className="inline-block px-2 py-0.5 rounded-lg font-bold text-[10px] border max-w-[130px] truncate"
                              title={matchedStage ? `Stage ${c.stage}: ${matchedStage.name}` : `Stage ${c.stage}`}
                              style={{
                                backgroundColor: `${stageColor}18`,
                                color: stageColor,
                                borderColor: `${stageColor}40`,
                              }}
                            >
                              Stage {c.stage}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-2.5">
                        <div className="flex flex-col items-center">
                          {(() => {
                            const statusObj = availableStatuses.find((s) => s.name === c.status);
                            const statusColor = statusObj?.color || '#3b82f6';
                            return (
                              <span
                                className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mb-1 border max-w-[115px] truncate text-center"
                                title={c.status}
                                style={{
                                  backgroundColor: `${statusColor}18`,
                                  color: statusColor,
                                  borderColor: `${statusColor}40`,
                                }}
                              >
                                {c.status}
                              </span>
                            );
                          })()}
                          <div className="w-20 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                progressPct === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {c.receivedCount}/{c.checklistCount} ({progressPct}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Case Intake Details"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-semibold transition-colors text-[11px]"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>

                          {/* Open Case Detail View */}
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-600/20 hover:bg-sky-100 dark:hover:bg-sky-600/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-semibold transition-colors text-[11px]"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </Link>

                          {/* Delete Button: ONLY visible to SUPER_ADMIN */}
                          {userRole === 'SUPER_ADMIN' ? (
                            <button
                              onClick={() => handleDelete(c.id, c.clientName)}
                              disabled={deletingId === c.id}
                              title="Delete Case (Super Admin Only)"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              title="Delete restricted to Super Admin"
                              className="p-1 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------- EDIT CASE INTAKE DETAILS MODAL -------------------- */}
      {editingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full space-y-5 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-500" /> Edit Case Intake Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update client details, co-applicants, loan parameters, stage, and staff assignments for <span className="font-semibold text-slate-800 dark:text-slate-200">{editingCase.clientName}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingCase(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-5 text-xs overflow-y-auto pr-1 flex-1">
              {/* Section 1: Client Contact Information & KYC */}
              <div className="space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <User className="w-3.5 h-3.5 text-sky-500" /> 1. Client Contact & KYC Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.clientName}
                      onChange={(e) => setEditFormData({ ...editFormData, clientName: sanitizeToAlphabetsOnly(e.target.value) })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Mobile Number * (10 Digits)
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${editFormData.mobile.length === 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {editFormData.mobile.length}/10
                      </span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: sanitizeTo10Digits(e.target.value) })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono tracking-wider font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value.trim() })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gender *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, gender: g })}
                          className={`py-2 text-center rounded-xl text-xs font-bold transition-all border ${
                            editFormData.gender === g
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth (DOB)
                    </label>
                    <DatePickerInput
                      value={editFormData.clientDob}
                      onChange={(val) => setEditFormData({ ...editFormData, clientDob: val })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      minYear={1930}
                      maxYear={2026}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client State
                    </label>
                    <select
                      value={editFormData.clientState}
                      onChange={(e) => {
                        setIsCustomCityEdit(false);
                        setEditFormData({
                          ...editFormData,
                          clientState: e.target.value,
                          clientCity: '',
                        });
                      }}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Select State --</option>
                      {INDIAN_STATES.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client City
                    </label>
                    {(() => {
                      const editStateObj = states.find((s) => s.name?.toLowerCase() === editFormData.clientState?.toLowerCase());
                      const dbCities = editStateObj?.cities?.map((c) => c.name) || [];
                      const editCities = Array.from(new Set([...dbCities, ...getCitiesForIndianState(editFormData.clientState)]));
                      if (editCities.length > 0) {
                        return (
                          <div className="space-y-1">
                            <select
                              value={
                                isCustomCityEdit
                                  ? '__other__'
                                  : editCities.some((c) => c === editFormData.clientCity)
                                  ? editFormData.clientCity
                                  : editFormData.clientCity
                                  ? '__other__'
                                  : ''
                              }
                              onChange={(e) => {
                                if (e.target.value === '__other__') {
                                  setIsCustomCityEdit(true);
                                  setEditFormData({ ...editFormData, clientCity: '' });
                                } else {
                                  setIsCustomCityEdit(false);
                                  setEditFormData({ ...editFormData, clientCity: e.target.value });
                                }
                              }}
                              className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                            >
                              <option value="">-- Select City --</option>
                              {editCities.map((cityName) => (
                                <option key={cityName} value={cityName}>
                                  {cityName}
                                </option>
                              ))}
                              <option value="__other__">+ Other / Enter Manually</option>
                            </select>
                            {isCustomCityEdit && (
                              <input
                                type="text"
                                placeholder="Enter city name..."
                                value={editFormData.clientCity}
                                onChange={(e) => setEditFormData({ ...editFormData, clientCity: e.target.value })}
                                className="w-full glass-input px-3 py-1.5 rounded-xl text-xs"
                                autoFocus
                              />
                            )}
                          </div>
                        );
                      }
                      return (
                        <input
                          type="text"
                          placeholder="e.g. Mumbai"
                          value={editFormData.clientCity}
                          onChange={(e) => setEditFormData({ ...editFormData, clientCity: e.target.value })}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Section 2: Product & Parameters */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> 2. Loan Profile & Parameters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Loan Product *
                    </label>
                    <select
                      value={editFormData.product}
                      onChange={(e) => setEditFormData({ ...editFormData, product: e.target.value, subProduct: '' })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold text-sky-600 dark:text-sky-400"
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id || p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sub-Product
                    </label>
                    <select
                      value={editFormData.subProduct || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, subProduct: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Standard / General --</option>
                      {filteredEditSubProducts.map((sp) => (
                        <option key={sp.id} value={sp.name}>
                          {sp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Customer Profile / Type (Multi-Select)
                      </label>
                      <a
                        href="/admin/profiles"
                        target="_blank"
                        className="text-[10px] text-sky-600 hover:underline font-semibold"
                      >
                        + Manage Profiles
                      </a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableCustomerTypes.map((pr) => {
                        const checked = editFormData.customerTypes.includes(pr.name);
                        return (
                          <button
                            key={pr.name}
                            type="button"
                            onClick={() => {
                              const newTypes = checked
                                ? editFormData.customerTypes.filter((t) => t !== pr.name)
                                : [...editFormData.customerTypes, pr.name];
                              setEditFormData({
                                ...editFormData,
                                customerTypes: newTypes,
                                customerType: newTypes.join(', '),
                              });
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs text-left transition-all ${
                              checked
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                              checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {checked && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{pr.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Income Profile (Multi-Select)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {profiles.map((pr) => {
                        const checked = editFormData.incomeTypes.includes(pr.name);
                        return (
                          <button
                            key={pr.name}
                            type="button"
                            onClick={() => {
                              const newTypes = checked
                                ? editFormData.incomeTypes.filter((t) => t !== pr.name)
                                : [...editFormData.incomeTypes, pr.name];
                              setEditFormData({
                                ...editFormData,
                                incomeTypes: newTypes,
                              });
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs text-left transition-all ${
                              checked
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                              checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {checked && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{pr.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Property Scope & Location */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <Building className="w-3.5 h-3.5 text-blue-500" /> 3. Property Scope & Location
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Property Scope
                      </label>
                      <a
                        href="/admin/property-scopes"
                        target="_blank"
                        className="text-[10px] text-sky-600 hover:underline font-semibold"
                      >
                        + Manage Scopes
                      </a>
                    </div>
                    <select
                      value={editFormData.propertyType}
                      onChange={(e) => setEditFormData({ ...editFormData, propertyType: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {availablePropertyScopes.map((ps) => (
                        <option key={ps.id || ps.name} value={ps.name}>
                          {ps.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Property State
                    </label>
                    <select
                      value={editFormData.propertyState}
                      onChange={(e) => {
                        setIsCustomPropCityEdit(false);
                        setEditFormData({
                          ...editFormData,
                          propertyState: e.target.value,
                          propertyCity: '',
                        });
                      }}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Select State --</option>
                      {INDIAN_STATES.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Property City
                    </label>
                    {(() => {
                      const propStateObj = states.find((s) => s.name?.toLowerCase() === editFormData.propertyState?.toLowerCase());
                      const propDbCities = propStateObj?.cities?.map((c) => c.name) || [];
                      const propCities = Array.from(new Set([...propDbCities, ...getCitiesForIndianState(editFormData.propertyState)]));
                      if (propCities.length > 0) {
                        return (
                          <div className="space-y-1">
                            <select
                              value={
                                isCustomPropCityEdit
                                  ? '__other__'
                                  : propCities.some((c) => c === editFormData.propertyCity)
                                  ? editFormData.propertyCity
                                  : editFormData.propertyCity
                                  ? '__other__'
                                  : ''
                              }
                              onChange={(e) => {
                                if (e.target.value === '__other__') {
                                  setIsCustomPropCityEdit(true);
                                  setEditFormData({ ...editFormData, propertyCity: '' });
                                } else {
                                  setIsCustomPropCityEdit(false);
                                  setEditFormData({ ...editFormData, propertyCity: e.target.value });
                                }
                              }}
                              className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                            >
                              <option value="">-- Select City --</option>
                              {propCities.map((cityName) => (
                                <option key={cityName} value={cityName}>
                                  {cityName}
                                </option>
                              ))}
                              <option value="__other__">+ Other / Enter Manually</option>
                            </select>
                            {isCustomPropCityEdit && (
                              <input
                                type="text"
                                placeholder="Enter property city..."
                                value={editFormData.propertyCity}
                                onChange={(e) => setEditFormData({ ...editFormData, propertyCity: e.target.value })}
                                className="w-full glass-input px-3 py-1.5 rounded-xl text-xs"
                                autoFocus
                              />
                            )}
                          </div>
                        );
                      }
                      return (
                        <input
                          type="text"
                          placeholder="e.g. Pune"
                          value={editFormData.propertyCity}
                          onChange={(e) => setEditFormData({ ...editFormData, propertyCity: e.target.value })}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Section 4: Co-Applicant Details */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" /> 4. Co-Applicant Details ({editCoApplicants.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCoApplicantCountChange(editCoApplicants.length + 1)}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    + Add Co-Applicant
                  </button>
                </div>

                {editCoApplicants.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-500 text-center text-xs">
                    Sole applicant file (No co-applicants). Click "+ Add Co-Applicant" above to add co-applicant details.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editCoApplicants.map((coApp, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/70 dark:border-slate-800/80 pb-2">
                          <span className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400">
                            👤 Co-Applicant {idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-medium">Income Details:</span>
                              <select
                                value={coApp.incomeRequired ? 'YES' : 'NO'}
                                onChange={(e) => handleCoApplicantFieldChange(idx, 'incomeRequired', e.target.value === 'YES')}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                                  coApp.incomeRequired
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                                }`}
                              >
                                <option value="YES">YES (Income Required)</option>
                                <option value="NO">NO (Skip Income)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = editCoApplicants.filter((_, i) => i !== idx);
                                setEditCoApplicants(updated);
                                setEditFormData((prev) => ({ ...prev, coApplicantCount: updated.length }));
                              }}
                              className="text-rose-500 hover:text-rose-600 text-[11px] font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Full Name
                            </label>
                            <input
                              type="text"
                              placeholder={`Co-Applicant ${idx + 1} Name`}
                              value={coApp.name}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'name', sanitizeToAlphabetsOnly(e.target.value))}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Relationship with Applicant
                            </label>
                            <select
                              value={coApp.relationship || 'Spouse'}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'relationship', e.target.value)}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900"
                            >
                              <option value="Spouse">Spouse</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Son">Son</option>
                              <option value="Daughter">Daughter</option>
                              <option value="Business Partner">Business Partner</option>
                              <option value="Director">Director</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                Mobile Number (10 Digits)
                              </label>
                              <span className={`text-[10px] font-mono ${coApp.mobile?.length === 10 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                                {coApp.mobile?.length || 0}/10
                              </span>
                            </div>
                            <input
                              type="tel"
                              maxLength={10}
                              placeholder="10-digit mobile"
                              value={coApp.mobile}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'mobile', sanitizeTo10Digits(e.target.value))}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Email Address
                            </label>
                            <input
                              type="email"
                              placeholder="Email Address"
                              value={coApp.email}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'email', e.target.value.trim())}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Gender
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => handleCoApplicantFieldChange(idx, 'gender', g)}
                                  className={`py-1 text-center rounded-lg text-[10px] font-bold border transition-all ${
                                    coApp.gender === g
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Date of Birth (DOB)
                            </label>
                            <DatePickerInput
                              value={coApp.dob || ''}
                              onChange={(val) => handleCoApplicantFieldChange(idx, 'dob', val)}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
                              minYear={1930}
                              maxYear={2026}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              State
                            </label>
                            <select
                              value={coApp.state}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'state', e.target.value)}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900"
                            >
                              <option value="">-- Select State --</option>
                              {INDIAN_STATES.map((stateName) => (
                                <option key={stateName} value={stateName}>
                                  {stateName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              City
                            </label>
                            <input
                              type="text"
                              placeholder="City"
                              value={coApp.city || ''}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'city', e.target.value)}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
                            />
                          </div>
                        </div>

                        {/* Co-app Profiles */}
                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Co-Applicant Customer Entity (Multi-Select)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {availableCustomerTypes.map((pr) => {
                              const coCusts = coApp.customerTypes || [];
                              const checked = coCusts.includes(pr.name);
                              return (
                                <button
                                  key={pr.name}
                                  type="button"
                                  onClick={() => {
                                    const next = checked
                                      ? coCusts.filter((t) => t !== pr.name)
                                      : [...coCusts, pr.name];
                                    handleCoApplicantFieldChange(idx, 'customerTypes', next);
                                  }}
                                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] text-left ${
                                    checked
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <div className={`w-3 h-3 rounded flex items-center justify-center border shrink-0 ${
                                    checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                                  }`}>
                                    {checked && <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{pr.name}</span>
                                </button>
                              );
                            })}
                          </div>

                          <label className="block text-[10px] font-semibold text-slate-500 uppercase pt-1">
                            Co-Applicant Income Profile (Multi-Select)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {profiles.map((pr) => {
                              const coIncs = coApp.incomeTypes || [];
                              const checked = coIncs.includes(pr.name);
                              return (
                                <button
                                  key={pr.name}
                                  type="button"
                                  onClick={() => {
                                    const next = checked
                                      ? coIncs.filter((t) => t !== pr.name)
                                      : [...coIncs, pr.name];
                                    handleCoApplicantFieldChange(idx, 'incomeTypes', next);
                                  }}
                                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] text-left ${
                                    checked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <div className={`w-3 h-3 rounded flex items-center justify-center border shrink-0 ${
                                    checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                                  }`}>
                                    {checked && <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{pr.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: Lifecycle & Multi-Select Staff Assignments */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <Users className="w-3.5 h-3.5 text-emerald-500" /> 5. Stage, Status & Staff Assignments
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Processing Stage
                      </label>
                      {userRole === 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewStageData({
                              stageNumber: (stagesList.length > 0 ? Math.max(...stagesList.map((s) => s.stageNumber)) : 0) + 1,
                              name: '',
                              description: '',
                              color: '#3b82f6',
                            });
                            setStageManagerError('');
                            setStageManagerSuccess('');
                            setEditingStageId(null);
                            setIsStageManagerOpen(true);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          + Manage Stages
                        </button>
                      )}
                    </div>
                    <select
                      value={editFormData.stage}
                      onChange={(e) => setEditFormData({ ...editFormData, stage: parseInt(e.target.value) || 1 })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                      style={{
                        color: stagesList.find((s) => s.stageNumber === editFormData.stage)?.color || '#4f46e5',
                      }}
                    >
                      {stagesList.map((stg) => (
                        <option key={stg.id || stg.stageNumber} value={stg.stageNumber}>
                          Stage {stg.stageNumber} — {stg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Case Filing Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                      style={{
                        color: availableStatuses.find((s) => s.name === editFormData.status)?.color || '#10b981',
                      }}
                    >
                      {availableStatuses.map((st) => (
                        <option key={st.id || st.name} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Team
                    </label>
                    <select
                      value={editFormData.assignedTeamId}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedTeamId: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                    >
                      <option value="">-- No Specific Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Channel Partner Multi-Select */}
                  <MultiSelectDropdown
                    label="Channel Partner(s) (Multi-Select)"
                    options={channelUsers.map((u) => ({ value: u.id, label: u.name.replace(/\s*\([^)]*\)/g, '').trim() }))}
                    selected={editFormData.channelUserIds}
                    onChange={(ids) => setEditFormData({ ...editFormData, channelUserIds: ids, channelUserId: ids.join(',') })}
                    color="amber"
                    placeholder="Select Channel Partners..."
                  />

                  {/* Sales Lead Multi-Select */}
                  <MultiSelectDropdown
                    label="Sales Executive(s) (Multi-Select)"
                    options={salesUsers.map((u) => ({ value: u.id, label: u.name.replace(/\s*\([^)]*\)/g, '').trim() }))}
                    selected={editFormData.salesUserIds}
                    onChange={(ids) => setEditFormData({ ...editFormData, salesUserIds: ids, salesUserId: ids.join(',') })}
                    color="blue"
                    placeholder="Select Sales Executives..."
                  />

                  {/* Operation Lead Multi-Select */}
                  <MultiSelectDropdown
                    label="Operations Executive(s) (Multi-Select)"
                    options={operationUsers.map((u) => ({ value: u.id, label: u.name.replace(/\s*\([^)]*\)/g, '').trim() }))}
                    selected={editFormData.operationUserIds}
                    onChange={(ids) => setEditFormData({ ...editFormData, operationUserIds: ids, operationUserId: ids.join(',') })}
                    color="purple"
                    placeholder="Select Operations Executives..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  {editLoading ? 'Saving...' : 'Save Case Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- PROCESSING STAGES MANAGER MODAL -------------------- */}
      {isStageManagerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full space-y-4 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Manage Processing Stages
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add new stages, edit existing titles & colors, or delete stages dynamically
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStageManagerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Success Messages */}
            {stageManagerError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{stageManagerError}</span>
              </div>
            )}
            {stageManagerSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{stageManagerSuccess}</span>
              </div>
            )}

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Add New Stage Box */}
              <form onSubmit={handleAddStage} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-500" /> Add New Processing Stage
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Stage No. *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={newStageData.stageNumber}
                      onChange={(e) => setNewStageData({ ...newStageData, stageNumber: parseInt(e.target.value) || 1 })}
                      className="w-full glass-input px-3 py-1.5 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Stage Title / Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Valuation & Legal Audit"
                      value={newStageData.name}
                      onChange={(e) => setNewStageData({ ...newStageData, name: e.target.value })}
                      className="w-full glass-input px-3 py-1.5 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Badge Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newStageData.color}
                        onChange={(e) => setNewStageData({ ...newStageData, color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                      />
                      <span className="text-[11px] font-mono text-slate-500">{newStageData.color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Short description / purpose (optional)"
                    value={newStageData.description}
                    onChange={(e) => setNewStageData({ ...newStageData, description: e.target.value })}
                    className="flex-1 glass-input px-3 py-1.5 rounded-lg text-xs"
                  />
                  <button
                    type="submit"
                    disabled={stageManagerLoading}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    {stageManagerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add Stage
                  </button>
                </div>
              </form>

              {/* Existing Stages List */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Active Stages ({stagesList.length})</span>
                  <span className="text-[10px] lowercase font-normal">Sorted by stage sequence</span>
                </div>

                {stagesList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No processing stages found. Add your first stage above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stagesList.map((stg) => {
                      const isEditing = editingStageId === stg.id;
                      return (
                        <div
                          key={stg.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all"
                        >
                          {isEditing ? (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Stage No.</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={editStageData.stageNumber}
                                    onChange={(e) => setEditStageData({ ...editStageData, stageNumber: parseInt(e.target.value) || 1 })}
                                    className="w-full glass-input px-2.5 py-1 rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Stage Title</label>
                                  <input
                                    type="text"
                                    value={editStageData.name}
                                    onChange={(e) => setEditStageData({ ...editStageData, name: e.target.value })}
                                    className="w-full glass-input px-2.5 py-1 rounded-lg text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Color</label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="color"
                                      value={editStageData.color}
                                      onChange={(e) => setEditStageData({ ...editStageData, color: e.target.value })}
                                      className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                                    />
                                    <span className="text-[10px] font-mono text-slate-400">{editStageData.color}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description (Optional)</label>
                                <input
                                  type="text"
                                  value={editStageData.description}
                                  onChange={(e) => setEditStageData({ ...editStageData, description: e.target.value })}
                                  placeholder="Description..."
                                  className="w-full glass-input px-2.5 py-1 rounded-lg text-xs"
                                />
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setEditingStageId(null)}
                                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-[11px] font-semibold"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={stageManagerLoading}
                                  onClick={() => handleSaveEditStage(stg.id)}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1"
                                >
                                  {stageManagerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                  Save Stage
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold border shrink-0"
                                  style={{
                                    backgroundColor: `${stg.color || '#3b82f6'}18`,
                                    color: stg.color || '#3b82f6',
                                    borderColor: `${stg.color || '#3b82f6'}40`,
                                  }}
                                >
                                  Stage {stg.stageNumber}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {stg.name}
                                  </div>
                                  {stg.description && (
                                    <div className="text-[11px] text-slate-500 truncate">
                                      {stg.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditStage(stg)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                  title="Edit Stage"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStage(stg.id, stg.stageNumber, stg.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                  title="Delete Stage"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsStageManagerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all"
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
