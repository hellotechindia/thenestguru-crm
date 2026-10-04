'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSalaryRecordAction,
  updateSalaryRecordStatusAction,
  calculateAndCreateSalaryAction,
  editSalaryRecordAction,
  deleteSalaryRecordAction,
} from '@/app/actions';
import {
  Plus, Search, Filter, Download, CheckCircle2,
  Clock, AlertCircle, User, ShieldAlert, ArrowUpDown, X, Zap, Calculator,
  FileText, Edit3, Trash2, Printer, Building2, IndianRupee, Link2
} from 'lucide-react';
import { exportToCSV } from '@/lib/excel-export';

interface StaffUser {
  id: string;
  name: string;
  role: string;
  jobRole?: string | null;
  department?: string | null;
  currentCTC?: number | null;
  monthlySalary?: number | null;
  employmentType?: string | null;
  email: string | null;
  phone: string | null;
  pan?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  dateOfJoining?: Date | string | null;
  team?: { name: string } | null;
}

interface SalaryRecordItem {
  id: string;
  userId: string;
  user: StaffUser;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  workingDays?: number | null;
  paidDays?: number | null;
  lwpDays?: number | null;
  incentiveEarned?: number | null;
  netPayable: number;
  paymentStatus: string;
  paidDate: Date | string | null;
  remarks: string | null;
  createdAt: Date | string;
}

interface ActiveCaseItem {
  id: string;
  clientName: string;
  product: string;
  stage: number;
  salesUserId?: string | null;
  operationUserId?: string | null;
  createdById?: string | null;
}

interface Props {
  staffUsers: StaffUser[];
  initialRecords: SalaryRecordItem[];
  isSuperAdmin?: boolean;
  crmBranding?: {
    crmName: string;
    crmTagline: string;
    crmLogoUrl: string;
  };
  activeCases?: ActiveCaseItem[];
}

// Indian Number to Words Helper
function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  }

  const rounded = Math.round(num);
  let n = rounded;
  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const hundreds = Math.floor(n / 100);
  const remainder = Math.floor(n % 100);

  let res = '';
  if (crores > 0) res += inWords(crores) + ' Crore ';
  if (lakhs > 0) res += inWords(lakhs) + ' Lakh ';
  if (thousands > 0) res += inWords(thousands) + ' Thousand ';
  if (hundreds > 0) res += inWords(hundreds) + ' Hundred ';
  if (remainder > 0) res += inWords(remainder) + ' ';

  return ('Rupees ' + res.trim() + ' Only').replace(/\s+/g, ' ');
}

export const ALL_CALENDAR_MONTHS = [
  'January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025',
  'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025',
  'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
  'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026',
  'January 2027', 'February 2027', 'March 2027', 'April 2027', 'May 2027', 'June 2027',
  'July 2027', 'August 2027', 'September 2027', 'October 2027', 'November 2027', 'December 2027',
];

export default function SalaryRegisterClient({
  staffUsers,
  initialRecords = [],
  isSuperAdmin = false,
  crmBranding = {
    crmName: 'TheNestGuru',
    crmTagline: 'Loan Processing Desk',
    crmLogoUrl: 'https://thenestguru.com/thenestgurulogo.png',
  },
  activeCases = [],
}: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<SalaryRecordItem[]>(initialRecords);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstUser = staffUsers[0];
  const firstUserSalary = firstUser?.monthlySalary || (firstUser?.currentCTC ? Math.round(firstUser.currentCTC / 12) : 0);

  // Create Form State
  const [form, setForm] = useState({
    userId: firstUser?.id || '',
    month: 'September 2026',
    monthlySalary: firstUserSalary && firstUserSalary > 0 ? String(firstUserSalary) : '',
    workingDays: '26',
    lwpDays: '0',
    allowances: '0',
    deductions: '0',
    incentiveEarned: '0',
    linkedCaseId: '',
    linkedCaseName: '',
    paymentStatus: 'UNPAID',
    remarks: '',
  });

  // Edit Record State
  const [editingRecord, setEditingRecord] = useState<SalaryRecordItem | null>(null);
  const [editForm, setEditForm] = useState({
    month: 'September 2026',
    workingDays: '26',
    lwpDays: '0',
    basicSalary: '0',
    allowances: '0',
    deductions: '0',
    incentiveEarned: '0',
    paymentStatus: 'UNPAID',
    remarks: '',
  });

  // Salary Slip Modal State
  const [slipRecord, setSlipRecord] = useState<SalaryRecordItem | null>(null);

  // Calculate Net Preview with Prorated Formula for Creation
  const netPreview = useMemo(() => {
    const monthly = parseFloat(form.monthlySalary) || 0;
    const wDays = Math.max(1, parseInt(form.workingDays) || 26);
    const lwp = Math.max(0, parseFloat(form.lwpDays) || 0);
    const effectivePaidDays = Math.max(0, wDays - lwp);
    const proratedBasic = Math.round((monthly / wDays) * effectivePaidDays);
    const a = parseFloat(form.allowances) || 0;
    const d = parseFloat(form.deductions) || 0;
    const inc = parseFloat(form.incentiveEarned) || 0;
    return {
      wDays,
      lwp,
      effectivePaidDays,
      proratedBasic,
      allowances: a,
      deductions: d,
      incentiveEarned: inc,
      netPayable: Math.max(0, proratedBasic + a + inc - d),
    };
  }, [form.monthlySalary, form.workingDays, form.lwpDays, form.allowances, form.deductions, form.incentiveEarned]);

  // Unique Months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.month));
    return Array.from(set);
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (monthFilter !== 'ALL' && r.month !== monthFilter) return false;
      if (statusFilter !== 'ALL' && r.paymentStatus !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (r.user?.name || '').toLowerCase().includes(q);
        const matchesRole = (r.user?.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole) return false;
      }
      return true;
    });
  }, [records, monthFilter, statusFilter, searchTerm]);

  // KPI Metrics - DYNAMICALLY COMPUTED ON FILTERED VIEW
  const stats = useMemo(() => {
    let totalPayroll = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    filteredRecords.forEach((r) => {
      totalPayroll += r.netPayable;
      if (r.paymentStatus === 'PAID') {
        totalPaid += r.netPayable;
      } else {
        totalUnpaid += r.netPayable;
      }
    });

    return {
      totalPayroll,
      totalPaid,
      totalUnpaid,
      count: filteredRecords.length,
    };
  }, [filteredRecords]);

  // Handle Create Salary
  const handleCreateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthly = parseFloat(form.monthlySalary);
    if (!form.userId || !monthly || monthly <= 0) {
      setError('Please select a staff member and specify base monthly salary.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await calculateAndCreateSalaryAction({
      userId: form.userId,
      month: form.month,
      monthlySalary: monthly,
      workingDays: parseInt(form.workingDays) || 26,
      lwpDays: parseFloat(form.lwpDays) || 0,
      allowances: parseFloat(form.allowances) || 0,
      deductions: parseFloat(form.deductions) || 0,
      incentiveEarned: parseFloat(form.incentiveEarned) || 0,
      linkedCaseId: form.linkedCaseId || null,
      linkedCaseName: form.linkedCaseName || null,
      paymentStatus: form.paymentStatus,
      remarks: form.remarks || undefined,
    });

    setLoading(false);

    if (res.success && res.record) {
      const staff = staffUsers.find((u) => u.id === form.userId);
      const newRec: any = {
        ...res.record,
        user: staff || { id: form.userId, name: 'Staff', role: 'MEMBER', email: null, phone: null },
      };
      setRecords([newRec, ...records]);
      setIsModalOpen(false);
      setForm({
        userId: staffUsers[0]?.id || '',
        month: form.month,
        monthlySalary: '',
        workingDays: '26',
        lwpDays: '0',
        allowances: '0',
        deductions: '0',
        incentiveEarned: '0',
        linkedCaseId: '',
        linkedCaseName: '',
        paymentStatus: 'UNPAID',
        remarks: '',
      });
      router.refresh();
    } else {
      setError(res.error || 'Failed to calculate and create salary record.');
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const res = await updateSalaryRecordStatusAction(id, newStatus);
    if (res.success) {
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, paymentStatus: newStatus, paidDate: newStatus === 'PAID' ? new Date() : null } : r))
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to update status');
    }
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (rec: SalaryRecordItem) => {
    setEditingRecord(rec);
    setEditForm({
      month: rec.month || 'September 2026',
      workingDays: String(rec.workingDays || 26),
      lwpDays: String(rec.lwpDays || 0),
      basicSalary: String(rec.basicSalary || 0),
      allowances: String(rec.allowances || 0),
      deductions: String(rec.deductions || 0),
      incentiveEarned: String(rec.incentiveEarned || 0),
      paymentStatus: rec.paymentStatus || 'UNPAID',
      remarks: rec.remarks || '',
    });
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setLoading(true);

    const basic = parseFloat(editForm.basicSalary) || 0;
    const allowances = parseFloat(editForm.allowances) || 0;
    const deductions = parseFloat(editForm.deductions) || 0;
    const incentive = parseFloat(editForm.incentiveEarned) || 0;
    const workingDays = parseInt(editForm.workingDays) || 26;
    const lwpDays = parseFloat(editForm.lwpDays) || 0;
    const paidDays = Math.max(0, workingDays - lwpDays);

    const res = await editSalaryRecordAction(editingRecord.id, {
      month: editForm.month,
      basicSalary: basic,
      allowances,
      deductions,
      workingDays,
      lwpDays,
      paidDays,
      incentiveEarned: incentive,
      paymentStatus: editForm.paymentStatus,
      remarks: editForm.remarks,
    });
    setLoading(false);

    if (res.success && res.record) {
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? { ...r, ...res.record, month: editForm.month, user: r.user } : r))
      );
      setEditingRecord(null);
      router.refresh();
    } else {
      alert(res.error || 'Failed to update salary record');
    }
  };

  // Handle Delete Record
  const handleDeleteSalary = async (id: string, staffName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the salary record for ${staffName}? This action cannot be undone.`)) {
      return;
    }
    const res = await deleteSalaryRecordAction(id);
    if (res.success) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete salary record');
    }
  };

  // CSV Export
  const handleExport = () => {
    const exportData = filteredRecords.map((r) => ({
      'Staff Name': r.user?.name || 'Staff',
      'Role': r.user?.role || 'Staff',
      'Month': r.month,
      'Working Days': r.workingDays || 26,
      'Paid Days': r.paidDays || 26,
      'LWP Days': r.lwpDays || 0,
      'Prorated Basic (₹)': r.basicSalary,
      'Allowances (₹)': r.allowances,
      'Stage Incentives (₹)': r.incentiveEarned || 0,
      'Deductions (₹)': r.deductions,
      'Net Payable (₹)': r.netPayable,
      'Status': r.paymentStatus,
      'Paid Date': r.paidDate ? new Date(r.paidDate).toLocaleDateString('en-IN') : 'N/A',
      'Remarks': r.remarks || '',
    }));
    exportToCSV(`salary_register_${monthFilter.toLowerCase()}`, exportData);
  };

  return (
    <div className="space-y-6">
      {/* Super Admin KPI Cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Payroll Value</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              ₹{stats.totalPayroll.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500">Across {stats.count} processed records</span>
          </div>

          <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-500">Total Disbursed (Paid)</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{stats.totalPaid.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600/70">Successfully paid out</span>
          </div>

          <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-500">Pending Payout</span>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              ₹{stats.totalUnpaid.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-amber-600/70">Awaiting clearance</span>
          </div>

          <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Staff Enrolled
            </span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {staffUsers.length}
            </div>
            <span className="text-[10px] text-indigo-600/70">Operations & Sales Team</span>
          </div>
        </div>
      )}

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="HOLD">Hold</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => {
                const u = staffUsers[0];
                const autoSalary = u?.monthlySalary || (u?.currentCTC ? Math.round(u.currentCTC / 12) : 0);
                setForm((prev) => ({
                  ...prev,
                  userId: u?.id || prev.userId,
                  monthlySalary: autoSalary && autoSalary > 0 ? String(autoSalary) : prev.monthlySalary,
                }));
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Salary Slip
            </button>
          )}
        </div>
      </div>

      {/* Salary Register Table */}
      <div className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50/70 dark:bg-slate-800/40">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-center">Working / LWP Days</th>
                <th className="py-3 px-4 text-right">Prorated Basic</th>
                <th className="py-3 px-4 text-right">Allowances</th>
                <th className="py-3 px-4 text-right">Stage Incentives</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right font-bold">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{r.user?.name || 'Staff Member'}</div>
                      <div className="text-[10px] text-slate-400">
                        {r.user?.jobRole ? `${r.user.jobRole} • ` : ''}{r.user?.role || ''} {r.user?.department ? `(${r.user.department})` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {r.month}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{r.paidDays ?? (r.workingDays || 26)}</span>
                      <span className="text-slate-400">/{r.workingDays || 26}d</span>
                      {(r.lwpDays || 0) > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-rose-500">(-{r.lwpDays} LWP)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      ₹{r.basicSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      +₹{r.allowances.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {(r.incentiveEarned || 0) > 0 ? `+₹${(r.incentiveEarned || 0).toLocaleString('en-IN')}` : '₹0'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-500">
                      -₹{r.deductions.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                      ₹{r.netPayable.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : r.paymentStatus === 'HOLD'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View & Download PDF Payslip */}
                        <button
                          onClick={() => setSlipRecord(r)}
                          title="View & Download PDF Payslip"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold hover:bg-indigo-100 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Payslip</span>
                        </button>

                        {isSuperAdmin && (
                          <>
                            {/* Edit Record */}
                            <button
                              onClick={() => handleOpenEdit(r)}
                              title="Edit Salary Record"
                              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Record */}
                            <button
                              onClick={() => handleDeleteSalary(r.id, r.user?.name || 'Staff')}
                              title="Delete Record"
                              className="p-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {r.paymentStatus !== 'PAID' ? (
                              <button
                                onClick={() => handleUpdateStatus(r.id, 'PAID')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(r.id, 'UNPAID')}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                Unpaid
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic text-xs">
                    No salary records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Salary Slip Modal (Super Admin) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800/60">
                  <IndianRupee className="w-4 h-4" />
                </div>
                Generate Employee Salary Slip
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSalary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Staff Member *
                </label>
                <select
                  value={form.userId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const u = staffUsers.find((x) => x.id === selId);
                    const autoMonthly = u?.monthlySalary || (u?.currentCTC ? Math.round(u.currentCTC / 12) : 0);
                    setForm({
                      ...form,
                      userId: selId,
                      monthlySalary: autoMonthly && autoMonthly > 0 ? String(autoMonthly) : form.monthlySalary,
                    });
                  }}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {staffUsers.map((u) => {
                    const monthly = u.monthlySalary || (u.currentCTC ? Math.round(u.currentCTC / 12) : 0);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.jobRole || u.role}{u.department ? ` (${u.department})` : ''}{monthly ? ` • ₹${monthly.toLocaleString('en-IN')}/mo` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Salary Month *
                  </label>
                  <select
                    required
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {!ALL_CALENDAR_MONTHS.includes(form.month) && (
                      <option value={form.month}>{form.month}</option>
                    )}
                    {ALL_CALENDAR_MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={form.paymentStatus}
                    onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PAID">PAID</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Full CTC / Base (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 30000"
                    value={form.monthlySalary}
                    onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Working Days
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={form.workingDays}
                    onChange={(e) => setForm({ ...form, workingDays: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                    LWP Days (Leave Without Pay)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    step="0.5"
                    value={form.lwpDays}
                    onChange={(e) => setForm({ ...form, lwpDays: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-rose-600 border-rose-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allowances / Bonuses (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.allowances}
                    onChange={(e) => setForm({ ...form, allowances: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Other Deductions / Advance (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.deductions}
                    onChange={(e) => setForm({ ...form, deductions: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-rose-500"
                  />
                </div>
              </div>

              {/* CASE LINKED FOR INCENTIVE OPTION */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Link Case for Incentive (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Select Loan Case
                    </label>
                    <select
                      value={form.linkedCaseId}
                      onChange={(e) => {
                        const selCase = activeCases.find((c) => c.id === e.target.value);
                        setForm({
                          ...form,
                          linkedCaseId: e.target.value,
                          linkedCaseName: selCase ? `${selCase.clientName} (${selCase.product})` : '',
                        });
                      }}
                      className="w-full glass-input px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- No Case Linked / General Incentive --</option>
                      {activeCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clientName} — {c.product} (Stage {c.stage})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      Incentive / Bonus Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.incentiveEarned}
                      onChange={(e) => setForm({ ...form, incentiveEarned: e.target.value })}
                      className="w-full glass-input px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold text-indigo-600"
                    />
                  </div>
                </div>

                {form.linkedCaseName && (
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    ✓ Incentive will be recorded against: <strong>{form.linkedCaseName}</strong>
                  </p>
                )}
              </div>

              {/* Live Proration Breakdown Banner */}
              <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Effective Paid Days:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {netPreview.effectivePaidDays} of {netPreview.wDays} days ({netPreview.lwp} LWP)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Prorated Basic Salary:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    ₹{netPreview.proratedBasic.toLocaleString('en-IN')}
                  </span>
                </div>
                {netPreview.incentiveEarned > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-600 dark:text-indigo-400">+ Case / Stage Incentive:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      +₹{netPreview.incentiveEarned.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {netPreview.allowances > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">+ Allowances / Bonuses:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      +₹{netPreview.allowances.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {netPreview.deductions > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-rose-600 dark:text-rose-400">- Deductions / Advance:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                      -₹{netPreview.deductions.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-indigo-200 dark:border-indigo-800/80">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                    Calculated Net Payable:
                  </span>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    ₹{netPreview.netPayable.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                  Note: Calculation is strictly based on the explicit values entered above (Prorated Basic + Allowances + Incentive - Deductions).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Target bonus included"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Generate Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Salary Record Modal (Super Admin) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Edit Salary Record ({editingRecord.user?.name})
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Salary Month *
                  </label>
                  <select
                    required
                    value={editForm.month}
                    onChange={(e) => setEditForm({ ...editForm, month: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {!ALL_CALENDAR_MONTHS.includes(editForm.month) && (
                      <option value={editForm.month}>{editForm.month}</option>
                    )}
                    {ALL_CALENDAR_MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PAID">PAID</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Working Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editForm.workingDays}
                    onChange={(e) => setEditForm({ ...editForm, workingDays: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                    LWP Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    step="0.5"
                    value={editForm.lwpDays}
                    onChange={(e) => setEditForm({ ...editForm, lwpDays: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prorated Basic Salary (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.basicSalary}
                    onChange={(e) => setEditForm({ ...editForm, basicSalary: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    Allowances / Bonus (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.allowances}
                    onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    Stage-Linked Incentives (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.incentiveEarned}
                    onChange={(e) => setEditForm({ ...editForm, incentiveEarned: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-500 mb-1">
                    Deductions (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.deductions}
                    onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs flex justify-between items-center font-bold">
                <span className="text-slate-700 dark:text-slate-300">Revised Net Payable:</span>
                <span className="text-base text-indigo-600 dark:text-indigo-400 font-mono">
                  ₹{Math.max(
                    0,
                    (parseFloat(editForm.basicSalary) || 0) +
                    (parseFloat(editForm.allowances) || 0) +
                    (parseFloat(editForm.incentiveEarned) || 0) -
                    (parseFloat(editForm.deductions) || 0)
                  ).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Payslip Modal & Print View */}
      {slipRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSlipRecord(null);
          }}
        >
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Actions Bar (Hidden on Print) */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm no-print">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block leading-tight">Official Employee Payslip Preview</span>
                  <span className="text-[11px] text-slate-400">
                    {slipRecord.user?.name || 'Staff Member'} • {slipRecord.month} (Voucher #{slipRecord.id.slice(-8).toUpperCase()})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSlipRecord(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-700 hover:border-rose-500"
                  title="Close popup"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Scrollable Payslip Content Area with Vertical Scroll */}
            <div className="overflow-y-auto flex-1 p-6 sm:p-10 space-y-6 bg-white text-slate-900">
              <div id="printable-salary-slip" className="space-y-6 max-w-3xl mx-auto">
              {/* Header: Company Logo & Details */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <img
                      src={crmBranding?.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png'}
                      alt="Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://thenestguru.com/thenestgurulogo.png';
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                      {crmBranding?.crmName || 'TheNestGuru'}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                      {crmBranding?.crmTagline || 'Private Enterprise Loan Processing Desk'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Corporate Head Office: H-Block, Sector 63, Noida, Uttar Pradesh 201301 | info@thenestguru.com
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase border border-slate-300 bg-slate-100 text-slate-800">
                    {slipRecord.paymentStatus}
                  </span>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    Voucher: #{slipRecord.id.slice(-8).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Payslip Document Title */}
              <div className="text-center py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                <h3 className="text-xs font-black tracking-widest uppercase text-slate-800">
                  SALARY SLIP FOR THE MONTH OF {slipRecord.month.toUpperCase()}
                </h3>
              </div>

              {/* Employee & Bank Details Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Employee Name:</span>
                  <span className="font-bold text-slate-900">{slipRecord.user?.name || 'Staff Member'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Employee ID:</span>
                  <span className="font-bold font-mono text-slate-900">EMP-{slipRecord.user?.id.slice(-6).toUpperCase()}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Designation / Role:</span>
                  <span className="font-bold text-slate-900">{slipRecord.user?.jobRole || slipRecord.user?.role || 'Staff'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Department / Team:</span>
                  <span className="font-bold text-slate-900">{slipRecord.user?.department || slipRecord.user?.team?.name || 'Operations Desk'}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">PAN Number:</span>
                  <span className="font-bold font-mono text-slate-900">{slipRecord.user?.pan || 'NOT PROVIDED'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Bank Name:</span>
                  <span className="font-bold text-slate-900">{slipRecord.user?.bankName || 'Direct Transfer'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Bank Account No:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {slipRecord.user?.bankAccountNo ? '••••••••' + slipRecord.user.bankAccountNo.slice(-4) : 'Direct Account'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Bank IFSC:</span>
                  <span className="font-bold font-mono text-slate-900">{slipRecord.user?.bankIfsc || 'N/A'}</span>
                </div>
              </div>

              {/* Attendance & Working Days Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Working Days</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">{slipRecord.workingDays || 26}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Paid Days</span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">{slipRecord.paidDays ?? (slipRecord.workingDays || 26)}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-rose-500 block">LWP Days</span>
                  <span className="text-base font-extrabold text-rose-600 font-mono">{slipRecord.lwpDays || 0}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Date</span>
                  <span className="text-xs font-bold text-slate-700 block mt-1">
                    {slipRecord.paidDate ? new Date(slipRecord.paidDate).toLocaleDateString('en-IN') : 'Scheduled'}
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Detailed Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-800 uppercase">
                      <th className="py-2.5 px-4 text-left border-r border-slate-300 w-1/2">Earnings Particulars</th>
                      <th className="py-2.5 px-4 text-right border-r border-slate-300">Amount (₹)</th>
                      <th className="py-2.5 px-4 text-left border-r border-slate-300 w-1/2">Deductions Particulars</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-700">Prorated Basic Salary</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-300 text-slate-900">
                        ₹{slipRecord.basicSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-700">LWP Loss of Pay</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                        {(slipRecord.lwpDays || 0) > 0 ? `Applied` : '₹0'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-700">Performance & Stage Incentives</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-300 text-slate-900 font-bold">
                        ₹{(slipRecord.incentiveEarned || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-700">Other Deductions / Advances</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                        ₹{slipRecord.deductions.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-700">Special Allowances / Bonus</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-300 text-slate-900">
                        ₹{slipRecord.allowances.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-700">-</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-900">Total Gross Earnings</td>
                      <td className="py-2.5 px-4 text-right font-mono border-r border-slate-300 text-slate-950 font-extrabold">
                        ₹{(slipRecord.basicSalary + slipRecord.allowances + (slipRecord.incentiveEarned || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-300 text-slate-900">Total Deductions</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-extrabold">
                        ₹{slipRecord.deductions.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Net Pay Highlight Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Net Take-Home Salary Payable
                  </span>
                  <div className="text-xs text-indigo-300 font-medium italic mt-0.5">
                    {numberToWordsINR(slipRecord.netPayable)}
                  </div>
                </div>
                <div className="text-2xl font-black tracking-tight font-mono text-emerald-400">
                  ₹{slipRecord.netPayable.toLocaleString('en-IN')}
                </div>
              </div>

              {slipRecord.remarks && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Admin Remarks:</span> {slipRecord.remarks}
                </div>
              )}

              {/* Signatures & Declarations */}
              <div className="pt-10 flex justify-between items-end text-xs text-slate-600 border-t border-slate-200">
                <div className="text-center">
                  <div className="w-44 border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                    {slipRecord.user?.name || 'Employee'}
                  </div>
                  <span className="text-[10px] text-slate-400">Employee Signature</span>
                </div>

                <div className="text-center">
                  <div className="w-52 border-b border-slate-400 pb-1 mb-1 font-bold text-slate-900 uppercase">
                    {crmBranding?.crmName || 'TheNestGuru'} HR Dept.
                  </div>
                  <span className="text-[10px] text-slate-400">Authorized Signatory & Seal</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 italic">
                * This document is a computer-generated official salary slip of {crmBranding?.crmName || 'TheNestGuru'}.
              </div>
            </div>
          </div>

          {/* Bottom Modal Actions Bar (Hidden on Print) */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Ready for printing on standard A4 page or saving as PDF.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Payslip</span>
              </button>
              <button
                type="button"
                onClick={() => setSlipRecord(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
