'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Layers, 
  ExternalLink, 
  ChevronRight, 
  X, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Flame, 
  CheckCircle2, 
  Clock, 
  MessageSquare
} from 'lucide-react';
import { UniqueClientItem } from '@/app/actions';
import { exportToCSV } from '@/lib/excel-export';

interface Props {
  initialClients: UniqueClientItem[];
  userRole?: string;
}

export default function ClientDirectoryClient({ initialClients = [], userRole }: Props) {
  const [clients] = useState<UniqueClientItem[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PRIMARY' | 'CO_APP' | 'BOTH'>('ALL');
  const [caseFilter, setCaseFilter] = useState<'ALL' | 'MULTI_ONLY'>('ALL');
  const [selectedClient, setSelectedClient] = useState<UniqueClientItem | null>(null);

  // Statistics
  const stats = useMemo(() => {
    let totalUnique = clients.length;
    let singleCase = 0;
    let multiCase = 0;
    let primaryOnly = 0;
    let coAppOnly = 0;
    let bothRoles = 0;

    clients.forEach((c) => {
      if (c.caseCount > 1) multiCase++;
      else singleCase++;

      const hasPrimary = c.roles.includes('PRIMARY_APPLICANT');
      const hasCoApp = c.roles.includes('CO_APPLICANT');
      if (hasPrimary && hasCoApp) bothRoles++;
      else if (hasPrimary) primaryOnly++;
      else if (hasCoApp) coAppOnly++;
    });

    return {
      totalUnique,
      singleCase,
      multiCase,
      primaryOnly,
      coAppOnly,
      bothRoles,
    };
  }, [clients]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Role filter
      if (roleFilter === 'PRIMARY' && !c.roles.includes('PRIMARY_APPLICANT')) return false;
      if (roleFilter === 'CO_APP' && !c.roles.includes('CO_APPLICANT')) return false;
      if (roleFilter === 'BOTH' && (!c.roles.includes('PRIMARY_APPLICANT') || !c.roles.includes('CO_APPLICANT'))) return false;

      // Multi-case filter
      if (caseFilter === 'MULTI_ONLY' && c.caseCount < 2) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.toLowerCase().includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        const matchesCity = (c.city || '').toLowerCase().includes(q);
        const matchesState = (c.state || '').toLowerCase().includes(q);
        const matchesProduct = c.linkedCases.some((lc) => lc.product.toLowerCase().includes(q));
        const matchesCaseId = c.linkedCases.some((lc) => lc.id.toLowerCase().includes(q));

        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCity && !matchesState && !matchesProduct && !matchesCaseId) {
          return false;
        }
      }

      return true;
    });
  }, [clients, roleFilter, caseFilter, searchTerm]);

  // Export to Excel / CSV
  const handleExport = () => {
    const exportData = filteredClients.map((c, idx) => ({
      'S.No': idx + 1,
      'Full Name': c.name,
      'Mobile Number': c.phone,
      'Email Address': c.email || 'N/A',
      'Gender': c.gender || 'N/A',
      'Date of Birth': c.dob ? new Date(c.dob).toLocaleDateString('en-IN') : 'N/A',
      'City': c.city || 'N/A',
      'State': c.state || 'N/A',
      'Total Cases Linked': c.caseCount,
      'Applicant Roles': c.roles.join(', '),
      'Loan Products': c.linkedCases.map((lc) => lc.product).join(' | '),
      'Latest Activity': new Date(c.latestActivityDate).toLocaleDateString('en-IN'),
    }));

    exportToCSV(`TheNestGuru_Clients_Directory_${new Date().toISOString().slice(0, 10)}`, exportData);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Client & Co-Applicant Master Directory
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Deduplicated master roster of all loan applicants and co-applicants across all intake files
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/cases/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Case Intake</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Total Unique Profiles</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
            {stats.totalUnique}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Deduplicated applicants & co-apps</p>
        </div>

        <div 
          onClick={() => setCaseFilter(caseFilter === 'MULTI_ONLY' ? 'ALL' : 'MULTI_ONLY')}
          className={`glass-panel p-5 rounded-3xl border shadow-sm transition-all cursor-pointer ${
            caseFilter === 'MULTI_ONLY'
              ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Repeat Clients (2+ Cases)</span>
            </span>
            {caseFilter === 'MULTI_ONLY' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-black">Active Filter</span>
            )}
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
            {stats.multiCase}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Clients with multiple intake cases</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Single Case Clients</span>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
            {stats.singleCase}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Single active or completed file</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Co-Applicants Listed</span>
          </div>
          <div className="text-3xl font-black text-sky-600 dark:text-sky-400 mt-1.5 font-mono">
            {stats.coAppOnly + stats.bothRoles}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{stats.bothRoles} also primary applicant</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by client name, mobile, email, city, case ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('PRIMARY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'PRIMARY'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Primary Applicants
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('CO_APP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'CO_APP'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Co-Applicants
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('BOTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'BOTH'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Both Roles
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3.5 px-4 font-semibold">Client / Person</th>
                <th className="py-3.5 px-4 font-semibold">Contact & Phone</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th className="py-3.5 px-4 font-semibold text-center">Applicant Role</th>
                <th className="py-3.5 px-4 font-semibold text-center">Cases Filed</th>
                <th className="py-3.5 px-4 font-semibold">Latest Product / Stage</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <div className="font-bold text-slate-700 dark:text-slate-300">No matching clients found</div>
                      <p className="text-xs text-slate-400">Try adjusting your search criteria or role filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isMulti = client.caseCount > 1;
                  const hasPrimary = client.roles.includes('PRIMARY_APPLICANT');
                  const hasCoApp = client.roles.includes('CO_APPLICANT');
                  const latestCase = client.linkedCases[0];

                  return (
                    <tr 
                      key={client.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedClient(client)}
                    >
                      {/* Person Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span>{client.name}</span>
                              {client.dob && (
                                <span className="text-[10px] text-pink-600 dark:text-pink-400 font-medium" title="Birthday">
                                  🎂 {new Date(client.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {client.gender ? `${client.gender} • ` : ''}
                              {client.email ? client.email : <span className="italic text-slate-400">No email</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Quick Actions */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{client.phone}</span>
                        </div>
                        {client.phone && client.phone !== 'N/A' && (
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${client.phone}`}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                              title="Direct Phone Call"
                            >
                              Call
                            </a>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <a
                              href={`https://wa.me/91${client.phone.replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {client.city ? `${client.city}${client.state ? `, ${client.state}` : ''}` : 'Location N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Applicant Roles */}
                      <td className="py-3.5 px-4 text-center">
                        {hasPrimary && hasCoApp ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            Primary & Co-App
                          </span>
                        ) : hasPrimary ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            Primary Applicant
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                            Co-Applicant
                          </span>
                        )}
                      </td>

                      {/* Case Count Badge (Highlight for 2+ cases) */}
                      <td className="py-3.5 px-4 text-center">
                        {isMulti ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm shadow-amber-500/30 animate-pulse">
                            <Flame className="w-3.5 h-3.5" />
                            <span>{client.caseCount} Cases</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            1 Case
                          </span>
                        )}
                      </td>

                      {/* Latest Product / Stage */}
                      <td className="py-3.5 px-4">
                        {latestCase ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{latestCase.product}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Stage {latestCase.stage}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="truncate max-w-[140px]">{latestCase.status}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No case record</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedClient(client)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1 ml-auto shadow-xs"
                        >
                          <span>{client.caseCount > 1 ? `View All (${client.caseCount})` : 'View Details'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Cases Modal / Drawer */}
      {selectedClient && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedClient(null);
          }}
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>{selectedClient.name}</span>
                    {selectedClient.caseCount > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                        {selectedClient.caseCount} Cases Linked
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedClient.phone} {selectedClient.email ? `• ${selectedClient.email}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Linked Cases List */}
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Associated Intake Cases ({selectedClient.linkedCases.length})
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedClient.city ? `Location: ${selectedClient.city}, ${selectedClient.state || ''}` : ''}
                </span>
              </div>

              <div className="space-y-3">
                {selectedClient.linkedCases.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-500/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                            #{c.id.slice(-8).toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            c.clientRole === 'PRIMARY_APPLICANT'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                          }`}>
                            {c.clientRole === 'PRIMARY_APPLICANT' ? 'Primary Applicant' : 'Co-Applicant'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                          {c.product} {c.subProduct ? `(${c.subProduct})` : ''}
                        </h4>
                      </div>

                      <Link
                        href={`/cases/${c.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition"
                      >
                        <span>Open Case</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Workflow Stage</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Stage {c.stage}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Case Status</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {c.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Intake Date</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {c.coApplicants && c.coApplicants.length > 0 && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Co-Applicants on this file:</span>{' '}
                        {c.coApplicants.join(', ')}
                      </div>
                    )}

                    {c.primaryClientName && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Primary Client:</span>{' '}
                        {c.primaryClientName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                All records unified by verified mobile number <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedClient.phone}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
