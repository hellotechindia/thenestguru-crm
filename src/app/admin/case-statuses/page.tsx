import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CaseStatusMasterManager from '@/components/CaseStatusMasterManager';
import Link from 'next/link';
import { Tag, ChevronRight, FileCheck2 } from 'lucide-react';

export const revalidate = 0;

export default async function AdminCaseStatusesPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session?.user || userRole === 'CHANNEL') {
    redirect('/dashboard');
  }

  const statuses = await prisma.caseStatusMaster.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
            <Link
              href="/admin/checklist-templates"
              className="hover:text-sky-500 transition-colors flex items-center gap-1"
            >
              <FileCheck2 className="w-3.5 h-3.5" /> Checklist Matrix
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 dark:text-slate-200 font-bold">Overall Case Statuses</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Tag className="w-7 h-7 text-amber-500" />
            Overall Case Statuses Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dynamically configure case drop-down statuses, custom color branding, display order, and pipeline categories.
          </p>
        </div>
      </div>

      <CaseStatusMasterManager initialStatuses={statuses} />
    </div>
  );
}
