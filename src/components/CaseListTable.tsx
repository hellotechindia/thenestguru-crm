'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { deleteCaseAction, updateCaseIntakeDetailsAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/excel-export';

export interface CoApplicantInfo {
  name: string;
  mobile: string;
  email: string;
  state: string;
  incomeRequired: boolean;
}

export interface CaseItem {
  id: string;
  clientName: string;
  mobile: string;
  email: string | null;
  clientState?: string | null;
  product: string;
  customerType: string;
  propertyType: string;
  coApplicantCount: number;
  coApplicantsData?: string | null;
  stage: number;
  status: string;
  channelUserId?: string | null;
  salesUserId?: string | null;
  operationUserId?: string | null;
  assignedTeamId?: string | null;
  createdAt: string;
  checklistCount: number;
  receivedCount: number;
  assignedTeamName: string;
}

interface CaseListTableProps {
  cases: CaseItem[];
  userRole: string;
  teams?: Array<{ id: string; name: string }>;
  states?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; name: string; role: string; email: string }>;
}

export default function CaseListTable({
  cases,
  userRole,
  teams = [],
  states = [],
  users = [],
}: CaseListTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit Modal State
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    mobile: '',
    email: '',
    clientState: '',
    product: 'Home Loan',
    customerType: 'Salaried',
    propertyType: 'Resale',
    coApplicantCount: 0,
    stage: 1,
    status: 'Pending Documents',
    assignedTeamId: '',
    channelUserId: '',
    salesUserId: '',
    operationUserId: '',
  });
  const [editCoApplicants, setEditCoApplicants] = useState<CoApplicantInfo[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const channelUsers = users.filter((u) => u.role === 'CHANNEL');
  const salesUsers = users.filter((u) => u.role === 'SALES');
  const operationUsers = users.filter((u) => u.role === 'OPERATION' || u.role === 'TEAM_MEMBER');

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesProperty = propertyFilter === 'ALL' || c.propertyType === propertyFilter;

    return matchesSearch && matchesStatus && matchesProperty;
  });

  const handleExportFilteredCases = () => {
    const rows = filteredCases.map((c) => ({
      'Case ID': c.id,
      'Client Name': c.clientName,
      'Mobile Number': c.mobile,
      'Email': c.email || 'N/A',
      'Client State': c.clientState || 'N/A',
      'Loan Product': c.product,
      'Customer Profile': c.customerType,
      'Property Scope': c.propertyType,
      'Co-Applicants Count': c.coApplicantCount,
      'Processing Stage': `Stage ${c.stage}`,
      'Overall Status': c.status,
      'Assigned Team': c.assignedTeamName,
      'Documents Received': `${c.receivedCount}/${c.checklistCount}`,
      'Checklist Progress (%)': c.checklistCount > 0 ? `${Math.round((c.receivedCount / c.checklistCount) * 100)}%` : '0%',
      'Created Date': c.createdAt.slice(0, 10),
    }));
    exportToCSV(`NestGuru_Filtered_Cases_${new Date().toISOString().slice(0, 10)}`, rows);
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

    let parsedCoApps: CoApplicantInfo[] = [];
    try {
      if (c.coApplicantsData) {
        parsedCoApps = JSON.parse(c.coApplicantsData);
      }
    } catch (e) {
      parsedCoApps = [];
    }

    const fullCoApps: CoApplicantInfo[] = [];
    for (let i = 0; i < c.coApplicantCount; i++) {
      fullCoApps.push(
        parsedCoApps[i] || {
          name: '',
          mobile: '',
          email: '',
          state: states[0]?.name || '',
          incomeRequired: true,
        }
      );
    }
    setEditCoApplicants(fullCoApps);

    setEditFormData({
      clientName: c.clientName,
      mobile: c.mobile,
      email: c.email || '',
      clientState: c.clientState || (states[0]?.name || ''),
      product: c.product,
      customerType: c.customerType,
      propertyType: c.propertyType,
      coApplicantCount: c.coApplicantCount,
      stage: c.stage,
      status: c.status,
      assignedTeamId: c.assignedTeamId || (teams[0]?.id || ''),
      channelUserId: c.channelUserId || '',
      salesUserId: c.salesUserId || '',
      operationUserId: c.operationUserId || '',
    });
  };

  const handleCoApplicantCountChange = (count: number) => {
    const newCount = Math.max(0, count);
    const updated = [...editCoApplicants];
    if (newCount > updated.length) {
      for (let i = updated.length; i < newCount; i++) {
        updated.push({
          name: '',
          mobile: '',
          email: '',
          state: states[0]?.name || '',
          incomeRequired: true,
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

    setEditLoading(true);
    setEditError('');

    const res = await updateCaseIntakeDetailsAction(editingCase.id, {
      clientName: editFormData.clientName,
      mobile: editFormData.mobile,
      email: editFormData.email || null,
      clientState: editFormData.clientState || null,
      product: editFormData.product,
      customerType: editFormData.customerType,
      propertyType: editFormData.propertyType,
      coApplicantCount: editFormData.coApplicantCount,
      coApplicantsData: editCoApplicants,
      stage: editFormData.stage,
      status: editFormData.status,
      assignedTeamId: editFormData.assignedTeamId || null,
      channelUserId: editFormData.channelUserId || null,
      salesUserId: editFormData.salesUserId || null,
      operationUserId: editFormData.operationUserId || null,
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
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by client name, mobile, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-9 pr-4 py-2 rounded-xl text-xs"
          />
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-400 font-semibold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending Documents">Pending Documents</option>
              <option value="Ready for Submission">Ready for Submission</option>
              <option value="In Review">In Review</option>
              <option value="Approved">Approved</option>
              <option value="Disbursed">Disbursed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">Property:</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-400 font-semibold focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="Resale">Resale</option>
              <option value="Takeover / Seller BT">Takeover / Seller BT</option>
              <option value="Direct Allotment (Under Construction)">Direct Allotment</option>
            </select>
          </div>

          <button
            onClick={handleExportFilteredCases}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>

          <Link
            href="/cases/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Case
          </Link>
        </div>
      </div>

      {/* Cases Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Client Details</th>
                <th className="py-3 px-4">Product / Profile</th>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4 text-center">Co-Applicants</th>
                <th className="py-3 px-4 text-center">Stage</th>
                <th className="py-3 px-4 text-center">Checklist Progress</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const progressPct =
                    c.checklistCount > 0 ? Math.round((c.receivedCount / c.checklistCount) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <Link href={`/cases/${c.id}`} className="font-bold text-slate-900 dark:text-white hover:text-sky-600 text-sm">
                          {c.clientName}
                        </Link>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.mobile}</div>
                        {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                        {c.clientState && (
                          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">
                            📍 {c.clientState}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-sky-600 dark:text-sky-400">{c.product}</span>
                        <span className="block text-[10px] text-slate-500">{c.customerType}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-medium">{c.propertyType}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {c.coApplicantCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
                            {c.coApplicantCount} Co-App
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Sole Applicant</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] border border-indigo-200 dark:border-indigo-500/30">
                          Stage {c.stage}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col items-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${
                              c.status === 'Ready for Submission' || c.status === 'Approved' || c.status === 'Disbursed'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                            }`}
                          >
                            {c.status}
                          </span>
                          <div className="w-28 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                progressPct === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1">
                            {c.receivedCount}/{c.checklistCount} ({progressPct}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Case Intake Details"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-semibold transition-colors text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>

                          {/* Open Case Detail View */}
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-600/20 hover:bg-sky-100 dark:hover:bg-sky-600/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-semibold transition-colors text-xs"
                          >
                            Open <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Delete Button: ONLY visible to SUPER_ADMIN */}
                          {userRole === 'SUPER_ADMIN' ? (
                            <button
                              onClick={() => handleDelete(c.id, c.clientName)}
                              disabled={deletingId === c.id}
                              title="Delete Case (Super Admin Only)"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              title="Delete restricted to Super Admin"
                              className="p-1.5 text-slate-700 cursor-not-allowed opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
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
              {/* Section 1: Client Contact Information */}
              <div className="space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <User className="w-3.5 h-3.5 text-sky-500" /> 1. Client Contact Details
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
                      onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client State
                    </label>
                    <select
                      value={editFormData.clientState}
                      onChange={(e) => setEditFormData({ ...editFormData, clientState: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Select State --</option>
                      {states.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
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
                      Loan Product
                    </label>
                    <select
                      value={editFormData.product}
                      onChange={(e) => setEditFormData({ ...editFormData, product: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold text-sky-600 dark:text-sky-400"
                    >
                      <option value="Home Loan">Home Loan</option>
                      <option value="Loan Against Property">Loan Against Property</option>
                      <option value="MSME Business Loan">MSME Business Loan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Profile
                    </label>
                    <select
                      value={editFormData.customerType}
                      onChange={(e) => setEditFormData({ ...editFormData, customerType: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="Salaried">Salaried</option>
                      <option value="Professional">Professional</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Property Scope
                    </label>
                    <select
                      value={editFormData.propertyType}
                      onChange={(e) => setEditFormData({ ...editFormData, propertyType: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="Resale">Resale Property</option>
                      <option value="Takeover / Seller BT">Takeover / Seller BT</option>
                      <option value="Direct Allotment (Under Construction)">Direct Allotment (Under Construction)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. of Co-Applicants
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={editFormData.coApplicantCount}
                        onChange={(e) => handleCoApplicantCountChange(parseInt(e.target.value) || 0)}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Co-Applicant Details */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" /> 3. Co-Applicant Details ({editCoApplicants.length})
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
                    Sole applicant file (No co-applicants). Increase co-applicant count above to add co-applicant details.
                  </div>
                ) : (
                  <div className="space-y-3">
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
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'name', e.target.value)}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Mobile Number
                            </label>
                            <input
                              type="tel"
                              placeholder="Mobile Number"
                              value={coApp.mobile}
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'mobile', e.target.value)}
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
                              onChange={(e) => handleCoApplicantFieldChange(idx, 'email', e.target.value)}
                              className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
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
                              {states.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Lifecycle & Staff Assignments */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <Users className="w-3.5 h-3.5 text-emerald-500" /> 4. Stage, Status & Staff Assignments
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Processing Stage
                    </label>
                    <select
                      value={editFormData.stage}
                      onChange={(e) => setEditFormData({ ...editFormData, stage: parseInt(e.target.value) || 1 })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <option value={1}>Stage 1 - Document Collection</option>
                      <option value={2}>Stage 2 - Verification & Scrutiny</option>
                      <option value={3}>Stage 3 - Credit & Underwriting</option>
                      <option value={4}>Stage 4 - Sanction & Disbursal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Overall Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      <option value="Pending Documents">Pending Documents</option>
                      <option value="Ready for Submission">Ready for Submission</option>
                      <option value="In Review">In Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Disbursed">Disbursed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Team
                    </label>
                    <select
                      value={editFormData.assignedTeamId}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedTeamId: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Unassigned --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Channel Partner User
                    </label>
                    <select
                      value={editFormData.channelUserId}
                      onChange={(e) => setEditFormData({ ...editFormData, channelUserId: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Unassigned Channel --</option>
                      {channelUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sales Lead User
                    </label>
                    <select
                      value={editFormData.salesUserId}
                      onChange={(e) => setEditFormData({ ...editFormData, salesUserId: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Unassigned Sales --</option>
                      {salesUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Operation Lead User
                    </label>
                    <select
                      value={editFormData.operationUserId}
                      onChange={(e) => setEditFormData({ ...editFormData, operationUserId: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Unassigned Operation --</option>
                      {operationUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
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
    </div>
  );
}
