'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateChecklistItemAction,
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
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  appliesTo: string;
  status: string;
  remark: string | null;
  documentUrl: string | null;
  stage: number;
}

interface CaseDetailProps {
  caseData: {
    id: string;
    clientName: string;
    mobile: string;
    email: string | null;
    product: string;
    customerType: string;
    propertyType: string;
    coApplicantCount: number;
    stage: number;
    status: string;
    assignedTeamName?: string;
    checklistItems: ChecklistItem[];
  };
  userRole: string;
}

export default function CaseDetailTracker({ caseData, userRole }: CaseDetailProps) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>(caseData.checklistItems);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const receivedCount = items.filter((i) => i.status === 'Received' || i.status === 'Not Applicable').length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0;

  // Group items by category
  const categoriesMap = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const handleFieldChange = (id: string, field: keyof ChecklistItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveItem = async (item: ChecklistItem) => {
    setSavingId(item.id);
    setErrorMessage('');
    try {
      await updateChecklistItemAction(item.id, caseData.id, {
        status: item.status,
        remark: item.remark || '',
        documentUrl: item.documentUrl || '',
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update document status');
    } finally {
      setSavingId(null);
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

  const handleStageChange = async (newStage: number) => {
    await updateCaseStatusAction(caseData.id, caseData.status, newStage);
    router.refresh();
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateCaseStatusAction(caseData.id, newStatus, caseData.stage);
    router.refresh();
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Printable Case Header with NestGuru Logo */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Brand Logo & Client Meta */}
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
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">NestGuru Loan Desk Report</span>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{caseData.clientName}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold text-xs">
                {caseData.product}
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold text-xs">
                {caseData.customerType}
              </span>
              {caseData.coApplicantCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-sky-300 font-bold text-xs border border-slate-700">
                  {caseData.coApplicantCount} Co-Applicant(s)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-mono text-slate-400">
                <Phone className="w-3.5 h-3.5 text-sky-400" /> {caseData.mobile}
              </span>
              {caseData.email && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-sky-400" /> {caseData.email}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-medium text-indigo-300">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> {caseData.propertyType}
              </span>
            </div>
          </div>

          {/* Controls: Stage & Overall Status & Print Button */}
          <div className="flex flex-wrap items-center gap-3 no-print">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
              title="Print or Export Case Summary to PDF"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Print / PDF Summary</span>
            </button>

            {/* Stage Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400 font-medium">Stage:</span>
              <select
                value={caseData.stage}
                onChange={(e) => handleStageChange(parseInt(e.target.value))}
                className="bg-transparent font-bold text-indigo-400 focus:outline-none"
              >
                <option value={1} className="bg-slate-900 text-white">Stage 1 (Doc Intake)</option>
                <option value={2} className="bg-slate-900 text-white">Stage 2 (Bank Login)</option>
                <option value={3} className="bg-slate-900 text-white">Stage 3 (Sanctioning)</option>
                <option value={4} className="bg-slate-900 text-white">Stage 4 (Disbursal)</option>
              </select>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 text-xs">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={caseData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-transparent font-bold text-emerald-400 focus:outline-none"
              >
                <option value="Pending Documents" className="bg-slate-900 text-amber-400">Pending Documents</option>
                <option value="Ready for Submission" className="bg-slate-900 text-emerald-400">Ready for Submission</option>
                <option value="In Review" className="bg-slate-900 text-sky-400">In Review</option>
                <option value="Approved" className="bg-slate-900 text-emerald-400">Approved</option>
                <option value="Rejected" className="bg-slate-900 text-rose-400">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progress Bar Header */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Document Collection Progress
            </span>
            <span className="text-sky-400">
              {receivedCount} of {totalCount} Completed ({progressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                progressPct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/50'
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
            <div key={categoryName} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  {categoryName}
                </h2>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                  {catReceived} / {catItems.length} Done
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      item.status === 'Received'
                        ? 'bg-slate-900/60 border-emerald-500/20'
                        : item.status === 'Rejected'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* Item Label & Scope Tag */}
                      <div className="lg:col-span-4 space-y-1">
                        <div className="font-semibold text-xs text-white leading-snug">{item.label}</div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              item.appliesTo === 'Applicant'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {item.appliesTo}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Stage {item.stage}</span>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Status
                        </label>
                        <select
                          value={item.status}
                          onChange={(e) => handleFieldChange(item.id, 'status', e.target.value)}
                          className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:ring-2 focus:outline-none ${
                            item.status === 'Received'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                              : item.status === 'Rejected'
                              ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                              : item.status === 'Not Applicable'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-amber-950 text-amber-400 border-amber-500/40'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Received">Received</option>
                          <option value="Not Applicable">Not Applicable</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      {/* Document URL Input */}
                      <div className="lg:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          OneDrive / Drive URL
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            placeholder="Paste OneDrive link..."
                            value={item.documentUrl || ''}
                            onChange={(e) => handleFieldChange(item.id, 'documentUrl', e.target.value)}
                            className="w-full glass-input px-2.5 py-1 text-xs rounded-lg placeholder:text-slate-600 font-mono"
                          />
                          {item.documentUrl && (
                            <a
                              href={item.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Document Link in OneDrive"
                              className="p-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/60 text-sky-300 transition-colors shrink-0 no-print"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Remarks */}
                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Remarks / Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Salary slip 3 months attached"
                          value={item.remark || ''}
                          onChange={(e) => handleFieldChange(item.id, 'remark', e.target.value)}
                          className="w-full glass-input px-2.5 py-1 text-xs rounded-lg placeholder:text-slate-600"
                        />
                      </div>

                      {/* Save & Delete Action Buttons */}
                      <div className="lg:col-span-1 flex items-center justify-end gap-1 pt-2 lg:pt-0 no-print">
                        <button
                          onClick={() => handleSaveItem(item)}
                          disabled={savingId === item.id}
                          title="Save Changes"
                          className="p-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 font-semibold text-xs transition-all disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Restricted to SUPER_ADMIN */}
                        {userRole === 'SUPER_ADMIN' ? (
                          <button
                            onClick={() => handleDeleteItem(item.id, item.label)}
                            disabled={savingId === item.id}
                            title="Delete Line Item (Super Admin)"
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span title="Delete restricted to Super Admin" className="p-2 text-slate-700 cursor-not-allowed opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
