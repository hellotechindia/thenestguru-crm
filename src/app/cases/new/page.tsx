import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CaseIntakeForm from '@/components/CaseIntakeForm';
import { prisma } from '@/lib/prisma';

export default async function NewCasePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const teams = await prisma.team.findMany();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">New Case Intake Form</h1>
        <p className="text-xs text-slate-400 mt-1">
          Select product parameters to auto-generate a dynamic document checklist for this client file
        </p>
      </div>

      <CaseIntakeForm teams={teams} />
    </div>
  );
}
