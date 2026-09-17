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
  const userAccessPermission = (session.user as any).accessPermission || 'EDIT';

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

  const banks = await prisma.bankConfig.findMany({ orderBy: { bankName: 'asc' } });
  const states = await prisma.stateConfig.findMany({
    include: { cities: { orderBy: { name: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  const formattedCase = {
    id: caseData.id,
    clientName: caseData.clientName,
    mobile: caseData.mobile,
    email: caseData.email,
    clientState: caseData.clientState,
    clientCity: caseData.clientCity,
    clientDob: caseData.clientDob ? caseData.clientDob.toISOString().slice(0, 10) : '',
    product: caseData.product,
    customerType: caseData.customerType,
    propertyType: caseData.propertyType,
    coApplicantCount: caseData.coApplicantCount,
    coApplicantsData: caseData.coApplicantsData ? JSON.parse(caseData.coApplicantsData) : [],
    motherName: caseData.motherName || '',
    spouseName: caseData.spouseName || '',
    dojCompany: caseData.dojCompany ? caseData.dojCompany.toISOString().slice(0, 10) : '',
    totalExperienceYears: caseData.totalExperienceYears || '',
    residenceYears: caseData.residenceYears || '',
    educationQualification: caseData.residenceYears || '',
    referencesData: caseData.referencesData ? JSON.parse(caseData.referencesData) : [],
    stage: caseData.stage,
    status: caseData.status,
    assignedTeamName: caseData.assignedTeam?.name,
    checklistItems: caseData.checklistItems.map((item) => ({
      id: item.id,
      category: item.category,
      label: item.label,
      appliesTo: item.appliesTo,
      status: item.status,
      remark: item.remark || '',
      documentUrl: item.documentUrl || '',
      stage: item.stage,
      requireOnedrive: item.requireOnedrive !== false,
      requireRemark: item.requireRemark === true,
      remarkPlaceholder: item.remarkPlaceholder || '',
      bankName: item.bankName || '',
      monthName: item.monthName || '',
      financialYear: item.financialYear || '',
      documentDate: item.documentDate ? item.documentDate.toISOString().slice(0, 10) : '',
      periodDetails: item.periodDetails || '',
      startDate: item.startDate ? item.startDate.toISOString().slice(0, 10) : '',
      endDate: item.endDate ? item.endDate.toISOString().slice(0, 10) : '',
      extraDetails: item.extraDetails || '',
    })),
  };

  return (
    <CaseDetailTracker
      caseData={formattedCase}
      userRole={userRole}
      userAccessPermission={userAccessPermission}
      banks={banks}
      states={states}
    />
  );
}
