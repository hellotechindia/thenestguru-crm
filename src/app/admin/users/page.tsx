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

  const users = await prisma.user.findMany({
    include: { team: true },
    orderBy: { createdAt: 'desc' },
  });

  const teams = await prisma.team.findMany({
    include: { members: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">User & Team Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Super Admin Panel: Create operations teams and assign team member roles
        </p>
      </div>

      <UserManagementClient users={users} teams={teams} />
    </div>
  );
}
