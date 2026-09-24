'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/context/ThemeContext';
import { 
  LayoutDashboard, 
  FolderCheck, 
  PlusCircle, 
  Users, 
  FileCheck2, 
  LogOut, 
  ShieldCheck, 
  UserCheck,
  Sun,
  Moon,
  UserCog,
  Sliders,
  CalendarDays,
  Contact,
  ChevronDown
} from 'lucide-react';
import BirthdayTopWidget from '@/components/BirthdayTopWidget';
import AttendancePunchTracker from '@/components/AttendancePunchTracker';
import NotificationBell from '@/components/NotificationBell';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const caseMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (caseMenuRef.current && !caseMenuRef.current.contains(e.target as Node)) {
        setIsCaseMenuOpen(false);
      }
    }
    if (isCaseMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCaseMenuOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setIsCaseMenuOpen(false);
  }, [pathname]);

  if (pathname === '/login') return null;

  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name || 'User';

  const isCaseDirectoryActive =
    pathname.startsWith('/cases') || pathname === '/clients';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  const trailingNavItems = [
    { label: 'HRMS Desk', href: '/hrms', icon: CalendarDays }
  ];

  if (userRole === 'SUPER_ADMIN') {
    trailingNavItems.push(
      { label: 'Add Functionality', href: '/admin/functionality', icon: Sliders },
      { label: 'User & Teams', href: '/admin/users', icon: Users },
      { label: 'Checklist Matrix', href: '/admin/checklist-templates', icon: FileCheck2 }
    );
  }

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-slate-700/50 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between h-auto py-2.5 md:h-16 gap-2">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow border border-slate-200 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img
                src="https://thenestguru.com/thenestgurulogo.png"
                alt="TheNestGuru Logo"
                className="w-full h-full max-w-full max-h-full object-contain shrink-0"
              />
            </div>
            <div className="leading-none">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors flex items-center gap-1">
                TheNestGuru <span className="text-sky-600 dark:text-sky-400 font-light">Loan Desk</span>
              </span>
              <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                Multi-Tenant Processing Hub
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 overflow-x-visible shrink py-1">
            {/* Dashboard */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-inner'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Case Directory Nested Dropdown Menu */}
            <div className="relative" ref={caseMenuRef}>
              <button
                type="button"
                onClick={() => setIsCaseMenuOpen(!isCaseMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isCaseDirectoryActive
                    ? 'bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-inner'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <FolderCheck className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                <span>Case Directory</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isCaseMenuOpen ? 'rotate-180 text-sky-500' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Nested Menu Dropdown */}
              {isCaseMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* All Cases */}
                  <Link
                    href="/cases"
                    onClick={() => setIsCaseMenuOpen(false)}
                    className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                      pathname === '/cases'
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                      <FolderCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">All Cases Pipeline</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Active pipeline, stages & case ledger
                      </div>
                    </div>
                  </Link>

                  {/* Client Directory (Nested Item) */}
                  {userRole !== 'CHANNEL' && (
                    <Link
                      href="/clients"
                      onClick={() => setIsCaseMenuOpen(false)}
                      className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                        pathname === '/clients'
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                        <Contact className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Client Directory</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Deduplicated borrowers & co-applicants
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* New Intake Shortcut */}
                  {userRole !== 'CHANNEL' && (
                    <Link
                      href="/cases/new"
                      onClick={() => setIsCaseMenuOpen(false)}
                      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 transition-all border-t border-slate-100 dark:border-slate-800/80 pt-2"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight text-emerald-600 dark:text-emerald-400">
                          + New Case Intake
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Register fresh borrower application
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Trailing Items (HRMS, Admin links) */}
            {trailingNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-inner'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Attendance Punch, Birthday Hub, Notifications, Theme Switcher & Profile Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {session?.user && (
              <>
                <AttendancePunchTracker variant="header" />
                <BirthdayTopWidget />
                <NotificationBell />
              </>
            )}

            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-amber-500 hover:text-amber-600 transition-all shadow-sm shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-600" />}
            </button>

            {session?.user && (
              <div className="flex items-center gap-2 glass-panel px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 shrink-0">
                <Link
                  href="/profile"
                  title="Edit Profile Settings"
                  className="flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {userRole === 'SUPER_ADMIN' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-slate-900 dark:text-white leading-tight truncate max-w-[110px]">
                      {userName}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          userRole === 'SUPER_ADMIN' ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'
                        }`}
                      />
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                        {userRole === 'SUPER_ADMIN' ? 'Super Admin' : userRole}
                      </span>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/profile"
                  title="Profile Settings"
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/10 rounded transition-colors ml-0.5 shrink-0"
                >
                  <UserCog className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  title="Sign Out"
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
