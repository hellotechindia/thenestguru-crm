'use client';

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
  UserCog
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  if (pathname === '/login') return null;

  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name || 'User';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Cases Directory', href: '/cases', icon: FolderCheck },
    { label: 'New Intake', href: '/cases/new', icon: PlusCircle },
  ];

  if (userRole === 'SUPER_ADMIN') {
    navItems.push(
      { label: 'User & Teams', href: '/admin/users', icon: Users },
      { label: 'Checklist Matrix', href: '/admin/checklist-templates', icon: FileCheck2 }
    );
  }

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-700/50 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between h-auto py-2.5 md:h-16 gap-2">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow border border-slate-200 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img
                src="https://thenestguru.com/thenestgurulogo.png"
                alt="NestGuru Logo"
                className="w-full h-full max-w-full max-h-full object-contain shrink-0"
              />
            </div>
            <div className="leading-none">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-sky-400 transition-colors flex items-center gap-1">
                NestGuru <span className="text-sky-400 font-light">Loan Desk</span>
              </span>
              <span className="block text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                Multi-Tenant Processing Hub
              </span>
            </div>
          </Link>

          {/* Navigation Links - Always visible across screen sizes */}
          <nav className="flex items-center gap-1 overflow-x-auto shrink py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Theme Toggle & User Profile Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Light / Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-amber-400 hover:text-amber-300 hover:bg-slate-700/80 transition-all shadow-sm shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-600" />}
            </button>

            {session?.user && (
              <div className="flex items-center gap-2 glass-panel px-2.5 py-1 rounded-lg border border-slate-700/50 shrink-0">
                <Link
                  href="/profile"
                  title="Edit Profile Settings"
                  className="flex items-center gap-1.5 hover:text-sky-400 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    {userRole === 'SUPER_ADMIN' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-white leading-tight truncate max-w-[110px]">
                      {userName}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          userRole === 'SUPER_ADMIN' ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'
                        }`}
                      />
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                        {userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Team Member'}
                      </span>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/profile"
                  title="Profile Settings"
                  className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded transition-colors ml-0.5 shrink-0"
                >
                  <UserCog className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors shrink-0"
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
