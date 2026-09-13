import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChecklistTemplateEditor from '@/components/ChecklistTemplateEditor';

export const revalidate = 0;

export default async function ChecklistTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const categories = await prisma.checklistCategory.findMany({
    include: {
      items: {
        orderBy: { stage: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dynamic Checklist Template Engine</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Data-driven checklist matrix: Manage rules, property scopes, and processing stages (1 to 4) without code changes
        </p>
      </div>

      <ChecklistTemplateEditor categories={categories} />
    </div>
  );
}
