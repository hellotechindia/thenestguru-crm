import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SalaryRegisterClient from '@/components/SalaryRegisterClient';

export const revalidate = 0;

export default async function SalaryRegisterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const currentUserId = (session.user as any).id;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Strict Channel Partner protection: Channel users have no access to salary ledger
  if (userRole === 'CHANNEL') {
    redirect('/dashboard');
  }

  const userSelect = {
    id: true,
    name: true,
    role: true,
    email: true,
    phone: true,
    pan: true,
    bankName: true,
    bankAccountNo: true,
    bankIfsc: true,
    dateOfJoining: true,
    jobRole: true,
    department: true,
    currentCTC: true,
    monthlySalary: true,
    employmentType: true,
    team: { select: { name: true } },
  };

  let users: any[] = [];
  let salaryRecords: any[] = [];

  const [crmSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { id: 'default' } }),
  ]);

  const branding = {
    crmName: crmSetting?.crmName || 'TheNestGuru',
    crmTagline: crmSetting?.crmTagline || 'Loan Processing Desk',
    crmLogoUrl: crmSetting?.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png',
  };

  let activeCases: any[] = [];

  if (isSuperAdmin) {
    [users, salaryRecords, activeCases] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { notIn: ['SUPER_ADMIN', 'CHANNEL'] },
          parentChannelId: null,
        },
        select: userSelect,
        orderBy: { name: 'asc' },
      }),
      prisma.salaryRecord.findMany({
        include: {
          user: { select: userSelect },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.case.findMany({
        select: {
          id: true,
          clientName: true,
          product: true,
          stage: true,
          salesUserId: true,
          operationUserId: true,
          createdById: true,
        },
        orderBy: { clientName: 'asc' },
        take: 100,
      }),
    ]);
  } else {
    // Regular staff can view their own historical paid salary records (not current unfinalized drafts)
    salaryRecords = await prisma.salaryRecord.findMany({
      where: {
        userId: currentUserId,
        paymentStatus: 'PAID',
      },
      include: {
        user: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {isSuperAdmin ? 'Employee Salary Register & Payroll Ledger' : 'My Salary Slips & Payment History'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isSuperAdmin
            ? 'Super Admin Console: Manage staff monthly compensation, allowances, deductions, and payment statuses'
            : 'View, verify and download your official historical monthly salary slips'}
        </p>
      </div>

      <SalaryRegisterClient
        isSuperAdmin={isSuperAdmin}
        staffUsers={users}
        initialRecords={salaryRecords}
        crmBranding={branding}
        activeCases={activeCases}
      />
    </div>
  );
}
