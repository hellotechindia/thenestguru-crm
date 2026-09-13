import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AddFunctionalityClient from '@/components/AddFunctionalityClient';

export const revalidate = 0;

export default async function AdminFunctionalityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const banks = await prisma.bankConfig.findMany({ orderBy: { bankName: 'asc' } });
  const states = await prisma.stateConfig.findMany({ orderBy: { name: 'asc' } });
  const cases = await prisma.case.findMany({
    select: { id: true, clientName: true, product: true, status: true },
    orderBy: { createdAt: 'desc' },
  });
  const revenues = await prisma.revenueRecord.findMany({
    include: { case: true },
    orderBy: { createdAt: 'desc' },
  });
  const expenses = await prisma.expenseRecord.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Add Functionality & Settings Hub
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure Banks (salary slip months), States, Revenue records, and Expense entries
        </p>
      </div>

      <AddFunctionalityClient
        banks={banks}
        states={states}
        cases={cases}
        revenues={revenues}
        expenses={expenses}
      />
    </div>
  );
}
