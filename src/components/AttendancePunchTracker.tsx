'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LogIn, LogOut, Clock, CheckCircle2, AlertCircle, ArrowRight, Users } from 'lucide-react';
import { getTodayAttendanceAction, punchInAction, punchOutAction } from '@/app/actions';
import { formatTimeIST, formatDuration } from '@/lib/ist-time';

export default function AttendancePunchTracker({ variant = 'header' }: { variant?: 'header' | 'dashboard' }) {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState<Date | string | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<Date | string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAttendance = async () => {
    try {
      const res = await getTodayAttendanceAction();
      if (res.success) {
        const punched = Boolean(res.isPunchedIn);
        setIsPunchedIn(punched);
        setPunchInTime(res.record?.punchIn || null);
        setPunchOutTime(res.record?.punchOut || null);
        const mins = res.record?.totalMinutes || 0;
        setTotalMinutes(mins);
        setElapsedSeconds(res.elapsedSeconds ?? (mins * 60));
      }
    } catch (err) {
      console.error('Error fetching today attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();

    // Cross-component synchronizer: Keeps header tracker and dashboard tracker in sync
    const handleSync = () => {
      fetchAttendance();
    };
    window.addEventListener('nestguru:attendance-sync', handleSync);
    return () => {
      window.removeEventListener('nestguru:attendance-sync', handleSync);
    };
  }, []);

  // Real-time ticker: ONLY increments while punched in!
  useEffect(() => {
    let timer: any = null;
    if (isPunchedIn) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPunchedIn]);

  const handlePunchToggle = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      if (!isPunchedIn) {
        // Punch In / Resume Shift
        const res = await punchInAction();
        if (res.success && res.record) {
          setIsPunchedIn(true);
          setPunchInTime(res.record.punchIn);
          setPunchOutTime(null);
          const accumulatedSec = (res.record.totalMinutes || 0) * 60;
          setTotalMinutes(res.record.totalMinutes || 0);
          setElapsedSeconds(accumulatedSec);
          setMessage('Punched In successfully! Work session started.');
          // Synchronize all tracker components across the window
          window.dispatchEvent(new CustomEvent('nestguru:attendance-sync'));
        } else {
          setMessage(res.error || 'Failed to punch in');
        }
      } else {
        // Punch Out / End Shift
        const res = await punchOutAction();
        if (res.success && res.record) {
          setIsPunchedIn(false);
          setPunchOutTime(res.record.punchOut);
          const totalMins = res.record.totalMinutes || 0;
          setTotalMinutes(totalMins);
          setElapsedSeconds(totalMins * 60); // Freeze timer immediately at total worked
          setMessage('Punched Out successfully! Work session stopped.');
          // Synchronize all tracker components across the window
          window.dispatchEvent(new CustomEvent('nestguru:attendance-sync'));
        } else {
          setMessage(res.error || 'Failed to punch out');
        }
      }
    } catch (err) {
      setMessage('Attendance action failed. Please try again.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-400">
        <Clock className="w-3.5 h-3.5 animate-spin" /> Loading...
      </div>
    );
  }

  // Super Admin view: Can only monitor and view HRMS desk, cannot punch in/out
  if (isSuperAdmin) {
    if (variant === 'header') {
      return (
        <Link
          href="/hrms"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all shadow-sm shrink-0"
          title="Super Admin Monitor: Open HRMS Employee Tracker"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">HRMS Tracker</span>
        </Link>
      );
    }

    return (
      <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                HRMS Employee Live Desk (Super Admin Supervisor)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You have supervisor access to monitor live staff attendance, timesheets, and approve leave requests.
              </p>
            </div>
          </div>
          <Link
            href="/hrms"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Open HRMS Employee Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Header Variant (Compact, fits in top navigation for staff)
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2 shrink-0">
        {isPunchedIn ? (
          <div className="flex items-center gap-1.5 glass-panel px-2.5 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="text-[11px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">
              {formatDuration(elapsedSeconds)}
            </span>
            <button
              onClick={handlePunchToggle}
              disabled={actionLoading}
              title={`Punched in at ${formatTimeIST(punchInTime)} IST. Click to Punch Out`}
              className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition-all disabled:opacity-50"
            >
              <LogOut className="w-3 h-3" />
              <span>{actionLoading ? 'Saving...' : 'Punch Out'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {punchOutTime ? (
              <div className="flex items-center gap-1.5 glass-panel px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                  {formatDuration(totalMinutes * 60)}
                </span>
                <button
                  onClick={handlePunchToggle}
                  disabled={actionLoading}
                  title="Punch In again (Resume IST Attendance Tracker)"
                  className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <LogIn className="w-3 h-3" />
                  <span>{actionLoading ? 'Starting...' : 'Punch In'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handlePunchToggle}
                disabled={actionLoading}
                title="Click to Punch In (IST Attendance Tracker)"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Starting...' : 'Punch In'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Dashboard Card Variant (Hero tracker card)
  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
              isPunchedIn
                ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              HRMS Attendance Tracker
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Indian Standard Time (IST) • 24-Hour Daily Cycle
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
            isPunchedIn
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPunchedIn ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
          {isPunchedIn ? 'ACTIVE SESSION' : punchOutTime ? 'SHIFT PAUSED' : 'NOT PUNCHED IN'}
        </span>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.includes('success') || message.includes('started') || message.includes('saved')
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {message.includes('success') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message}</span>
        </div>
      )}

      {/* Live Timer Display */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {isPunchedIn ? "Today's Active Working Hours" : 'Total Hours Completed Today'}
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-0.5">
            {isPunchedIn ? formatDuration(elapsedSeconds) : formatDuration(totalMinutes * 60)}
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-500 space-y-0.5">
          <div>Punch In: <span className="font-bold text-slate-700 dark:text-slate-300">{formatTimeIST(punchInTime)}</span></div>
          <div>Punch Out: <span className="font-bold text-slate-700 dark:text-slate-300">{formatTimeIST(punchOutTime)}</span></div>
        </div>
      </div>

      {/* Action Punch Button */}
      <button
        onClick={handlePunchToggle}
        disabled={actionLoading}
        className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
          isPunchedIn
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
        } disabled:opacity-50`}
      >
        {isPunchedIn ? (
          <>
            <LogOut className="w-4 h-4" />
            <span>{actionLoading ? 'Clocking Out...' : 'Punch Out (End Shift)'}</span>
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span>{actionLoading ? 'Clocking In...' : punchOutTime ? 'Punch In (Resume Shift)' : 'Punch In (Start Shift)'}</span>
          </>
        )}
      </button>
    </div>
  );
}
