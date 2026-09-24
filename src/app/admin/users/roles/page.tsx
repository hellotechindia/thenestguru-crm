import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getRolesMatrixAction } from '@/app/actions';
import RolesPermissionsManager from '@/components/RolesPermissionsManager';
import Link from 'next/link';
import { Users, ChevronRight, ShieldCheck } from 'lucide-react';

export const revalidate = 0;

export default async function AdminRolesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const { roles, userCounts } = await getRolesMatrixAction();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
            <Link href="/admin/users" className="hover:text-sky-500 transition-colors flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> User & Teams
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 dark:text-slate-200 font-bold">Roles & Permissions</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-sky-500" />
            User Roles & Permissions Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Super Admin master for defining organization roles, access levels, and granular module permissions
          </p>
        </div>
      </div>

      <RolesPermissionsManager initialRoles={roles || []} userCounts={userCounts || {}} />
    </div>
  );
}
