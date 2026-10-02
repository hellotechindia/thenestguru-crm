import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUserAccessCase } from '@/lib/case-filter';
import CaseDetailTracker from '@/components/CaseDetailTracker';
import CaseFollowUpTimeline from '@/components/CaseFollowUpTimeline';

export const revalidate = 0;

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const userAccessPermission = (session.user as any).accessPermission || 'EDIT';

  const caseData = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      checklistItems: {
        orderBy: { category: 'asc' },
      },
      assignedTeam: true,
      followUps: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!caseData) {
    notFound();
  }

  const hasAccess = await canUserAccessCase(userId, userRole, caseData);
  if (!hasAccess) {
    redirect('/cases');
  }

  const banks = await prisma.bankConfig.findMany({ orderBy: { bankName: 'asc' } });
  const states = await prisma.stateConfig.findMany({
    include: { cities: { orderBy: { name: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  const caseStatuses = await prisma.caseStatusMaster.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  let parsedCoApplicants: any[] = [];
  try {
    if (caseData.coApplicantsData) {
      parsedCoApplicants = JSON.parse(caseData.coApplicantsData);
    }
  } catch (e) {
    parsedCoApplicants = [];
  }

  let parsedReferences: any[] = [];
  try {
    if (caseData.referencesData) {
      parsedReferences = JSON.parse(caseData.referencesData);
    }
  } catch (e) {
    parsedReferences = [];
  }

  const toIsoDateStr = (val: any): string => {
    if (!val) return '';
    try {
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const toIsoDateTimeStr = (val: any): string => {
    if (!val) return new Date().toISOString();
    try {
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const formattedCase = {
    id: caseData.id,
    clientName: caseData.clientName || '',
    mobile: caseData.mobile || '',
    email: caseData.email || '',
    clientState: caseData.clientState || '',
    clientCity: caseData.clientCity || '',
    clientDob: toIsoDateStr(caseData.clientDob),
    product: caseData.product || '',
    customerType: caseData.customerType || '',
    propertyType: caseData.propertyType || '',
    propertyState: caseData.propertyState || '',
    propertyCity: caseData.propertyCity || '',
    coApplicantCount: caseData.coApplicantCount || 0,
    coApplicantsData: parsedCoApplicants,
    motherName: caseData.motherName || '',
    spouseName: caseData.spouseName || '',
    dojCompany: toIsoDateStr(caseData.dojCompany),
    totalExperienceYears: caseData.totalExperienceYears || '',
    residenceYears: caseData.residenceYears || '',
    educationQualification: '',
    referencesData: parsedReferences,
    stage: caseData.stage || 1,
    status: caseData.status || '',
    assignedTeamName: caseData.assignedTeam?.name,
    createdAt: toIsoDateTimeStr(caseData.createdAt),
    updatedAt: toIsoDateTimeStr(caseData.updatedAt),
    incomeTypes: caseData.incomeTypes
      ? (() => {
          try {
            return JSON.parse(caseData.incomeTypes);
          } catch {
            return [];
          }
        })()
      : [],
    checklistItems: (caseData.checklistItems || []).map((item) => ({
      id: item.id,
      category: item.category || 'General',
      label: item.label || '',
      appliesTo: item.appliesTo || 'Applicant',
      personName: item.personName || '',
      status: item.status || 'Pending',
      remark: item.remark || '',
      documentUrl: item.documentUrl || '',
      stage: item.stage || 1,
      requireOnedrive: item.requireOnedrive !== false,
      requireRemark: item.requireRemark === true,
      remarkPlaceholder: item.remarkPlaceholder || '',
      bankName: item.bankName || '',
      monthName: item.monthName || '',
      financialYear: item.financialYear || '',
      documentDate: toIsoDateStr(item.documentDate),
      periodDetails: item.periodDetails || '',
      startDate: toIsoDateStr(item.startDate),
      endDate: toIsoDateStr(item.endDate),
      extraDetails: item.extraDetails || '',
    })),
  };

  const formattedFollowUps = (caseData.followUps || []).map((f) => ({
    id: f.id,
    stage: f.stage,
    stageName: f.stageName,
    status: f.status,
    remarks: f.remarks,
    createdByName: f.createdByName,
    createdAt: toIsoDateTimeStr(f.createdAt),
  }));

  const isReadOnly = userAccessPermission === 'VIEW' || userRole === 'CHANNEL';

  return (
    <div className="space-y-8">
      <CaseDetailTracker
        caseData={formattedCase}
        userRole={userRole}
        userAccessPermission={userAccessPermission}
        banks={banks}
        states={states}
      />

      {/* Case File Follow-Up & Timeline Log */}
      <div id="case-history-timeline" className="scroll-mt-6">
        <CaseFollowUpTimeline
          caseId={caseData.id}
          initialFollowUps={formattedFollowUps}
          isReadOnly={isReadOnly}
          statusList={caseStatuses.map((s) => s.name)}
        />
      </div>
    </div>
  );
}
