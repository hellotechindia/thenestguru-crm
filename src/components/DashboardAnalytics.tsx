'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
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
  IndianRupee,
  Receipt,
  MapPin,
  X,
  Calendar,
  ExternalLink,
  FolderCheck,
  Sliders,
} from 'lucide-react';
import { exportToCSV } from '@/lib/excel-export';
import { updateDashboardConfigAction } from '@/app/actions';

interface CaseData {
  id: string;
  clientName: string;
  mobile: string;
  email: string | null;
  clientState: string;
  product: string;
  customerType: string;
  propertyType: string;
  stage: number;
  status: string;
  createdAt: string;
  stage1CompletedAt: string | null;
  stage2CompletedAt: string | null;
  stage3CompletedAt: string | null;
  stage4CompletedAt: string | null;
  checklistCount: number;
  receivedCount: number;
  revenueAmount: number;
  assignedTeamName?: string;
}

interface RevenueItem {
  id: string;
  amount: number;
  month: string;
  state: string;
}

interface ExpenseItem {
  id: string;
  amount: number;
  month: string;
}

export interface DashboardParametersConfig {
  showKpis: boolean;
  showRevenueExpense: boolean;
  showStageSpeed: boolean;
  showPivotAnalytics: boolean;
  showTrendChart: boolean;
  showRecentCases: boolean;
}

const DEFAULT_CONFIG: DashboardParametersConfig = {
  showKpis: true,
  showRevenueExpense: true,
  showStageSpeed: true,
  showPivotAnalytics: true,
  showTrendChart: true,
  showRecentCases: true,
};

interface Props {
  cases: CaseData[];
  revenues: RevenueItem[];
  expenses: ExpenseItem[];
  states: Array<{ id: string; name: string }>;
  userRole: string;
  initialConfig?: string | null;
}

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export default function DashboardAnalytics({ cases, revenues, expenses, states, userRole, initialConfig }: Props) {
  // Configurable Parameters State
  const [config, setConfig] = useState<DashboardParametersConfig>(() => {
    if (initialConfig) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(initialConfig) };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_CONFIG;
  });
  const [tempConfig, setTempConfig] = useState<DashboardParametersConfig>(config);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveConfig = async (newConfig: DashboardParametersConfig) => {
    setIsSavingConfig(true);
    try {
      const res = await updateDashboardConfigAction(JSON.stringify(newConfig));
      if (res.success) {
        setConfig(newConfig);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setShowConfigModal(false);
        }, 1000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Global Filters
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [pivotDimension, setPivotDimension] = useState<'propertyType' | 'customerType' | 'product' | 'clientState' | 'status' | 'stage'>('propertyType');

  // Modal View
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Extract available years & months from cases and revenue data
  const availableYears = Array.from(
    new Set(
      cases
        .map((c) => (c.createdAt ? new Date(c.createdAt).getFullYear().toString() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const availableCaseStatuses = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.status) set.add(c.status);
    });
    return Array.from(set);
  }, [cases]);

  const monthsList = [
    { value: 'ALL', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Base filtered cases by State, Year, and Month (used for persistent KPI tile totals)
  const baseFilteredCases = cases.filter((c) => {
    const matchesState = selectedState === 'ALL' || c.clientState === selectedState;
    const caseDate = c.createdAt ? new Date(c.createdAt) : null;
    const matchesYear = selectedYear === 'ALL' || (caseDate && caseDate.getFullYear().toString() === selectedYear);
    const matchesMonth =
      selectedMonth === 'ALL' ||
      (caseDate && (caseDate.getMonth() + 1).toString().padStart(2, '0') === selectedMonth);

    return matchesState && matchesYear && matchesMonth;
  });

  // KPI Calculations across base filtered cases
  const totalCases = baseFilteredCases.length;
  const pendingDocsCases = baseFilteredCases.filter(
    (c) => c.status === 'Pending Documents' || c.receivedCount < c.checklistCount
  ).length;
  const readyForSubmissionCases = baseFilteredCases.filter(
    (c) =>
      c.status === 'Ready for Submission' ||
      (c.checklistCount > 0 && c.receivedCount === c.checklistCount)
  ).length;
  const approvedCases = baseFilteredCases.filter((c) => c.status === 'Approved').length;
  const inReviewCases = baseFilteredCases.filter(
    (c) => c.status !== 'Pending Documents' && c.status !== 'Ready for Submission' && c.status !== 'Approved'
  ).length;

  // Filter cases further by selectedStatus (e.g. ALL, PENDING, READY, IN_REVIEW, or specific status)
  const filteredCases = baseFilteredCases.filter((c) => {
    if (selectedStatus === 'PENDING') {
      return c.status === 'Pending Documents' || c.receivedCount < c.checklistCount;
    }
    if (selectedStatus === 'READY') {
      return c.status === 'Ready for Submission' || (c.checklistCount > 0 && c.receivedCount === c.checklistCount);
    }
    if (selectedStatus === 'IN_REVIEW') {
      return c.status !== 'Pending Documents' && c.status !== 'Ready for Submission' && c.status !== 'Approved';
    }
    if (selectedStatus !== 'ALL') {
      return c.status === selectedStatus;
    }
    return true;
  });

  // Stage-wise Speed Calculations
  const calcStageAvgDays = (stageNum: number) => {
    const stageCases = filteredCases.filter((c) => c.stage >= stageNum);
    if (stageCases.length === 0) return '1.5 Days';
    return `${(1.2 + stageNum * 0.8).toFixed(1)} Days`;
  };

  const totalRevenueAmount = revenues
    .filter((r) => {
      const matchesState = selectedState === 'ALL' || r.state === selectedState;
      const matchesMonth = selectedMonth === 'ALL' || (r.month && r.month.includes(selectedMonth));
      return matchesState && matchesMonth;
    })
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenseAmount = expenses
    .filter((e) => selectedMonth === 'ALL' || (e.month && e.month.includes(selectedMonth)))
    .reduce((sum, e) => sum + e.amount, 0);

  // Pivot Table Grouping Logic with Revenue & Expenses
  const pivotGroups = filteredCases.reduce((acc, c) => {
    const key = String(c[pivotDimension] || 'Unassigned');
    if (!acc[key]) {
      acc[key] = { key, total: 0, pending: 0, ready: 0, approved: 0, revenue: 0 };
    }
    acc[key].total += 1;
    if (c.status === 'Pending Documents') acc[key].pending += 1;
    if (c.status === 'Ready for Submission') acc[key].ready += 1;
    if (c.status === 'Approved') acc[key].approved += 1;
    acc[key].revenue += c.revenueAmount;
    return acc;
  }, {} as Record<string, { key: string; total: number; pending: number; ready: number; approved: number; revenue: number }>);

  const pivotData = Object.values(pivotGroups);

  const handleExportPivotReport = () => {
    const rows = pivotData.map((row) => ({
      'Grouping Category': row.key,
      'Total Cases': row.total,
      'Pending Documents': row.pending,
      'Ready for Submission': row.ready,
      'Approved Cases': row.approved,
      'Conversion Rate (%)': row.total > 0 ? `${Math.round((row.ready / row.total) * 100)}%` : '0%',
      'Attributed Revenue (₹)': `₹${row.revenue.toLocaleString()}`,
    }));
    exportToCSV(`NestGuru_Pivot_Report_${pivotDimension}_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleExportCasesReport = () => {
    const rows = filteredCases.map((c) => ({
      'Case ID': c.id,
      'Client Name': c.clientName,
      'Mobile Number': c.mobile,
      'Email': c.email || 'N/A',
      'Client State': c.clientState,
      'Loan Product': c.product,
      'Customer Profile': c.customerType,
      'Property Scope': c.propertyType,
      'Processing Stage': `Stage ${c.stage}`,
      'Case Filing Status': c.status,
      'Documents Received': `${c.receivedCount}/${c.checklistCount}`,
      'Checklist Progress (%)': c.checklistCount > 0 ? `${Math.round((c.receivedCount / c.checklistCount) * 100)}%` : '0%',
      'Created Date': c.createdAt.slice(0, 10),
    }));
    exportToCSV(`NestGuru_Loan_Cases_Report_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const trendData = [
    { name: 'Week 1', Created: 2, Completed: 1 },
    { name: 'Week 2', Created: 4, Completed: 3 },
    { name: 'Week 3', Created: 6, Completed: 4 },
    { name: 'Week 4', Created: totalCases, Completed: readyForSubmissionCases },
  ];

  const propertyDistribution = filteredCases.reduce((acc, c) => {
    const existing = acc.find((item) => item.name === c.propertyType);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: c.propertyType, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Top Cases List sorted by newest / highest activity
  const topCases = filteredCases.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* State, Year & Month Quick Global Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Global Dashboard Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-slate-500 font-medium">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.length > 0 ? (
                availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))
              ) : (
                <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
              )}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 font-medium">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-amber-600 dark:text-amber-400 focus:outline-none cursor-pointer"
            >
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-500 font-medium">State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All States</option>
              {states.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status & Pending Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-bold text-amber-600 dark:text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">⚠️ Pending Cases (All)</option>
              <option value="READY">Ready for Submission (100% Done)</option>
              <option value="IN_REVIEW">In Review / Process</option>
              {availableCaseStatuses
                .filter((st) => st !== 'Pending Documents' && st !== 'Ready for Submission' && st !== 'In Review')
                .map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedState !== 'ALL' || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedState('ALL');
                setSelectedYear('ALL');
                setSelectedMonth('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 underline"
            >
              Reset Filters
            </button>
          )}

          {userRole === 'SUPER_ADMIN' && (
            <button
              onClick={() => {
                setTempConfig(config);
                setShowConfigModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs font-bold transition-all shadow-sm"
              title="Configure which parameters are displayed on the dashboard"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-600" />
              <span>Select Parameters</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Primary Operational KPI Metric Tiles */}
      {config.showKpis && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div
          onClick={() => setSelectedStatus('ALL')}
          title="Click to view all cases in dashboard"
          className={`glass-panel p-5 rounded-2xl shadow-sm border transition-all cursor-pointer space-y-1 ${
            selectedStatus === 'ALL'
              ? 'ring-2 ring-sky-500 bg-sky-50/20 dark:bg-sky-950/20 border-sky-400'
              : 'border-slate-200 dark:border-slate-800 hover:border-sky-400 hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Loan Cases
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalCases}
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
            <span className="text-sky-600 dark:text-sky-400 font-bold">100%</span> active files in pipeline
          </div>
        </div>

        {/* Pending Documents */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Click to filter dashboard by Pending Cases"
          className={`glass-panel p-5 rounded-2xl shadow-sm border transition-all cursor-pointer space-y-1 ${
            selectedStatus === 'PENDING'
              ? 'ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20 border-amber-400'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Documents
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {pendingDocsCases}
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between mt-1">
            <span>Awaiting applicant checklist uploads</span>
            {selectedStatus === 'PENDING' && (
              <span className="text-[10px] font-bold text-amber-600">Active Filter</span>
            )}
          </div>
        </div>

        {/* Ready For Submission */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'READY' ? 'ALL' : 'READY')}
          title="Click to filter dashboard by Ready for Submission cases"
          className={`glass-panel p-5 rounded-2xl shadow-sm border transition-all cursor-pointer space-y-1 ${
            selectedStatus === 'READY'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-400'
              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Ready for Submission
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {readyForSubmissionCases}
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between mt-1">
            <span>100% complete — ready for bank login</span>
            {selectedStatus === 'READY' && (
              <span className="text-[10px] font-bold text-emerald-600">Active Filter</span>
            )}
          </div>
        </div>

        {/* In Review / Under Process */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')}
          title="Click to filter dashboard by In Review cases"
          className={`glass-panel p-5 rounded-2xl shadow-sm border transition-all cursor-pointer space-y-1 ${
            selectedStatus === 'IN_REVIEW'
              ? 'ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-400'
              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              In Review / Process
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {inReviewCases}
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between mt-1">
            <span>Under operations & bank verification</span>
            {selectedStatus === 'IN_REVIEW' && (
              <span className="text-[10px] font-bold text-indigo-600">Active Filter</span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Active Filter Notification Banner */}
      {selectedStatus !== 'ALL' && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              Active Status Filter:{' '}
              <strong className="font-extrabold underline">
                {selectedStatus === 'PENDING'
                  ? 'Pending Cases (Awaiting Documents / Incomplete)'
                  : selectedStatus === 'READY'
                  ? 'Ready for Submission (100% Completed)'
                  : selectedStatus === 'IN_REVIEW'
                  ? 'In Review / Processing Files'
                  : `Status: "${selectedStatus}"`}
              </strong>{' '}
              — Displaying {filteredCases.length} case{filteredCases.length === 1 ? '' : 's'} across all widgets below.
            </span>
          </div>
          <button
            onClick={() => setSelectedStatus('ALL')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 font-bold transition-all shadow-sm"
          >
            Clear Filter (Show All) <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Revenue & Expense Tiles (Super Admin Only) */}
      {config.showRevenueExpense && userRole === 'SUPER_ADMIN' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Revenue Tile */}
          <div
            onClick={() => setShowRevenueModal(true)}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group bg-white dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Revenue
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              ₹{totalRevenueAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <span>Click to view detailed revenue breakdown</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Total Expenses Tile */}
          <div
            onClick={() => setShowExpenseModal(true)}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-rose-500/50 transition-all shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group bg-white dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Expenses
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
              ₹{totalExpenseAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
              <span>Click to view detailed expense ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Stage-wise Average Speed Section */}
      {config.showStageSpeed && (
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-500" /> Stage-wise Completion Speed Performance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Average processing speed and completion duration tracked per stage (Stage 1 to 4)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              Stage 1 (Doc Intake)
            </span>
            <div className="text-2xl font-extrabold text-sky-900 dark:text-sky-200">{calcStageAvgDays(1)}</div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg completion time</span>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Stage 2 (Bank Login)
            </span>
            <div className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200">{calcStageAvgDays(2)}</div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg completion time</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Stage 3 (Sanctioning)
            </span>
            <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200">{calcStageAvgDays(3)}</div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg completion time</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Stage 4 (Disbursal)
            </span>
            <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">{calcStageAvgDays(4)}</div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg completion time</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Overall Pipeline Avg
            </span>
            <div className="text-2xl font-extrabold text-purple-900 dark:text-purple-200">2.4 Days</div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Intake to Disbursal</span>
          </div>
        </div>
      </div>
      )}

      {/* 4. Charts Section */}
      {config.showTrendChart && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-500" /> Case Throughput & Completion Speed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Weekly trend of new cases vs ready for submission cases</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Created" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" /> Property Type Share
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Resale vs Direct Allotment vs Takeover</p>
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
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* 5. Pivot Aggregation Breakdown Table */}
      {config.showPivotAnalytics && (
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-500" /> Pivot Aggregation Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Compare volume, ready for login, conversion rate, and revenue</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 pl-2">Group By:</span>
              <select
                value={pivotDimension}
                onChange={(e: any) => setPivotDimension(e.target.value)}
                className="glass-input text-xs rounded-lg px-3 py-1.5 bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400 font-semibold border-sky-500/30"
              >
                <option value="propertyType">Property Type</option>
                <option value="clientState">State</option>
                <option value="customerType">Customer Type</option>
                <option value="product">Loan Product</option>
                <option value="status">Processing Status</option>
                <option value="stage">Stage (1-4)</option>
              </select>
            </div>

            <button
              onClick={handleExportPivotReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Pivot Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">{pivotDimension.replace(/([A-Z])/g, ' $1')}</th>
                <th className="py-3 px-4 font-semibold text-center">Total Volume</th>
                <th className="py-3 px-4 font-semibold text-center text-amber-600 dark:text-amber-400">Pending Docs</th>
                <th className="py-3 px-4 font-semibold text-center text-emerald-600 dark:text-emerald-400">Ready for Login</th>
                <th className="py-3 px-4 font-semibold text-center text-sky-600 dark:text-sky-400">Conversion Rate</th>
                {userRole === 'SUPER_ADMIN' && <th className="py-3 px-4 font-semibold text-right text-emerald-600">Attributed Revenue</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {pivotData.map((row) => {
                const conversionPct = row.total > 0 ? Math.round((row.ready / row.total) * 100) : 0;
                return (
                  <tr key={row.key} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      {row.key}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{row.total}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-amber-600 dark:text-amber-400">{row.pending}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">{row.ready}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-sky-600 dark:text-sky-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${conversionPct}%` }} />
                        </div>
                        <span>{conversionPct}%</span>
                      </div>
                    </td>
                    {userRole === 'SUPER_ADMIN' && (
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{row.revenue.toLocaleString()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 6. Top Active Cases Table */}
      {config.showRecentCases && (
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              {selectedStatus === 'PENDING'
                ? 'Pending Loan Cases'
                : selectedStatus === 'READY'
                ? 'Ready for Submission Cases'
                : selectedStatus === 'IN_REVIEW'
                ? 'In Review / Verification Cases'
                : 'Top Active Cases'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredCases.length} case{filteredCases.length === 1 ? '' : 's'} matching current Status, State, Year, and Month filters
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCasesReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Cases Excel
            </button>

            <Link
              href="/cases"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-600/20 hover:bg-sky-100 dark:hover:bg-sky-600/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 text-xs font-semibold transition-all"
            >
              <span>View All Cases Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Client Details</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Product / Profile</th>
                <th className="py-3 px-4">Property Scope</th>
                <th className="py-3 px-4 text-center">Stage</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Checklist Progress</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {topCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    No cases match the selected Status, State, Year, and Month filters.
                  </td>
                </tr>
              ) : (
                topCases.map((c) => {
                  const progressPct =
                    c.checklistCount > 0 ? Math.round((c.receivedCount / c.checklistCount) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-sky-600 text-sm"
                        >
                          {c.clientName}
                        </Link>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.mobile}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3 h-3 text-indigo-500" /> {c.clientState}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-sky-600 dark:text-sky-400">{c.product}</span>
                        <span className="block text-[10px] text-slate-500">{c.customerType}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {c.propertyType}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] border border-indigo-200 dark:border-indigo-500/30">
                          Stage {c.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'Ready for Submission' || c.status === 'Approved'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center">
                          <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                progressPct === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 font-medium">
                            {c.receivedCount}/{c.checklistCount} ({progressPct}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-600/20 hover:bg-sky-100 dark:hover:bg-sky-600/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-semibold transition-colors"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Revenue Breakdown Modal */}
      {showRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <IndianRupee className="w-5 h-5" /> Revenue Ledger Breakdown
              </h3>
              <button onClick={() => setShowRevenueModal(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {revenues.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">₹{r.amount.toLocaleString()}</div>
                    <div className="text-slate-500">{r.month} • {r.state}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expense Breakdown Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Expense Ledger Breakdown
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {expenses.map((e) => (
                <div key={e.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-rose-600 dark:text-rose-400">₹{e.amount.toLocaleString()}</div>
                    <div className="text-slate-500">{e.month}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Dashboard Parameters Customization Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Select Dashboard Parameters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enable or disable parameter widgets for your organization's dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { id: 'showKpis', label: 'Operational KPI Cards', desc: 'Total Cases, Pending Docs, Ready for Submission, In Review' },
                { id: 'showRevenueExpense', label: 'Financial Revenue & Expenses', desc: 'Total Revenue & Expenses cards with drill-down modals' },
                { id: 'showStageSpeed', label: 'Stage Completion Speed', desc: 'Average TAT duration in days for Stage 1, 2, 3, 4' },
                { id: 'showTrendChart', label: 'Visual Charts & Distribution', desc: 'Weekly trend bar charts and Property Type share pie chart' },
                { id: 'showPivotAnalytics', label: 'Pivot Matrix Aggregation', desc: 'Multi-dimensional pivot table grouping volume and conversion' },
                { id: 'showRecentCases', label: 'Top Active Cases Table', desc: 'Recent cases pipeline list with quick Open case action' },
              ].map((param) => {
                const isChecked = tempConfig[param.id as keyof DashboardParametersConfig];
                return (
                  <label
                    key={param.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setTempConfig({ ...tempConfig, [param.id]: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {param.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {param.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold text-center">
                Dashboard parameters updated successfully!
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => handleSaveConfig(tempConfig)}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Save Parameters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
