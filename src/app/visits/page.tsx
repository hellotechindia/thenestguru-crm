import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import VisitTrackerClient from '@/components/VisitTrackerClient';

export const dynamic = 'force-dynamic';
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

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { isTeamLeader: true, role: true },
  });
  const isTeamLeader = Boolean(userRecord?.isTeamLeader);

  // Role-based visits query: Super Admin and Team Leader can see all sales visits to combine by builder
  const whereCondition = (isSuperAdmin || isTeamLeader) ? {} : { staffUserId: userId };

  let [visits, staffUsers, activeCases, builders, channelPartners] = await Promise.all([
    prisma.visitRecord.findMany({
      where: whereCondition,
      include: {
        staff: { select: { id: true, name: true, role: true } },
        case: { select: { id: true, clientName: true, product: true } },
        followUps: { orderBy: { createdAt: 'desc' } },
        builder: true,
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
    prisma.builder.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { visits: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'CHANNEL' },
      select: { id: true, name: true, phone: true, email: true, address: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Auto seed default reputed builders if table is empty
  if (builders.length === 0) {
    const defaultBuilders = [
      { name: 'DLF Limited', contactPerson: 'Sales Desk', phone: '011-45678900', approvedBanks: 'SBI, HDFC, ICICI, Axis Bank' },
      { name: 'Godrej Properties', contactPerson: 'Corporate Sales', phone: '022-68888888', approvedBanks: 'HDFC, SBI, ICICI, Kotak' },
      { name: 'ATS Homekraft', contactPerson: 'Project Coordinator', phone: '0120-7111111', approvedBanks: 'SBI, HDFC, PNB' },
      { name: 'Tata Housing', contactPerson: 'Customer Relations', phone: '1800-209-6660', approvedBanks: 'SBI, HDFC, ICICI, BoB' },
      { name: 'Prestige Group', contactPerson: 'Sales Operations', phone: '080-25591080', approvedBanks: 'HDFC, ICICI, SBI' },
      { name: 'M3M India', contactPerson: 'Site Incharge', phone: '0124-4777333', approvedBanks: 'ICICI, Axis, HDFC, SBI' },
      { name: 'Sobha Developers', contactPerson: 'Sales Office', phone: '080-49320000', approvedBanks: 'SBI, HDFC, Canara Bank' },
      { name: 'Gaursons India', contactPerson: 'Helpdesk', phone: '0120-4343333', approvedBanks: 'SBI, HDFC, PNB, BoB' },
    ];
    for (const b of defaultBuilders) {
      await prisma.builder.upsert({
        where: { name: b.name },
        update: {},
        create: b,
      });
    }
    builders = await prisma.builder.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { visits: true } },
      },
    });
  }

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
        builders={builders as any}
        currentUserId={userId}
        isSuperAdmin={isSuperAdmin}
        isTeamLeader={isTeamLeader}
        channelPartners={channelPartners as any}
      />
    </div>
  );
}
