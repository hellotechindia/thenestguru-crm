import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CaseDetailTracker from '@/components/CaseDetailTracker';

export const revalidate = 0;

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;

  const caseData = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      checklistItems: {
        orderBy: { category: 'asc' },
      },
      assignedTeam: true,
    },
  });

  if (!caseData) {
    notFound();
  }

  const formattedCase = {
    id: caseData.id,
    clientName: caseData.clientName,
    mobile: caseData.mobile,
    email: caseData.email,
    product: caseData.product,
    customerType: caseData.customerType,
    propertyType: caseData.propertyType,
    coApplicantCount: caseData.coApplicantCount,
    stage: caseData.stage,
    status: caseData.status,
    assignedTeamName: caseData.assignedTeam?.name,
    checklistItems: caseData.checklistItems.map((item) => ({
      id: item.id,
      category: item.category,
      label: item.label,
      appliesTo: item.appliesTo,
      status: item.status,
      remark: item.remark,
      documentUrl: item.documentUrl,
      stage: item.stage,
    })),
  };

  return <CaseDetailTracker caseData={formattedCase} userRole={userRole} />;
}
