import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserManagementClient from '@/components/UserManagementClient';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const currentUserId = (session.user as any).id;

  // Filter out SUPER_ADMIN users so Super Admin doesn't appear in the staff/team operations list
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'SUPER_ADMIN' },
    },
    include: { team: true },
    orderBy: { createdAt: 'desc' },
  });

  const teams = await prisma.team.findMany({
    include: { members: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">User & Team Management</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Super Admin Panel: Manage operations team members, assign channel/sales/operation roles, edit access, and organize teams
        </p>
      </div>

      <UserManagementClient users={users} teams={teams} currentUserId={currentUserId} />
    </div>
  );
}
