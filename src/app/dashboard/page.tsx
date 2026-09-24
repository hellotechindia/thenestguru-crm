import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import AttendancePunchTracker from '@/components/AttendancePunchTracker';
import DashboardStickyNotes from '@/components/DashboardStickyNotes';
import ChannelSubAccountsWidget, { ChannelDashboardTopAction } from '@/components/ChannelSubAccountsWidget';
import Link from 'next/link';
import { PlusCircle, Sliders, Users } from 'lucide-react';

export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const currentUserId = (session.user as any).id;

  // Filter cases for channel partner
  let caseWhere: any = {};
  if (userRole === 'CHANNEL') {
    const currentDbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { parentChannelId: true },
    });
    const effectiveChannelId = currentDbUser?.parentChannelId || currentUserId;
    caseWhere = {
      OR: [
        { channelUserId: currentUserId },
        { channelUserId: effectiveChannelId },
      ],
    };
  }

  const [cases, revenues, expenses, states, systemSetting, selfTasks, childAccounts] = await Promise.all([
    prisma.case.findMany({
      where: caseWhere,
      include: {
        checklistItems: true,
        assignedTeam: true,
        revenues: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.revenueRecord.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.expenseRecord.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.stateConfig.findMany({ orderBy: { name: 'asc' } }),
    prisma.systemSetting.findUnique({ where: { id: 'default' } }),
    userRole !== 'CHANNEL'
      ? prisma.task.findMany({
          where: {
            assignedToId: currentUserId,
            status: { not: 'CANCELLED' },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 12,
        })
      : Promise.resolve([]),
    userRole === 'CHANNEL'
      ? prisma.user.findMany({
          where: { parentChannelId: currentUserId },
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
        })
      : Promise.resolve([]),
  ]);

  const dashboardConfig = systemSetting?.dashboardConfig || null;

  const formattedCases = cases.map((c) => {
    const receivedCount = c.checklistItems.filter(
      (item) => item.status === 'Received' || item.status === 'Not Applicable'
    ).length;

    const caseRevenue = c.revenues.reduce((sum, r) => sum + r.amount, 0);

    return {
      id: c.id,
      clientName: c.clientName,
      mobile: c.mobile,
      email: c.email,
      clientState: c.clientState || 'Unassigned',
      product: c.product,
      customerType: c.customerType,
      propertyType: c.propertyType,
      stage: c.stage,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      stage1CompletedAt: c.stage1CompletedAt ? c.stage1CompletedAt.toISOString() : null,
      stage2CompletedAt: c.stage2CompletedAt ? c.stage2CompletedAt.toISOString() : null,
      stage3CompletedAt: c.stage3CompletedAt ? c.stage3CompletedAt.toISOString() : null,
      stage4CompletedAt: c.stage4CompletedAt ? c.stage4CompletedAt.toISOString() : null,
      checklistCount: c.checklistItems.length,
      receivedCount,
      revenueAmount: caseRevenue,
      assignedTeamName: c.assignedTeam?.name,
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            {userRole === 'CHANNEL' ? 'Channel Partner Portal & Case Pipeline' : 'Loan Processing Analytics & Dashboard'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {userRole === 'CHANNEL'
              ? 'Real-time status tracking for your referred client cases and sub-agent credentials'
              : 'Real-time pipeline metrics, Stage-wise speed performance, Revenue & Expense analysis'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userRole === 'SUPER_ADMIN' && (
            <Link
              href="/admin/functionality"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <Sliders className="w-4 h-4 text-sky-500" /> Add Functionality
            </Link>
          )}

          {userRole === 'CHANNEL' && (
            <Link
              href="/sub-accounts"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Users className="w-4 h-4" /> Manage Child IDs
            </Link>
          )}

          {userRole !== 'CHANNEL' && (
            <Link
              href="/cases/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" /> New Case Intake
            </Link>
          )}
        </div>
      </div>

      {/* HRMS Daily Attendance Punch Tracker (Staff & Admins Only) */}
      {userRole !== 'CHANNEL' && <AttendancePunchTracker variant="dashboard" />}

      {/* Staff Personal Sticky Notes & Eisenhower Quick-Pad */}
      {userRole !== 'CHANNEL' && (
        <DashboardStickyNotes
          initialTasks={JSON.parse(JSON.stringify(selfTasks))}
          currentUserId={currentUserId}
        />
      )}

      <DashboardAnalytics
        cases={formattedCases}
        revenues={revenues}
        expenses={expenses}
        states={states}
        userRole={userRole}
        initialConfig={dashboardConfig}
      />
    </div>
  );
}

