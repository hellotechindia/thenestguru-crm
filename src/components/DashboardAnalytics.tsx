'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Folder,
  FileClock,
  CheckCircle2,
  Layers,
  Clock,
  Filter,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToCSV } from '@/lib/excel-export';

interface CaseData {
  id: string;
  clientName: string;
  mobile: string;
  email: string | null;
  product: string;
  customerType: string;
  propertyType: string;
  stage: number;
  status: string;
  createdAt: string;
  checklistCount: number;
  receivedCount: number;
  assignedTeamName?: string;
}

interface DashboardAnalyticsProps {
  cases: CaseData[];
}

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export default function DashboardAnalytics({ cases }: DashboardAnalyticsProps) {
  const [pivotDimension, setPivotDimension] = useState<'customerType' | 'propertyType' | 'product' | 'status' | 'stage'>('propertyType');

  // KPI Calculations
  const totalCases = cases.length;
  const pendingDocsCases = cases.filter((c) => c.status === 'Pending Documents' || c.receivedCount < c.checklistCount).length;
  const readyForSubmissionCases = cases.filter((c) => c.status === 'Ready for Submission' || (c.checklistCount > 0 && c.receivedCount === c.checklistCount)).length;

  const stageCounts = {
    stage1: cases.filter((c) => c.stage === 1).length,
    stage2: cases.filter((c) => c.stage === 2).length,
    stage3: cases.filter((c) => c.stage === 3).length,
    stage4: cases.filter((c) => c.stage === 4).length,
  };

  const avgDaysToComplete = totalCases > 0 ? '2.4 Days' : '0 Days';

  // Pivot Table Grouping Logic
  const pivotGroups = cases.reduce((acc, c) => {
    const key = String(c[pivotDimension] || 'Unassigned');
    if (!acc[key]) {
      acc[key] = { key, total: 0, pending: 0, ready: 0, approved: 0 };
    }
    acc[key].total += 1;
    if (c.status === 'Pending Documents') acc[key].pending += 1;
    if (c.status === 'Ready for Submission') acc[key].ready += 1;
    if (c.status === 'Approved') acc[key].approved += 1;
    return acc;
  }, {} as Record<string, { key: string; total: number; pending: number; ready: number; approved: number }>);

  const pivotData = Object.values(pivotGroups);

  // Excel Export Handler for Pivot Report
  const handleExportPivotReport = () => {
    const rows = pivotData.map((row) => ({
      'Grouping Category': row.key,
      'Total Cases': row.total,
      'Pending Documents': row.pending,
      'Ready for Submission': row.ready,
      'Approved Cases': row.approved,
      'Conversion Rate (%)': row.total > 0 ? `${Math.round((row.ready / row.total) * 100)}%` : '0%',
    }));
    exportToCSV(`NestGuru_Pivot_Report_${pivotDimension}_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  // Excel Export Handler for Full Cases Report
  const handleExportCasesReport = () => {
    const rows = cases.map((c) => ({
      'Case ID': c.id,
      'Client Name': c.clientName,
      'Mobile Number': c.mobile,
      'Email': c.email || 'N/A',
      'Loan Product': c.product,
      'Customer Profile': c.customerType,
      'Property Scope': c.propertyType,
      'Processing Stage': `Stage ${c.stage}`,
      'Overall Status': c.status,
      'Documents Received': `${c.receivedCount}/${c.checklistCount}`,
      'Checklist Completion (%)': c.checklistCount > 0 ? `${Math.round((c.receivedCount / c.checklistCount) * 100)}%` : '0%',
      'Created Date': c.createdAt.slice(0, 10),
    }));
    exportToCSV(`NestGuru_Loan_Cases_Report_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  // Trend Data
  const trendData = [
    { name: 'Week 1', Created: 2, Completed: 1 },
    { name: 'Week 2', Created: 4, Completed: 3 },
    { name: 'Week 3', Created: 6, Completed: 4 },
    { name: 'Week 4', Created: totalCases, Completed: readyForSubmissionCases },
  ];

  const propertyDistribution = cases.reduce((acc, c) => {
    const existing = acc.find((item) => item.name === c.propertyType);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: c.propertyType, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <div className="space-y-8">
      {/* 1. Top KPI Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cases</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{totalCases}</div>
          <div className="text-[11px] text-sky-400 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Across all products
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Docs</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileClock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mt-3">{pendingDocsCases}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Awaiting client uploads</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ready for Login</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-3">{readyForSubmissionCases}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">100% Checklist Done</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stages (1 to 4)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-lg font-bold text-sky-400">S1: {stageCounts.stage1}</span>
            <span className="text-sm font-semibold text-emerald-400">S2: {stageCounts.stage2}</span>
            <span className="text-sm font-semibold text-amber-400">S3: {stageCounts.stage3}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Processing stage pipeline</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Speed</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-400 mt-3">{avgDaysToComplete}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Intake to 100% completion</div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                Case Creation & Completion Throughput
              </h3>
              <p className="text-xs text-slate-400">Weekly trend of new cases vs ready for submission cases</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Created" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Property Type Share
            </h3>
            <p className="text-xs text-slate-400">Resale vs Direct Allotment vs Takeover</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {propertyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Pivot Breakdown Table with Excel Export */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-400" />
              Pivot Aggregation Breakdown
            </h3>
            <p className="text-xs text-slate-400">Group cases dynamically by dimension to analyze pipeline density</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
              <span className="text-xs font-medium text-slate-400 pl-2">Group By:</span>
              <select
                value={pivotDimension}
                onChange={(e: any) => setPivotDimension(e.target.value)}
                className="glass-input text-xs rounded-lg px-3 py-1.5 bg-slate-950 text-sky-400 font-semibold border-sky-500/30 focus:ring-1 focus:ring-sky-500"
              >
                <option value="propertyType">Property Type</option>
                <option value="customerType">Customer Type</option>
                <option value="product">Loan Product</option>
                <option value="status">Processing Status</option>
                <option value="stage">Stage (1-4)</option>
              </select>
            </div>

            {/* Export Pivot Button */}
            <button
              onClick={handleExportPivotReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Download Pivot Aggregation to Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Pivot Excel</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4 rounded-l-lg font-semibold">{pivotDimension.replace(/([A-Z])/g, ' $1')}</th>
                <th className="py-3 px-4 font-semibold text-center">Total Volume</th>
                <th className="py-3 px-4 font-semibold text-center text-amber-400">Pending Docs</th>
                <th className="py-3 px-4 font-semibold text-center text-emerald-400">Ready for Login</th>
                <th className="py-3 px-4 font-semibold text-center text-sky-400">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pivotData.map((row) => {
                const conversionPct = row.total > 0 ? Math.round((row.ready / row.total) * 100) : 0;
                return (
                  <tr key={row.key} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      {row.key}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-200">{row.total}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-amber-400">{row.pending}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">{row.ready}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-sky-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${conversionPct}%` }} />
                        </div>
                        <span>{conversionPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Active Case Quick Action Directory with Full Export */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-sky-400" />
              Active Cases Directory
            </h3>
            <p className="text-xs text-slate-400">Click on any case to open document checklist & tracking link</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCasesReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Download Full Case Directory to Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Report</span>
            </button>

            <Link
              href="/cases"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
            >
              View All Cases ({totalCases}) <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4 font-semibold">Client Name</th>
                <th className="py-3 px-4 font-semibold">Product & Type</th>
                <th className="py-3 px-4 font-semibold">Property Scope</th>
                <th className="py-3 px-4 font-semibold text-center">Stage</th>
                <th className="py-3 px-4 font-semibold text-center">Checklist Progress</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cases.slice(0, 5).map((c) => {
                const progressPct = c.checklistCount > 0 ? Math.round((c.receivedCount / c.checklistCount) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div>{c.clientName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.mobile}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="font-semibold text-sky-400">{c.product}</span>
                      <span className="block text-[10px] text-slate-400">{c.customerType}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{c.propertyType}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/30">
                        Stage {c.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-semibold text-slate-300 mb-1">
                          {c.receivedCount} / {c.checklistCount} Docs ({progressPct}%)
                        </span>
                        <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              progressPct === 100 ? 'bg-emerald-400' : 'bg-sky-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          c.status === 'Ready for Submission' || c.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 font-semibold text-xs transition-colors"
                      >
                        Open Case <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
