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
  Settings,
  MapPin,
  DollarSign,
  Globe,
  Languages,
  Shield,
  Layers,
  Users2,
  Contact,
  Tag,
  Building2,
} from 'lucide-react';
import BirthdayTopWidget from '@/components/BirthdayTopWidget';
import AttendancePunchTracker from '@/components/AttendancePunchTracker';
import GoogleTranslateTopBar from '@/components/GoogleTranslateTopBar';
import NotificationBell from '@/components/NotificationBell';
import { getCrmBrandingAction } from '@/app/actions';
import { translations, Locale } from '@/lib/i18n';

interface AppShellProps {
  children: React.ReactNode;
  initialSession?: any;
}

export default function AppShell({ children, initialSession }: AppShellProps) {
  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const session = clientSession || initialSession;
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCaseActive =
    pathname.startsWith('/cases') ||
    pathname === '/clients' ||
    pathname.startsWith('/sub-accounts');
  const isChecklistActive =
    pathname.startsWith('/admin/checklist-templates') ||
    pathname.startsWith('/admin/products') ||
    pathname.startsWith('/admin/profiles') ||
    pathname.startsWith('/admin/customer-types') ||
    pathname.startsWith('/admin/property-scopes') ||
    pathname.startsWith('/admin/workflow-stages') ||
    pathname.startsWith('/admin/case-statuses');

  const isUsersActive = pathname.startsWith('/admin/users');
  const isHrmsActive = pathname.startsWith('/hrms') || pathname.startsWith('/salary');
  const [isCaseSubmenuOpen, setIsCaseSubmenuOpen] = useState(true);
  const [isChecklistSubmenuOpen, setIsChecklistSubmenuOpen] = useState(true);
  const [isUsersSubmenuOpen, setIsUsersSubmenuOpen] = useState(true);
  const [isHrmsSubmenuOpen, setIsHrmsSubmenuOpen] = useState(true);
  const [crmBranding, setCrmBranding] = useState({
    crmName: 'TheNestGuru',
    crmTagline: 'Loan Processing Desk',
    crmLogoUrl: 'https://thenestguru.com/thenestgurulogo.png',
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_locale') as Locale;
      if (saved === 'hi' || saved === 'en') {
        setLocale(saved);
      }
    }
  }, []);

  const toggleLocale = () => {
    const next: Locale = locale === 'en' ? 'hi' : 'en';
    setLocale(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_locale', next);
      window.dispatchEvent(new CustomEvent('crm_locale_changed', { detail: { locale: next } }));
    }
  };

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

  // Persistent role & user fallback cache (synchronously initialized from localStorage on client)
  const [cachedUser, setCachedUser] = useState<{ role?: string; name?: string; avatarUrl?: string | null }>(() => {
    let role = initialSession?.user?.role;
    let name = initialSession?.user?.name;
    let avatarUrl = (initialSession?.user as any)?.avatarUrl;

    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('crm_user_role');
      const storedName = localStorage.getItem('crm_user_name');
      const storedAvatar = localStorage.getItem('crm_user_avatar');
      if (storedRole) role = storedRole;
      if (storedName) name = storedName;
      if (storedAvatar) avatarUrl = storedAvatar;
    }
    return {
      role: role || 'SUPER_ADMIN',
      name: name || 'Admin',
      avatarUrl: avatarUrl || null,
    };
  });

  useEffect(() => {
    const activeRole = (session?.user as any)?.role;
    const activeName = session?.user?.name;
    const activeAvatar = (session?.user as any)?.avatarUrl;

    if (activeRole || activeName) {
      setCachedUser({
        role: activeRole || 'SUPER_ADMIN',
        name: activeName || 'Admin',
        avatarUrl: activeAvatar !== undefined ? activeAvatar : null,
      });
      if (typeof window !== 'undefined') {
        if (activeRole) localStorage.setItem('crm_user_role', activeRole);
        if (activeName) localStorage.setItem('crm_user_name', activeName);
        if (activeAvatar) localStorage.setItem('crm_user_avatar', activeAvatar);
      }
    }
  }, [session]);

  const activeSessionRole = (session?.user as any)?.role;
  const userRole = activeSessionRole || cachedUser.role || initialSession?.user?.role || 'SUPER_ADMIN';
  const userName = session?.user?.name || cachedUser.name || initialSession?.user?.name || (userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff');

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
  const coreNavItems: Array<{
    label: string;
    href: string;
    icon: any;
    badge?: string | null;
    badgeColor?: string;
  }> = [
    ...(userRole !== 'CHANNEL' ? [
      { label: locale === 'hi' ? 'कार्य प्रबंधन' : 'Task Management', href: '/tasks', icon: CheckSquare, badge: null, badgeColor: '' },
      { label: locale === 'hi' ? 'विजिट ट्रैकर' : 'Visit Tracker', href: '/visits', icon: MapPin, badge: null, badgeColor: '' },
      { label: locale === 'hi' ? 'जन्मदिन केंद्र' : 'Birthdays Hub', href: '/birthdays', icon: PartyPopper, badge: null, badgeColor: '' },
    ] : []),
  ];

  const adminNavItems = userRole !== 'CHANNEL' ? [
    { label: locale === 'hi' ? 'कर्मचारी और टीम' : 'User & Teams', href: '/admin/users', icon: Users, badge: null },
    { label: locale === 'hi' ? 'चेकलिस्ट मैट्रिक्स' : 'Checklist Matrix', href: '/admin/checklist-templates', icon: FileCheck2, badge: null },
    { label: locale === 'hi' ? 'सुविधाएं जोड़ें' : 'Add Functionality', href: '/admin/functionality', icon: Sliders, badge: null },
    { label: locale === 'hi' ? 'सीआरएम सेटिंग्स' : 'CRM Settings', href: '/admin/settings', icon: Settings, badge: null },
  ] : [];

  // Breadcrumb / Page Title resolution
  const getPageTitle = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'Dashboard Overview';
    if (pathname === '/cases/new') return 'New Case Intake Form';
    if (pathname.startsWith('/cases/') && pathname !== '/cases') return 'Case Details & Checklist Engine';
    if (pathname === '/cases') return 'Cases Directory';
    if (pathname === '/sub-accounts') return 'Child IDs & Sub-Accounts Directory';
    if (pathname === '/clients') return 'Client & Co-Applicant Directory';
    if (pathname === '/tasks') return 'Task Management Hub';
    if (pathname === '/hrms') return 'HRMS Employee Desk';
    if (pathname === '/birthdays') return 'Celebrations & Birthdays Directory';
    if (pathname === '/admin/settings') return 'CRM Settings & Branding';
    if (pathname === '/admin/functionality') return 'Add Functionality & Settings Hub';
    if (pathname === '/admin/users') return 'User & Team Management';
    if (pathname === '/admin/users/roles') return 'Roles & Access Permissions Manager';
    if (pathname === '/admin/checklist-templates') return 'Dynamic Checklist Matrix';
    if (pathname === '/admin/products') return 'Loan Products Master';
    if (pathname === '/admin/profiles') return 'Income Profiles Master';
    if (pathname === '/admin/customer-types') return 'Customer Types (Entity Master)';
    if (pathname === '/admin/property-scopes') return 'Property Scopes Master';
    if (pathname === '/admin/workflow-stages') return 'Workflow Stages Master';
    if (pathname === '/admin/case-statuses') return 'Case Filing Statuses Master';
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
              {/* 1. Dashboard Link */}
              <Link
                href="/dashboard"
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isItemActive('/dashboard')
                    ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className={`w-4 h-4 transition-transform group-hover:scale-110 ${isItemActive('/dashboard') ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{locale === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}</span>
                </div>
                {isItemActive('/dashboard') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                )}
              </Link>

              {/* 2. Nested Case Directory Submenu (Includes /cases, /clients, /cases/new) */}
              <div className="space-y-1 pt-0.5">
                <div
                  onClick={() => setIsCaseSubmenuOpen(!isCaseSubmenuOpen)}
                  className={`w-full group cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isCaseActive
                      ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className={`w-4 h-4 transition-transform group-hover:scale-110 ${isCaseActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{locale === 'hi' ? 'केस निर्देशिका' : 'Case Directory'}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCaseSubmenuOpen ? 'rotate-180 text-sky-500' : 'text-slate-400'}`} />
                </div>

                {isCaseSubmenuOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 animate-in slide-in-from-top-1 duration-150">
                    <Link
                      href="/cases"
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        pathname === '/cases'
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                        <span>{locale === 'hi' ? 'सभी केस पाइपलाइन' : 'All Cases Pipeline'}</span>
                      </div>
                      {pathname === '/cases' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      )}
                    </Link>

                    {userRole === 'CHANNEL' ? (
                      <Link
                        href="/sub-accounts"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/sub-accounts'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span>{locale === 'hi' ? 'चाइल्ड आईडी निर्देशिका' : 'Child IDs Directory'}</span>
                        </div>
                        {pathname === '/sub-accounts' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </Link>
                    ) : (
                      <Link
                        href="/clients"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/clients'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Contact className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          <span>{locale === 'hi' ? 'ग्राहक निर्देशिका' : 'Client Directory'}</span>
                        </div>
                        {pathname === '/clients' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </Link>
                    )}

                    {userRole !== 'CHANNEL' && (
                      <Link
                        href="/cases/new"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/cases/new'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 flex items-center justify-center font-extrabold text-sky-600 dark:text-sky-400">+</span>
                          <span>{locale === 'hi' ? 'नया केस दर्ज करें' : 'New Case Intake'}</span>
                        </div>
                        {pathname === '/cases/new' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Other Core Items (Tasks, Visits, Birthdays) */}
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

            {/* Nested HRMS Submenu (Hidden for Channel Accounts) */}
            {userRole !== 'CHANNEL' && (
              <div className="space-y-1 pt-1.5">
                <div
                  onClick={() => setIsHrmsSubmenuOpen(!isHrmsSubmenuOpen)}
                  className={`w-full group cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isHrmsActive
                      ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className={`w-4 h-4 transition-transform group-hover:scale-110 ${isHrmsActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{locale === 'hi' ? 'एचआरएमएस' : 'HRMS Desk'}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isHrmsSubmenuOpen ? 'rotate-180 text-sky-500' : 'text-slate-400'}`} />
                </div>

                {isHrmsSubmenuOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 animate-in slide-in-from-top-1 duration-150">
                    <Link
                      href="/hrms"
                      className={`block px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        pathname === '/hrms'
                          ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {locale === 'hi' ? 'एचआरएमएस ओवरव्यू' : 'HRMS Overview'}
                    </Link>
                    <Link
                      href="/salary"
                      className={`block px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        pathname === '/salary'
                          ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {userRole === 'SUPER_ADMIN'
                        ? (locale === 'hi' ? 'वेतन रजिस्टर' : 'Salary Register')
                        : (locale === 'hi' ? 'वेतन पर्ची' : 'Salary Slips')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Administration Section (Visible strictly to Super Admin only) */}
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

                {/* Nested User & Teams Submenu */}
                <div className="space-y-1 pt-0.5">
                  <div
                    onClick={() => setIsUsersSubmenuOpen(!isUsersSubmenuOpen)}
                    className={`w-full group cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isUsersActive
                        ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent text-sky-600 dark:text-sky-400 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-sm pl-2.5'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className={`w-4 h-4 transition-transform group-hover:scale-110 ${isUsersActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>User & Teams</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUsersSubmenuOpen ? 'rotate-180 text-sky-500' : 'text-slate-400'}`} />
                  </div>

                  {isUsersSubmenuOpen && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 animate-in slide-in-from-top-1 duration-150">
                      <Link
                        href="/admin/users"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/users'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                          <span>Staff Directory</span>
                        </div>
                        {pathname === '/admin/users' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/users/roles"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/users/roles'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          <span>Roles & Permissions</span>
                        </div>
                        {pathname === '/admin/users/roles' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </Link>
                    </div>
                  )}
                </div>

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
                          <span>Income Profiles</span>
                        </div>
                        {pathname === '/admin/profiles' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/customer-types"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/customer-types'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          <span>Customer Types</span>
                        </div>
                        {pathname === '/admin/customer-types' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/property-scopes"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/property-scopes'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          <span>Property Scopes</span>
                        </div>
                        {pathname === '/admin/property-scopes' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/workflow-stages"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/workflow-stages'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                          <span>Workflow Stages</span>
                        </div>
                        {pathname === '/admin/workflow-stages' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </Link>

                      <Link
                        href="/admin/case-statuses"
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === '/admin/case-statuses'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span>Case Filing Statuses</span>
                        </div>
                        {pathname === '/admin/case-statuses' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
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
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('crm_user_role');
                  localStorage.removeItem('crm_user_name');
                  localStorage.removeItem('crm_user_avatar');
                }
                signOut({ callbackUrl: '/login' });
              }}
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

  // If on login or auth pages, render clean full-screen content without sidebar/header (after all hooks have executed)
  if (pathname === '/login' || pathname.startsWith('/forgot-password')) {
    return <>{children}</>;
  }

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
          <GoogleTranslateTopBar />
          <NotificationBell />
          {userRole !== 'CHANNEL' && (
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
            {userRole !== 'CHANNEL' && (
              <>
                <AttendancePunchTracker variant="header" />
                <BirthdayTopWidget />
              </>
            )}

            <GoogleTranslateTopBar />
            <NotificationBell />

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
