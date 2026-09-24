import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import WorkflowStagesMasterManager from '@/components/WorkflowStagesMasterManager';
import Link from 'next/link';
import { Layers, ChevronRight, FileCheck2 } from 'lucide-react';

export const revalidate = 0;

export default async function AdminWorkflowStagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const stages = await prisma.workflowStageMaster.findMany({
    orderBy: { stageNumber: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
            <Link href="/admin/checklist-templates" className="hover:text-sky-500 transition-colors flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5" /> Checklist Matrix
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 dark:text-slate-200 font-bold">Workflow Stages</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Layers className="w-7 h-7 text-sky-500" />
            Dynamic Workflow Stages Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure stage numbers, titles, custom branding colors, and stage-linked automated staff incentives
          </p>
        </div>
      </div>

      <WorkflowStagesMasterManager initialStages={stages} />
    </div>
  );
}
