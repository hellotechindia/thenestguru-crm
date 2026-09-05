import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import Link from 'next/link';
import { PlusCircle, RefreshCw } from 'lucide-react';

export const revalidate = 0; // Dynamic route

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const cases = await prisma.case.findMany({
    include: {
      checklistItems: true,
      assignedTeam: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedCases = cases.map((c) => {
    const receivedCount = c.checklistItems.filter(
      (item) => item.status === 'Received' || item.status === 'Not Applicable'
    ).length;

    return {
      id: c.id,
      clientName: c.clientName,
      mobile: c.mobile,
      email: c.email,
      product: c.product,
      customerType: c.customerType,
      propertyType: c.propertyType,
      stage: c.stage,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      checklistCount: c.checklistItems.length,
      receivedCount,
      assignedTeamName: c.assignedTeam?.name,
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Loan Processing Analytics & Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline metrics, dynamic checklist completion, and pivot breakdowns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cases/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Case Intake
          </Link>
        </div>
      </div>

      <DashboardAnalytics cases={formattedCases} />
    </div>
  );
}
