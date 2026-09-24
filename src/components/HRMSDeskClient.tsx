'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CalendarDays, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Users, 
  FileText, 
  PlusCircle, 
  Check, 
  X, 
  Building, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Award,
  Trash2,
  UserCheck,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getAllStaffAttendanceTodayAction, 
  getStaffMonthlyAttendanceAction, 
  getLeaveRequestsAction, 
  applyLeaveAction, 
  reviewLeaveAction, 
  getHolidaysAction,
  recordAdminLeaveAction,
  deleteLeaveAction
} from '@/app/actions';
import { formatTimeIST, formatDuration } from '@/lib/ist-time';
import { isValid10DigitPhone, sanitizeTo10Digits, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';

interface StaffItem {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  team?: { name: string } | null;
}

interface HRMSDeskClientProps {
  currentUserId: string;
  userName: string;
  userRole: string;
  staffList?: StaffItem[];
}

export default function HRMSDeskClient({ currentUserId, userName, userRole, staffList = [] }: HRMSDeskClientProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Tabs: 'attendance' | 'calendar' | 'leaves' | 'holidays'
  const [activeTab, setActiveTab] = useState<'attendance' | 'calendar' | 'leaves' | 'holidays'>('attendance');

  // Month Calendar View State
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarStaffFilter, setCalendarStaffFilter] = useState<string>('ALL');

  // Live Attendance state
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [personalAttendance, setPersonalAttendance] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Leaves state
  const [leaves, setLeaves] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'CASUAL' as 'CASUAL' | 'SICK' | 'PAID' | 'LWP',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveMessage, setLeaveMessage] = useState('');

  // Super Admin Direct / Manual Leave State
  const [isAdminLeaveModalOpen, setIsAdminLeaveModalOpen] = useState(false);
  const [adminLeaveForm, setAdminLeaveForm] = useState({
    isManual: false,
    userId: staffList[0]?.id || '',
    manualName: '',
    manualPhone: '',
    leaveType: 'CASUAL' as 'CASUAL' | 'SICK' | 'PAID' | 'LWP',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'APPROVED' as 'APPROVED' | 'PENDING',
  });
  const [adminLeaveLoading, setAdminLeaveLoading] = useState(false);
  const [adminLeaveError, setAdminLeaveError] = useState('');
  const [adminLeaveSuccess, setAdminLeaveSuccess] = useState('');

  // Holidays state
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Load Attendance Data
  const loadAttendance = async () => {
    setLoadingAttendance(true);
    try {
      if (isSuperAdmin) {
        const res = await getAllStaffAttendanceTodayAction();
        if (res.success) {
          setTodaySummary(res.summary);
          setAttendanceList(res.attendanceList || []);
        }
      } else {
        const res = await getStaffMonthlyAttendanceAction();
        if (res.success) {
          setPersonalAttendance(res.records || []);
        }
      }
    } catch (err) {
      console.error('Error loading attendance', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Load Leaves Data
  const loadLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await getLeaveRequestsAction();
      if (res.success) {
        setLeaves(res.leaves || []);
        setQuota(res.quota || null);
      }
    } catch (err) {
      console.error('Error loading leaves', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Load Holidays Data
  const loadHolidays = async () => {
    setLoadingHolidays(true);
    try {
      const res = await getHolidaysAction();
      if (res.success) {
        setHolidays(res.holidays || []);
      }
    } catch (err) {
      console.error('Error loading holidays', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    loadLeaves();
    loadHolidays();
  }, [isSuperAdmin]);

  // Handle Apply Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveMessage('');
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason.trim()) {
      setLeaveMessage('Please complete all required fields.');
      return;
    }
    const res = await applyLeaveAction(newLeave);
    if (res.success) {
      setLeaveMessage('Leave applied successfully! Awaiting supervisor approval.');
      setNewLeave({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
      setIsApplyModalOpen(false);
      loadLeaves();
    } else {
      setLeaveMessage(res.error || 'Failed to submit leave request.');
    }
  };

  // Handle Review Leave
  const handleReviewLeave = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    const res = await reviewLeaveAction(leaveId, status);
    if (res.success) {
      loadLeaves();
    }
  };

  // Handle Admin Direct / Manual Leave Entry
  const handleRecordAdminLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLeaveError('');
    setAdminLeaveSuccess('');

    if (adminLeaveForm.isManual) {
      if (!adminLeaveForm.manualName.trim()) {
        setAdminLeaveError('Employee Full Name is required for manual entry.');
        return;
      }
      if (!isValidName(adminLeaveForm.manualName)) {
        setAdminLeaveError('Employee Full Name must contain only alphabets and spaces (no numbers or special characters).');
        return;
      }
      if (adminLeaveForm.manualPhone && !isValid10DigitPhone(adminLeaveForm.manualPhone)) {
        setAdminLeaveError('Phone number must be a valid 10-digit number.');
        return;
      }
    } else {
      if (!adminLeaveForm.userId) {
        setAdminLeaveError('Please select an active staff member.');
        return;
      }
    }

    if (!adminLeaveForm.startDate || !adminLeaveForm.endDate) {
      setAdminLeaveError('Please choose both start and end leave dates.');
      return;
    }

    if (adminLeaveForm.endDate < adminLeaveForm.startDate) {
      setAdminLeaveError('End Date cannot be earlier than Start Date.');
      return;
    }

    setAdminLeaveLoading(true);
    const res = await recordAdminLeaveAction(adminLeaveForm);
    setAdminLeaveLoading(false);

    if (res.success) {
      setAdminLeaveSuccess('Employee leave recorded successfully!');
      setTimeout(() => {
        setIsAdminLeaveModalOpen(false);
        setAdminLeaveSuccess('');
        setAdminLeaveForm({
          isManual: false,
          userId: staffList[0]?.id || '',
          manualName: '',
          manualPhone: '',
          leaveType: 'CASUAL',
          startDate: '',
          endDate: '',
          reason: '',
          status: 'APPROVED',
        });
      }, 700);
      loadLeaves();
    } else {
      setAdminLeaveError(res.error || 'Failed to record leave entry.');
    }
  };

  // Handle Delete Leave
  const handleDeleteLeave = async (leaveId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to delete/cancel the leave record for "${employeeName}"?`)) return;
    const res = await deleteLeaveAction(leaveId);
    if (res.success) {
      loadLeaves();
    } else {
      alert(res.error || 'Failed to delete leave record.');
    }
  };

  const filteredAttendance = attendanceList.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.teamName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              {isSuperAdmin ? 'Supervisor & Organization Desk' : 'Self-Service Employee Portal'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            TheNestGuru HRMS Desk
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Real-time staff attendance tracking, leave approval workflow, and timesheet management'
              : 'Track your daily working hours, monitor monthly attendance, apply for leaves, and view holiday calendar'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'attendance'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'calendar'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Month Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'leaves'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Leaves {isSuperAdmin && leaves.filter((l) => l.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-black">
                {leaves.filter((l) => l.status === 'PENDING').length}
              </span>
            )}</span>
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'holidays'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Holidays</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ATTENDANCE & TIMESHEET */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Super Admin Live Staff View */}
          {isSuperAdmin ? (
            <div className="space-y-6">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Staff
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {todaySummary?.totalStaff || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Registered staff members</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-md">
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Working Now (Live)
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {todaySummary?.activeCount || 0}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Currently punched in</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-md">
                  <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    Punched In Today
                  </div>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                    {todaySummary?.presentCount || 0}
                  </div>
                  <div className="text-[10px] text-sky-600/80 dark:text-sky-400/80 mt-1">Present on duty today</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 shadow-md">
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Not Punched In
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {todaySummary?.absentCount || 0}
                  </div>
                  <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1">Absent or pending login</div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-sky-500" /> Today's Live Staff Attendance ({todaySummary?.todayIST || 'IST'})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Live tracking of punch-in timestamps, active sessions, and shift completions
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search staff or team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input px-3.5 py-2 rounded-xl text-xs w-full sm:w-64"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                        <th className="py-3 px-4 font-semibold">Employee</th>
                        <th className="py-3 px-4 font-semibold">Team & Role</th>
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                        <th className="py-3 px-4 font-semibold text-center">First Punch In (IST)</th>
                        <th className="py-3 px-4 font-semibold text-center">Last Punch Out (IST)</th>
                        <th className="py-3 px-4 font-semibold text-right">Active Working Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            No matching staff records found for today.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map((emp) => (
                          <tr key={emp.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                              <div className="text-[10px] text-slate-500">{emp.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">{emp.teamName}</div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                                {emp.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {emp.isPunchedIn ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  Working Now
                                </span>
                              ) : emp.punchOut ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-slate-500" />
                                  Shift Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                                  <XCircle className="w-3 h-3 text-rose-500" />
                                  Not Punched In
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {formatTimeIST(emp.punchIn)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {formatTimeIST(emp.punchOut)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                              {formatDuration(emp.totalMinutes * 60)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Employee Self-Service Monthly Attendance View */
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-sky-500" /> My Monthly Attendance Timesheet
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Your daily work sessions logged in Indian Standard Time (IST)
                    </p>
                  </div>
                  <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    Total Active Days Logged: {personalAttendance.length}
                  </div>
                </div>

                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                        <th className="py-3 px-4 font-semibold">Date (IST)</th>
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                        <th className="py-3 px-4 font-semibold text-center">Punch In</th>
                        <th className="py-3 px-4 font-semibold text-center">Punch Out</th>
                        <th className="py-3 px-4 font-semibold text-right">Total Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {personalAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No attendance punches recorded yet for this month. Use the Punch In button to start your daily session!
                          </td>
                        </tr>
                      ) : (
                        personalAttendance.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {rec.date}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {formatTimeIST(rec.punchIn)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {formatTimeIST(rec.punchOut)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                              {formatDuration(rec.totalMinutes * 60)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: MONTH CALENDAR VIEW */}
      {activeTab === 'calendar' && (() => {
        const calYear = calendarDate.getFullYear();
        const calMonth = calendarDate.getMonth();
        const firstDayOfWeek = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday=0..Sunday=6
        const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

        // Month title
        const monthTitle = calendarDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

        // Navigation
        const handlePrevMonth = () => {
          setCalendarDate(new Date(calYear, calMonth - 1, 1));
        };
        const handleNextMonth = () => {
          setCalendarDate(new Date(calYear, calMonth + 1, 1));
        };
        const handleCurrentMonth = () => {
          setCalendarDate(new Date());
        };

        // Filter approved leaves relevant to this month
        const monthStart = new Date(calYear, calMonth, 1, 0, 0, 0);
        const monthEnd = new Date(calYear, calMonth, daysInCurrentMonth, 23, 59, 59);

        const relevantLeaves = leaves.filter((l) => {
          if (l.status !== 'APPROVED') return false;
          if (calendarStaffFilter !== 'ALL') {
            if (l.isManual) {
              if (calendarStaffFilter !== 'MANUAL') return false;
            } else if (l.userId !== calendarStaffFilter) {
              return false;
            }
          }
          const s = new Date(l.startDate);
          const e = new Date(l.endDate);
          return s <= monthEnd && e >= monthStart;
        });

        // Compute days array
        const calendarGrid: Array<{
          dayNumber: number;
          isCurrentMonth: boolean;
          dateStr: string;
          isSunday: boolean;
          isToday: boolean;
          holiday?: any;
          dayLeaves: any[];
          attendanceRecord?: any;
        }> = [];

        // Previous month padding
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
          const dNum = prevMonthTotalDays - i;
          const prevMonthNum = calMonth === 0 ? 12 : calMonth;
          const prevYearNum = calMonth === 0 ? calYear - 1 : calYear;
          const dateStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
          calendarGrid.push({
            dayNumber: dNum,
            isCurrentMonth: false,
            dateStr,
            isSunday: false,
            isToday: false,
            dayLeaves: [],
          });
        }

        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

        // Current month days
        let countSundays = 0;
        let countHolidays = 0;
        let countLWPInMonth = 0;
        let countLeavesInMonth = 0;

        for (let day = 1; day <= daysInCurrentMonth; day++) {
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const currentDayObj = new Date(calYear, calMonth, day);
          const isSunday = currentDayObj.getDay() === 0;
          if (isSunday) countSundays++;

          const holiday = holidays.find((h) => h.date === dateStr);
          if (holiday) countHolidays++;

          // Day leaves
          const curStart = new Date(calYear, calMonth, day, 0, 0, 0);
          const curEnd = new Date(calYear, calMonth, day, 23, 59, 59);

          const dayLeaves = relevantLeaves.filter((l) => {
            const s = new Date(l.startDate);
            const e = new Date(l.endDate);
            return s <= curEnd && e >= curStart;
          });

          dayLeaves.forEach((dl) => {
            if (dl.leaveType === 'LWP') countLWPInMonth++;
            else countLeavesInMonth++;
          });

          // Attendance for logged-in user or selected staff
          const attRecord = personalAttendance.find((a) => a.date === dateStr);

          calendarGrid.push({
            dayNumber: day,
            isCurrentMonth: true,
            dateStr,
            isSunday,
            isToday: dateStr === todayStr,
            holiday,
            dayLeaves,
            attendanceRecord: attRecord,
          });
        }

        // Remaining padding to complete grid
        const remainingCells = (7 - (calendarGrid.length % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
          const nextMonthNum = calMonth === 11 ? 1 : calMonth + 2;
          const nextYearNum = calMonth === 11 ? calYear + 1 : calYear;
          const dateStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          calendarGrid.push({
            dayNumber: i,
            isCurrentMonth: false,
            dateStr,
            isSunday: false,
            isToday: false,
            dayLeaves: [],
          });
        }

        const workingDaysCount = Math.max(0, daysInCurrentMonth - countSundays - countHolidays);

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Toolbar: Month Navigation & Filter */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {monthTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Monthly working calendar, scheduled leaves, LWPs and official bank holidays
                  </p>
                </div>
              </div>

              {/* Month Navigation & Staff Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {isSuperAdmin && staffList.length > 0 && (
                  <select
                    value={calendarStaffFilter}
                    onChange={(e) => setCalendarStaffFilter(e.target.value)}
                    className="glass-input px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold max-w-xs"
                  >
                    <option value="ALL">👥 All Staff Leaves</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                    <option value="MANUAL">Manual / External Entries</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCurrentMonth}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics KPI Row for this Month */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Month Days</div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {daysInCurrentMonth} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{countSundays} Sundays</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Standard Working Days</div>
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {workingDaysCount} <span className="text-xs font-normal text-emerald-600/70">days</span>
                </div>
                <div className="text-[11px] text-emerald-600/80 mt-0.5">Used in salary calculation</div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Public Holidays</div>
                <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                  {countHolidays} <span className="text-xs font-normal text-purple-600/70">days</span>
                </div>
                <div className="text-[11px] text-purple-600/80 mt-0.5">Paid holiday closures</div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Leaves & LWP Logged</div>
                <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {countLWPInMonth} <span className="text-xs font-normal text-rose-500">LWP</span>
                  <span className="text-xs font-normal text-slate-400 ml-1.5">/ {countLeavesInMonth} Paid</span>
                </div>
                <div className="text-[11px] text-rose-500/90 mt-0.5">Deducted on salary register</div>
              </div>
            </div>

            {/* Main Interactive Month Calendar Grid */}
            <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              {/* Day Header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                <div className="p-2">Mon</div>
                <div className="p-2">Tue</div>
                <div className="p-2">Wed</div>
                <div className="p-2">Thu</div>
                <div className="p-2">Fri</div>
                <div className="p-2">Sat</div>
                <div className="p-2 text-rose-500">Sun</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarGrid.map((cell, idx) => (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`min-h-[85px] sm:min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'opacity-30 bg-slate-50/50 dark:bg-slate-900/30 border-transparent text-slate-400'
                        : cell.isToday
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                        : cell.isSunday
                        ? 'bg-rose-50/30 dark:bg-rose-950/10 border-slate-200/60 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Day Number & Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-black font-mono ${
                          cell.isToday
                            ? 'px-1.5 py-0.5 rounded-md bg-indigo-600 text-white'
                            : cell.isSunday
                            ? 'text-rose-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {cell.isSunday && cell.isCurrentMonth && (
                        <span className="text-[9px] font-bold text-rose-400 uppercase hidden sm:inline">Sun Off</span>
                      )}
                      {cell.isToday && (
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Today</span>
                      )}
                    </div>

                    {/* Middle Content: Holidays & Leaves */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {cell.holiday && (
                        <div
                          className="px-1.5 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold truncate flex items-center gap-1"
                          title={cell.holiday.name}
                        >
                          <span>🎉</span>
                          <span className="truncate">{cell.holiday.name}</span>
                        </div>
                      )}

                      {cell.dayLeaves.map((l, lIdx) => {
                        const isLwp = l.leaveType === 'LWP';
                        const empName = l.isManual ? l.manualName : (l.user?.name?.split(' ')[0] || 'Staff');
                        return (
                          <div
                            key={l.id || lIdx}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold truncate flex items-center gap-1 border ${
                              isLwp
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
                                : 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300'
                            }`}
                            title={`${l.leaveType}: ${empName} (${l.reason || ''})`}
                          >
                            <span>{isLwp ? '🚨' : '🏖️'}</span>
                            <span className="truncate">
                              {isLwp ? 'LWP' : l.leaveType}: {empName}
                            </span>
                          </div>
                        );
                      })}

                      {cell.attendanceRecord && (
                        <div
                          className="px-1.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold truncate flex items-center gap-0.5"
                          title={`Punch In: ${formatTimeIST(cell.attendanceRecord.punchIn)} - Duration: ${formatDuration(cell.attendanceRecord.totalMinutes * 60)}`}
                        >
                          <span>✓</span>
                          <span>{formatDuration(cell.attendanceRecord.totalMinutes * 60)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-400 text-right">
                      {cell.dateStr}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend Footer */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>Today's Date</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Bank / Company Holiday</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>LWP (Leave Without Pay)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>Approved Leave (CL/SL/PL)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Work Session Punched</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 italic">
                  * All dates synchronized with Indian Standard Time (IST)
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: LEAVE MANAGEMENT */}
      {activeTab === 'leaves' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quota Overview (for employee) or Admin Pending Alert */}
          {!isSuperAdmin && quota && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-md">
                <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                  Casual Leave (CL)
                </div>
                <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                  {quota.casualRemaining} <span className="text-xs font-normal text-slate-400">/ {quota.casualTotal} left</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">For planned personal events & emergencies</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-md">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Sick Leave (SL)
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {quota.sickRemaining} <span className="text-xs font-normal text-slate-400">/ {quota.sickTotal} left</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">For medical and health recovery</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 shadow-md">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Paid / Privilege Leave (PL)
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {quota.paidRemaining} <span className="text-xs font-normal text-slate-400">/ {quota.paidTotal} left</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Annual paid vacation days</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 shadow-md">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Leave Without Pay (LWP)
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {quota.lwpTotalTaken || 0} <span className="text-xs font-normal text-slate-400">days taken</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Deducted from monthly salary register</p>
              </div>
            </div>
          )}

          {/* Action Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              {isSuperAdmin ? 'Company Leave Applications & Approvals' : 'My Leave Requests'}
            </h3>

            {isSuperAdmin ? (
              <button
                onClick={() => {
                  setAdminLeaveForm({
                    isManual: false,
                    userId: staffList[0]?.id || '',
                    manualName: '',
                    manualPhone: '',
                    leaveType: 'CASUAL',
                    startDate: '',
                    endDate: '',
                    reason: '',
                    status: 'APPROVED',
                  });
                  setAdminLeaveError('');
                  setAdminLeaveSuccess('');
                  setIsAdminLeaveModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Mark / Record Leave</span>
              </button>
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Apply for Leave</span>
              </button>
            )}
          </div>

          {/* Leaves List Table */}
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                    {isSuperAdmin && <th className="py-3 px-4 font-semibold">Employee</th>}
                    <th className="py-3 px-4 font-semibold">Leave Type</th>
                    <th className="py-3 px-4 font-semibold text-center">Dates (Duration)</th>
                    <th className="py-3 px-4 font-semibold">Reason</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    {isSuperAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-slate-400 text-xs">
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {isSuperAdmin && (
                          <td className="py-3 px-4">
                            {l.isManual ? (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">{l.manualName}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                                    Manual Entry
                                  </span>
                                </div>
                                {l.manualPhone && (
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" /> {l.manualPhone}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{l.user?.name || 'Staff Member'}</div>
                                <div className="text-[10px] text-slate-500">
                                  {l.user?.team?.name || 'General Staff'} {l.user?.role && `(${l.user.role})`}
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            l.leaveType === 'LWP'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              : l.leaveType === 'SICK'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : l.leaveType === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                          }`}>
                            {l.leaveType === 'LWP' ? 'Leave Without Pay (LWP)' : l.leaveType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">{l.daysCount} Day(s)</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-300">
                          {l.reason}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {l.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          ) : l.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[10px] animate-pulse">
                              Pending Review
                            </span>
                          )}
                        </td>
                        {isSuperAdmin && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {l.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleReviewLeave(l.id, 'APPROVED')}
                                    title="Approve Leave"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleReviewLeave(l.id, 'REJECTED')}
                                    title="Reject Leave"
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" /> Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteLeave(l.id, l.isManual ? l.manualName : (l.user?.name || 'Employee'))}
                                title="Delete / Cancel Leave Record"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Super Admin Direct / Manual Leave Entry Modal */}
          {isAdminLeaveModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-indigo-500" /> Record / Mark Employee Leave
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mark leaves for internal team staff or external manual employee records.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAdminLeaveModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {adminLeaveError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{adminLeaveError}</span>
                  </div>
                )}

                {adminLeaveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{adminLeaveSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleRecordAdminLeave} className="space-y-4">
                  {/* Selection Type: Existing Staff vs Manual Entry */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Employee Selection Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setAdminLeaveForm({ ...adminLeaveForm, isManual: false })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          !adminLeaveForm.isManual
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Existing Staff</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminLeaveForm({ ...adminLeaveForm, isManual: true })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          adminLeaveForm.isManual
                            ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Manual Entry</span>
                      </button>
                    </div>
                  </div>

                  {/* Existing Staff Dropdown */}
                  {!adminLeaveForm.isManual ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select Staff Member *
                      </label>
                      <select
                        required
                        value={adminLeaveForm.userId}
                        onChange={(e) => setAdminLeaveForm({ ...adminLeaveForm, userId: e.target.value })}
                        className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                      >
                        <option value="">-- Choose Staff Member --</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role} - {s.team?.name || 'General Team'})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* Manual Entry Fields */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Employee Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sunil Sharma"
                          value={adminLeaveForm.manualName}
                          onChange={(e) => setAdminLeaveForm({ ...adminLeaveForm, manualName: sanitizeToAlphabetsOnly(e.target.value) })}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Phone Number
                          </label>
                          <span className={`text-[10px] font-mono ${adminLeaveForm.manualPhone.length === 10 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                            {adminLeaveForm.manualPhone.length}/10
                          </span>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit mobile"
                          value={adminLeaveForm.manualPhone}
                          onChange={(e) => setAdminLeaveForm({ ...adminLeaveForm, manualPhone: sanitizeTo10Digits(e.target.value) })}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-mono tracking-wider"
                        />
                      </div>
                    </div>
                  )}

                  {/* Leave Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                    <select
                      value={adminLeaveForm.leaveType}
                      onChange={(e: any) => setAdminLeaveForm({ ...adminLeaveForm, leaveType: e.target.value })}
                      className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <option value="CASUAL">Casual Leave (CL)</option>
                      <option value="SICK">Sick Leave (SL)</option>
                      <option value="PAID">Paid Leave (PL)</option>
                      <option value="LWP">Leave Without Pay (LWP)</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Start Date (From) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={adminLeaveForm.startDate}
                        onChange={(e) => setAdminLeaveForm({ ...adminLeaveForm, startDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        End Date (To) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={adminLeaveForm.endDate}
                        onChange={(e) => setAdminLeaveForm({ ...adminLeaveForm, endDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason / Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Approved personal vacation, medical leave, etc."
                      value={adminLeaveForm.reason}
                      onChange={(e) => setAdminLeaveForm({ ...adminLeaveForm, reason: e.target.value })}
                      className="w-full glass-input p-3 rounded-xl text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAdminLeaveModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adminLeaveLoading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                    >
                      {adminLeaveLoading ? 'Recording...' : '+ Record Leave Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Apply Leave Modal */}
          {isApplyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-indigo-500" /> Apply for Leave
                  </h3>
                  <button onClick={() => setIsApplyModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {leaveMessage && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    {leaveMessage}
                  </div>
                )}

                <form onSubmit={handleApplyLeave} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                    <select
                      value={newLeave.leaveType}
                      onChange={(e: any) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                    >
                      <option value="CASUAL">Casual Leave (CL)</option>
                      <option value="SICK">Sick Leave (SL)</option>
                      <option value="PAID">Paid Leave (PL)</option>
                      <option value="LWP">Leave Without Pay (LWP)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Leave</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Please specify the reason for your leave request..."
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      className="w-full glass-input p-3 rounded-xl text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all"
                    >
                      Submit Leave Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPANY HOLIDAYS */}
      {activeTab === 'holidays' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" /> Official Company Holiday Calendar (2026)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Indian national and public festival holidays. These days are considered paid non-working days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    h.isPassed
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-60'
                      : 'glass-panel border-amber-500/30 hover:shadow-lg hover:border-amber-500/50 bg-gradient-to-tr from-amber-500/5 to-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {h.dayName || 'Holiday'}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        h.isPassed ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400 font-extrabold'
                      }`}
                    >
                      {h.isPassed ? 'Passed' : 'Upcoming 🎉'}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2">
                    {h.name}
                  </h4>
                  <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {h.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
