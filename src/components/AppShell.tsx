'use client';

import { useState, useEffect } from 'react';
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
  PartyPopper,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Compass,
  Package,
  Briefcase,
  CheckSquare,
  Settings
} from 'lucide-react';
import BirthdayTopWidget from '@/components/BirthdayTopWidget';
import AttendancePunchTracker from '@/components/AttendancePunchTracker';
import { getCrmBrandingAction } from '@/app/actions';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isChecklistActive =
    pathname.startsWith('/admin/checklist-templates') ||
    pathname.startsWith('/admin/products') ||
    pathname.startsWith('/admin/profiles');

  const [isChecklistSubmenuOpen, setIsChecklistSubmenuOpen] = useState(true);
  const [crmBranding, setCrmBranding] = useState({
    crmName: 'TheNestGuru',
    crmTagline: 'Loan Processing Desk',
    crmLogoUrl: 'https://thenestguru.com/thenestgurulogo.png',
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Fetch CRM branding and listen for live updates
  useEffect(() => {
    getCrmBrandingAction().then((res) => {
      if (res && res.success) {
        setCrmBranding({
          crmName: res.crmName || 'TheNestGuru',
          crmTagline: res.crmTagline || 'Loan Processing Desk',
          crmLogoUrl: res.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png',
        });
      }
    });

    const handleBrandingUpdate = (e: any) => {
      if (e.detail?.branding) {
        setCrmBranding(e.detail.branding);
      }
      if (e.detail?.avatarUrl !== undefined) {
        setUserAvatar(e.detail.avatarUrl);
      }
    };
    window.addEventListener('crm-branding-updated', handleBrandingUpdate);
    return () => window.removeEventListener('crm-branding-updated', handleBrandingUpdate);
  }, []);

  useEffect(() => {
    if ((session?.user as any)?.avatarUrl) {
      setUserAvatar((session?.user as any).avatarUrl);
    }
  }, [session]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // If on login page, render clean full-screen content without sidebar/header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name || 'User';

  // Navigation route matching logic
  const isItemActive = (href: string) => {
    if (href === '/cases') {
      return pathname === '/cases' || (pathname.startsWith('/cases/') && pathname !== '/cases/new');
    }
    if (href === '/cases/new') {
      return pathname === '/cases/new';
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Nav Groups
  const coreNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null },
    { label: 'Cases Directory', href: '/cases', icon: FolderCheck, badge: null },
    { label: 'New Intake', href: '/cases/new', icon: PlusCircle, badge: 'New', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    ...(userRole !== 'CHANNEL' ? [{ label: 'Task Management', href: '/tasks', icon: CheckSquare, badge: null }] : []),
    { label: 'HRMS Desk', href: '/hrms', icon: CalendarDays, badge: null },
    { label: 'Birthdays Hub', href: '/birthdays', icon: PartyPopper, badge: null },
  ];

  const adminNavItems = userRole === 'SUPER_ADMIN' ? [
    { label: 'Add Functionality', href: '/admin/functionality', icon: Sliders, badge: null },
    { label: 'User & Teams', href: '/admin/users', icon: Users, badge: null },
    { label: 'Checklist Matrix', href: '/admin/checklist-templates', icon: FileCheck2, badge: null },
    { label: 'CRM Settings', href: '/admin/settings', icon: Settings, badge: null },
  ] : [];

  // Breadcrumb / Page Title resolution
  const getPageTitle = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'Dashboard Overview';
    if (pathname === '/cases/new') return 'New Case Intake Form';
    if (pathname.startsWith('/cases/') && pathname !== '/cases') return 'Case Details & Checklist Engine';
    if (pathname === '/cases') return 'Cases Directory';
    if (pathname === '/tasks') return 'Task Management Hub';
    if (pathname === '/hrms') return 'HRMS Employee Desk';
    if (pathname === '/birthdays') return 'Celebrations & Birthdays Directory';
    if (pathname === '/admin/settings') return 'CRM Settings & Branding';
    if (pathname === '/admin/functionality') return 'Add Functionality & Settings Hub';
    if (pathname === '/admin/users') return 'User & Team Management';
    if (pathname === '/admin/checklist-templates') return 'Dynamic Checklist Matrix';
    if (pathname === '/admin/products') return 'Loan Products Master';
    if (pathname === '/admin/profiles') return 'Customer Profiles Master';
    if (pathname === '/profile') return 'User Profile & Preferences';
    return crmBranding.crmName + ' Workspace';
  };

  // Sidebar content (used for both desktop and mobile drawer)
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Brand */}
      <div>
        <div className="p-3.5 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img
                src={crmBranding.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png'}
                alt="CRM Logo"
                className="w-full h-full object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://thenestguru.com/thenestgurulogo.png';
                }}
              />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors truncate">
                {crmBranding.crmName || 'TheNestGuru'}
              </div>
              <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 truncate">
                {crmBranding.crmTagline || 'Loan Processing Desk'}
              </div>
              <span className="inline-block text-[7px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                Multi-Tenant Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)]">
          {/* Core Workspace Section */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Core Workspace
              </span>
              <Compass className="w-3 h-3 text-slate-400" />
            </div>
            <nav className="space-y-1">
              {coreNavItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    ) : active ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Administration Section (Super Admin Only) */}
          {userRole === 'SUPER_ADMIN' && (
            <div>
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Administration
                </span>
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
              </div>
              <nav className="space-y-1">
                {/* Standard Admin Links */}
                <Link
                  href="/admin/functionality"
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isItemActive('/admin/functionality')
                      ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className={`w-4 h-4 transition-transform group-hover:scale-110 ${isItemActive('/admin/functionality') ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>Add Functionality</span>
                  </div>
                  {isItemActive('/admin/functionality') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                  )}
                </Link>

                <Link
                  href="/admin/users"
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isItemActive('/admin/users')
                      ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 transition-transform group-hover:scale-110 ${isItemActive('/admin/users') ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>User & Teams</span>
                  </div>
                  {isItemActive('/admin/users') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                  )}
                </Link>

                {/* Nested Checklist Matrix Submenu */}
                <div className="space-y-1 pt-0.5">
                  <div
                    onClick={() => setIsChecklistSubmenuOpen(!isChecklistSubmenuOpen)}
                    className={`w-full group cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isChecklistActive
                        ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className={`w-4 h-4 transition-transform group-hover:scale-110 ${isChecklistActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Checklist Matrix</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isChecklistSubmenuOpen ? 'rotate-180 text-sky-500' : 'text-slate-400'}`} />
                  </div>

                  {isChecklistSubmenuOpen && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 animate-in slide-in-from-top-1 duration-150">
                      <Link
                        href="/admin/checklist-templates"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/checklist-templates'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Checklist Rules</span>
                        </div>
                        {pathname === '/admin/checklist-templates' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/products"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/products'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                          <span>Products</span>
                        </div>
                        {pathname === '/admin/products' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/profiles"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/profiles'
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                          <span>Customer Profiles</span>
                        </div>
                        {pathname === '/admin/profiles' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/admin/settings"
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isItemActive('/admin/settings')
                      ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className={`w-4 h-4 transition-transform group-hover:scale-110 ${isItemActive('/admin/settings') ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>CRM Settings</span>
                  </div>
                  {isItemActive('/admin/settings') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                  )}
                </Link>
              </nav>
            </div>
          )}

          {/* Quick System Badge */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                TheNestGuru Cloud
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                IST v2.5
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              Dynamic Loan Eligibility, Automated Checklist & Unified Celebrations Hub.
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar Footer: User Card, Theme Toggle & Sign Out */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-2.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 shadow-sm">
          <Link
            href="/profile"
            className="flex items-center gap-2 min-w-0 group hover:opacity-80 transition-opacity"
            title="View & Edit Profile"
          >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow shrink-0 overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-full h-full object-cover"
                  onError={() => setUserAvatar(null)}
                />
              ) : (
                <span>{userName.charAt(0).toUpperCase()}</span>
              )}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  userRole === 'SUPER_ADMIN' ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
              />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-600 transition-colors">
                {userName}
              </div>
              <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                {userRole === 'SUPER_ADMIN' ? 'Super Admin' : userRole}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-lg text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-600" />}
            </button>

            <Link
              href="/profile"
              title="Profile Settings"
              className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <UserCog className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* DESKTOP SIDEBAR (Visible on md and larger) - Reduced sleek width */}
      <aside className="hidden md:flex flex-col w-56 xl:w-60 fixed inset-y-0 left-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 shadow-[1px_0_15px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_15px_rgba(0,0,0,0.4)] transition-all duration-300">
        {renderSidebarContent()}
      </aside>

      {/* MOBILE TOP BAR (Visible on screens < md) */}
      <header className="md:hidden fixed top-0 inset-x-0 h-16 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle Side Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shadow border border-slate-200 shrink-0 overflow-hidden">
              <img
                src={crmBranding.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png'}
                alt="CRM Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://thenestguru.com/thenestgurulogo.png';
                }}
              />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              {crmBranding.crmName}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {session?.user && (
            <>
              <AttendancePunchTracker variant="header" />
              <BirthdayTopWidget />
            </>
          )}
        </div>
      </header>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl z-10 flex flex-col border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER - Reduced sidebar padding */}
      <div className="md:pl-56 xl:pl-60 flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* DESKTOP TOP HEADER (Breadcrumbs & Quick System Bar) */}
        <header className="hidden md:flex h-16 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{crmBranding.crmName}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {session?.user && (
              <>
                <AttendancePunchTracker variant="header" />
                <BirthdayTopWidget />
              </>
            )}

            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-amber-500 hover:text-amber-600 transition-all shadow-sm"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
            </button>

            <Link
              href="/profile"
              title="Profile Settings"
              className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl glass-panel border border-slate-200 dark:border-slate-700/50 hover:border-sky-500/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span>{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {userName}
              </span>
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
