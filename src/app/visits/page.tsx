import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import VisitTrackerClient from '@/components/VisitTrackerClient';

export const revalidate = 0;

export default async function VisitsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  // Channel accounts have no visit tracker access
  if (userRole === 'CHANNEL') {
    redirect('/dashboard');
  }

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Role-based visits query: Super Admin sees all, Staff sees their own assigned visits
  const whereCondition = isSuperAdmin ? {} : { staffUserId: userId };

  const [visits, staffUsers, activeCases] = await Promise.all([
    prisma.visitRecord.findMany({
      where: whereCondition,
      include: {
        staff: { select: { id: true, name: true, role: true } },
        case: { select: { id: true, clientName: true, product: true } },
        followUps: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { visitDate: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: { not: 'SUPER_ADMIN' } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.case.findMany({
      select: { id: true, clientName: true, mobile: true, product: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Client & Property Visit Tracker
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Track, schedule, and verify property inspections, client document collections, and in-person discussions
        </p>
      </div>

      <VisitTrackerClient
        initialVisits={visits as any}
        staffUsers={staffUsers}
        activeCases={activeCases}
        currentUserId={userId}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
