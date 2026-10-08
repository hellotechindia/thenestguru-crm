import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import ChannelPartnerDirectoryClient from '@/components/ChannelPartnerDirectoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ChannelPartnerDirectoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  // Channel accounts have no access to partner management
  if (userRole === 'CHANNEL') {
    redirect('/dashboard');
  }

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { isTeamLeader: true, role: true },
  });
  const isTeamLeader = Boolean(userRecord?.isTeamLeader);

  // Fetch all Channel Partners
  const channelPartners = await prisma.user.findMany({
    where: { role: 'CHANNEL' },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      address: true,
      jobRole: true,
      dob: true,
      accessPermission: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff Directory
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
            </span>
            <span>Channel Partner Directory</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage channel partners, brokerage associates, and view-only client sourcing partners
          </p>
        </div>
      </div>

      <ChannelPartnerDirectoryClient
        initialPartners={channelPartners as any}
        isSuperAdmin={isSuperAdmin}
        isTeamLeader={isTeamLeader}
      />
    </div>
  );
}
