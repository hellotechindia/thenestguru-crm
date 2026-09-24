import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChannelSubAccountsWidget from '@/components/ChannelSubAccountsWidget';

export const revalidate = 0;

export const metadata = {
  title: 'Child IDs Directory | TheNestGuru CRM',
  description: 'Manage Channel Partner delegated child accounts and view-only logins',
};

export default async function SubAccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  // Only CHANNEL or SUPER_ADMIN can access
  if (userRole !== 'CHANNEL' && userRole !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  // If user is a child channel, find root parent channel ID
  let effectiveParentId = userId;
  if (userRole === 'CHANNEL') {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentChannelId: true },
    });
    effectiveParentId = dbUser?.parentChannelId || userId;
  }

  const childAccounts = await prisma.user.findMany({
    where: { parentChannelId: effectiveParentId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      accessPermission: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-[1600px] mx-auto py-2 space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Child IDs & Sub-Accounts Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage delegated view-only logins for branch staff, operators, and field associates
        </p>
      </div>

      <ChannelSubAccountsWidget
        initialChildAccounts={childAccounts.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        parentChannelName={session.user.name || undefined}
      />
    </div>
  );
}
