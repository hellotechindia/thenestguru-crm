'use client';

import { useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Download, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Layers, 
  ExternalLink, 
  ChevronRight, 
  ChevronDown,
  X, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Flame, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  FileText,
  User
} from 'lucide-react';
import { UniqueClientItem, ClientCoApplicant } from '@/app/actions';
import { exportToCSV } from '@/lib/excel-export';

interface Props {
  initialClients: UniqueClientItem[];
  userRole?: string;
}

export default function ClientDirectoryClient({ initialClients = [], userRole }: Props) {
  const [clients] = useState<UniqueClientItem[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'MULTI' | 'SINGLE' | 'WITH_COAPP'>('ALL');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<UniqueClientItem | null>(null);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalClients = clients.length;
    let singleCase = 0;
    let multiCase = 0;
    let hasCoApps = 0;
    let totalCoApplicants = 0;

    clients.forEach((c) => {
      if (c.caseCount > 1) multiCase++;
      else singleCase++;

      if (c.allCoApplicants && c.allCoApplicants.length > 0) {
        hasCoApps++;
        totalCoApplicants += c.allCoApplicants.length;
      }
    });

    return {
      totalClients,
      singleCase,
      multiCase,
      hasCoApps,
      totalCoApplicants,
    };
  }, [clients]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Tab Filter
      if (activeTab === 'MULTI' && c.caseCount < 2) return false;
      if (activeTab === 'SINGLE' && c.caseCount !== 1) return false;
      if (activeTab === 'WITH_COAPP' && (!c.allCoApplicants || c.allCoApplicants.length === 0)) return false;

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.toLowerCase().includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        const matchesCity = (c.city || '').toLowerCase().includes(q);
        const matchesState = (c.state || '').toLowerCase().includes(q);
        const matchesProduct = c.linkedCases.some((lc) => lc.product.toLowerCase().includes(q));
        const matchesCaseId = c.linkedCases.some((lc) => lc.id.toLowerCase().includes(q));
        const matchesCoAppName = (c.allCoApplicants || []).some(
          (ca) => ca.name.toLowerCase().includes(q) || (ca.mobile && ca.mobile.includes(q))
        );

        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCity && !matchesState && !matchesProduct && !matchesCaseId && !matchesCoAppName) {
          return false;
        }
      }

      return true;
    });
  }, [clients, activeTab, searchTerm]);

  // Toggle inline accordion expansion
  const toggleExpand = (id: string) => {
    setExpandedClientId((prev) => (prev === id ? null : id));
  };

  // Export to Excel / CSV
  const handleExport = () => {
    const exportData = filteredClients.map((c, idx) => ({
      'S.No': idx + 1,
      'Client Name': c.name,
      'Mobile Number': c.phone,
      'Email Address': c.email || 'N/A',
      'Gender': c.gender || 'N/A',
      'Date of Birth': c.dob ? new Date(c.dob).toLocaleDateString('en-IN') : 'N/A',
      'City': c.city || 'N/A',
      'State': c.state || 'N/A',
      'Total Cases Filed': c.caseCount,
      'Associated Co-Applicants': (c.allCoApplicants || []).map((ca) => `${ca.name} (${ca.mobile || 'No Phone'})`).join(' | ') || 'None',
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
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Client Master Directory
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Master roster of all loan clients, their filed cases & associated co-applicants
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
        {/* Total Clients */}
        <div 
          onClick={() => setActiveTab('ALL')}
          className={`glass-panel p-5 rounded-3xl border shadow-sm transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Total Unique Clients</span>
            </span>
            {activeTab === 'ALL' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500 text-white font-black">Active</span>
            )}
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
            {stats.totalClients}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Deduplicated primary loan applicants</p>
        </div>

        {/* Repeat Clients */}
        <div 
          onClick={() => setActiveTab(activeTab === 'MULTI' ? 'ALL' : 'MULTI')}
          className={`glass-panel p-5 rounded-3xl border shadow-sm transition-all cursor-pointer ${
            activeTab === 'MULTI'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Repeat Clients (2+ Cases)</span>
            </span>
            {activeTab === 'MULTI' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-black">Active</span>
            )}
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
            {stats.multiCase}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Clients who filed multiple loan cases</p>
        </div>

        {/* Single Case Clients */}
        <div 
          onClick={() => setActiveTab(activeTab === 'SINGLE' ? 'ALL' : 'SINGLE')}
          className={`glass-panel p-5 rounded-3xl border shadow-sm transition-all cursor-pointer ${
            activeTab === 'SINGLE'
              ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Single Case Clients</span>
            </span>
            {activeTab === 'SINGLE' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-black">Active</span>
            )}
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
            {stats.singleCase}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Clients with single active/closed file</p>
        </div>

        {/* Associated Co-Applicants */}
        <div 
          onClick={() => setActiveTab(activeTab === 'WITH_COAPP' ? 'ALL' : 'WITH_COAPP')}
          className={`glass-panel p-5 rounded-3xl border shadow-sm transition-all cursor-pointer ${
            activeTab === 'WITH_COAPP'
              ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30'
              : 'border-slate-200 dark:border-slate-800 hover:border-sky-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>Co-Applicants Listed</span>
            </span>
            {activeTab === 'WITH_COAPP' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-black">Active</span>
            )}
          </div>
          <div className="text-3xl font-black text-sky-600 dark:text-sky-400 mt-1.5 font-mono">
            {stats.totalCoApplicants}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across {stats.hasCoApps} clients with co-applicants</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by client name, mobile, email, co-applicant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Clients ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MULTI')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'MULTI'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Repeat Clients ({stats.multiCase})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SINGLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SINGLE'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Single Case ({stats.singleCase})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WITH_COAPP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'WITH_COAPP'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            With Co-Applicants ({stats.hasCoApps})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3.5 px-3 font-semibold w-10 text-center">#</th>
                <th className="py-3.5 px-4 font-semibold min-w-[200px]">Client / Applicant</th>
                <th className="py-3.5 px-4 font-semibold min-w-[160px]">Contact & Phone</th>
                <th className="py-3.5 px-4 font-semibold min-w-[140px]">Location</th>
                <th className="py-3.5 px-4 font-semibold text-center min-w-[120px]">Cases Filed</th>
                <th className="py-3.5 px-4 font-semibold min-w-[180px]">Co-Applicants on File</th>
                <th className="py-3.5 px-4 font-semibold min-w-[160px]">Latest Product / Stage</th>
                <th className="py-3.5 px-4 font-semibold text-right min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <div className="font-bold text-slate-700 dark:text-slate-300">No matching clients found</div>
                      <p className="text-xs text-slate-400">Try adjusting your search criteria or tab filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isMulti = client.caseCount > 1;
                  const latestCase = client.linkedCases[0];
                  const isExpanded = expandedClientId === client.id;
                  const coAppsCount = client.allCoApplicants?.length || 0;

                  return (
                    <Fragment key={client.id}>
                      <tr 
                        className={`transition-colors cursor-pointer ${
                          isExpanded 
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20' 
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                        onClick={() => toggleExpand(client.id)}
                      >
                        {/* Expand / Collapse chevron indicator */}
                        <td className="py-3.5 px-3 text-center text-slate-400">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(client.id);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Expand cases & co-applicants'}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`} />
                          </button>
                        </td>

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

                        {/* Case Count Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isMulti ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm shadow-amber-500/30">
                              <Flame className="w-3.5 h-3.5" />
                              <span>{client.caseCount} Cases</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              1 Case
                            </span>
                          )}
                        </td>

                        {/* Co-Applicants on File (Nested under Applicant) */}
                        <td className="py-3.5 px-4">
                          {coAppsCount > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {client.allCoApplicants.slice(0, 2).map((ca, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                                    title={`${ca.name} • ${ca.mobile || 'No Mobile'}`}
                                  >
                                    <User className="w-2.5 h-2.5 text-sky-500" />
                                    <span className="truncate max-w-[110px]">{ca.name}</span>
                                  </span>
                                ))}
                                {coAppsCount > 2 && (
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    +{coAppsCount - 2} more
                                  </span>
                                )}
                              </div>
                              <span className="text-[9.5px] text-slate-400 block">
                                {coAppsCount} {coAppsCount === 1 ? 'co-applicant' : 'co-applicants'} attached
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Solo Applicant (None)
                            </span>
                          )}
                        </td>

                        {/* Latest Product / Stage */}
                        <td className="py-3.5 px-4">
                          {latestCase ? (
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{latestCase.product}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedClient(client)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Open Full Client Profile"
                            >
                              <span>{client.caseCount > 1 ? `View All (${client.caseCount})` : 'View Details'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Accordion Row: Cases & Co-Applicants Under This Client */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-indigo-100 dark:border-indigo-900/30">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="space-y-4 max-w-5xl">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-indigo-500" />
                                  <span>Cases Filed by {client.name} ({client.caseCount})</span>
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setSelectedClient(client)}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Full Details Drawer</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Cases Cards Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {client.linkedCases.map((c, idx) => (
                                  <div
                                    key={c.id || idx}
                                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                                            #{c.id.slice(-8).toUpperCase()}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                            Stage {c.stage}
                                          </span>
                                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            {c.status}
                                          </span>
                                        </div>
                                        <h5 className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                                          {c.product} {c.subProduct ? `(${c.subProduct})` : ''}
                                        </h5>
                                      </div>

                                      <Link
                                        href={`/cases/${c.id}`}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs transition"
                                      >
                                        <span>Open</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </Link>
                                    </div>

                                    {/* Specific Co-Applicants on this case */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Co-Applicants on this Case:
                                      </div>
                                      {c.coApplicantsDetails && c.coApplicantsDetails.length > 0 ? (
                                        <div className="space-y-1">
                                          {c.coApplicantsDetails.map((ca, caIdx) => (
                                            <div key={caIdx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                              <span className="font-semibold flex items-center gap-1">
                                                <User className="w-3 h-3 text-sky-500" />
                                                {ca.name}
                                              </span>
                                              <span className="text-slate-500 text-[10px] font-mono">
                                                {ca.mobile || 'No Mobile'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[10px]">
                                          No co-applicant on this case file
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* All Co-Applicants Summary under this client */}
                              {client.allCoApplicants && client.allCoApplicants.length > 0 && (
                                <div className="pt-2">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-sky-500" />
                                    <span>All Co-Applicants Associated with {client.name} ({client.allCoApplicants.length})</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {client.allCoApplicants.map((ca, caIdx) => (
                                      <div
                                        key={caIdx}
                                        className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 text-xs space-y-1"
                                      >
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                          <span>{ca.name}</span>
                                          {ca.incomeRequired !== false ? (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                              Income Req.
                                            </span>
                                          ) : (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                              Non-Income
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                          <span>📱 {ca.mobile || 'N/A'}</span>
                                          {ca.email && <span>✉️ {ca.email}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Cases & Co-Applicants Modal Drawer */}
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
                        {selectedClient.caseCount} Cases Filed
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
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Co-Applicants & Linked Cases */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1">
              {/* Co-Applicants Attached under this Client */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-500" />
                    <span>Associated Co-Applicants ({selectedClient.allCoApplicants?.length || 0})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Attached under {selectedClient.name}
                  </span>
                </div>

                {selectedClient.allCoApplicants && selectedClient.allCoApplicants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedClient.allCoApplicants.map((ca, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-sky-500" />
                            {ca.name}
                          </span>
                          {ca.incomeRequired !== false ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                              Income Req.
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                              Non-Income
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                          {ca.mobile && (
                            <div className="flex items-center gap-2">
                              <span>📱 {ca.mobile}</span>
                              <a href={`tel:${ca.mobile}`} className="text-indigo-600 dark:text-indigo-400 underline text-[10px]">Call</a>
                              <a 
                                href={`https://wa.me/91${ca.mobile.replace(/\D/g, '').slice(-10)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 underline text-[10px]"
                              >
                                WhatsApp
                              </a>
                            </div>
                          )}
                          {ca.email && <div>✉️ {ca.email}</div>}
                          {ca.dob && (
                            <div>🎂 DOB: {new Date(ca.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    No co-applicants attached to this client's cases.
                  </p>
                )}
              </div>

              {/* Cases Filed by this Client */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Cases Filed ({selectedClient.linkedCases.length})</span>
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
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              Stage {c.stage}
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
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Stage</span>
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
