'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateChecklistItemAction,
  saveSectionChecklistItemsAction,
  updateCasePersonalInfoAction,
  updateCaseStatusAction,
  deleteChecklistItemAction,
  resyncCaseChecklistAction,
} from '@/app/actions';
import {
  ExternalLink,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  FileCheck,
  Layers,
  Printer,
  Trash2,
  ShieldAlert,
  Download,
  Filter,
  User,
  MapPin,
  Building,
  Plus,
  Users,
  Calendar,
  Clock,
  Sparkles,
  BadgeCheck,
  History,
  X,
  RefreshCw,
} from 'lucide-react';
import { exportToCSV } from '@/lib/excel-export';
import { isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';
import DatePickerInput from './DatePickerInput';

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  appliesTo: string;
  personName?: string;
  status: string;
  remark: string;
  documentUrl: string;
  stage: number;
  requireOnedrive?: boolean;
  requireRemark?: boolean;
  remarkPlaceholder?: string;
  bankName?: string;
  monthName?: string;
  financialYear?: string;
  documentDate?: string;
  periodDetails?: string;
  startDate?: string;
  endDate?: string;
  extraDetails?: string;
}

interface CaseDetailProps {
  caseData: {
    id: string;
    clientName: string;
    mobile: string;
    email: string | null;
    clientState?: string | null;
    clientCity?: string | null;
    clientDob?: string | null;
    product: string;
    customerType: string;
    propertyType: string;
    propertyState?: string | null;
    propertyCity?: string | null;
    coApplicantCount: number;
    coApplicantsData?: any[];
    motherName?: string;
    spouseName?: string;
    educationQualification?: string;
    dojCompany?: string;
    totalExperienceYears?: string;
    residenceYears?: string;
    referencesData?: any[];
    stage: number;
    status: string;
    assignedTeamName?: string;
    createdById?: string;
    createdByName?: string;
    createdByRole?: string;
    createdAt?: string;
    updatedAt?: string;
    incomeTypes?: string[];
    checklistItems: ChecklistItem[];
  };
  userRole: string;
  userAccessPermission: string;
  banks: Array<{ id: string; bankName: string; requiredSalaryMonths: number }>;
  states: Array<{ id: string; name: string }>;
}

export default function CaseDetailTracker({ caseData, userRole, userAccessPermission, banks, states }: CaseDetailProps) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>(caseData.checklistItems);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resyncing, setResyncing] = useState(false);

  // Sync state when caseData prop updates
  useEffect(() => {
    setItems(caseData.checklistItems);
  }, [caseData.checklistItems]);

  const handleResyncChecklist = async () => {
    if (
      !confirm(
        'Re-sync checklist items with the latest template conditions?\n\n• Unmatched fields (e.g. MSME/business documents for salaried applicants) will be safely removed.\n• All previously uploaded documents, remarks, and completed items will be strictly PRESERVED.'
      )
    ) {
      return;
    }
    setResyncing(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await resyncCaseChecklistAction(caseData.id);
      if (res.success) {
        setSuccessMessage('Checklist re-synced successfully with current template conditions.');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to re-sync checklist');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error occurred while re-syncing checklist');
    } finally {
      setResyncing(false);
    }
  };

  // Applicant Filter state: "ALL" | "Applicant" | "Co-Applicant 1" | "Co-Applicant 2" ...
  const [applicantFilter, setApplicantFilter] = useState<string>('ALL');

  // History Note / Reason Prompt State
  const [historyModalItem, setHistoryModalItem] = useState<ChecklistItem | null>(null);
  const [historyRemarkInput, setHistoryRemarkInput] = useState('');
  const [autoLogWithoutPrompt, setAutoLogWithoutPrompt] = useState(false);

  // Dynamic Person Badge Resolver: Always shows real names for Applicant and all Co-Applicants
  const getPersonBadgeLabel = (item: ChecklistItem) => {
    const applies = (item.appliesTo || '').trim();
    const person = (item.personName || '').trim();

    if (!applies || applies.toLowerCase() === 'applicant') {
      return `${person || caseData.clientName || 'Applicant'} (Applicant)`;
    }
    if (applies.toLowerCase().includes('(applicant)')) {
      return applies;
    }

    const coMatch = applies.match(/co-applicant\s*(\d+)/i);
    if (coMatch) {
      const idx = parseInt(coMatch[1], 10);
      const coApp = (caseData.coApplicantsData || [])[idx - 1];
      const resolvedName = person || coApp?.name?.trim() || `Co-Applicant ${idx}`;
      return `${resolvedName} (Co-Applicant ${idx})`;
    }

    if (applies.toLowerCase() === 'co-applicant') {
      const coApp = (caseData.coApplicantsData || [])[0];
      const resolvedName = person || coApp?.name?.trim() || 'Co-Applicant 1';
      return `${resolvedName} (Co-Applicant 1)`;
    }

    if (person && !applies.toLowerCase().includes(person.toLowerCase())) {
      return `${person} (${applies})`;
    }

    return applies;
  };

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    motherName: caseData.motherName || '',
    spouseName: caseData.spouseName || '',
    educationQualification: caseData.educationQualification || caseData.residenceYears || '',
    dojCompany: caseData.dojCompany || '',
    totalExperienceYears: caseData.totalExperienceYears || '5 Years',
    residenceYears: caseData.residenceYears || '3 Years',
  });

  // Dynamic References State
  const [references, setReferences] = useState<Array<{ name: string; address: string; phone: string; email: string }>>(
    caseData.referencesData && caseData.referencesData.length > 0
      ? caseData.referencesData
      : [{ name: '', address: '', phone: '', email: '' }]
  );

  const isReadOnly = userAccessPermission === 'VIEW';

  const receivedCount = items.filter((i) => i.status === 'Received' || i.status === 'Not Applicable').length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0;

  // Filter items by Applicant filter
  const filteredItems = items.filter((item) => {
    if (applicantFilter === 'ALL') return true;
    const applies = (item.appliesTo || '').toLowerCase();
    const person = (item.personName || '').toLowerCase();

    if (applicantFilter === 'APPLICANT') {
      return applies.includes('applicant') && !applies.includes('co-applicant');
    }

    if (applicantFilter.startsWith('CO_APP_')) {
      const idx = parseInt(applicantFilter.replace('CO_APP_', ''), 10);
      const coApp = (caseData.coApplicantsData || [])[idx - 1];
      const matchesIdx = applies.includes(`co-applicant ${idx}`);
      const matchesName = coApp?.name && (applies.includes(coApp.name.toLowerCase()) || person.includes(coApp.name.toLowerCase()));
      return matchesIdx || matchesName;
    }

    return item.appliesTo === applicantFilter;
  });

  const applicantItemsCount = items.filter((item) => {
    const applies = (item.appliesTo || '').toLowerCase();
    return applies.includes('applicant') && !applies.includes('co-applicant');
  }).length;

  const getCoAppItemsCount = (idx: number) => {
    const coApp = (caseData.coApplicantsData || [])[idx - 1];
    return items.filter((item) => {
      const applies = (item.appliesTo || '').toLowerCase();
      const person = (item.personName || '').toLowerCase();
      const matchesIdx = applies.includes(`co-applicant ${idx}`);
      const matchesName = coApp?.name && (applies.includes(coApp.name.toLowerCase()) || person.includes(coApp.name.toLowerCase()));
      return matchesIdx || matchesName;
    }).length;
  };

  // Group filtered items by category - ignore dummy "Personal Information" checklist category
  const categoriesMap = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (cat.toLowerCase().includes('personal information')) {
      return acc;
    }
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const parseExtra = (
    extraDetails?: string | null
  ): {
    numberOfItems?: string;
    timePeriod?: string;
    bankName?: string;
    panNumber?: string;
    aadharNumber?: string;
  } => {
    if (!extraDetails) return {};
    try {
      return JSON.parse(extraDetails);
    } catch {
      return {};
    }
  };

  const validatePAN = (pan: string): boolean => {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((pan || '').trim());
  };

  const validateAadhar = (aadhar: string): boolean => {
    const digitsOnly = (aadhar || '').replace(/\D/g, '');
    return digitsOnly.length === 12;
  };

  const handleFieldChange = (id: string, field: keyof ChecklistItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleExtraFieldChange = (
    id: string,
    key: 'numberOfItems' | 'timePeriod' | 'bankName' | 'panNumber' | 'aadharNumber',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = parseExtra(item.extraDetails);
        const updated = { ...current, [key]: value };
        const updatedItem: ChecklistItem = {
          ...item,
          extraDetails: JSON.stringify(updated),
        };
        if (key === 'timePeriod') {
          updatedItem.periodDetails = value;
        }
        if (key === 'bankName') {
          updatedItem.bankName = value;
        }
        return updatedItem;
      })
    );
  };

  const handleSalaryBankSelect = (id: string, selectedBankName: string) => {
    const bankConfig = banks.find((b) => b.bankName === selectedBankName);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = parseExtra(item.extraDetails);
        const updatedCount = bankConfig ? String(bankConfig.requiredSalaryMonths) : (current.numberOfItems || '');
        const updated = {
          ...current,
          bankName: selectedBankName,
          numberOfItems: updatedCount,
        };
        return {
          ...item,
          bankName: selectedBankName,
          extraDetails: JSON.stringify(updated),
        };
      })
    );
  };

  // Individual Row Save Handler: prompts for history note or auto-logs
  const handleSaveItem = (item: ChecklistItem) => {
    if (isReadOnly) {
      setErrorMessage('Read-only access: Cannot modify document items.');
      return;
    }
    if (autoLogWithoutPrompt) {
      executeSaveItem(item, item.remark || '');
    } else {
      setHistoryModalItem(item);
      setHistoryRemarkInput(item.remark || '');
    }
  };

  const executeSaveItem = async (item: ChecklistItem, historyRemark?: string) => {
    setSavingId(item.id);
    setErrorMessage('');
    setSuccessMessage('');
    setHistoryModalItem(null);
    try {
      await updateChecklistItemAction(item.id, caseData.id, {
        ...item,
        historyRemark: historyRemark || undefined,
      });
      setSuccessMessage(`Saved "${item.label}" & recorded to history!`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update document status');
    } finally {
      setSavingId(null);
    }
  };

  // Section-wise Bulk Save
  const handleSaveSection = async (categoryName: string, categoryItems: ChecklistItem[]) => {
    if (isReadOnly) {
      setErrorMessage('Read-only access: Cannot modify document items.');
      return;
    }
    const note = window.prompt(`Enter optional history update note for category "${categoryName}":`, '') || undefined;
    setSavingCategory(categoryName);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await saveSectionChecklistItemsAction(caseData.id, categoryItems, note);
    setSavingCategory(null);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save section.');
    } else {
      setSuccessMessage(`Section "${categoryName}" saved & recorded to history!`);
      router.refresh();
    }
  };

  // Personal Info Save
  const handleSavePersonalInfo = async () => {
    if (isReadOnly) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (personalInfo.motherName && !isValidName(personalInfo.motherName)) {
      setErrorMessage("Mother Name must contain only alphabetic characters and spaces.");
      return;
    }

    if (personalInfo.spouseName && !isValidName(personalInfo.spouseName)) {
      setErrorMessage("Spouse Name must contain only alphabetic characters and spaces.");
      return;
    }

    for (let rIdx = 0; rIdx < references.length; rIdx++) {
      const ref = references[rIdx];
      if (ref.name && !isValidName(ref.name)) {
        setErrorMessage(`Reference ${rIdx + 1} Name must contain only alphabetic characters and spaces.`);
        return;
      }
    }

    const res = await updateCasePersonalInfoAction(caseData.id, {
      ...personalInfo,
      referencesData: references,
    });
    if (res.success) {
      setSuccessMessage('Personal information updated!');
      router.refresh();
    } else {
      setErrorMessage(res.error || 'Failed to update personal info.');
    }
  };

  const handleDeleteItem = async (itemId: string, label: string) => {
    if (userRole !== 'SUPER_ADMIN') {
      setErrorMessage('Permission Denied: Only Super Admin can delete document line items.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${label}"?`)) return;

    setSavingId(itemId);
    const res = await deleteChecklistItemAction(itemId, caseData.id);
    setSavingId(null);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to delete');
    } else {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      router.refresh();
    }
  };

  // Export Pending Documents for Filtered Applicant
  const handleExportPendingDocs = () => {
    const pendingRows = filteredItems
      .filter((i) => i.status === 'Pending' || i.status === 'Rejected')
      .map((i) => {
        const extra = parseExtra(i.extraDetails);
        return {
          'Category': i.category,
          'Document Label': i.label,
          'Applies To': i.appliesTo,
          'Current Status': i.status,
          'Bank Name': i.bankName || extra.bankName || 'N/A',
          'No. of Items/Forms': extra.numberOfItems || 'N/A',
          'Time Period': i.periodDetails || extra.timePeriod || 'N/A',
          'Remarks': i.remark || '',
        };
      });

    exportToCSV(`Pending_Docs_${caseData.clientName}_${applicantFilter}_${new Date().toISOString().slice(0, 10)}`, pendingRows);
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
        </div>
      )}

      {/* Case Overview Header */}
      <div className="glass-panel p-6 rounded-2xl space-y-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden shadow-sm">
                <img
                  src="https://thenestguru.com/thenestgurulogo.png"
                  alt="TheNestGuru Logo"
                  className="w-full h-full max-w-full max-h-full object-contain shrink-0"
                />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  TheNestGuru Loan Desk • File #{caseData.id.slice(-6).toUpperCase()}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {caseData.clientName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold text-xs">
                    Primary Applicant
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold text-xs">
                {caseData.product}
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold text-xs">
                {caseData.customerType}
              </span>
              {caseData.incomeTypes && caseData.incomeTypes.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-xs">
                  Income: {caseData.incomeTypes.join(', ')}
                </span>
              )}
              {(caseData.clientCity || caseData.clientState) && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {caseData.clientCity ? `${caseData.clientCity}, ${caseData.clientState || ''}` : caseData.clientState}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-400">
                <Phone className="w-3.5 h-3.5 text-sky-500" /> {caseData.mobile}
              </span>
              {caseData.email && (
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-sky-500" /> {caseData.email}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-300">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{caseData.propertyType}</span>
                {(caseData.propertyCity || caseData.propertyState) && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ({[caseData.propertyCity, caseData.propertyState].filter(Boolean).join(', ')})
                  </span>
                )}
              </span>
            </div>

            {/* Timeline & Case Age Info */}
            {caseData.createdAt && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  Intake Date: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </span>
                {(() => {
                  const created = new Date(caseData.createdAt);
                  const now = new Date();
                  const diffDays = Math.floor(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                      ⏱ {diffDays === 0 ? 'Intake: Today (Fresh)' : `${diffDays} Days Old`}
                    </span>
                  );
                })()}
                {caseData.updatedAt && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Last Updated: {new Date(caseData.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(caseData.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {caseData.createdByName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <User className="w-3 h-3 text-indigo-500" />
                    Intake By: <strong className="text-slate-900 dark:text-white font-bold">{caseData.createdByName}</strong>
                    {caseData.createdByRole && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                        ({caseData.createdByRole.replace('_', ' ')})
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 no-print shrink-0">
            {userRole !== 'CHANNEL' && (
              <button
                type="button"
                onClick={handleResyncChecklist}
                disabled={resyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                title="Re-evaluate and refresh checklist fields according to template rules"
              >
                <RefreshCw className={`w-4 h-4 ${resyncing ? 'animate-spin' : ''}`} />
                <span>{resyncing ? 'Re-syncing...' : 'Re-sync Checklist'}</span>
              </button>
            )}

            <button
              onClick={handleExportPendingDocs}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Download Pending Documents List for this applicant"
            >
              <Download className="w-4 h-4" /> Export Pending Docs
            </button>

            <a
              href="#case-history-timeline"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm"
              title="View Case Follow-Up & History Audit Trail"
            >
              <History className="w-4 h-4" /> History Log
            </a>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-sm"
            >
              <Printer className="w-4 h-4 text-sky-500" /> Print / PDF Summary
            </button>
          </div>
        </div>

        {/* Co-Applicants on File Banner */}
        {caseData.coApplicantsData && caseData.coApplicantsData.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mb-2.5">
              <Users className="w-3.5 h-3.5" /> Co-Applicants on File ({caseData.coApplicantsData.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {caseData.coApplicantsData.map((co: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40 text-xs flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      {co.name || `Co-Applicant ${idx + 1}`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                      {co.relationship || `Co-Applicant ${idx + 1}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                    {co.mobile && <span>📞 {co.mobile}</span>}
                    {(co.city || co.state) && <span>📍 {co.city ? `${co.city}, ${co.state || ''}` : co.state}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-purple-100 dark:border-purple-900/40 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        co.incomeRequired !== false
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {co.incomeRequired !== false ? 'Financial (Income Contributor)' : 'Non-Financial'}
                    </span>
                    {co.customerType && (
                      <span className="text-slate-500 font-medium">({co.customerType})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar Header */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              Document Collection Progress ({applicantFilter === 'ALL' ? 'All Applicants' : applicantFilter === 'APPLICANT' ? `${caseData.clientName} (Applicant)` : applicantFilter})
            </span>
            <span className="text-sky-600 dark:text-sky-400">
              {receivedCount} of {totalCount} Completed ({progressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                progressPct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Smart Applicant Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 border-t border-slate-200 dark:border-slate-800 no-print">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-sky-500" /> Filter Person:
          </span>

          {/* All Documents Tab */}
          <button
            type="button"
            onClick={() => setApplicantFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              applicantFilter === 'ALL'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Documents</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${applicantFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {items.length}
            </span>
          </button>

          {/* Main Applicant Tab */}
          <button
            type="button"
            onClick={() => setApplicantFilter('APPLICANT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              applicantFilter === 'APPLICANT'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{caseData.clientName} (Applicant)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${applicantFilter === 'APPLICANT' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {applicantItemsCount}
            </span>
          </button>

          {/* Co-Applicants Tabs */}
          {(caseData.coApplicantsData || []).map((co: any, idx: number) => {
            const tabKey = `CO_APP_${idx + 1}`;
            const count = getCoAppItemsCount(idx + 1);
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setApplicantFilter(tabKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  applicantFilter === tabKey
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{co.name || `Co-Applicant ${idx + 1}`} ({co.relationship || `Co-App ${idx + 1}`})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${applicantFilter === tabKey ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {userRole !== 'CHANNEL' && (
            <button
              type="button"
              onClick={handleResyncChecklist}
              disabled={resyncing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shrink-0 shadow-xs disabled:opacity-50"
              title="Refresh / Re-sync checklist items with template rules"
            >
              <RefreshCw className={`w-3 h-3 ${resyncing ? 'animate-spin' : ''}`} />
              <span>{resyncing ? 'Re-syncing...' : 'Re-sync Checklist'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Checklist Sections by Category */}
      <div className="space-y-6">
        {Object.entries(categoriesMap).map(([categoryName, catItems]) => {
          const catReceived = catItems.filter((i) => i.status === 'Received' || i.status === 'Not Applicable').length;
          return (
            <div key={categoryName} className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  {categoryName}
                </h2>

                <div className="flex items-center gap-3 no-print">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    {catReceived} / {catItems.length} Done
                  </span>

                  {/* Section-wise Save Button */}
                  {!isReadOnly && (
                    <button
                      onClick={() => handleSaveSection(categoryName, catItems)}
                      disabled={savingCategory === categoryName}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow"
                      title={`Bulk Save all rows in ${categoryName}`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingCategory === categoryName ? 'Saving Section...' : 'Save Section'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Global Banks Datalist */}
              <datalist id="case-banks-list">
                {banks.map((b) => (
                  <option key={b.id} value={b.bankName} />
                ))}
              </datalist>

              {/* Items List */}
              <div className="space-y-4">
                {catItems.map((item) => {
                  const labelLower = (item.label || '').toLowerCase();
                  const isPANCard = labelLower.includes('pan card') || labelLower === 'pan';
                  const isAadharCard = labelLower.includes('aadhar') || labelLower.includes('aadhaar');
                  const isSalarySlip = labelLower.includes('salary slip');
                  const isAccountStatement = labelLower.includes('account statement') || labelLower.includes('salary account');
                  const isForm16 = (labelLower.includes('form 16') || labelLower.includes('form-16')) && !labelLower.includes('26as');
                  const isForm26AS = labelLower.includes('26as');
                  const isITRCopy = (labelLower.includes('itr copy') || labelLower.includes('acknowledged itr')) && !labelLower.includes('itr form');
                  const isITRForm = labelLower.includes('itr form');
                  const isCombinedForm16 = labelLower.includes('form 16') && labelLower.includes('26as');
                  const isCombinedITR = (labelLower.includes('itr copy') || labelLower.includes('acknowledged itr')) && labelLower.includes('itr form');

                  const hasConfigStrip =
                    isSalarySlip ||
                    isAccountStatement ||
                    isForm16 ||
                    isForm26AS ||
                    isITRCopy ||
                    isITRForm ||
                    isCombinedForm16 ||
                    isCombinedITR ||
                    isPANCard ||
                    isAadharCard;

                  const extra = parseExtra(item.extraDetails);
                  const currentBank = item.bankName || extra.bankName || '';
                  const currentPeriod = extra.timePeriod || item.periodDetails || '';
                  const currentCount = extra.numberOfItems || '';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        item.status === 'Received'
                          ? 'bg-emerald-500/5 dark:bg-slate-900/60 border-emerald-500/30'
                          : item.status === 'Rejected'
                          ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        {/* Label & Applies To */}
                        <div className="lg:col-span-3 space-y-1">
                          <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">{item.label}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm ${
                                (item.appliesTo || '').toLowerCase().includes('co-applicant')
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                  : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                              }`}
                            >
                              <User className="w-3 h-3 shrink-0" />
                              <span>{getPersonBadgeLabel(item)}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Stage {item.stage}</span>
                            {currentCount && (
                              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-300 dark:border-sky-800">
                                Qty: {currentCount}
                              </span>
                            )}
                            {extra.panNumber && (
                              <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-800">
                                PAN: {extra.panNumber}
                              </span>
                            )}
                            {extra.aadharNumber && (
                              <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-300 dark:border-teal-800">
                                UID: {extra.aadharNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status (Always Visible) */}
                        <div className="lg:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Status
                          </label>
                          <select
                            value={item.status}
                            onChange={(e) => handleFieldChange(item.id, 'status', e.target.value)}
                            className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:ring-2 focus:outline-none ${
                              item.status === 'Received'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                : item.status === 'Rejected'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40'
                                : item.status === 'Not Applicable'
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Received">Received</option>
                            <option value="Not Applicable">Not Applicable</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>

                        {/* Document Drive URL */}
                        <div className="lg:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              OneDrive / Share Link
                            </label>
                            {item.requireOnedrive === false ? (
                              <span className="text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Optional
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded">
                                Link Required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              placeholder={item.requireOnedrive === false ? "Optional: paste drive link if any..." : "Paste OneDrive link..."}
                              value={item.documentUrl || ''}
                              onChange={(e) => handleFieldChange(item.id, 'documentUrl', e.target.value)}
                              className="w-full glass-input px-2.5 py-1 text-xs rounded-lg placeholder:text-slate-400 font-mono"
                            />
                            {item.documentUrl && (
                              <a
                                href={item.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Link"
                                className="p-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/60 text-sky-600 dark:text-sky-300 shrink-0 no-print"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Multi-line Remarks Field */}
                        <div className="lg:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Remarks / Notes
                          </label>
                          <textarea
                            rows={2}
                            placeholder={item.remarkPlaceholder || 'Type detailed remarks...'}
                            value={item.remark || ''}
                            onChange={(e) => handleFieldChange(item.id, 'remark', e.target.value)}
                            className="w-full glass-input px-2.5 py-1 text-xs rounded-lg placeholder:text-slate-400 whitespace-pre-wrap"
                          />
                        </div>

                        {/* Individual Row Action */}
                        <div className="lg:col-span-1 flex items-center justify-end gap-1 pt-2 lg:pt-0 no-print">
                          {!isReadOnly && (
                            <button
                              onClick={() => handleSaveItem(item)}
                              disabled={savingId === item.id}
                              title="Save Row"
                              className="p-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold text-xs transition-all disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {userRole === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleDeleteItem(item.id, item.label)}
                              title="Delete Line Item"
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Document-Specific Configuration Strip */}
                      {hasConfigStrip && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 p-3 rounded-xl">
                          <div className="flex flex-wrap items-center gap-4">
                            {/* 1. Salary Slip */}
                            {isSalarySlip && (
                              <>
                                <div className="flex-1 min-w-[200px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Salary Bank Selection
                                  </label>
                                  <select
                                    value={currentBank}
                                    onChange={(e) => handleSalaryBankSelect(item.id, e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  >
                                    <option value="">-- Select Bank --</option>
                                    {banks.map((b) => (
                                      <option key={b.id} value={b.bankName}>
                                        {b.bankName} ({b.requiredSalaryMonths} Mos Req)
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of Salary Slips
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 3 or 6"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[220px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Time Period (Duration / Months)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Oct 2023 - Mar 2024"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}

                            {/* 2. Last 1 Year Account Statement */}
                            {isAccountStatement && (
                              <>
                                <div className="flex-1 min-w-[200px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Bank Name
                                  </label>
                                  <input
                                    type="text"
                                    list="case-banks-list"
                                    placeholder="Select or enter bank..."
                                    value={currentBank}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'bankName', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of Statements
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 1, 4, 12"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[220px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Statement Time Period
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Apr 2023 - Mar 2024"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}

                            {/* 3. Form 16 (Part A & B) */}
                            {isForm16 && (
                              <>
                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of Form 16
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 2"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[240px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Financial Year / Time Period
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. FY 2022-23 & FY 2023-24"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}

                            {/* 4. Form 26AS */}
                            {isForm26AS && (
                              <>
                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of 26AS Forms
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 2"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[240px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Assessment Year / Time Period
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. AY 2023-24 & AY 2024-25"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}

                            {/* 5. Acknowledged ITR copy with computation */}
                            {isITRCopy && (
                              <>
                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of ITR Copies
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 2"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[240px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Assessment Year / Time Period
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. AY 2023-24 & AY 2024-25"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}

                            {/* 6. ITR Forms */}
                            {isITRForm && (
                              <>
                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of ITR Forms
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 2"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[240px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Assessment Year / Time Period
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. AY 2023-24 & AY 2024-25"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}

                            {/* 7. Fallback for unmigrated combined items */}
                            {(isCombinedForm16 || isCombinedITR) && (
                              <>
                                <div className="w-40">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    No. of Forms
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 2"
                                    value={currentCount}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'numberOfItems', e.target.value)}
                                    className="w-full glass-input text-xs font-bold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>

                                <div className="flex-1 min-w-[240px]">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Time Period (Years / AY)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 2 Years / FY 2022-24"
                                    value={currentPeriod}
                                    onChange={(e) => handleExtraFieldChange(item.id, 'timePeriod', e.target.value)}
                                    className="w-full glass-input text-xs font-semibold rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </>
                            )}
                            {/* 8. PAN Card */}
                            {isPANCard && (
                              <div className="flex-1 min-w-[280px]">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    PAN Card Number
                                  </label>
                                  {extra.panNumber ? (
                                    validatePAN(extra.panNumber) ? (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="w-3 h-3" /> Valid PAN
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-rose-500">
                                        Invalid PAN Format (e.g. ABCDE1234F)
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">10-Digit Alphanumeric</span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  maxLength={10}
                                  placeholder="e.g. ABCDE1234F"
                                  value={extra.panNumber || ''}
                                  onChange={(e) =>
                                    handleExtraFieldChange(
                                      item.id,
                                      'panNumber',
                                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                                    )
                                  }
                                  className={`w-full glass-input text-xs font-mono font-bold tracking-wider rounded-lg px-2.5 py-1.5 uppercase ${
                                    extra.panNumber
                                      ? validatePAN(extra.panNumber)
                                        ? 'border-emerald-500/60 focus:ring-emerald-500'
                                        : 'border-rose-500/60 focus:ring-rose-500'
                                      : ''
                                  }`}
                                />
                              </div>
                            )}

                            {/* 9. Aadhar Card */}
                            {isAadharCard && (
                              <div className="flex-1 min-w-[280px]">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Aadhar Card Number
                                  </label>
                                  {extra.aadharNumber ? (
                                    validateAadhar(extra.aadharNumber) ? (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="w-3 h-3" /> Valid Aadhaar (12 Digits)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-rose-500">
                                        12 Digits Required ({extra.aadharNumber.replace(/\D/g, '').length}/12)
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">12-Digit Number</span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  maxLength={14}
                                  placeholder="e.g. 1234 5678 9012"
                                  value={extra.aadharNumber || ''}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                                    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
                                    handleExtraFieldChange(item.id, 'aadharNumber', formatted);
                                  }}
                                  className={`w-full glass-input text-xs font-mono font-bold tracking-wider rounded-lg px-2.5 py-1.5 ${
                                    extra.aadharNumber
                                      ? validateAadhar(extra.aadharNumber)
                                        ? 'border-emerald-500/60 focus:ring-emerald-500'
                                        : 'border-rose-500/60 focus:ring-rose-500'
                                      : ''
                                  }`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Personal Information & References Section (Replaces dummy checklist items) */}
      <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" /> Personal Information & References
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Client & Co-Applicant contact details, family, qualification, employment experience and references.
            </p>
          </div>

          {!isReadOnly && (
            <button
              onClick={handleSavePersonalInfo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
            >
              <Save className="w-3.5 h-3.5" /> Save Personal Info
            </button>
          )}
        </div>

        {/* 1. Intake Contact Details */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-sky-500" />
            <span>Applicant & Co-Applicant Contact Information (From Intake)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Main Client Name</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{caseData.clientName}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Mobile Number</span>
              <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{caseData.mobile}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Email ID</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{caseData.email || 'N/A'}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Date of Birth (DOB)</span>
              <span className="font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                🎂 {caseData.clientDob ? new Date(caseData.clientDob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified'}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Location (City, State)</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {caseData.clientCity
                  ? `${caseData.clientCity}, ${caseData.clientState || 'N/A'}`
                  : caseData.clientState || 'N/A'}
              </span>
            </div>
          </div>

          {/* Co-Applicants Details if present */}
          {caseData.coApplicantsData && caseData.coApplicantsData.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Co-Applicants Contact Details ({caseData.coApplicantsData.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {caseData.coApplicantsData.map((coApp: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-white">
                        Co-Applicant {idx + 1}: {coApp.name || 'N/A'}
                      </span>
                      {coApp.incomeRequired !== false ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
                          Income Required
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                          No Income Req
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 flex items-center justify-between text-[11px]">
                      <span>📱 {coApp.mobile || 'N/A'}</span>
                      <span>✉️ {coApp.email || 'N/A'}</span>
                    </div>
                    {coApp.dob && (
                      <div className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                        🎂 DOB: {new Date(coApp.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Personal & Employment Details Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mother Name</label>
            <input
              type="text"
              placeholder="Mother's Full Name"
              value={personalInfo.motherName}
              onChange={(e) => setPersonalInfo({ ...personalInfo, motherName: sanitizeToAlphabetsOnly(e.target.value) })}
              className="w-full glass-input px-3 py-2 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Spouse Name</label>
            <input
              type="text"
              placeholder="Spouse's Full Name"
              value={personalInfo.spouseName}
              onChange={(e) => setPersonalInfo({ ...personalInfo, spouseName: sanitizeToAlphabetsOnly(e.target.value) })}
              className="w-full glass-input px-3 py-2 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Education Qualification</label>
            <input
              type="text"
              placeholder="e.g. Graduate / B.Tech / MBA"
              value={personalInfo.educationQualification}
              onChange={(e) => setPersonalInfo({ ...personalInfo, educationQualification: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date of Joining Current Company
            </label>
            <DatePickerInput
              value={personalInfo.dojCompany}
              onChange={(val) => setPersonalInfo({ ...personalInfo, dojCompany: val })}
              className="w-full glass-input px-3 py-2 rounded-xl"
              minYear={1950}
              maxYear={2035}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Experience</label>
            <select
              value={personalInfo.totalExperienceYears}
              onChange={(e) => setPersonalInfo({ ...personalInfo, totalExperienceYears: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl bg-white dark:bg-slate-900"
            >
              <option value="1 Year">1 Year</option>
              <option value="2 Years">2 Years</option>
              <option value="3 Years">3 Years</option>
              <option value="5 Years">5 Years</option>
              <option value="10 Years">10 Years</option>
              <option value="15+ Years">15+ Years</option>
            </select>
          </div>
        </div>

        {/* 3. References List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
            <span>References List ({references.length})</span>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setReferences([...references, { name: '', address: '', phone: '', email: '' }])}
                className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Reference
              </button>
            )}
          </div>

          {references.map((ref, rIdx) => (
            <div
              key={rIdx}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs items-center"
            >
              <input
                type="text"
                placeholder={`Reference ${rIdx + 1} Name`}
                value={ref.name}
                onChange={(e) => {
                  const updated = [...references];
                  updated[rIdx].name = sanitizeToAlphabetsOnly(e.target.value);
                  setReferences(updated);
                }}
                className="sm:col-span-3 glass-input px-2.5 py-1.5 rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={ref.address}
                onChange={(e) => {
                  const updated = [...references];
                  updated[rIdx].address = e.target.value;
                  setReferences(updated);
                }}
                className="sm:col-span-4 glass-input px-2.5 py-1.5 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={ref.phone}
                onChange={(e) => {
                  const updated = [...references];
                  updated[rIdx].phone = e.target.value;
                  setReferences(updated);
                }}
                className="sm:col-span-2 glass-input px-2.5 py-1.5 rounded-lg font-mono"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={ref.email}
                onChange={(e) => {
                  const updated = [...references];
                  updated[rIdx].email = e.target.value;
                  setReferences(updated);
                }}
                className="sm:col-span-2 glass-input px-2.5 py-1.5 rounded-lg"
              />
              {!isReadOnly && references.length > 1 && (
                <button
                  type="button"
                  onClick={() => setReferences(references.filter((_, idx) => idx !== rIdx))}
                  title="Remove Reference"
                  className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save & History Remark Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Case History Update
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Will be permanently logged into Case History & Timeline Log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Document:</span>
                <span className="font-bold text-slate-900 dark:text-white">{historyModalItem.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Person:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{getPersonBadgeLabel(historyModalItem)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  historyModalItem.status === 'Received'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : historyModalItem.status === 'Rejected'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}>
                  {historyModalItem.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                History Update Note / Follow-Up Reason:
              </label>
              <textarea
                rows={3}
                value={historyRemarkInput}
                onChange={(e) => setHistoryRemarkInput(e.target.value)}
                placeholder="e.g. Physical documents collected, Bank statement verified, Query answered by client..."
                className="w-full glass-input px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Logged with your staff username and Indian Standard Time (IST).
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 select-none">
                <input
                  type="checkbox"
                  checked={autoLogWithoutPrompt}
                  onChange={(e) => setAutoLogWithoutPrompt(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Auto-save without prompt this session</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryModalItem(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeSaveItem(historyModalItem, historyRemarkInput)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Record History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
