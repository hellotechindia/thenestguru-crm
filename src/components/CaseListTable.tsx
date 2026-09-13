'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Trash2, ExternalLink, ShieldAlert, FileSpreadsheet, Download, PlusCircle } from 'lucide-react';
import { deleteCaseAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/excel-export';

interface CaseItem {
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
  createdAt: string;
  checklistCount: number;
  receivedCount: number;
  assignedTeamName: string;
}

interface CaseListTableProps {
  cases: CaseItem[];
  userRole: string;
}

export default function CaseListTable({ cases, userRole }: CaseListTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-slate-400 hover:text-white">✕</button>
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
                              c.status === 'Ready for Submission' || c.status === 'Approved'
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
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-600/20 hover:bg-sky-100 dark:hover:bg-sky-600/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-semibold transition-colors"
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
    </div>
  );
}
