import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HRMSDeskClient from '@/components/HRMSDeskClient';

export const revalidate = 0;

export default async function HRMSPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  // Channel accounts have no HRMS desk access
  if ((session.user as any).role === 'CHANNEL') {
    redirect('/dashboard');
  }

  const currentUserId = (session.user as any).id;
  const userName = session.user.name || 'Staff Member';
  const userRole = (session.user as any).role || 'TEAM_MEMBER';

  const staffList = await prisma.user.findMany({
    where: {
      role: { not: 'CHANNEL' },
    },
    select: {
      id: true,
      name: true,
      role: true,
      jobRole: true,
      department: true,
      monthlySalary: true,
      currentCTC: true,
      employmentType: true,
      email: true,
      phone: true,
      team: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <HRMSDeskClient
        currentUserId={currentUserId}
        userName={userName}
        userRole={userRole}
        staffList={staffList}
      />
    </div>
  );
}
