'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Trash2, ExternalLink, ShieldAlert, FileSpreadsheet, Download } from 'lucide-react';
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
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
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
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sky-400 font-semibold focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
              <option value="Pending Documents" className="bg-slate-900 text-white">Pending Documents</option>
              <option value="Ready for Submission" className="bg-slate-900 text-white">Ready for Submission</option>
              <option value="In Review" className="bg-slate-900 text-white">In Review</option>
              <option value="Approved" className="bg-slate-900 text-white">Approved</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Property:</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-transparent text-indigo-400 font-semibold focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Types</option>
              <option value="Resale" className="bg-slate-900 text-white">Resale</option>
              <option value="Takeover / Seller BT" className="bg-slate-900 text-white">Takeover / Seller BT</option>
              <option value="Direct Allotment (Under Construction)" className="bg-slate-900 text-white">
                Direct Allotment
              </option>
            </select>
          </div>

          <button
            onClick={handleExportFilteredCases}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
            title="Download Filtered Cases to Excel (.csv)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Case Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/80">
                <th className="py-3.5 px-4 font-semibold">Client Info</th>
                <th className="py-3.5 px-4 font-semibold">Product / Type</th>
                <th className="py-3.5 px-4 font-semibold">Property Scope</th>
                <th className="py-3.5 px-4 font-semibold text-center">Co-Applicants</th>
                <th className="py-3.5 px-4 font-semibold text-center">Stage</th>
                <th className="py-3.5 px-4 font-semibold text-center">Checklist Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                    No matching cases found. Create a new case intake to get started.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const progressPct =
                    c.checklistCount > 0 ? Math.round((c.receivedCount / c.checklistCount) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <Link href={`/cases/${c.id}`} className="font-bold text-white hover:text-sky-400 text-sm">
                          {c.clientName}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.mobile}</div>
                        {c.email && <div className="text-[10px] text-slate-500">{c.email}</div>}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-sky-400">{c.product}</span>
                        <span className="block text-[10px] text-slate-400">{c.customerType}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-medium">{c.propertyType}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-300">
                        {c.coApplicantCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {c.coApplicantCount} Co-App
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal">Sole Applicant</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/30">
                          Stage {c.stage}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col items-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${
                              c.status === 'Ready for Submission' || c.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {c.status}
                          </span>
                          <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                progressPct === 100 ? 'bg-emerald-400' : 'bg-sky-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">
                            {c.receivedCount}/{c.checklistCount} ({progressPct}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 font-semibold transition-colors"
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
