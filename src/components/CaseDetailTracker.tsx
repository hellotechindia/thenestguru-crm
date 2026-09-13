'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateChecklistItemAction,
  saveSectionChecklistItemsAction,
  updateCasePersonalInfoAction,
  updateCaseStatusAction,
  deleteChecklistItemAction,
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
} from 'lucide-react';
import { exportToCSV } from '@/lib/excel-export';

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  appliesTo: string;
  status: string;
  remark: string;
  documentUrl: string;
  stage: number;
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
    product: string;
    customerType: string;
    propertyType: string;
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

  // Applicant Filter state: "ALL" | "Applicant" | "Co-Applicant 1" | "Co-Applicant 2" ...
  const [applicantFilter, setApplicantFilter] = useState<string>('ALL');

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
    return item.appliesTo === applicantFilter;
  });

  // Group filtered items by category - ignore dummy "Personal Information" checklist category
  const categoriesMap = filteredItems.reduce((acc, item) => {
    if (item.category.toLowerCase().includes('personal information')) {
      return acc;
    }
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
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
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim());
  };

  const validateAadhar = (aadhar: string): boolean => {
    const digitsOnly = aadhar.replace(/\D/g, '');
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

  // Individual Row Save
  const handleSaveItem = async (item: ChecklistItem) => {
    if (isReadOnly) {
      setErrorMessage('Read-only access: Cannot modify document items.');
      return;
    }
    setSavingId(item.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await updateChecklistItemAction(item.id, caseData.id, item);
      setSuccessMessage(`Saved "${item.label}"!`);
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
    setSavingCategory(categoryName);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await saveSectionChecklistItemsAction(caseData.id, categoryItems);
    setSavingCategory(null);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save section.');
    } else {
      setSuccessMessage(`Section "${categoryName}" saved successfully!`);
      router.refresh();
    }
  };

  // Personal Info Save
  const handleSavePersonalInfo = async () => {
    if (isReadOnly) return;
    setErrorMessage('');
    setSuccessMessage('');
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
      <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
                <img
                  src="https://thenestguru.com/thenestgurulogo.png"
                  alt="NestGuru Logo"
                  className="w-full h-full max-w-full max-h-full object-contain shrink-0"
                />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">NestGuru Loan Desk</span>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{caseData.clientName}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold text-xs">
                {caseData.product}
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold text-xs">
                {caseData.customerType}
              </span>
              {caseData.clientState && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {caseData.clientState}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400">
                <Phone className="w-3.5 h-3.5 text-sky-500" /> {caseData.mobile}
              </span>
              {caseData.email && (
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-sky-500" /> {caseData.email}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-300">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" /> {caseData.propertyType}
              </span>
            </div>
          </div>

          {/* Controls: Applicant Filter, Print & Export */}
          <div className="flex flex-wrap items-center gap-3 no-print">
            {/* Applicant-wise Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <Filter className="w-4 h-4 text-sky-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Filter Applicant:</span>
              <select
                value={applicantFilter}
                onChange={(e) => setApplicantFilter(e.target.value)}
                className="bg-transparent font-bold text-sky-600 dark:text-sky-400 focus:outline-none"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Applicants</option>
                <option value="Applicant" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Main Client Only</option>
                {Array.from({ length: caseData.coApplicantCount }).map((_, idx) => (
                  <option key={idx} value={`Co-Applicant ${idx + 1}`} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    Co-Applicant {idx + 1}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportPendingDocs}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Download Pending Documents List for this applicant"
            >
              <Download className="w-4 h-4" /> Export Pending Docs
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-sm"
            >
              <Printer className="w-4 h-4 text-sky-500" /> Print / PDF Summary
            </button>
          </div>
        </div>

        {/* Progress Bar Header */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              Document Collection Progress ({applicantFilter})
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
                  const labelLower = item.label.toLowerCase();
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
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                item.appliesTo === 'Applicant'
                                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {item.appliesTo}
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
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            OneDrive / Drive Share Link
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              placeholder="Paste OneDrive link..."
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
                            Remarks / Notes (Multi-line)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Type detailed remarks..."
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Client State</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{caseData.clientState || 'N/A'}</span>
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
                    className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1"
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
              onChange={(e) => setPersonalInfo({ ...personalInfo, motherName: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Spouse Name</label>
            <input
              type="text"
              placeholder="Spouse's Full Name"
              value={personalInfo.spouseName}
              onChange={(e) => setPersonalInfo({ ...personalInfo, spouseName: e.target.value })}
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
            <input
              type="date"
              value={personalInfo.dojCompany}
              onChange={(e) => setPersonalInfo({ ...personalInfo, dojCompany: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl"
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
                  updated[rIdx].name = e.target.value;
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
    </div>
  );
}
