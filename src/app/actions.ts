'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can, UserContext } from '@/lib/permissions';
import { generateChecklistForCase } from '@/lib/checklist-engine';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { getTodayISTDate, evaluateUpcomingBirthday } from '@/lib/ist-time';
import { isValid10DigitPhone, isValidEmail, isValidName } from '@/lib/validations';

async function getAuthUser(): Promise<UserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as any).id,
    role: (session.user as any).role,
    name: session.user.name || 'Staff User',
    accessPermission: (session.user as any).accessPermission || 'EDIT',
    teamId: (session.user as any).teamId,
  };
}

// 1. Case Actions
export async function createCaseAction(formData: {
  clientName: string;
  mobile: string;
  email?: string;
  gender?: string;
  clientState?: string;
  clientCity?: string;
  clientDob?: string | Date | null;
  product: string;
  subProduct?: string;
  customerType: string;
  propertyType: string;
  propertyState?: string;
  propertyCity?: string;
  incomeTypes?: string[];
  coApplicantCount: number;
  coApplicantsData?: any[];
  channelUserId?: string;
  salesUserId?: string;
  operationUserId?: string;
  assignedTeamId?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'create', 'case')) throw new Error('Unauthorized');

  // Name, Phone & Email Validation
  if (!isValidName(formData.clientName)) {
    throw new Error('Client name must contain only alphabetic characters and spaces.');
  }
  if (!isValid10DigitPhone(formData.mobile)) {
    throw new Error('Client mobile number must be exactly 10 digits.');
  }
  if (formData.email && !isValidEmail(formData.email)) {
    throw new Error('Please enter a valid client email address.');
  }
  if (Array.isArray(formData.coApplicantsData)) {
    for (let i = 0; i < formData.coApplicantsData.length; i++) {
      const coApp = formData.coApplicantsData[i];
      if (coApp.name && !isValidName(coApp.name)) {
        throw new Error(`Co-Applicant ${i + 1} name must contain only alphabetic characters and spaces.`);
      }
      if (coApp.mobile && !isValid10DigitPhone(coApp.mobile)) {
        throw new Error(`Co-Applicant ${i + 1} mobile number must be exactly 10 digits.`);
      }
      if (coApp.email && !isValidEmail(coApp.email)) {
        throw new Error(`Co-Applicant ${i + 1} email address is invalid.`);
      }
    }
  }

  const newCase = await prisma.case.create({
    data: {
      clientName: formData.clientName,
      mobile: formData.mobile,
      email: formData.email || null,
      gender: formData.gender || null,
      clientState: formData.clientState || null,
      clientCity: formData.clientCity || null,
      clientDob: formData.clientDob ? new Date(formData.clientDob) : null,
      product: formData.product,
      subProduct: formData.subProduct || null,
      customerType: formData.customerType,
      propertyType: formData.propertyType,
      propertyState: formData.propertyState || null,
      propertyCity: formData.propertyCity || null,
      incomeTypes: formData.incomeTypes ? JSON.stringify(formData.incomeTypes) : null,
      coApplicantCount: formData.coApplicantCount,
      coApplicantsData: formData.coApplicantsData ? JSON.stringify(formData.coApplicantsData) : null,
      channelUserId: formData.channelUserId || null,
      salesUserId: formData.salesUserId || null,
      operationUserId: formData.operationUserId || null,
      createdById: user.id,
      assignedTeamId: formData.assignedTeamId || user.teamId || null,
      status: 'Pending Documents',
      stage: 1,
    },
  });

  // Initial follow-up entry
  await prisma.caseFollowUp.create({
    data: {
      caseId: newCase.id,
      stage: 1,
      stageName: 'Stage 1: Lead Intake & KYC',
      status: 'Pending Documents',
      remarks: 'Lead created successfully with initial intake details.',
      createdById: user.id,
      createdByName: (await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }))?.name || 'System',
    },
  });

  // Auto-generate dynamic checklist items (respecting person names, co-applicant income, property scopes, etc.)
  await generateChecklistForCase(
    newCase.id,
    formData.product,
    formData.customerType,
    formData.propertyType,
    formData.coApplicantCount,
    formData.coApplicantsData,
    user.id,
    {
      subProduct: formData.subProduct,
      clientName: formData.clientName,
      incomeTypes: formData.incomeTypes,
      propertyState: formData.propertyState,
      clientState: formData.clientState,
    }
  );

  revalidatePath('/cases');
  revalidatePath('/dashboard');

  if (user.role === 'CHANNEL') {
    await recordSystemNotification({
      title: 'New Lead Submitted by Channel',
      message: `${newCase.clientName} (${newCase.product}) submitted by ${user.name || 'Channel Partner'}.`,
      type: 'CASE_UPDATE',
      link: `/cases/${newCase.id}`,
      role: 'OPERATION',
    });
    await recordSystemNotification({
      title: 'Lead Registered Successfully',
      message: `Your file for ${newCase.clientName} (${newCase.product}) has been registered in the system.`,
      type: 'SUCCESS',
      link: `/cases/${newCase.id}`,
      userId: user.id,
    });
  } else {
    await recordSystemNotification({
      title: 'New Lead Created',
      message: `${newCase.clientName} (${newCase.product}) registered by ${user.name || 'Staff'}.`,
      type: 'CASE_UPDATE',
      link: `/cases/${newCase.id}`,
      role: 'OPERATION',
    });
  }

  return { success: true, caseId: newCase.id };
}

export async function updateCaseIntakeDetailsAction(
  caseId: string,
  data: {
    clientName: string;
    mobile: string;
    email?: string | null;
    gender?: string | null;
    clientState?: string | null;
    clientCity?: string | null;
    clientDob?: string | Date | null;
    product?: string;
    subProduct?: string | null;
    customerType?: string;
    incomeTypes?: string[] | string | null;
    propertyType?: string;
    propertyState?: string | null;
    propertyCity?: string | null;
    coApplicantCount?: number;
    coApplicantsData?: any[] | null;
    stage?: number;
    status?: string;
    assignedTeamId?: string | null;
    channelUserId?: string | null;
    salesUserId?: string | null;
    operationUserId?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!user || !can(user, 'update', 'case')) {
    return { success: false, error: 'Permission denied: Cannot edit case details.' };
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: { checklistItems: true },
  });
  if (!existingCase) {
    return { success: false, error: 'Case not found.' };
  }

  // Validate name, phone & email
  if (data.clientName !== undefined && !isValidName(data.clientName)) {
    return { success: false, error: 'Client name must contain only alphabets and spaces.' };
  }
  if (data.mobile !== undefined && !isValid10DigitPhone(data.mobile)) {
    return { success: false, error: 'Client mobile number must be exactly 10 digits.' };
  }
  if (data.email && !isValidEmail(data.email)) {
    return { success: false, error: 'Please enter a valid client email address.' };
  }
  if (Array.isArray(data.coApplicantsData)) {
    for (let i = 0; i < data.coApplicantsData.length; i++) {
      const coApp = data.coApplicantsData[i];
      if (coApp.name && !isValidName(coApp.name)) {
        return { success: false, error: `Co-Applicant ${i + 1} name must contain only alphabets and spaces.` };
      }
      if (coApp.mobile && !isValid10DigitPhone(coApp.mobile)) {
        return { success: false, error: `Co-Applicant ${i + 1} mobile number must be exactly 10 digits.` };
      }
      if (coApp.email && !isValidEmail(coApp.email)) {
        return { success: false, error: `Co-Applicant ${i + 1} email address is invalid.` };
      }
    }
  }

  const now = new Date();
  const timestampUpdates: any = {};
  if (data.stage !== undefined && data.stage !== existingCase.stage) {
    if (data.stage === 1 && !existingCase.stage1CompletedAt) timestampUpdates.stage1CompletedAt = now;
    if (data.stage === 2 && !existingCase.stage2CompletedAt) timestampUpdates.stage2CompletedAt = now;
    if (data.stage === 3 && !existingCase.stage3CompletedAt) timestampUpdates.stage3CompletedAt = now;
    if (data.stage === 4 && !existingCase.stage4CompletedAt) timestampUpdates.stage4CompletedAt = now;
  }

  const newCoAppCount = data.coApplicantCount !== undefined ? data.coApplicantCount : existingCase.coApplicantCount;
  const newProduct = data.product || existingCase.product;
  const newCustomerType = data.customerType || existingCase.customerType;
  const newPropertyType = data.propertyType || existingCase.propertyType;

  // Handle co-applicant checklist items sync
  if (data.coApplicantCount !== undefined && data.coApplicantCount < existingCase.coApplicantCount) {
    // If reduced, delete extra co-applicant checklist items
    for (let i = data.coApplicantCount + 1; i <= existingCase.coApplicantCount; i++) {
      await prisma.caseChecklistItem.deleteMany({
        where: {
          caseId,
          appliesTo: { contains: `Co-Applicant ${i}` },
        },
      });
    }
  } else if (data.coApplicantCount !== undefined && data.coApplicantCount > existingCase.coApplicantCount) {
    // If increased, generate checklist items for newly added co-applicants using the robust condition engine
    const rawExistingItems = await prisma.caseChecklistItem.findMany({
      where: { caseId },
      select: { label: true, appliesTo: true },
    });

    let activeIncomeTypes: string[] = [];
    if (data.incomeTypes) {
      activeIncomeTypes = Array.isArray(data.incomeTypes) ? data.incomeTypes : [data.incomeTypes];
    } else if (existingCase.incomeTypes) {
      try {
        activeIncomeTypes = JSON.parse(existingCase.incomeTypes);
      } catch {
        activeIncomeTypes = [newCustomerType];
      }
    }

    await generateChecklistForCase(
      caseId,
      newProduct,
      newCustomerType,
      newPropertyType,
      data.coApplicantCount,
      data.coApplicantsData,
      user.id,
      {
        subProduct: data.subProduct !== undefined ? data.subProduct : existingCase.subProduct,
        clientName: data.clientName || existingCase.clientName,
        incomeTypes: activeIncomeTypes,
        propertyState: data.propertyState || existingCase.propertyState,
        clientState: data.clientState || existingCase.clientState,
        existingItems: rawExistingItems,
      }
    );
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      clientName: data.clientName.trim(),
      mobile: data.mobile.trim(),
      email: data.email?.trim() || null,
      ...(data.gender !== undefined && { gender: data.gender || null }),
      clientState: data.clientState || null,
      clientCity: data.clientCity || null,
      ...(data.clientDob !== undefined && { clientDob: data.clientDob ? new Date(data.clientDob) : null }),
      ...(data.product && { product: data.product }),
      ...(data.subProduct !== undefined && { subProduct: data.subProduct || null }),
      ...(data.customerType && { customerType: data.customerType }),
      ...(data.incomeTypes !== undefined && {
        incomeTypes: Array.isArray(data.incomeTypes)
          ? JSON.stringify(data.incomeTypes)
          : (typeof data.incomeTypes === 'string' ? data.incomeTypes : null),
      }),
      ...(data.propertyType && { propertyType: data.propertyType }),
      ...(data.propertyState !== undefined && { propertyState: data.propertyState || null }),
      ...(data.propertyCity !== undefined && { propertyCity: data.propertyCity || null }),
      ...(data.coApplicantCount !== undefined && { coApplicantCount: data.coApplicantCount }),
      ...(data.coApplicantsData !== undefined && {
        coApplicantsData: data.coApplicantsData ? JSON.stringify(data.coApplicantsData) : null,
      }),
      ...(data.stage !== undefined && { stage: data.stage }),
      ...(data.status && { status: data.status }),
      ...(data.assignedTeamId !== undefined && { assignedTeamId: data.assignedTeamId || null }),
      ...(data.channelUserId !== undefined && { channelUserId: data.channelUserId || null }),
      ...(data.salesUserId !== undefined && { salesUserId: data.salesUserId || null }),
      ...(data.operationUserId !== undefined && { operationUserId: data.operationUserId || null }),
      ...timestampUpdates,
    },
  });

  // Sync Co-Applicant names on existing checklist items if updated
  if (Array.isArray(data.coApplicantsData)) {
    for (let i = 0; i < data.coApplicantsData.length; i++) {
      const coApp = data.coApplicantsData[i];
      if (coApp && coApp.name) {
        const coAppName = coApp.name.trim();
        const targetSuffix = `(Co-Applicant ${i + 1})`;
        const oldLabel = `Co-Applicant ${i + 1}`;

        const itemsToUpdate = await prisma.caseChecklistItem.findMany({
          where: {
            caseId,
            OR: [
              { appliesTo: oldLabel },
              { appliesTo: { contains: targetSuffix } },
            ],
          },
        });
        for (const it of itemsToUpdate) {
          await prisma.caseChecklistItem.update({
            where: { id: it.id },
            data: {
              appliesTo: `${coAppName} ${targetSuffix}`,
              personName: coAppName,
            },
          });
        }
      }
    }
  }

  // Sync client name on applicant items if updated
  if (data.clientName && data.clientName.trim() !== existingCase.clientName) {
    const trimmedClientName = data.clientName.trim();
    const itemsToUpdate = await prisma.caseChecklistItem.findMany({
      where: {
        caseId,
        OR: [
          { appliesTo: 'Applicant' },
          { appliesTo: { contains: '(Applicant)' } },
        ],
      },
    });
    for (const it of itemsToUpdate) {
      await prisma.caseChecklistItem.update({
        where: { id: it.id },
        data: {
          appliesTo: `${trimmedClientName} (Applicant)`,
          personName: trimmedClientName,
        },
      });
    }
  }

  revalidatePath('/cases');
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');

  await recordSystemNotification({
    title: 'Case Details Updated',
    message: `${data.clientName} details modified by ${user.name || 'Staff'}.`,
    type: 'CASE_UPDATE',
    link: `/cases/${caseId}`,
  });

  return { success: true };
}

export async function updateChecklistItemAction(
  itemId: string,
  caseId: string,
  data: {
    status?: string;
    remark?: string;
    documentUrl?: string;
    bankName?: string;
    monthName?: string;
    financialYear?: string;
    documentDate?: string;
    periodDetails?: string;
    startDate?: string;
    endDate?: string;
    extraDetails?: string;
    historyRemark?: string;
  }
) {
  const user = await getAuthUser();
  if (!user || !can(user, 'update', 'checklist_item')) {
    throw new Error('Permission denied');
  }

  const existing = await prisma.caseChecklistItem.findUnique({
    where: { id: itemId },
  });

  await prisma.caseChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.remark !== undefined && { remark: data.remark }),
      ...(data.documentUrl !== undefined && { documentUrl: data.documentUrl }),
      ...(data.bankName !== undefined && { bankName: data.bankName }),
      ...(data.monthName !== undefined && { monthName: data.monthName }),
      ...(data.financialYear !== undefined && { financialYear: data.financialYear }),
      ...(data.documentDate ? { documentDate: new Date(data.documentDate) } : {}),
      ...(data.periodDetails !== undefined && { periodDetails: data.periodDetails }),
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      ...(data.extraDetails !== undefined && { extraDetails: data.extraDetails }),
      updatedById: user.id,
    },
  });

  // Automatically record to Case File Follow-Up / Timeline Log (History Data)
  if (existing) {
    const changes: string[] = [];
    if (data.status && data.status !== existing.status) {
      changes.push(`Status: ${existing.status} ➔ ${data.status}`);
    }
    if (data.remark !== undefined && data.remark !== existing.remark) {
      changes.push(data.remark ? `Remark: "${data.remark}"` : 'Remark cleared');
    }
    if (data.documentUrl !== undefined && data.documentUrl !== existing.documentUrl) {
      changes.push(data.documentUrl ? 'Drive Link Attached' : 'Drive Link Removed');
    }
    if (data.bankName !== undefined && data.bankName !== existing.bankName) {
      changes.push(`Bank: ${data.bankName}`);
    }
    if (data.periodDetails !== undefined && data.periodDetails !== existing.periodDetails) {
      changes.push(`Period: ${data.periodDetails}`);
    }

    if (changes.length > 0 || data.historyRemark) {
      const remarksText = `[${existing.label}] (${existing.appliesTo || 'Applicant'}): ${changes.join(', ')}${data.historyRemark ? ` - Note: ${data.historyRemark}` : ''}`;
      await prisma.caseFollowUp.create({
        data: {
          caseId,
          stage: existing.stage || 1,
          stageName: `Stage ${existing.stage || 1}: Document Checklist`,
          status: data.status || existing.status || 'Updated',
          remarks: remarksText,
          createdById: user.id,
          createdByName: user.name || 'Staff User',
        },
      });
    }
  }

  // Check if all items are received/NA to update case status
  const allItems = await prisma.caseChecklistItem.findMany({
    where: { caseId },
  });

  const pendingCount = allItems.filter((i) => i.status === 'Pending').length;
  if (pendingCount === 0 && allItems.length > 0) {
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'Ready for Submission' },
    });
  } else {
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'Pending Documents' },
    });
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/cases');
  revalidatePath('/dashboard');

  if (existing && data.status && data.status !== existing.status) {
    const matchedCase = await prisma.case.findUnique({ where: { id: caseId }, select: { clientName: true } });
    await recordSystemNotification({
      title: 'Document Checklist Updated',
      message: `${matchedCase?.clientName || 'Lead'}: "${existing.label}" marked as ${data.status} by ${user.name || 'Staff'}.`,
      type: 'INFO',
      link: `/cases/${caseId}`,
    });
  }

  return { success: true };
}

// Section-wise Bulk Save Action
export async function saveSectionChecklistItemsAction(
  caseId: string,
  items: Array<{
    id: string;
    status?: string;
    remark?: string;
    documentUrl?: string;
    bankName?: string;
    monthName?: string;
    financialYear?: string;
    documentDate?: string;
    periodDetails?: string;
    startDate?: string;
    endDate?: string;
    extraDetails?: string;
  }>,
  sectionHistoryNote?: string
) {
  const user = await getAuthUser();
  if (!user || !can(user, 'update', 'checklist_item')) {
    return { success: false, error: 'Permission denied: Read-only access.' };
  }

  for (const item of items) {
    await prisma.caseChecklistItem.update({
      where: { id: item.id },
      data: {
        ...(item.status && { status: item.status }),
        ...(item.remark !== undefined && { remark: item.remark }),
        ...(item.documentUrl !== undefined && { documentUrl: item.documentUrl }),
        ...(item.bankName !== undefined && { bankName: item.bankName }),
        ...(item.monthName !== undefined && { monthName: item.monthName }),
        ...(item.financialYear !== undefined && { financialYear: item.financialYear }),
        ...(item.documentDate ? { documentDate: new Date(item.documentDate) } : {}),
        ...(item.periodDetails !== undefined && { periodDetails: item.periodDetails }),
        ...(item.startDate ? { startDate: new Date(item.startDate) } : {}),
        ...(item.endDate ? { endDate: new Date(item.endDate) } : {}),
        ...(item.extraDetails !== undefined && { extraDetails: item.extraDetails }),
        updatedById: user.id,
      },
    });
  }

  // Record section bulk update in CaseFollowUp
  const firstItem = items[0]
    ? await prisma.caseChecklistItem.findUnique({ where: { id: items[0].id }, select: { category: true } })
    : null;
  const categoryName = firstItem?.category || 'Checklist Section';
  await prisma.caseFollowUp.create({
    data: {
      caseId,
      stage: 1,
      stageName: 'Stage 1: Bulk Section Update',
      status: 'Documents Saved',
      remarks: `Bulk saved ${items.length} items in category "${categoryName}"${sectionHistoryNote ? ` - Note: ${sectionHistoryNote}` : ''}.`,
      createdById: user.id,
      createdByName: user.name || 'Staff User',
    },
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
  return { success: true };
}

// Update Case Personal Information & References Action
export async function updateCasePersonalInfoAction(
  caseId: string,
  data: {
    motherName?: string;
    spouseName?: string;
    dojCompany?: string;
    totalExperienceYears?: string;
    residenceYears?: string;
    educationQualification?: string;
    referencesData?: any[];
  }
) {
  const user = await getAuthUser();
  if (!user || !can(user, 'update', 'case')) {
    return { success: false, error: 'Permission denied' };
  }

  if (data.motherName && !isValidName(data.motherName)) {
    return { success: false, error: 'Mother name must contain only alphabetic characters and spaces.' };
  }
  if (data.spouseName && !isValidName(data.spouseName)) {
    return { success: false, error: 'Spouse name must contain only alphabetic characters and spaces.' };
  }
  if (Array.isArray(data.referencesData)) {
    for (let rIdx = 0; rIdx < data.referencesData.length; rIdx++) {
      const ref = data.referencesData[rIdx];
      if (ref.name && !isValidName(ref.name)) {
        return { success: false, error: `Reference ${rIdx + 1} name must contain only alphabetic characters and spaces.` };
      }
    }
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      ...(data.motherName !== undefined && { motherName: data.motherName }),
      ...(data.spouseName !== undefined && { spouseName: data.spouseName }),
      ...(data.dojCompany ? { dojCompany: new Date(data.dojCompany) } : {}),
      ...(data.totalExperienceYears !== undefined && { totalExperienceYears: data.totalExperienceYears }),
      ...(data.educationQualification !== undefined
        ? { residenceYears: data.educationQualification }
        : data.residenceYears !== undefined
        ? { residenceYears: data.residenceYears }
        : {}),
      ...(data.referencesData ? { referencesData: JSON.stringify(data.referencesData) } : {}),
    },
  });

  // Auto-log to history timeline
  await prisma.caseFollowUp.create({
    data: {
      caseId,
      stage: 1,
      stageName: 'Stage 1: Personal Info & References',
      status: 'Profile Updated',
      remarks: `Updated Personal Info & Emergency References (Mother: ${data.motherName || 'N/A'}, Spouse: ${data.spouseName || 'N/A'}, Experience: ${data.totalExperienceYears || 'N/A'}).`,
      createdById: user.id,
      createdByName: user.name || 'Staff User',
    },
  });

  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}

// Update Case Status & Stage Timestamps Action
export async function updateCaseStatusAction(caseId: string, status: string, stage?: number) {
  const user = await getAuthUser();
  if (!user || !can(user, 'update', 'case')) {
    throw new Error('Permission denied');
  }

  const currentCase = await prisma.case.findUnique({ where: { id: caseId } });
  const now = new Date();

  const updateData: any = {
    status,
    ...(stage !== undefined && { stage }),
  };

  if (stage && currentCase) {
    if (stage === 1 && !currentCase.stage1CompletedAt) updateData.stage1CompletedAt = now;
    if (stage === 2 && !currentCase.stage2CompletedAt) updateData.stage2CompletedAt = now;
    if (stage === 3 && !currentCase.stage3CompletedAt) updateData.stage3CompletedAt = now;
    if (stage === 4 && !currentCase.stage4CompletedAt) updateData.stage4CompletedAt = now;
  }

  await prisma.case.update({
    where: { id: caseId },
    data: updateData,
  });

  // Auto-log status change to history timeline
  if (currentCase && (status !== currentCase.status || (stage && stage !== currentCase.stage))) {
    const stageNames: Record<number, string> = {
      1: 'Stage 1: Lead Intake & KYC',
      2: 'Stage 2: Document Verification & Eligibility',
      3: 'Stage 3: Bank File Login & Underwriting',
      4: 'Stage 4: Sanction & Disbursement',
    };
    const targetStage = stage || currentCase.stage || 1;
    await prisma.caseFollowUp.create({
      data: {
        caseId,
        stage: targetStage,
        stageName: stageNames[targetStage] || `Stage ${targetStage}`,
        status,
        remarks: `Case status changed from "${currentCase.status}" to "${status}"${stage && stage !== currentCase.stage ? ` (Workflow moved to Stage ${stage})` : ''}`,
        createdById: user.id,
        createdByName: user.name || 'Staff User',
      },
    });
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/cases');
  revalidatePath('/dashboard');

  if (currentCase) {
    const stageInfo = stage && stage !== currentCase.stage ? ` (Moved to Stage ${stage})` : '';
    await recordSystemNotification({
      title: 'Case Status Updated',
      message: `${currentCase.clientName}: Status changed to "${status}"${stageInfo} by ${user.name || 'Staff'}.`,
      type: 'CASE_UPDATE',
      link: `/cases/${caseId}`,
    });
  }

  return { success: true };
}

export async function deleteCaseAction(caseId: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'delete', 'case')) {
    return { success: false, error: 'Permission denied: Only Super Admin can delete cases.' };
  }

  await prisma.case.delete({
    where: { id: caseId },
  });

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteChecklistItemAction(itemId: string, caseId: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'delete', 'checklist_item')) {
    return { success: false, error: 'Permission denied: Only Super Admin can delete document line items.' };
  }

  await prisma.caseChecklistItem.delete({
    where: { id: itemId },
  });

  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}

// 2. User & Team Management Actions (Super Admin Only)
export async function createUserAction(data: {
  name: string;
  username: string;
  email?: string;
  password: string;
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission?: 'EDIT' | 'VIEW';
  teamId?: string;
  dob?: string;
  monthlySalary?: number;
  currentCTC?: number;
  jobRole?: string;
  department?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'user')) {
    return { success: false, error: 'Permission denied: Only Super Admin can create users.' };
  }

  if (!isValidName(data.name)) {
    return { success: false, error: 'User name must contain only alphabetic characters and spaces.' };
  }

  const cleanUsername = data.username ? data.username.trim().toLowerCase() : '';
  if (!cleanUsername) {
    return { success: false, error: 'Username is required and must be unique.' };
  }

  const existingUsername = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUsername) {
    return { success: false, error: 'Username is already taken. Please choose another username.' };
  }

  const cleanEmail = data.email && data.email.trim() !== '' ? data.email.trim().toLowerCase() : null;
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      name: data.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: data.role,
      accessPermission: data.accessPermission || 'EDIT',
      teamId: data.teamId || null,
      dob: data.dob && data.dob.trim() !== '' ? new Date(data.dob) : null,
      monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : (data.currentCTC ? Math.round(Number(data.currentCTC) / 12) : null),
      currentCTC: data.currentCTC ? Number(data.currentCTC) : (data.monthlySalary ? Math.round(Number(data.monthlySalary) * 12) : null),
      jobRole: data.jobRole?.trim() || null,
      department: data.department?.trim() || null,
    },
  });

  revalidatePath('/admin/users');
  revalidatePath('/salary');
  return { success: true };
}

export async function createTeamAction(name: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'team')) {
    return { success: false, error: 'Permission denied: Only Super Admin can create teams.' };
  }

  await prisma.team.create({
    data: { name },
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateUserAction(data: {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password?: string;
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission?: 'EDIT' | 'VIEW';
  teamId?: string;
  dob?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'user')) {
    return { success: false, error: 'Permission denied: Only Super Admin can edit users.' };
  }

  if (data.name !== undefined && !isValidName(data.name)) {
    return { success: false, error: 'User name must contain only alphabetic characters and spaces.' };
  }

  const updatePayload: any = {
    name: data.name.trim(),
    role: data.role,
    accessPermission: data.accessPermission || 'EDIT',
    teamId: data.teamId || null,
  };

  if (data.username !== undefined) {
    const cleanUsername = data.username.trim().toLowerCase();
    if (cleanUsername) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: data.id },
        },
      });
      if (existingUser) {
        return { success: false, error: 'Username is already taken by another user.' };
      }
      updatePayload.username = cleanUsername;
    }
  }

  if (data.email !== undefined) {
    const cleanEmail = data.email && data.email.trim() !== '' ? data.email.trim().toLowerCase() : null;
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    updatePayload.email = cleanEmail;
  }

  if (data.dob !== undefined) {
    updatePayload.dob = data.dob && data.dob.trim() !== '' ? new Date(data.dob) : null;
  }

  if (data.password && data.password.trim() !== '') {
    updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await prisma.user.update({
    where: { id: data.id },
    data: updatePayload,
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'user')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/users');
  return { success: true };
}

// 3. Add Functionality Management Actions (Super Admin Only)
export async function createBankConfigAction(bankName: string, requiredSalaryMonths: number) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.bankConfig.upsert({
    where: { bankName },
    update: { requiredSalaryMonths },
    create: { bankName, requiredSalaryMonths },
  });

  revalidatePath('/admin/functionality');
  return { success: true };
}

export async function deleteBankConfigAction(id: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.bankConfig.delete({ where: { id } });
  revalidatePath('/admin/functionality');
  return { success: true };
}

export async function updateBankConfigAction(id: string, bankName: string, requiredSalaryMonths: number) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  const existing = await prisma.bankConfig.findFirst({
    where: {
      bankName,
      NOT: { id },
    },
  });
  if (existing) {
    return { success: false, error: 'Another bank with this name already exists.' };
  }

  await prisma.bankConfig.update({
    where: { id },
    data: { bankName, requiredSalaryMonths },
  });

  revalidatePath('/admin/functionality');
  return { success: true };
}

export async function createStateConfigAction(name: string, initialCities?: string[]) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  const cleanName = name.trim();
  if (!cleanName) return { success: false, error: 'State name is required' };

  const state = await prisma.stateConfig.upsert({
    where: { name: cleanName },
    update: {},
    create: { name: cleanName },
  });

  if (initialCities && initialCities.length > 0) {
    for (const city of initialCities) {
      const trimmed = city.trim();
      if (trimmed) {
        await prisma.cityConfig.upsert({
          where: {
            stateId_name: {
              stateId: state.id,
              name: trimmed,
            },
          },
          update: {},
          create: {
            stateId: state.id,
            name: trimmed,
          },
        });
      }
    }
  }

  revalidatePath('/admin/functionality');
  revalidatePath('/cases/new');
  revalidatePath('/cases');
  return { success: true, state };
}

export async function addCityToStateAction(stateId: string, cityName: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  const cleanCity = cityName.trim();
  if (!cleanCity) return { success: false, error: 'City name is required' };

  const existing = await prisma.cityConfig.findUnique({
    where: {
      stateId_name: {
        stateId,
        name: cleanCity,
      },
    },
  });

  if (existing) {
    return { success: false, error: 'This city already exists in this state.' };
  }

  const city = await prisma.cityConfig.create({
    data: {
      stateId,
      name: cleanCity,
    },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/cases/new');
  revalidatePath('/cases');
  return { success: true, city };
}

export async function deleteCityConfigAction(cityId: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.cityConfig.delete({ where: { id: cityId } });
  revalidatePath('/admin/functionality');
  revalidatePath('/cases/new');
  revalidatePath('/cases');
  return { success: true };
}

export async function updateCityConfigAction(cityId: string, cityName: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  const cleanCity = cityName.trim();
  if (!cleanCity) return { success: false, error: 'City name cannot be empty' };

  const city = await prisma.cityConfig.update({
    where: { id: cityId },
    data: { name: cleanCity },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/cases/new');
  revalidatePath('/cases');
  return { success: true, city };
}

export async function deleteStateConfigAction(id: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.stateConfig.delete({ where: { id } });
  revalidatePath('/admin/functionality');
  revalidatePath('/cases/new');
  revalidatePath('/cases');
  return { success: true };
}

export async function updateStateConfigAction(id: string, name: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  const existing = await prisma.stateConfig.findFirst({
    where: {
      name,
      NOT: { id },
    },
  });
  if (existing) {
    return { success: false, error: 'Another state with this name already exists.' };
  }

  await prisma.stateConfig.update({
    where: { id },
    data: { name },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/cases/new');
  revalidatePath('/cases');
  return { success: true };
}

export async function createRevenueAction(amount: number, month: string, state: string, caseId?: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.revenueRecord.create({
    data: {
      amount,
      month,
      state,
      caseId: caseId || null,
    },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteRevenueAction(id: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.revenueRecord.delete({ where: { id } });
  revalidatePath('/admin/functionality');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateRevenueAction(id: string, amount: number, month: string, state: string, caseId?: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.revenueRecord.update({
    where: { id },
    data: {
      amount,
      month,
      state,
      caseId: caseId || null,
    },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function createExpenseAction(amount: number, month: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.expenseRecord.create({
    data: {
      amount,
      month,
    },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteExpenseAction(id: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.expenseRecord.delete({ where: { id } });
  revalidatePath('/admin/functionality');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateExpenseAction(id: string, amount: number, month: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.expenseRecord.update({
    where: { id },
    data: {
      amount,
      month,
    },
  });

  revalidatePath('/admin/functionality');
  revalidatePath('/dashboard');
  return { success: true };
}

// 4. Template Category & Item Actions
export async function createTemplateCategoryAction(name: string, product: string, customerType: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistCategory.create({
    data: { name: name.trim(), product: product.trim(), customerType: customerType.trim() },
  });

  revalidatePath('/admin/checklist-templates');
  return { success: true };
}

export async function createTemplateCategoriesBatchAction(data: {
  name: string;
  products: string[];
  customerTypes: string[];
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  const cleanName = data.name.trim();
  if (!cleanName) return { success: false, error: 'Category name is required' };
  if (!data.products || data.products.length === 0) {
    return { success: false, error: 'Please select at least one Product' };
  }
  if (!data.customerTypes || data.customerTypes.length === 0) {
    return { success: false, error: 'Please select at least one Profile' };
  }

  let createdCount = 0;
  let alreadyExistCount = 0;

  for (const prod of data.products) {
    const cleanProd = prod.trim();
    if (!cleanProd) continue;

    for (const profile of data.customerTypes) {
      const cleanProfile = profile.trim();
      if (!cleanProfile) continue;

      const existing = await prisma.checklistCategory.findFirst({
        where: {
          name: cleanName,
          product: cleanProd,
          customerType: cleanProfile,
        },
      });

      if (!existing) {
        await prisma.checklistCategory.create({
          data: {
            name: cleanName,
            product: cleanProd,
            customerType: cleanProfile,
          },
        });
        createdCount++;
      } else {
        alreadyExistCount++;
      }
    }
  }

  revalidatePath('/admin/checklist-templates');
  return { success: true, createdCount, alreadyExistCount };
}

export async function updateTemplateCategoryAction(id: string, name: string, product: string, customerType: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistCategory.update({
    where: { id },
    data: {
      name: name.trim(),
      product: product.trim(),
      customerType: customerType.trim(),
    },
  });

  revalidatePath('/admin/checklist-templates');
  return { success: true };
}

export async function deleteTemplateCategoryAction(id: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistCategory.delete({
    where: { id },
  });

  revalidatePath('/admin/checklist-templates');
  return { success: true };
}

export async function createTemplateItemAction(data: {
  categoryId: string;
  label: string;
  applicantRequirement: any;
  coApplicantRequirement: any;
  propertyTypeScope?: string;
  subProduct?: string;
  incomeType?: string;
  customerType?: string;
  stages?: string;
  stage: number;
  requireOnedrive?: boolean;
  requireRemark?: boolean;
  remarkPlaceholder?: string;
}) {
  try {
    const user = await getAuthUser();
    if (!user || !can(user, 'manage_templates', 'template')) {
      return { success: false, error: 'Permission denied' };
    }

    if (!data.label || !data.label.trim()) {
      return { success: false, error: 'Document label is required' };
    }

    await prisma.checklistItemTemplate.create({
      data: {
        categoryId: data.categoryId,
        label: data.label.trim(),
        applicantRequirement: data.applicantRequirement,
        coApplicantRequirement: data.coApplicantRequirement,
        propertyTypeScope: data.propertyTypeScope || null,
        subProduct: data.subProduct || null,
        incomeType: data.incomeType || null,
        customerType: data.customerType || null,
        stages: data.stages || null,
        stage: data.stage || 1,
        requireOnedrive: data.requireOnedrive !== false,
        requireRemark: data.requireRemark === true,
        remarkPlaceholder: data.remarkPlaceholder?.trim() || null,
      },
    });

    revalidatePath('/admin/checklist-templates');
    return { success: true };
  } catch (err: any) {
    console.error('Error creating template item:', err);
    return { success: false, error: err?.message || 'Failed to create template item' };
  }
}

export async function updateTemplateItemAction(
  id: string,
  data: {
    categoryId: string;
    label: string;
    applicantRequirement: any;
    coApplicantRequirement: any;
    propertyTypeScope?: string;
    subProduct?: string;
    incomeType?: string;
    customerType?: string;
    stages?: string;
    stage: number;
    requireOnedrive?: boolean;
    requireRemark?: boolean;
    remarkPlaceholder?: string;
  }
) {
  try {
    const user = await getAuthUser();
    if (!user || !can(user, 'manage_templates', 'template')) {
      return { success: false, error: 'Permission denied' };
    }

    if (!data.label || !data.label.trim()) {
      return { success: false, error: 'Document label is required' };
    }

    await prisma.checklistItemTemplate.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        label: data.label.trim(),
        applicantRequirement: data.applicantRequirement,
        coApplicantRequirement: data.coApplicantRequirement,
        propertyTypeScope: data.propertyTypeScope || null,
        subProduct: data.subProduct || null,
        incomeType: data.incomeType || null,
        customerType: data.customerType || null,
        stages: data.stages || null,
        stage: data.stage || 1,
        requireOnedrive: data.requireOnedrive !== false,
        requireRemark: data.requireRemark === true,
        remarkPlaceholder: data.remarkPlaceholder?.trim() || null,
      },
    });

    revalidatePath('/admin/checklist-templates');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating template item:', err);
    return { success: false, error: err?.message || 'Failed to update template item' };
  }
}

export async function deleteTemplateItemAction(templateId: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistItemTemplate.delete({ where: { id: templateId } });
  revalidatePath('/admin/checklist-templates');
  return { success: true };
}

// 5. User Self Profile Update Action
export async function updateUserProfileAction(data: {
  name: string;
  username?: string;
  email?: string;
  password?: string;
  avatarUrl?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!isValidName(data.name)) {
    return { success: false, error: 'Display name must contain only alphabetic characters and spaces.' };
  }

  const updateData: any = { name: data.name.trim() };

  if (data.username !== undefined) {
    const cleanUsername = data.username.trim().toLowerCase();
    if (cleanUsername) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: user.id },
        },
      });
      if (existingUser) {
        return { success: false, error: 'Username is already taken by another user.' };
      }
      updateData.username = cleanUsername;
    }
  }

  if (data.email !== undefined) {
    const cleanEmail = data.email && data.email.trim() !== '' ? data.email.trim().toLowerCase() : null;
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    updateData.email = cleanEmail;
  }

  if (data.password && data.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }
  if (data.avatarUrl !== undefined) {
    let finalAvatar = data.avatarUrl ? data.avatarUrl.trim() : null;
    if (finalAvatar && finalAvatar.startsWith('data:')) {
      try {
        const matches = finalAvatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const fs = await import('fs');
          const path = await import('path');
          const ext = matches[1].includes('png') ? 'png' : 'jpg';
          const filename = `${user.id}-${Date.now()}.${ext}`;
          const dir = path.join(process.cwd(), 'public', 'avatars');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, filename), Buffer.from(matches[2], 'base64'));
          finalAvatar = `/avatars/${filename}`;
        }
      } catch {
        finalAvatar = null;
      }
    }
    updateData.avatarUrl = finalAvatar;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  revalidatePath('/profile');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/users');
  return { success: true };
}

// 6. Birthday Management Actions (All Database Sources: Staff, Clients, Co-Applicants & Manual Entries)
export async function getUpcomingBirthdaysAction(includeAll = false) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return { success: false, error: 'Unauthorized', birthdays: [] };
  }
  const isSuperAdmin = authUser.role === 'SUPER_ADMIN';

  // Pointer: Birthday details should only be visible if condition is fulfilled:
  // "Jis staff ko Visit ya case assign hoga usko dikhega yaa fir us staff ne khud Visit ya case bnaya h"
  if (!isSuperAdmin && authUser.id) {
    const hasAssignedOrCreatedCase = await prisma.case.findFirst({
      where: {
        OR: [
          { salesUserId: authUser.id },
          { operationUserId: authUser.id },
          { createdById: authUser.id },
          { visits: { some: { staffUserId: authUser.id } } },
        ],
      },
      select: { id: true },
    });

    const hasAssignedOrCreatedVisit = await prisma.visitRecord.findFirst({
      where: {
        staffUserId: authUser.id,
      },
      select: { id: true },
    });

    const hasCreatedManualBirthday = await prisma.manualBirthdayEntry.findFirst({
      where: { createdById: authUser.id },
      select: { id: true },
    });

    if (!hasAssignedOrCreatedCase && !hasAssignedOrCreatedVisit && !hasCreatedManualBirthday) {
      return { success: true, birthdays: [] };
    }
  }

  // 1. Staff Members (Users)
  const usersWithDob = await prisma.user.findMany({
    where: {
      dob: { not: null },
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      dob: true,
      team: { select: { name: true } },
    },
  });

  // 2. Intake Clients & Co-Applicants (Cases)
  // Pointer 7: Staff sees only other staff member Birthday or lead pertaining to them
  const caseWhereCondition: any = {
    OR: [
      { clientDob: { not: null } },
      { coApplicantsData: { not: null } },
    ],
  };

  if (!isSuperAdmin && authUser?.id) {
    caseWhereCondition.AND = {
      OR: [
        { salesUserId: authUser.id },
        { operationUserId: authUser.id },
        { createdById: authUser.id },
        { visits: { some: { staffUserId: authUser.id } } },
      ],
    };
  }

  const casesWithDob = await prisma.case.findMany({
    where: caseWhereCondition,
    select: {
      id: true,
      clientName: true,
      mobile: true,
      email: true,
      clientCity: true,
      clientState: true,
      clientDob: true,
      product: true,
      status: true,
      coApplicantsData: true,
    },
  });

  // 3. Custom Manual Birthday Entries (Scoped to creator if not super admin)
  const manualWhereCondition = !isSuperAdmin && authUser?.id
    ? { createdById: authUser.id }
    : {};
  const manualEntries = await prisma.manualBirthdayEntry.findMany({
    where: manualWhereCondition,
    orderBy: { createdAt: 'desc' },
  });

  const allItems: Array<{
    id: string;
    manualId?: string;
    name: string;
    username?: string | null;
    phone?: string | null;
    email?: string | null;
    role?: string;
    category: 'STAFF' | 'CLIENT' | 'CO_APPLICANT' | 'MANUAL';
    categoryLabel: string;
    teamName: string;
    association: string;
    remark?: string | null;
    dob: Date | string;
    isWithin30Days: boolean;
    isToday: boolean;
    daysRemaining: number;
    formattedBirthday: string;
    isManual?: boolean;
  }> = [];

  // Map Users
  for (const u of usersWithDob) {
    if (!u.dob) continue;
    const evaluation = evaluateUpcomingBirthday(u.dob);
    allItems.push({
      id: `staff-${u.id}`,
      name: u.name,
      username: u.username,
      email: u.email,
      phone: null,
      role: u.role,
      category: 'STAFF',
      categoryLabel: u.role,
      teamName: u.team?.name || 'General Operations',
      association: u.team?.name ? `Team: ${u.team.name}` : `Role: ${u.role}`,
      remark: `Staff Member (@${u.username || u.name})`,
      dob: u.dob,
      isWithin30Days: evaluation.isWithin30Days,
      isToday: evaluation.isToday,
      daysRemaining: evaluation.daysRemaining,
      formattedBirthday: evaluation.formattedBirthday,
    });
  }

  // Map Intake Cases (Client & Co-Applicants) with Strict Deduplication
  const casePersonMap = new Map<string, any>();

  for (const c of casesWithDob) {
    // Main Client
    if (c.clientDob) {
      const normPhone = c.mobile ? c.mobile.replace(/\D/g, '').slice(-10) : '';
      const key = normPhone ? `phone_${normPhone}` : (c.email ? `email_${c.email.trim().toLowerCase()}` : `name_${c.clientName.trim().toLowerCase()}`);
      
      if (casePersonMap.has(key)) {
        const existing = casePersonMap.get(key);
        existing.caseCount = (existing.caseCount || 1) + 1;
        if (!existing.products.includes(c.product)) existing.products.push(c.product);
        existing.association = `${existing.caseCount} Cases (${existing.products.join(', ')})`;
      } else {
        const evaluation = evaluateUpcomingBirthday(c.clientDob);
        casePersonMap.set(key, {
          id: `client-${c.id}`,
          name: c.clientName,
          phone: c.mobile,
          email: c.email,
          role: 'LOAN_CLIENT',
          category: 'CLIENT',
          categoryLabel: 'Loan Client',
          teamName: 'Client File',
          products: [c.product],
          caseCount: 1,
          association: `Loan: ${c.product} (#${c.id.slice(-6).toUpperCase()})`,
          remark: `Status: ${c.status}${c.clientCity ? ` | City: ${c.clientCity}` : ''}${c.clientState ? `, ${c.clientState}` : ''}`,
          dob: c.clientDob,
          isWithin30Days: evaluation.isWithin30Days,
          isToday: evaluation.isToday,
          daysRemaining: evaluation.daysRemaining,
          formattedBirthday: evaluation.formattedBirthday,
        });
      }
    }

    // Co-Applicants
    if (c.coApplicantsData) {
      try {
        const coApps = JSON.parse(c.coApplicantsData);
        if (Array.isArray(coApps)) {
          coApps.forEach((coApp: any, idx: number) => {
            if (coApp && coApp.name && coApp.dob) {
              const dobDate = new Date(coApp.dob);
              if (!isNaN(dobDate.getTime())) {
                const coPhone = coApp.mobile ? String(coApp.mobile).replace(/\D/g, '').slice(-10) : '';
                const coKey = coPhone ? `phone_${coPhone}` : (coApp.email ? `email_${coApp.email.trim().toLowerCase()}` : `name_${coApp.name.trim().toLowerCase()}`);
                
                if (casePersonMap.has(coKey)) {
                  const existing = casePersonMap.get(coKey);
                  existing.caseCount = (existing.caseCount || 1) + 1;
                  existing.association = `${existing.caseCount} Cases (Co-App): ${c.clientName}`;
                } else {
                  const evaluation = evaluateUpcomingBirthday(dobDate);
                  casePersonMap.set(coKey, {
                    id: `coapp-${c.id}-${idx}`,
                    name: coApp.name || `Co-Applicant ${idx + 1}`,
                    phone: coApp.mobile || null,
                    email: coApp.email || null,
                    role: 'CO_APPLICANT',
                    category: 'CO_APPLICANT',
                    categoryLabel: 'Co-Applicant',
                    teamName: 'Co-Applicant',
                    caseCount: 1,
                    association: `Co-App for ${c.clientName} (${c.product})`,
                    remark: `Client: ${c.clientName} | Case #${c.id.slice(-6).toUpperCase()}`,
                    dob: dobDate,
                    isWithin30Days: evaluation.isWithin30Days,
                    isToday: evaluation.isToday,
                    daysRemaining: evaluation.daysRemaining,
                    formattedBirthday: evaluation.formattedBirthday,
                  });
                }
              }
            }
          });
        }
      } catch (e) {
        // Ignore parse errors on malformed legacy JSON
      }
    }
  }

  allItems.push(...casePersonMap.values());

  // Map Manual Entries
  for (const m of manualEntries) {
    const evaluation = evaluateUpcomingBirthday(m.dob);
    const cat = (m as any).category || 'CUSTOMER';
    let catLabel = 'Customer / Lead';
    if (cat === 'STAFF') catLabel = 'Staff Member';
    else if (cat === 'CHANNEL') catLabel = 'Channel Partner';
    else if (cat !== 'CUSTOMER') catLabel = cat;

    allItems.push({
      id: `manual-${m.id}`,
      manualId: m.id,
      name: m.name,
      phone: m.phone,
      email: m.email || null,
      role: 'CUSTOM_ENTRY',
      category: 'MANUAL',
      rawCategory: cat,
      categoryLabel: catLabel,
      teamName: 'Custom Entry',
      association: m.remark || 'Direct Birthday Entry',
      remark: m.remark || 'Direct Birthday Entry',
      dob: m.dob,
      isWithin30Days: evaluation.isWithin30Days,
      isToday: evaluation.isToday,
      daysRemaining: evaluation.daysRemaining,
      formattedBirthday: evaluation.formattedBirthday,
      isManual: true,
    } as any);
  }

  const processed = allItems
    .filter((b) => (includeAll ? true : b.isWithin30Days))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { success: true, birthdays: processed };
}

export async function createManualBirthdayAction(data: {
  name: string;
  phone?: string;
  dob: string;
  remark?: string;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!data.name?.trim() || !data.dob) {
    return { success: false, error: 'Name and Date of Birth are required.' };
  }

  if (!isValidName(data.name)) {
    return { success: false, error: 'Name must contain only alphabetic characters and spaces.' };
  }

  if (data.phone && !isValid10DigitPhone(data.phone)) {
    return { success: false, error: 'Phone number must be a valid 10-digit number.' };
  }

  const entry = await prisma.manualBirthdayEntry.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      dob: new Date(data.dob),
      remark: data.remark?.trim() || null,
      createdById: user.id,
    },
  });

  revalidatePath('/birthdays');
  return { success: true, entry };
}

export async function deleteManualBirthdayAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  await prisma.manualBirthdayEntry.delete({
    where: { id },
  });

  revalidatePath('/birthdays');
  return { success: true };
}

export async function updateManualBirthdayAction(data: {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  dob: string;
  category?: string;
  remark?: string;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!data.id || !data.name?.trim() || !data.dob) {
    return { success: false, error: 'ID, Name and Date of Birth are required.' };
  }

  if (!isValidName(data.name)) {
    return { success: false, error: 'Name must contain only alphabetic characters and spaces.' };
  }

  if (data.phone && !isValid10DigitPhone(data.phone)) {
    return { success: false, error: 'Phone number must be a valid 10-digit number.' };
  }

  const updateData: any = {
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    dob: new Date(data.dob),
    remark: data.remark?.trim() || null,
  };
  if (data.category !== undefined) {
    updateData.category = data.category || 'CUSTOMER';
  }
  if (data.email !== undefined) {
    updateData.email = data.email?.trim() || null;
  }

  const entry = await prisma.manualBirthdayEntry.update({
    where: { id: data.id },
    data: updateData,
  });

  revalidatePath('/birthdays');
  return { success: true, entry };
}

// 7. HRMS Daily Attendance Actions (IST Normalization)
export async function getTodayAttendanceAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const todayIST = getTodayISTDate();
  const record = await prisma.attendanceRecord.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: todayIST,
      },
    },
  });

  if (!record) {
    return {
      success: true,
      isPunchedIn: false,
      record: null,
      todayIST,
      elapsedSeconds: 0,
    };
  }

  // If punched in and not yet punched out, compute current active session added to previously accumulated minutes
  let elapsedSeconds = record.totalMinutes * 60;
  const isPunchedIn = !record.punchOut;
  if (isPunchedIn && record.punchIn) {
    const activeSessionSec = Math.max(0, Math.floor((new Date().getTime() - new Date(record.punchIn).getTime()) / 1000));
    elapsedSeconds = (record.totalMinutes * 60) + activeSessionSec;
  }

  return {
    success: true,
    isPunchedIn,
    record: {
      id: record.id,
      date: record.date,
      punchIn: record.punchIn,
      punchOut: record.punchOut,
      totalMinutes: record.totalMinutes,
      status: record.status,
    },
    todayIST,
    elapsedSeconds,
  };
}

export async function punchInAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const todayIST = getTodayISTDate();
  const now = new Date();

  // Check if already punched in
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: todayIST,
      },
    },
  });

  if (existing && !existing.punchOut) {
    return { success: false, error: 'Already punched in for today!' };
  }

  // Create or re-open punch in
  let record;
  if (!existing) {
    record = await prisma.attendanceRecord.create({
      data: {
        userId: user.id,
        date: todayIST,
        punchIn: now,
        status: 'PRESENT',
      },
    });
  } else {
    // Re-punching in (clears punchOut)
    record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        punchIn: now,
        punchOut: null,
      },
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/hrms');
  return { 
    success: true, 
    record,
    isPunchedIn: true,
    elapsedSeconds: (record.totalMinutes || 0) * 60,
  };
}

export async function punchOutAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const todayIST = getTodayISTDate();
  const now = new Date();

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: todayIST,
      },
    },
  });

  if (!existing || existing.punchOut) {
    return { success: false, error: 'You are not currently punched in!' };
  }

  const durationSec = Math.max(0, Math.floor((now.getTime() - new Date(existing.punchIn).getTime()) / 1000));
  const durationMin = Math.max(0, Math.round(durationSec / 60));
  const totalMinutes = existing.totalMinutes + durationMin;

  const record = await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      punchOut: now,
      totalMinutes,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/hrms');
  return { 
    success: true, 
    record,
    isPunchedIn: false,
    elapsedSeconds: totalMinutes * 60,
  };
}

// 8. HRMS Team Attendance & Timesheet Actions
export async function getAllStaffAttendanceTodayAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const todayIST = getTodayISTDate();

  // Fetch all staff members (excluding outsider Channel role)
  const staff = await prisma.user.findMany({
    where: { role: { not: 'CHANNEL' } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobRole: true,
      department: true,
      monthlySalary: true,
      currentCTC: true,
      team: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Fetch today's attendance records
  const records = await prisma.attendanceRecord.findMany({
    where: { date: todayIST },
  });

  const recordMap = new Map<string, any>();
  records.forEach((r) => recordMap.set(r.userId, r));

  const attendanceList = staff.map((s) => {
    const rec = recordMap.get(s.id);
    const isPunchedIn = rec ? !rec.punchOut : false;
    let elapsedMinutes = rec ? rec.totalMinutes : 0;
    if (isPunchedIn && rec.punchIn) {
      const activeMinutes = Math.floor((new Date().getTime() - new Date(rec.punchIn).getTime()) / (1000 * 60));
      elapsedMinutes = activeMinutes;
    }

    return {
      userId: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      jobRole: s.jobRole || null,
      department: s.department || null,
      monthlySalary: s.monthlySalary || null,
      currentCTC: s.currentCTC || null,
      teamName: s.team?.name || 'Unassigned',
      isPunchedIn,
      punchIn: rec?.punchIn || null,
      punchOut: rec?.punchOut || null,
      totalMinutes: elapsedMinutes,
      status: rec?.status || 'ABSENT',
    };
  });

  const presentCount = attendanceList.filter((a) => a.punchIn).length;
  const activeCount = attendanceList.filter((a) => a.isPunchedIn).length;
  const totalStaff = staff.length;

  return {
    success: true,
    todayIST,
    attendanceList,
    summary: {
      totalStaff,
      presentCount,
      activeCount,
      absentCount: totalStaff - presentCount,
    },
  };
}

export async function getStaffMonthlyAttendanceAction(targetUserId?: string, monthPrefix?: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // If regular employee, only allow viewing self
  const userId = user.role === 'SUPER_ADMIN' && targetUserId ? targetUserId : user.id;

  // Month in IST: YYYY-MM
  const currentMonth = monthPrefix || getTodayISTDate().substring(0, 7);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      date: { startsWith: currentMonth },
    },
    orderBy: { date: 'asc' },
  });

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  return {
    success: true,
    userId,
    user: targetUser,
    month: currentMonth,
    records,
  };
}

export async function markStaffAttendanceStatusAction(data: {
  userId: string;
  date?: string;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  punchInTime?: string;
  punchOutTime?: string;
  notes?: string;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Only Super Admin can override staff attendance.' };
  }

  const dateIST = data.date?.trim() || getTodayISTDate();

  const createDateWithTime = (dateStr: string, timeStr?: string, defaultHour = 9, defaultMin = 30) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hour = defaultHour;
    let min = defaultMin;
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      if (!isNaN(parts[0])) hour = parts[0];
      if (!isNaN(parts[1])) min = parts[1];
    }
    const d = new Date(Date.UTC(year, month - 1, day, hour, min, 0));
    d.setMinutes(d.getMinutes() - 330);
    return d;
  };

  let punchInDate: Date;
  let punchOutDate: Date | null = null;
  let totalMinutes = 0;

  if (data.status === 'PRESENT') {
    punchInDate = createDateWithTime(dateIST, data.punchInTime, 9, 30);
    punchOutDate = data.punchOutTime ? createDateWithTime(dateIST, data.punchOutTime, 18, 30) : createDateWithTime(dateIST, '18:30', 18, 30);
    totalMinutes = Math.max(0, Math.round((punchOutDate.getTime() - punchInDate.getTime()) / (1000 * 60)));
  } else if (data.status === 'LATE') {
    punchInDate = createDateWithTime(dateIST, data.punchInTime, 10, 45);
    punchOutDate = data.punchOutTime ? createDateWithTime(dateIST, data.punchOutTime, 18, 30) : createDateWithTime(dateIST, '18:30', 18, 30);
    totalMinutes = Math.max(0, Math.round((punchOutDate.getTime() - punchInDate.getTime()) / (1000 * 60)));
  } else if (data.status === 'HALF_DAY') {
    punchInDate = createDateWithTime(dateIST, data.punchInTime, 9, 30);
    punchOutDate = createDateWithTime(dateIST, data.punchOutTime, 13, 30);
    totalMinutes = 240;
  } else {
    // ABSENT
    punchInDate = createDateWithTime(dateIST, '00:00', 0, 0);
    punchOutDate = createDateWithTime(dateIST, '00:00', 0, 0);
    totalMinutes = 0;
  }

  const record = await prisma.attendanceRecord.upsert({
    where: {
      userId_date: {
        userId: data.userId,
        date: dateIST,
      },
    },
    update: {
      status: data.status,
      punchIn: punchInDate,
      punchOut: punchOutDate,
      totalMinutes,
      notes: data.notes?.trim() || `Marked ${data.status} by Super Admin`,
    },
    create: {
      userId: data.userId,
      date: dateIST,
      status: data.status,
      punchIn: punchInDate,
      punchOut: punchOutDate,
      totalMinutes,
      notes: data.notes?.trim() || `Marked ${data.status} by Super Admin`,
    },
  });

  revalidatePath('/hrms');
  revalidatePath('/dashboard');
  revalidatePath('/salary');

  return { success: true, record };
}

export async function getStaffPunchHistoryAction(userId?: string, monthPrefix?: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized', records: [] };

  const targetUserId = user.role === 'SUPER_ADMIN' ? userId : user.id;

  const where: any = {};
  if (targetUserId && targetUserId !== 'ALL') {
    where.userId = targetUserId;
  }
  if (monthPrefix) {
    where.date = { startsWith: monthPrefix };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          monthlySalary: true,
          team: { select: { name: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
    take: 200,
  });

  return { success: true, records };
}

// 9. HRMS Leave Management Actions
export async function applyLeaveAction(data: {
  leaveType: 'CASUAL' | 'SICK' | 'PAID' | 'LWP';
  startDate: string;
  endDate: string;
  reason: string;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: 'Invalid start or end date' };
  }

  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      leaveType: data.leaveType,
      startDate: start,
      endDate: end,
      daysCount,
      reason: data.reason,
      status: 'PENDING',
    },
  });

  revalidatePath('/hrms');
  return { success: true, leave };
}

export async function getLeaveRequestsAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const whereClause = isSuperAdmin ? {} : { userId: user.id };

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          team: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate quota balance for the logged in user
  const userLeavesThisYear = await prisma.leaveRequest.findMany({
    where: {
      userId: user.id,
      status: 'APPROVED',
    },
  });

  const usedCL = userLeavesThisYear.filter((l) => l.leaveType === 'CASUAL').reduce((sum, l) => sum + l.daysCount, 0);
  const usedSL = userLeavesThisYear.filter((l) => l.leaveType === 'SICK').reduce((sum, l) => sum + l.daysCount, 0);
  const usedPL = userLeavesThisYear.filter((l) => l.leaveType === 'PAID').reduce((sum, l) => sum + l.daysCount, 0);
  const usedLWP = userLeavesThisYear.filter((l) => l.leaveType === 'LWP').reduce((sum, l) => sum + l.daysCount, 0);

  const quota = {
    casualTotal: 12,
    casualRemaining: Math.max(0, 12 - usedCL),
    sickTotal: 8,
    sickRemaining: Math.max(0, 8 - usedSL),
    paidTotal: 15,
    paidRemaining: Math.max(0, 15 - usedPL),
    lwpTotalTaken: usedLWP,
  };

  return { success: true, leaves, isSuperAdmin, quota };
}

export async function reviewLeaveAction(leaveId: string, status: 'APPROVED' | 'REJECTED') {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only Super Admin can approve or reject leaves' };
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath('/hrms');
  return { success: true, leave: updated };
}

export async function recordAdminLeaveAction(data: {
  isManual: boolean;
  userId?: string;
  manualName?: string;
  manualPhone?: string;
  leaveType: 'CASUAL' | 'SICK' | 'PAID' | 'LWP';
  startDate: string;
  endDate: string;
  reason?: string;
  status?: 'APPROVED' | 'PENDING';
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only Super Admin can record employee leaves directly.' };
  }

  if (data.isManual) {
    if (!data.manualName?.trim()) {
      return { success: false, error: 'Employee name is required for manual entry.' };
    }
    if (!isValidName(data.manualName)) {
      return { success: false, error: 'Employee name must contain only alphabetic characters and spaces.' };
    }
    if (data.manualPhone && !isValid10DigitPhone(data.manualPhone)) {
      return { success: false, error: 'Phone number must be a valid 10-digit number.' };
    }
  } else {
    if (!data.userId) {
      return { success: false, error: 'Please select a staff member.' };
    }
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: 'Invalid start or end date.' };
  }
  if (end.getTime() < start.getTime()) {
    return { success: false, error: 'End date cannot be before start date.' };
  }

  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: data.isManual ? null : data.userId,
      manualName: data.isManual ? data.manualName?.trim() : null,
      manualPhone: data.isManual ? data.manualPhone?.trim() : null,
      isManual: data.isManual,
      leaveType: data.leaveType,
      startDate: start,
      endDate: end,
      daysCount,
      reason: data.reason?.trim() || 'Super Admin Direct Leave Entry',
      status: data.status || 'APPROVED',
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath('/hrms');
  return { success: true, leave };
}

export async function deleteLeaveAction(leaveId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only Super Admin can delete leave entries.' };
  }

  await prisma.leaveRequest.delete({
    where: { id: leaveId },
  });

  revalidatePath('/hrms');
  return { success: true };
}

// 10. HRMS Company Holidays Actions
export async function getHolidaysAction() {
  let holidays = await prisma.holidayConfig.findMany({
    orderBy: { date: 'asc' },
  });

  // Auto seed default 2026 holidays if empty
  if (holidays.length === 0) {
    const defaultHolidays = [
      { name: 'Republic Day', date: '2026-01-26', dayName: 'Monday', isOptional: false },
      { name: 'Holi (Festival of Colors)', date: '2026-03-04', dayName: 'Wednesday', isOptional: false },
      { name: 'Eid-ul-Fitr', date: '2026-03-21', dayName: 'Saturday', isOptional: false },
      { name: 'Independence Day', date: '2026-08-15', dayName: 'Saturday', isOptional: false },
      { name: 'Gandhi Jayanti', date: '2026-10-02', dayName: 'Friday', isOptional: false },
      { name: 'Dussehra (Vijayadashami)', date: '2026-10-20', dayName: 'Tuesday', isOptional: false },
      { name: 'Diwali (Deepavali)', date: '2026-11-08', dayName: 'Sunday', isOptional: false },
      { name: 'Guru Nanak Jayanti', date: '2026-11-24', dayName: 'Tuesday', isOptional: false },
      { name: 'Christmas Day', date: '2026-12-25', dayName: 'Friday', isOptional: false },
    ];

    for (const h of defaultHolidays) {
      await prisma.holidayConfig.create({ data: h });
    }

    holidays = await prisma.holidayConfig.findMany({
      orderBy: { date: 'asc' },
    });
  }

  const todayIST = getTodayISTDate();
  const upcomingHolidays = holidays.map((h) => ({
    ...h,
    isPassed: h.date < todayIST,
  }));

  return { success: true, holidays: upcomingHolidays };
}

function getDayNameFromDate(dateStr: string): string {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
      return days[d.getUTCDay()] || 'Holiday';
    }
  } catch (err) {
    // fallback
  }
  return 'Holiday';
}

export async function createHolidayAction(data: {
  name: string;
  date: string;
  isOptional?: boolean;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only Super Admin can add official company holidays.' };
  }

  const cleanName = data.name.trim();
  const cleanDate = data.date.trim();

  if (!cleanName) return { success: false, error: 'Holiday name is required.' };
  if (!cleanDate) return { success: false, error: 'Holiday date is required.' };

  const dayName = getDayNameFromDate(cleanDate);

  const holiday = await prisma.holidayConfig.create({
    data: {
      name: cleanName,
      date: cleanDate,
      dayName,
      isOptional: Boolean(data.isOptional),
    },
  });

  revalidatePath('/hrms');

  return { success: true, holiday };
}

export async function updateHolidayAction(data: {
  id: string;
  name: string;
  date: string;
  isOptional?: boolean;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only Super Admin can edit official company holidays.' };
  }

  const cleanName = data.name.trim();
  const cleanDate = data.date.trim();

  if (!cleanName) return { success: false, error: 'Holiday name is required.' };
  if (!cleanDate) return { success: false, error: 'Holiday date is required.' };

  const dayName = getDayNameFromDate(cleanDate);

  const holiday = await prisma.holidayConfig.update({
    where: { id: data.id },
    data: {
      name: cleanName,
      date: cleanDate,
      dayName,
      isOptional: Boolean(data.isOptional),
    },
  });

  revalidatePath('/hrms');

  return { success: true, holiday };
}

export async function deleteHolidayAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only Super Admin can delete official company holidays.' };
  }

  await prisma.holidayConfig.delete({
    where: { id },
  });

  revalidatePath('/hrms');

  return { success: true };
}

// 10. Product Master Actions
export async function getProductsAction() {
  let products = await prisma.productMaster.findMany({
    include: {
      subProducts: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (products.length === 0) {
    const defaults = [
      'Home Loan',
      'Loan Against Property',
      'Balance Transfer',
      'Business Loan',
      'Personal Loan',
    ];
    for (const name of defaults) {
      await prisma.productMaster.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    products = await prisma.productMaster.findMany({
      include: {
        subProducts: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  return { success: true, products };
}

export async function createProductAction(name: string, initialSubProducts?: string[]) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const trimmed = name?.trim();
  if (!trimmed) return { success: false, error: 'Product name is required.' };

  const existing = await prisma.productMaster.findUnique({
    where: { name: trimmed },
  });
  if (existing) {
    return { success: false, error: 'Product already exists.' };
  }

  const cleanSubProducts = (initialSubProducts || [])
    .map((s) => s.trim())
    .filter(Boolean);

  const product = await prisma.productMaster.create({
    data: {
      name: trimmed,
      subProducts:
        cleanSubProducts.length > 0
          ? {
              create: cleanSubProducts.map((spName) => ({ name: spName })),
            }
          : undefined,
    },
    include: {
      subProducts: {
        orderBy: { name: 'asc' },
      },
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true, product };
}

export async function updateProductAction(id: string, name: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const trimmed = name?.trim();
  if (!trimmed) return { success: false, error: 'Product name is required.' };

  const existing = await prisma.productMaster.findFirst({
    where: { name: trimmed, NOT: { id } },
  });
  if (existing) {
    return { success: false, error: 'Another product with this name already exists.' };
  }

  const product = await prisma.productMaster.update({
    where: { id },
    data: { name: trimmed },
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true, product };
}

export async function deleteProductAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  await prisma.productMaster.delete({
    where: { id },
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true };
}

// 11. Customer Profile Master Actions
export async function getProfilesAction() {
  let profiles = await prisma.profileMaster.findMany({
    orderBy: { name: 'asc' },
  });

  if (profiles.length === 0) {
    const defaults = [
      'Salaried',
      'Self Employed Professional',
      'Business / Non-Professional',
      'Rental Income',
    ];
    for (const name of defaults) {
      await prisma.profileMaster.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    profiles = await prisma.profileMaster.findMany({
      orderBy: { name: 'asc' },
    });
  }

  return { success: true, profiles };
}

export async function createProfileAction(name: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const trimmed = name?.trim();
  if (!trimmed) return { success: false, error: 'Profile name is required.' };

  const existing = await prisma.profileMaster.findUnique({
    where: { name: trimmed },
  });
  if (existing) {
    return { success: false, error: 'Profile already exists.' };
  }

  const profile = await prisma.profileMaster.create({
    data: { name: trimmed },
  });

  revalidatePath('/admin/profiles');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true, profile };
}

export async function updateProfileAction(id: string, name: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const trimmed = name?.trim();
  if (!trimmed) return { success: false, error: 'Profile name is required.' };

  const existing = await prisma.profileMaster.findFirst({
    where: { name: trimmed, NOT: { id } },
  });
  if (existing) {
    return { success: false, error: 'Another profile with this name already exists.' };
  }

  const profile = await prisma.profileMaster.update({
    where: { id },
    data: { name: trimmed },
  });

  revalidatePath('/admin/profiles');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true, profile };
}

export async function deleteProfileAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  await prisma.profileMaster.delete({
    where: { id },
  });

  revalidatePath('/admin/profiles');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true };
}

// 12. Task Management Actions (Accessible to all roles EXCEPT CHANNEL)
export async function getAssignableUsersAction() {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized', users: [] };
  }

  const users = await prisma.user.findMany({
    where: {
      role: { not: 'CHANNEL' },
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      team: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return { success: true, users };
}

export async function getActiveCasesForTaskSelectAction() {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized', cases: [] };
  }

  const cases = await prisma.case.findMany({
    select: {
      id: true,
      clientName: true,
      mobile: true,
      product: true,
      stage: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return { success: true, cases };
}

export async function getTasksAction(filters?: {
  status?: string;
  priority?: string;
  assignedToId?: string;
  search?: string;
  view?: 'all' | 'my' | 'assigned_by_me';
}) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized', tasks: [] };
  }

  const andConditions: any[] = [];

  // Role Isolation: non-super-admins can ONLY view tasks assigned to them or created by them
  if (user.role !== 'SUPER_ADMIN') {
    if (filters?.view === 'assigned_by_me') {
      andConditions.push({ createdById: user.id });
    } else if (filters?.view === 'my') {
      andConditions.push({
        OR: [
          { assignedToId: user.id },
          { assignees: { some: { userId: user.id } } },
        ],
      });
    } else {
      // Default / 'all' for non-super-admin
      andConditions.push({
        OR: [
          { assignedToId: user.id },
          { assignees: { some: { userId: user.id } } },
          { createdById: user.id },
        ],
      });
    }
  } else {
    // Super Admin view filters
    if (filters?.view === 'my') {
      andConditions.push({
        OR: [
          { assignedToId: user.id },
          { assignees: { some: { userId: user.id } } },
        ],
      });
    } else if (filters?.view === 'assigned_by_me') {
      andConditions.push({ createdById: user.id });
    }
  }

  if (filters?.status && filters.status !== 'ALL') {
    andConditions.push({ status: filters.status });
  }

  if (filters?.priority && filters.priority !== 'ALL') {
    andConditions.push({ priority: filters.priority });
  }

  if (filters?.assignedToId && filters.assignedToId !== 'ALL') {
    andConditions.push({
      OR: [
        { assignedToId: filters.assignedToId },
        { assignees: { some: { userId: filters.assignedToId } } },
      ],
    });
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const q = filters.search.trim();
    andConditions.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { case: { clientName: { contains: q } } },
        { assignedTo: { name: { contains: q } } },
        { assignees: { some: { user: { name: { contains: q } } } } },
      ],
    });
  }

  const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: { id: true, name: true, role: true, username: true },
      },
      createdBy: {
        select: { id: true, name: true, role: true, username: true },
      },
      completedBy: {
        select: { id: true, name: true, role: true },
      },
      assignees: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      activityLogs: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      case: {
        select: { id: true, clientName: true, product: true, mobile: true },
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
  });

  return { success: true, tasks };
}

export async function createTaskAction(data: {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  assignedToId: string;
  caseId?: string;
}) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!data.title?.trim()) {
    return { success: false, error: 'Task title is required.' };
  }

  // Ensure target assignee is not a CHANNEL partner
  const targetUser = await prisma.user.findUnique({
    where: { id: data.assignedToId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    return { success: false, error: 'Assigned user not found.' };
  }

  if (targetUser.role === 'CHANNEL') {
    return { success: false, error: 'Tasks cannot be assigned to Channel partners.' };
  }

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
      assignedToId: data.assignedToId,
      createdById: user.id,
      assignedAt: new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      caseId: data.caseId || null,
    },
  });

  revalidatePath('/tasks');
  if (data.assignedToId !== user.id) {
    await recordSystemNotification({
      title: 'New Task Assigned to You',
      message: `"${task.title}" (Priority: ${task.priority}) assigned to you by ${user.name || 'Admin'}.`,
      type: 'TASK_UPDATE',
      link: `/tasks`,
      userId: data.assignedToId,
    });
  }
  return { success: true, task };
}

export async function updateTaskStatusAction(
  taskId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'
) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized' };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true },
  });

  if (!task) {
    return { success: false, error: 'Task not found.' };
  }

  const isAssignee = task.assignedToId === user.id || task.assignees.some(a => a.userId === user.id);
  // Assignee, creator, or Super Admin can update status
  if (user.role !== 'SUPER_ADMIN' && !isAssignee && task.createdById !== user.id) {
    return { success: false, error: 'Permission denied to update this task.' };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const staffName = dbUser?.name || 'Staff';
  const isCompleted = status === 'COMPLETED';

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: isCompleted ? new Date() : null,
      completedById: isCompleted ? user.id : null,
    },
  });

  // Record Task Activity Log for every update
  await prisma.taskActivityLog.create({
    data: {
      taskId,
      userId: user.id,
      action: isCompleted ? 'TASK_COMPLETED' : 'STATUS_CHANGED',
      details: isCompleted
        ? `${staffName} marked the task as COMPLETED.`
        : `${staffName} changed task status from ${task.status} to ${status}.`,
    },
  });

  revalidatePath('/tasks');
  revalidatePath('/dashboard');

  const targetUserIds = new Set<string>();
  if (task.createdById && task.createdById !== user.id) targetUserIds.add(task.createdById);
  if (task.assignedToId && task.assignedToId !== user.id) targetUserIds.add(task.assignedToId);
  task.assignees?.forEach((a) => {
    if (a.userId !== user.id) targetUserIds.add(a.userId);
  });

  for (const tUserId of targetUserIds) {
    await recordSystemNotification({
      title: isCompleted ? 'Task Completed' : 'Task Status Updated',
      message: `"${task.title}": ${isCompleted ? 'marked COMPLETED' : `status updated to ${status}`} by ${staffName}.`,
      type: 'TASK_UPDATE',
      link: `/tasks`,
      userId: tUserId,
    });
  }

  if (targetUserIds.size === 0) {
    await recordSystemNotification({
      title: isCompleted ? 'Task Completed' : 'Task Status Updated',
      message: `"${task.title}": ${isCompleted ? 'marked COMPLETED' : `status updated to ${status}`} by ${staffName}.`,
      type: 'TASK_UPDATE',
      link: `/tasks`,
      userId: user.id,
    });
  }

  return { success: true, task: updated };
}

export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status?: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
    isUrgent?: boolean;
    isImportant?: boolean;
    dueDate?: string | null;
    dueTime?: string | null;
    assignedToId?: string;
    assigneeIds?: string[];
    caseId?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized' };
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true },
  });

  if (!existing) {
    return { success: false, error: 'Task not found.' };
  }

  // Only Super Admin or Creator can edit full task details
  if (user.role !== 'SUPER_ADMIN' && existing.createdById !== user.id) {
    return { success: false, error: 'Only task creator or Super Admin can edit task details.' };
  }

  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.isUrgent !== undefined) updatePayload.isUrgent = data.isUrgent;
  if (data.isImportant !== undefined) updatePayload.isImportant = data.isImportant;
  if (data.status !== undefined) {
    updatePayload.status = data.status;
    updatePayload.completedAt = data.status === 'COMPLETED' ? new Date() : null;
  }
  if (data.dueDate !== undefined) {
    updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.dueTime !== undefined) {
    updatePayload.dueTime = data.dueTime || null;
  }
  if (data.caseId !== undefined) {
    updatePayload.caseId = data.caseId || null;
  }

  // Multi-assignment synchronization
  const effectiveAssigneeIds = data.assigneeIds && data.assigneeIds.length > 0
    ? data.assigneeIds
    : (data.assignedToId ? [data.assignedToId] : undefined);

  if (effectiveAssigneeIds && effectiveAssigneeIds.length > 0) {
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: effectiveAssigneeIds } },
      select: { id: true, name: true, role: true },
    });
    if (targetUsers.some((u) => u.role === 'CHANNEL')) {
      return { success: false, error: 'Tasks cannot be assigned to Channel partners.' };
    }

    const primaryAssigneeId = effectiveAssigneeIds[0];
    const existingAssigneeIds = existing.assignees.map((a) => a.userId);
    const assigneesChanged =
      existing.assignedToId !== primaryAssigneeId ||
      existingAssigneeIds.length !== effectiveAssigneeIds.length ||
      existingAssigneeIds.some((id) => !effectiveAssigneeIds.includes(id));

    if (assigneesChanged) {
      updatePayload.assignedToId = primaryAssigneeId;
      updatePayload.assignedAt = new Date(); // reset elapsed time on reassignment

      await prisma.taskAssignee.deleteMany({
        where: { taskId },
      });
      await prisma.taskAssignee.createMany({
        data: effectiveAssigneeIds.map((uid) => ({
          taskId,
          userId: uid,
        })),
      });

      const staffNames = targetUsers.map((u) => u.name).join(', ');
      await prisma.taskActivityLog.create({
        data: {
          taskId,
          userId: user.id,
          action: 'TASK_REASSIGNED',
          details: `Task assignees updated to: ${staffNames}`,
        },
      });
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updatePayload,
    include: {
      assignees: { include: { user: { select: { id: true, name: true, role: true } } } },
      assignedTo: { select: { id: true, name: true, role: true } },
      case: { select: { id: true, clientName: true } },
    },
  });

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { success: true, task: updated };
}

export async function deleteTaskAction(taskId: string) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized' };
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, createdById: true },
  });

  if (!existing) {
    return { success: false, error: 'Task not found.' };
  }

  if (user.role !== 'SUPER_ADMIN' && existing.createdById !== user.id) {
    return { success: false, error: 'Permission denied. Only creator or Super Admin can delete tasks.' };
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath('/tasks');
  return { success: true };
}

export async function addTaskCommentAction(taskId: string, content: string) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized' };
  }

  const trimmed = content?.trim();
  if (!trimmed) {
    return { success: false, error: 'Comment content cannot be empty.' };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const staffName = dbUser?.name || 'Staff';

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId: user.id,
      content: trimmed,
    },
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  await prisma.taskActivityLog.create({
    data: {
      taskId,
      userId: user.id,
      action: 'COMMENT_ADDED',
      details: `${staffName} added a comment: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? '...' : ''}"`,
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true },
  });
  if (task) {
    const notifyUserIds = new Set<string>();
    if (task.createdById && task.createdById !== user.id) notifyUserIds.add(task.createdById);
    if (task.assignedToId && task.assignedToId !== user.id) notifyUserIds.add(task.assignedToId);
    task.assignees?.forEach((a) => {
      if (a.userId !== user.id) notifyUserIds.add(a.userId);
    });

    for (const targetUid of notifyUserIds) {
      await recordSystemNotification({
        title: 'New Comment on Task',
        message: `${staffName} commented on "${task.title}": "${trimmed.slice(0, 60)}${trimmed.length > 60 ? '...' : ''}"`,
        type: 'TASK_UPDATE',
        link: `/tasks`,
        userId: targetUid,
      });
    }
  }

  revalidatePath('/tasks');
  return { success: true, comment };
}

// 13. CRM Branding & System Settings Actions (Super Admin Only)
export async function getCrmBrandingAction() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });

    return {
      success: true,
      crmName: setting?.crmName || 'TheNestGuru',
      crmTagline: setting?.crmTagline || 'Loan Processing Desk',
      crmLogoUrl: setting?.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png',
    };
  } catch (err) {
    return {
      success: true,
      crmName: 'TheNestGuru',
      crmTagline: 'Loan Processing Desk',
      crmLogoUrl: 'https://thenestguru.com/thenestgurulogo.png',
    };
  }
}

export async function updateCrmBrandingAction(data: {
  crmName: string;
  crmTagline: string;
  crmLogoUrl?: string | null;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Permission denied. Super Admin access required.' };
  }

  const trimmedName = data.crmName?.trim();
  if (!trimmedName) {
    return { success: false, error: 'CRM Name cannot be empty.' };
  }

  const setting = await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {
      crmName: trimmedName,
      crmTagline: data.crmTagline?.trim() || 'Loan Processing Desk',
      crmLogoUrl: data.crmLogoUrl ? data.crmLogoUrl.trim() : null,
    },
    create: {
      id: 'default',
      crmName: trimmedName,
      crmTagline: data.crmTagline?.trim() || 'Loan Processing Desk',
      crmLogoUrl: data.crmLogoUrl ? data.crmLogoUrl.trim() : null,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/profile');
  revalidatePath('/admin/settings');
  return { success: true, setting };
}

// 14. Follow-Up & Timeline Log Actions
export async function addCaseFollowUpAction(data: {
  caseId: string;
  stage?: number;
  stageName?: string;
  status: string;
  remarks: string;
}) {
  const user = await getAuthUser();
  if (!user || user.accessPermission === 'VIEW') {
    return { success: false, error: 'Unauthorized or view-only access.' };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const userName = dbUser?.name || 'Staff';

  const followUp = await prisma.caseFollowUp.create({
    data: {
      caseId: data.caseId,
      stage: data.stage || 1,
      stageName: data.stageName || `Stage ${data.stage || 1}`,
      status: data.status,
      remarks: data.remarks.trim(),
      createdById: user.id,
      createdByName: userName,
    },
  });

  // Also update case status if provided
  if (data.status) {
    await prisma.case.update({
      where: { id: data.caseId },
      data: { status: data.status },
    });
  }

  revalidatePath(`/cases/${data.caseId}`);
  revalidatePath('/cases');

  const matchedCase = await prisma.case.findUnique({
    where: { id: data.caseId },
    select: { clientName: true, channelUserId: true, createdById: true },
  });
  if (matchedCase) {
    const notifyUids = new Set<string>();
    if (matchedCase.channelUserId && matchedCase.channelUserId !== user.id) {
      notifyUids.add(matchedCase.channelUserId);
    }
    if (matchedCase.createdById && matchedCase.createdById !== user.id) {
      notifyUids.add(matchedCase.createdById);
    }
    for (const uid of notifyUids) {
      await recordSystemNotification({
        title: 'Case Follow-Up Logged',
        message: `${matchedCase.clientName}: "${data.remarks.slice(0, 70)}" by ${userName}.`,
        type: 'CASE_UPDATE',
        link: `/cases/${data.caseId}`,
        userId: uid,
      });
    }
    await recordSystemNotification({
      title: 'Case Follow-Up Logged',
      message: `${matchedCase.clientName}: "${data.remarks.slice(0, 70)}" by ${userName}.`,
      type: 'CASE_UPDATE',
      link: `/cases/${data.caseId}`,
      role: 'OPERATION',
    });
  }

  return { success: true, followUp };
}

export async function getCaseFollowUpsAction(caseId: string) {
  const followUps = await prisma.caseFollowUp.findMany({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
  });
  return { success: true, followUps };
}

// 15. Multi-Staff Task Actions & Comment Edit
export async function createTaskWithMultipleAssigneesAction(data: {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isUrgent?: boolean;
  isImportant?: boolean;
  dueDate?: string | null;
  dueTime?: string | null;
  assigneeIds: string[];
  caseId?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Pointer 32: Only Super Admin or Team Leader can assign tasks
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isTeamLeader = user.role === 'OPERATION' || user.role === 'SALES' || (user.role as any) === 'TEAM_LEADER'; // Team leads
  if (!isSuperAdmin && !isTeamLeader) {
    return { success: false, error: 'Permission denied: Only Team Leaders or Super Admin can assign tasks.' };
  }

  if (!data.title?.trim()) {
    return { success: false, error: 'Task Title is required.' };
  }

  if (!data.description?.trim()) {
    return { success: false, error: 'Detailed Instructions / Remarks are required.' };
  }

  if (!data.priority) {
    return { success: false, error: 'Priority Level is required.' };
  }

  if (!data.assigneeIds || data.assigneeIds.length === 0) {
    return { success: false, error: 'Please select at least one staff member.' };
  }

  if (!data.dueDate) {
    return { success: false, error: 'Due Date is required.' };
  }

  if (!data.dueTime) {
    return { success: false, error: 'Due Time is required.' };
  }

  const primaryAssigneeId = data.assigneeIds[0];
  const dueDateTime = new Date(data.dueDate);

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority || 'MEDIUM',
      isUrgent: !!data.isUrgent,
      isImportant: !!data.isImportant,
      dueDate: dueDateTime,
      dueTime: data.dueTime || null,
      assignedToId: primaryAssigneeId,
      createdById: user.id,
      caseId: data.caseId || null,
      assignees: {
        create: data.assigneeIds.map(uid => ({
          userId: uid,
        })),
      },
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, role: true } } } },
      case: { select: { id: true, clientName: true } },
    },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const staffName = dbUser?.name || 'Admin';

  await prisma.taskActivityLog.create({
    data: {
      taskId: task.id,
      userId: user.id,
      action: 'TASK_CREATED',
      details: `${staffName} created and assigned this task.`,
    },
  });

  revalidatePath('/tasks');
  revalidatePath('/dashboard');

  for (const assigneeId of data.assigneeIds) {
    if (assigneeId !== user.id) {
      await recordSystemNotification({
        title: 'New Task Assigned to You',
        message: `"${task.title}" (Priority: ${task.priority}) assigned to you by ${staffName}.`,
        type: 'TASK_UPDATE',
        link: `/tasks`,
        userId: assigneeId,
      });
    }
  }

  if (data.assigneeIds.length === 1 && data.assigneeIds[0] === user.id) {
    await recordSystemNotification({
      title: 'Task Created',
      message: `"${task.title}" created.`,
      type: 'TASK_UPDATE',
      link: `/tasks`,
      userId: user.id,
    });
  }

  return { success: true, task };
}

export async function editTaskCommentAction(commentId: string, newContent: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const existing = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!existing) return { success: false, error: 'Comment not found' };

  // Only author or Super Admin can edit
  if (existing.userId !== user.id && user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Permission denied: You can only edit your own comments.' };
  }

  const updated = await prisma.taskComment.update({
    where: { id: commentId },
    data: {
      content: newContent.trim(),
      isEdited: true,
      editedAt: new Date(),
    },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const staffName = dbUser?.name || 'Staff';

  await prisma.taskActivityLog.create({
    data: {
      taskId: existing.taskId,
      userId: user.id,
      action: 'COMMENT_EDITED',
      details: `${staffName} edited comment to: "${newContent.trim().slice(0, 60)}${newContent.trim().length > 60 ? '...' : ''}"`,
    },
  });

  revalidatePath('/tasks');
  return { success: true, comment: updated };
}

export async function deleteTaskCommentAction(commentId: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const existing = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!existing) return { success: false, error: 'Comment not found' };

  // Only author or Super Admin can delete
  if (existing.userId !== user.id && user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Permission denied: You can only delete your own comments.' };
  }

  await prisma.taskComment.delete({
    where: { id: commentId },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const staffName = dbUser?.name || 'Staff';

  await prisma.taskActivityLog.create({
    data: {
      taskId: existing.taskId,
      userId: user.id,
      action: 'COMMENT_DELETED',
      details: `${staffName} deleted a comment.`,
    },
  });

  revalidatePath('/tasks');
  return { success: true };
}

// 16. Birthday Deduplication & Category Filter Actions
export async function checkDuplicateBirthdayPhoneAction(phone: string) {
  if (!phone || phone.trim().length < 10) return { exists: false };
  const cleanPhone = phone.trim();

  const existingManual = await prisma.manualBirthdayEntry.findFirst({
    where: { phone: cleanPhone },
  });
  if (existingManual) {
    return { exists: true, name: existingManual.name, category: existingManual.category };
  }

  const existingCase = await prisma.case.findFirst({
    where: { mobile: cleanPhone },
    select: { clientName: true },
  });
  if (existingCase) {
    return { exists: true, name: existingCase.clientName, category: 'CUSTOMER' };
  }

  return { exists: false };
}

export async function createManualBirthdayWithCategoryAction(data: {
  name: string;
  phone: string;
  email?: string | null;
  dob: string;
  category?: string; // STAFF, CUSTOMER, CHANNEL
  onBehalfOf?: string | null;
  remark?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!isValidName(data.name)) {
    return { success: false, error: 'Name must contain only alphabetic characters and spaces.' };
  }
  if (!data.phone || !isValid10DigitPhone(data.phone)) {
    return { success: false, error: 'Mobile number must be exactly 10 digits.' };
  }

  const entry = await prisma.manualBirthdayEntry.create({
    data: {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      dob: new Date(data.dob),
      category: data.category || 'CUSTOMER',
      onBehalfOf: data.onBehalfOf?.trim() || null,
      remark: data.remark?.trim() || null,
      createdById: user.id,
    },
  });

  revalidatePath('/birthdays');
  revalidatePath('/dashboard');
  return { success: true, entry };
}

export async function bulkUploadBirthdaysAction(entries: Array<{
  name: string;
  phone?: string | null;
  email?: string | null;
  dob: string;
  category?: string | null;
  onBehalfOf?: string | null;
  remark?: string | null;
}>) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!entries || entries.length === 0) {
    return { success: false, error: 'No entries provided for upload.' };
  }

  const validRecords: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const row = entries[i];
    const rowNum = i + 1;

    if (!row.name || !row.name.trim()) {
      errors.push(`Row #${rowNum}: Name is required`);
      continue;
    }

    // Parse DOB (supports DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
    let parsedDob: Date | null = null;
    const rawDob = (row.dob || '').trim();
    if (rawDob) {
      const dmyMatch = rawDob.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) parsedDob = d;
      } else {
        const d = new Date(rawDob);
        if (!isNaN(d.getTime())) parsedDob = d;
      }
    }

    if (!parsedDob) {
      errors.push(`Row #${rowNum} (${row.name}): Invalid Date of Birth "${rawDob}". Format must be DD/MM/YYYY.`);
      continue;
    }

    const phoneDigits = row.phone ? String(row.phone).replace(/\D/g, '') : '';
    const validPhone = phoneDigits.length === 10 ? phoneDigits : (row.phone ? String(row.phone).trim() : null);

    const rawCat = (row.category || '').toUpperCase().trim();
    const category = ['STAFF', 'CHANNEL', 'CUSTOMER'].includes(rawCat) ? rawCat : 'CUSTOMER';

    validRecords.push({
      name: row.name.trim(),
      phone: validPhone,
      email: row.email ? String(row.email).trim() : null,
      dob: parsedDob,
      category,
      onBehalfOf: row.onBehalfOf ? String(row.onBehalfOf).trim() : 'TheNestGuru Management',
      remark: row.remark ? String(row.remark).trim() : null,
      createdById: user.id,
    });
  }

  if (validRecords.length === 0) {
    return {
      success: false,
      error: 'No valid birthday records found to upload. Please review errors.',
      errors,
    };
  }

  await prisma.manualBirthdayEntry.createMany({
    data: validRecords,
  });

  revalidatePath('/birthdays');
  revalidatePath('/dashboard');

  await recordSystemNotification({
    title: 'Bulk Birthdays Uploaded',
    message: `Successfully uploaded ${validRecords.length} birthday records by ${user.name || 'Staff'}.`,
    type: 'SUCCESS',
    link: `/birthdays`,
  });

  return {
    success: true,
    count: validRecords.length,
    totalSubmitted: entries.length,
    errors,
  };
}

// 17. Staff Personal Profile & Salary Register Actions
export async function updateStaffPersonalDetailsAction(userId: string, data: {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  phone?: string;
  gender?: string;
  dob?: string | null;
  pan?: string;
  panCardUrl?: string | null;
  aadhaar?: string;
  aadhaarCardUrl?: string | null;
  maritalStatus?: string;
  marriageAnniversary?: string | null;
  residentialAddress?: string;
  permanentAddress?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName1?: string;
  emergencyContactRelation1?: string;
  emergencyContactPhone1?: string;
  emergencyContactName2?: string;
  emergencyContactRelation2?: string;
  emergencyContactPhone2?: string;
  dateOfJoining?: string | null;
  educationQualification?: string;
  pastExperience?: string | null;
  photographUrl?: string | null;
  avatarUrl?: string | null;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bloodGroup?: string;
  monthlySalary?: number;
  currentCTC?: number;
  jobRole?: string;
  department?: string;
  employmentType?: string;
  workLocation?: string;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Self edit or Super Admin edit
  if (user.id !== userId && user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Permission denied: You can only edit your own personal details.' };
  }

  if (data.username !== undefined) {
    const cleanUsername = data.username.trim().toLowerCase();
    if (cleanUsername) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: userId },
        },
      });
      if (existingUser) {
        return { success: false, error: 'Username is already taken by another user.' };
      }
    }
  }

  const updatePayload: any = {
    name: data.name ? data.name.trim() : undefined,
    username: data.username !== undefined ? (data.username.trim().toLowerCase() || null) : undefined,
    email: data.email !== undefined ? (data.email.trim().toLowerCase() || null) : undefined,
    phone: data.phone ? data.phone.trim() : undefined,
    gender: data.gender || undefined,
    dob: data.dob ? new Date(data.dob) : null,
    pan: data.pan ? data.pan.trim().toUpperCase() : undefined,
    panCardUrl: data.panCardUrl !== undefined ? data.panCardUrl : undefined,
    aadhaar: data.aadhaar ? data.aadhaar.trim() : undefined,
    aadhaarCardUrl: data.aadhaarCardUrl !== undefined ? data.aadhaarCardUrl : undefined,
    maritalStatus: data.maritalStatus || undefined,
    marriageAnniversary: data.marriageAnniversary ? new Date(data.marriageAnniversary) : null,
    residentialAddress: data.residentialAddress ? data.residentialAddress.trim() : undefined,
    permanentAddress: data.permanentAddress ? data.permanentAddress.trim() : undefined,
    address: data.residentialAddress || data.address ? (data.residentialAddress || data.address || '').trim() : undefined,
    emergencyContactName1: data.emergencyContactName1 ? data.emergencyContactName1.trim() : undefined,
    emergencyContactRelation1: data.emergencyContactRelation1 ? data.emergencyContactRelation1.trim() : undefined,
    emergencyContactPhone1: data.emergencyContactPhone1 ? data.emergencyContactPhone1.trim() : undefined,
    emergencyContactName2: data.emergencyContactName2 ? data.emergencyContactName2.trim() : undefined,
    emergencyContactRelation2: data.emergencyContactRelation2 ? data.emergencyContactRelation2.trim() : undefined,
    emergencyContactPhone2: data.emergencyContactPhone2 ? data.emergencyContactPhone2.trim() : undefined,
    emergencyContact: data.emergencyContactPhone1 || data.emergencyContact ? (data.emergencyContactPhone1 || data.emergencyContact || '').trim() : undefined,
    dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
    educationQualification: data.educationQualification || undefined,
    pastExperience: data.pastExperience !== undefined ? data.pastExperience : undefined,
    photographUrl: data.photographUrl !== undefined ? data.photographUrl : undefined,
    avatarUrl: data.photographUrl || data.avatarUrl || undefined,
    bankName: data.bankName ? data.bankName.trim() : undefined,
    bankAccountNo: data.bankAccountNo ? data.bankAccountNo.trim() : undefined,
    bankIfsc: data.bankIfsc ? data.bankIfsc.trim().toUpperCase() : undefined,
    bloodGroup: data.bloodGroup || undefined,
    monthlySalary: data.monthlySalary !== undefined ? Number(data.monthlySalary) || 0 : undefined,
    currentCTC: data.currentCTC !== undefined ? Number(data.currentCTC) || 0 : undefined,
    jobRole: data.jobRole !== undefined ? data.jobRole.trim() : undefined,
    department: data.department !== undefined ? data.department.trim() : undefined,
    employmentType: data.employmentType !== undefined ? data.employmentType.trim() : undefined,
    workLocation: data.workLocation !== undefined ? data.workLocation.trim() : undefined,
  };

  if (data.password && data.password.trim() !== '') {
    updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
  });

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/profile');
  revalidatePath('/salary');
  revalidatePath('/hrms');
  revalidatePath('/dashboard');
  return { success: true, user: updated };
}

export async function createSalaryRecordAction(data: {
  userId: string;
  month: string;
  basicSalary: number;
  allowances?: number;
  deductions?: number;
  paymentStatus?: string;
  remarks?: string;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Super Admin access required.' };
  }

  const basic = Number(data.basicSalary) || 0;
  const allowances = Number(data.allowances) || 0;
  const deductions = Number(data.deductions) || 0;
  const netPayable = basic + allowances - deductions;

  const record = await prisma.salaryRecord.create({
    data: {
      userId: data.userId,
      month: data.month,
      basicSalary: basic,
      allowances,
      deductions,
      netPayable,
      paymentStatus: data.paymentStatus || 'UNPAID',
      remarks: data.remarks?.trim() || null,
    },
  });

  revalidatePath('/salary');
  return { success: true, record };
}

export async function updateSalaryRecordStatusAction(id: string, paymentStatus: string, remarks?: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Super Admin access required.' };
  }

  const existing = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Salary record not found.' };
  }

  const updated = await prisma.salaryRecord.update({
    where: { id },
    data: {
      paymentStatus,
      paidDate: paymentStatus === 'PAID' ? new Date() : null,
      remarks: remarks !== undefined ? remarks.trim() : undefined,
    },
  });

  // Automatically count into Company Expenses when marked as PAID
  if (paymentStatus === 'PAID' && existing.paymentStatus !== 'PAID') {
    await prisma.expenseRecord.create({
      data: {
        amount: updated.netPayable,
        month: updated.month,
      },
    });
  }

  revalidatePath('/salary');
  revalidatePath('/dashboard');
  revalidatePath('/admin/functionality');
  return { success: true, record: updated };
}

export async function editSalaryRecordAction(
  id: string,
  data: {
    month?: string;
    basicSalary?: number;
    allowances?: number;
    deductions?: number;
    workingDays?: number;
    paidDays?: number;
    lwpDays?: number;
    incentiveEarned?: number;
    paymentStatus?: string;
    remarks?: string;
    linkedCaseId?: string | null;
    linkedCaseName?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Super Admin access required.' };
  }

  const existing = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Salary record not found.' };
  }

  const basic = data.basicSalary !== undefined ? Number(data.basicSalary) : existing.basicSalary;
  const allowances = data.allowances !== undefined ? Number(data.allowances) : existing.allowances;
  const deductions = data.deductions !== undefined ? Number(data.deductions) : existing.deductions;
  const incentive = data.incentiveEarned !== undefined ? Number(data.incentiveEarned) : (existing.incentiveEarned || 0);
  const netPayable = Math.max(0, basic + allowances + incentive - deductions);

  let finalRemarks = data.remarks !== undefined ? (data.remarks.trim() || '') : (existing.remarks || '');
  if (data.linkedCaseName) {
    // Strip old Linked Case tag if present, then append new
    finalRemarks = finalRemarks.replace(/\|\s*Linked Case: [^|]+/g, '').replace(/Linked Case: [^|]+/g, '').trim();
    if (finalRemarks.endsWith('|')) finalRemarks = finalRemarks.slice(0, -1).trim();
    const caseTag = `Linked Case: ${data.linkedCaseName}`;
    finalRemarks = finalRemarks ? `${finalRemarks} | ${caseTag}` : caseTag;
  }

  const updated = await prisma.salaryRecord.update({
    where: { id },
    data: {
      month: data.month && data.month.trim() ? data.month.trim() : existing.month,
      basicSalary: basic,
      allowances,
      deductions,
      workingDays: data.workingDays !== undefined ? data.workingDays : existing.workingDays,
      paidDays: data.paidDays !== undefined ? data.paidDays : existing.paidDays,
      lwpDays: data.lwpDays !== undefined ? data.lwpDays : existing.lwpDays,
      incentiveEarned: incentive,
      netPayable,
      paymentStatus: data.paymentStatus || existing.paymentStatus,
      paidDate: data.paymentStatus === 'PAID' ? (existing.paidDate || new Date()) : null,
      remarks: finalRemarks || null,
    },
  });

  // Automatically count into Company Expenses when marked as PAID
  if (data.paymentStatus === 'PAID' && existing.paymentStatus !== 'PAID') {
    await prisma.expenseRecord.create({
      data: {
        amount: updated.netPayable,
        month: updated.month,
      },
    });
  }

  revalidatePath('/salary');
  revalidatePath('/dashboard');
  revalidatePath('/admin/functionality');
  return { success: true, record: updated };
}

export async function deleteSalaryRecordAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Super Admin access required.' };
  }

  await prisma.salaryRecord.delete({ where: { id } });
  revalidatePath('/salary');
  return { success: true };
}

// 18. Visit Tracker Actions
export async function createVisitRecordAction(data: {
  caseId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  projectName?: string | null;
  projectPrice?: number | null;
  propertyAddress?: string | null;
  visitDate: string;
  visitTime?: string | null;
  staffUserId: string;
  visitType?: string;
  remarks?: string | null;

  // Client's Additional Visit Data Fields:
  builderId?: string | null;
  builderName?: string | null;
  projectType?: string | null;
  projectLaunchDate?: string | null;
  reraStatus?: string | null;
  approvedBanks?: string | null;
  priceRange?: string | null;
  totalUnits?: string | null;
  unitsSold?: string | null;
  paymentPlan?: string | null;
  concernedPersonName?: string | null;
  concernedPersonDesignation?: string | null;
  concernedPersonContact?: string | null;
  officeAddress?: string | null;
  cpName?: string | null;
  cpContact?: string | null;
  cpAddress?: string | null;
  visitFrequency?: string | null;
  nextFollowUpDate?: string | null;
  leadType?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const hasInitialRemark = !!data.remarks?.trim();
  const now = new Date();

  // If builderId is not provided but builderName is, try to match builder
  let resolvedBuilderId = data.builderId || null;
  if (!resolvedBuilderId && data.builderName?.trim()) {
    const matchedBuilder = await prisma.builder.findUnique({
      where: { name: data.builderName.trim() },
      select: { id: true },
    });
    if (matchedBuilder) resolvedBuilderId = matchedBuilder.id;
  }

  const visit = await prisma.visitRecord.create({
    data: {
      caseId: data.caseId || null,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone?.trim() || null,
      projectName: data.projectName?.trim() || null,
      projectPrice: data.projectPrice !== undefined && data.projectPrice !== null && !isNaN(Number(data.projectPrice)) ? Number(data.projectPrice) : null,
      propertyAddress: data.propertyAddress?.trim() || null,
      visitDate: new Date(data.visitDate),
      visitTime: data.visitTime || null,
      staffUserId: data.staffUserId,
      visitType: data.visitType || 'PROPERTY_VERIFICATION',
      remarks: hasInitialRemark ? data.remarks!.trim() : null,
      lastRemarkAt: hasInitialRemark ? now : null,

      // Additional specifications:
      builderId: resolvedBuilderId,
      builderName: data.builderName?.trim() || null,
      projectType: data.projectType?.trim() || null,
      projectLaunchDate: data.projectLaunchDate?.trim() || null,
      reraStatus: data.reraStatus?.trim() || null,
      approvedBanks: data.approvedBanks?.trim() || null,
      priceRange: data.priceRange?.trim() || null,
      totalUnits: data.totalUnits?.trim() || null,
      unitsSold: data.unitsSold?.trim() || null,
      paymentPlan: data.paymentPlan?.trim() || null,
      concernedPersonName: data.concernedPersonName?.trim() || null,
      concernedPersonDesignation: data.concernedPersonDesignation?.trim() || null,
      concernedPersonContact: data.concernedPersonContact?.trim() || null,
      officeAddress: data.officeAddress?.trim() || null,
      cpName: data.cpName?.trim() || null,
      cpContact: data.cpContact?.trim() || null,
      cpAddress: data.cpAddress?.trim() || null,
      visitFrequency: data.visitFrequency?.trim() || null,
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      leadType: data.leadType?.trim() || 'Warm',

      ...(hasInitialRemark
        ? {
            followUps: {
              create: {
                remark: data.remarks!.trim(),
                authorName: user.name || 'Staff Member',
                authorRole: user.role || 'STAFF',
                createdAt: now,
              },
            },
          }
        : {}),
    },
    include: {
      staff: { select: { id: true, name: true, role: true } },
      case: { select: { id: true, clientName: true, product: true } },
      followUps: { orderBy: { createdAt: 'desc' } },
    },
  });

  revalidatePath('/visits');
  revalidatePath('/dashboard');

  if (data.staffUserId !== user.id) {
    await recordSystemNotification({
      title: 'New Visit Scheduled for You',
      message: `Visit for ${data.clientName} (${data.projectName || data.propertyAddress || 'Property'}) assigned to you on ${data.visitDate} by ${user.name || 'Staff'}.`,
      type: 'INFO',
      link: `/visits`,
      userId: data.staffUserId,
    });
  } else {
    await recordSystemNotification({
      title: 'Visit Scheduled',
      message: `Visit for ${data.clientName} (${data.projectName || data.propertyAddress || 'Property'}) scheduled on ${data.visitDate}.`,
      type: 'INFO',
      link: `/visits`,
      userId: user.id,
    });
  }

  return { success: true, visit };
}

export async function addVisitFollowUpAction(data: {
  visitId: string;
  remark: string;
  markCompleted?: boolean;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!data.remark?.trim()) {
    return { success: false, error: 'Remark is required' };
  }

  const trimmedRemark = data.remark.trim();
  const now = new Date();

  // Create follow-up item
  const followUp = await prisma.visitFollowUp.create({
    data: {
      visitId: data.visitId,
      remark: trimmedRemark,
      authorName: user.name || 'Staff Member',
      authorRole: user.role || 'STAFF',
      createdAt: now,
    },
  });

  // Update visit record: lastRemarkAt = now, remarks = latest remark, status if markCompleted
  const updatedVisit = await prisma.visitRecord.update({
    where: { id: data.visitId },
    data: {
      remarks: trimmedRemark,
      lastRemarkAt: now,
      ...(data.markCompleted ? { status: 'COMPLETED' } : {}),
    },
    include: {
      staff: { select: { id: true, name: true, role: true } },
      case: { select: { id: true, clientName: true, product: true } },
      followUps: { orderBy: { createdAt: 'desc' } },
    },
  });

  revalidatePath('/visits');
  revalidatePath('/dashboard');

  await recordSystemNotification({
    title: 'Visit Follow-Up Logged',
    message: `Follow-up on ${updatedVisit.clientName}: "${trimmedRemark.slice(0, 70)}" (3-day timer refreshed).`,
    type: 'SUCCESS',
    link: `/visits`,
  });

  return { success: true, followUp, visit: updatedVisit };
}

export async function updateVisitStatusAction(id: string, status: string, remarks?: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const now = new Date();
  const hasRemark = !!remarks?.trim();

  if (hasRemark) {
    await prisma.visitFollowUp.create({
      data: {
        visitId: id,
        remark: remarks!.trim(),
        authorName: user.name || 'Staff Member',
        authorRole: user.role || 'STAFF',
        createdAt: now,
      },
    });
  }

  const updated = await prisma.visitRecord.update({
    where: { id },
    data: {
      status,
      remarks: hasRemark ? remarks!.trim() : undefined,
      lastRemarkAt: hasRemark ? now : undefined,
    },
    include: {
      staff: { select: { id: true, name: true, role: true } },
      case: { select: { id: true, clientName: true, product: true } },
      followUps: { orderBy: { createdAt: 'desc' } },
    },
  });

  revalidatePath('/visits');

  await recordSystemNotification({
    title: 'Visit Status Changed',
    message: `Visit for ${updated.clientName} status marked as ${status}.`,
    type: 'SUCCESS',
    link: `/visits`,
  });

  return { success: true, visit: updated };
}

export async function updateVisitRecordAction(data: {
  id: string;
  caseId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  projectName?: string | null;
  projectPrice?: number | null;
  propertyAddress?: string | null;
  visitDate: string;
  visitTime?: string | null;
  staffUserId: string;
  visitType?: string;
  status?: string;
  remarks?: string | null;

  // Additional specifications:
  builderId?: string | null;
  builderName?: string | null;
  projectType?: string | null;
  projectLaunchDate?: string | null;
  reraStatus?: string | null;
  approvedBanks?: string | null;
  priceRange?: string | null;
  totalUnits?: string | null;
  unitsSold?: string | null;
  paymentPlan?: string | null;
  concernedPersonName?: string | null;
  concernedPersonDesignation?: string | null;
  concernedPersonContact?: string | null;
  officeAddress?: string | null;
  cpName?: string | null;
  cpContact?: string | null;
  cpAddress?: string | null;
  visitFrequency?: string | null;
  nextFollowUpDate?: string | null;
  leadType?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  let resolvedBuilderId = data.builderId;
  if (resolvedBuilderId === undefined && data.builderName?.trim()) {
    const matchedBuilder = await prisma.builder.findUnique({
      where: { name: data.builderName.trim() },
      select: { id: true },
    });
    if (matchedBuilder) resolvedBuilderId = matchedBuilder.id;
  }

  const updated = await prisma.visitRecord.update({
    where: { id: data.id },
    data: {
      caseId: data.caseId || null,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone?.trim() || null,
      projectName: data.projectName?.trim() || null,
      projectPrice: data.projectPrice !== undefined && data.projectPrice !== null && !isNaN(Number(data.projectPrice)) ? Number(data.projectPrice) : null,
      propertyAddress: data.propertyAddress?.trim() || null,
      visitDate: new Date(data.visitDate),
      visitTime: data.visitTime || null,
      staffUserId: data.staffUserId,
      visitType: data.visitType || 'PROPERTY_VERIFICATION',
      status: data.status || undefined,
      remarks: data.remarks?.trim() || null,

      // Additional specifications:
      builderId: resolvedBuilderId !== undefined ? (resolvedBuilderId || null) : undefined,
      builderName: data.builderName !== undefined ? (data.builderName?.trim() || null) : undefined,
      projectType: data.projectType !== undefined ? (data.projectType?.trim() || null) : undefined,
      projectLaunchDate: data.projectLaunchDate !== undefined ? (data.projectLaunchDate?.trim() || null) : undefined,
      reraStatus: data.reraStatus !== undefined ? (data.reraStatus?.trim() || null) : undefined,
      approvedBanks: data.approvedBanks !== undefined ? (data.approvedBanks?.trim() || null) : undefined,
      priceRange: data.priceRange !== undefined ? (data.priceRange?.trim() || null) : undefined,
      totalUnits: data.totalUnits !== undefined ? (data.totalUnits?.trim() || null) : undefined,
      unitsSold: data.unitsSold !== undefined ? (data.unitsSold?.trim() || null) : undefined,
      paymentPlan: data.paymentPlan !== undefined ? (data.paymentPlan?.trim() || null) : undefined,
      concernedPersonName: data.concernedPersonName !== undefined ? (data.concernedPersonName?.trim() || null) : undefined,
      concernedPersonDesignation: data.concernedPersonDesignation !== undefined ? (data.concernedPersonDesignation?.trim() || null) : undefined,
      concernedPersonContact: data.concernedPersonContact !== undefined ? (data.concernedPersonContact?.trim() || null) : undefined,
      officeAddress: data.officeAddress !== undefined ? (data.officeAddress?.trim() || null) : undefined,
      cpName: data.cpName !== undefined ? (data.cpName?.trim() || null) : undefined,
      cpContact: data.cpContact !== undefined ? (data.cpContact?.trim() || null) : undefined,
      cpAddress: data.cpAddress !== undefined ? (data.cpAddress?.trim() || null) : undefined,
      visitFrequency: data.visitFrequency !== undefined ? (data.visitFrequency?.trim() || null) : undefined,
      nextFollowUpDate: data.nextFollowUpDate !== undefined ? (data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null) : undefined,
      leadType: data.leadType !== undefined ? (data.leadType?.trim() || 'Warm') : undefined,
    },
    include: {
      staff: { select: { id: true, name: true, role: true } },
      case: { select: { id: true, clientName: true, product: true } },
      followUps: { orderBy: { createdAt: 'desc' } },
    },
  });

  revalidatePath('/visits');
  revalidatePath('/dashboard');

  await recordSystemNotification({
    title: 'Visit Details Updated',
    message: `Visit for ${data.clientName} (${data.projectName || 'Property'}) modified by ${user.name || 'Staff'}.`,
    type: 'INFO',
    link: `/visits`,
  });

  return { success: true, visit: updated };
}

export async function deleteVisitRecordAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  await prisma.visitRecord.delete({
    where: { id },
  });

  revalidatePath('/visits');
  revalidatePath('/dashboard');
  return { success: true };
}

// 19. Dynamic Masters & Target Category Actions

export async function createTargetCategoryAction(name: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  const cat = await prisma.targetCategoryMaster.create({
    data: { name: name.trim() },
  });

  revalidatePath('/admin/checklist-metrics');
  revalidatePath('/cases/new');
  return { success: true, cat };
}

export async function deleteTargetCategoryAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  await prisma.targetCategoryMaster.delete({ where: { id } });
  revalidatePath('/admin/checklist-metrics');
  revalidatePath('/cases/new');
  return { success: true };
}

// 20. Dashboard Parameters Customization Action
export async function updateDashboardConfigAction(configJson: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: { dashboardConfig: configJson },
    create: { id: 'default', dashboardConfig: configJson },
  });

  revalidatePath('/dashboard');
  return { success: true };
}

// ==========================================
// 21. DYNAMIC WORKFLOW STAGES MASTER ACTIONS
// ==========================================
export async function getWorkflowStagesAction() {
  const stages = await prisma.workflowStageMaster.findMany({
    orderBy: { stageNumber: 'asc' },
  });
  return { success: true, stages };
}

export async function createWorkflowStageAction(data: {
  stageNumber: number;
  name: string;
  description?: string;
  color?: string;
  incentiveAmount?: number;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (!data.name?.trim() || !data.stageNumber) {
    return { success: false, error: 'Stage Number and Name are required.' };
  }

  const existing = await prisma.workflowStageMaster.findUnique({
    where: { stageNumber: data.stageNumber },
  });
  if (existing) {
    return { success: false, error: `Stage ${data.stageNumber} already exists. Please pick another number or edit the existing stage.` };
  }

  const stage = await prisma.workflowStageMaster.create({
    data: {
      stageNumber: data.stageNumber,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      color: data.color || '#3b82f6',
      incentiveAmount: data.incentiveAmount || 0,
      isActive: true,
    },
  });

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  revalidatePath('/admin/functionality');
  return { success: true, stage };
}

export async function updateWorkflowStageAction(
  id: string,
  data: {
    stageNumber?: number;
    name?: string;
    description?: string;
    color?: string;
    incentiveAmount?: number;
    isActive?: boolean;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  const updateData: any = {};
  if (data.stageNumber !== undefined) updateData.stageNumber = data.stageNumber;
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description.trim() || null;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.incentiveAmount !== undefined) updateData.incentiveAmount = data.incentiveAmount;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const stage = await prisma.workflowStageMaster.update({
    where: { id },
    data: updateData,
  });

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  revalidatePath('/admin/functionality');
  return { success: true, stage };
}

export async function deleteWorkflowStageAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  await prisma.workflowStageMaster.delete({ where: { id } });
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  revalidatePath('/admin/functionality');
  return { success: true };
}

// ==========================================
// 22. ENTITY / CUSTOMER TYPE MASTER ACTIONS
// ==========================================
export async function getCustomerTypesAction() {
  const types = await prisma.customerTypeMaster.findMany({
    orderBy: { name: 'asc' },
  });
  return { success: true, types };
}

export async function createCustomerTypeAction(data: { name: string; description?: string }) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Entity name is required.' };
  }

  const cleanName = data.name.trim();
  const type = await prisma.customerTypeMaster.upsert({
    where: { name: cleanName },
    update: { description: data.description?.trim() || null },
    create: { name: cleanName, description: data.description?.trim() || null },
  });

  // Keep targetCategoryMaster in sync for backwards compatibility
  await prisma.targetCategoryMaster.upsert({
    where: { name: cleanName },
    update: {},
    create: { name: cleanName },
  });

  revalidatePath('/cases');
  revalidatePath('/cases/new');
  revalidatePath('/admin/customer-types');
  revalidatePath('/admin/functionality');
  return { success: true, type };
}

export async function updateCustomerTypeAction(id: string, data: { name: string; description?: string }) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Entity name is required.' };
  }

  const existing = await prisma.customerTypeMaster.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Entity type not found.' };
  }

  const cleanName = data.name.trim();
  const oldName = existing.name;

  // Check if another type has the same name
  if (cleanName.toLowerCase() !== oldName.toLowerCase()) {
    const duplicate = await prisma.customerTypeMaster.findFirst({
      where: {
        name: cleanName,
        NOT: { id },
      },
    });
    if (duplicate) {
      return { success: false, error: 'An entity type with this name already exists.' };
    }
  }

  const updated = await prisma.customerTypeMaster.update({
    where: { id },
    data: {
      name: cleanName,
      description: data.description !== undefined ? (data.description.trim() || null) : existing.description,
    },
  });

  // Keep targetCategoryMaster in sync
  if (oldName !== cleanName) {
    const targetCat = await prisma.targetCategoryMaster.findUnique({ where: { name: oldName } });
    if (targetCat) {
      await prisma.targetCategoryMaster.update({
        where: { name: oldName },
        data: { name: cleanName },
      });
    } else {
      await prisma.targetCategoryMaster.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName },
      });
    }
  }

  revalidatePath('/cases');
  revalidatePath('/cases/new');
  revalidatePath('/admin/customer-types');
  revalidatePath('/admin/functionality');
  return { success: true, type: updated };
}

export async function deleteCustomerTypeAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  const existing = await prisma.customerTypeMaster.findUnique({ where: { id } });
  if (existing) {
    await prisma.customerTypeMaster.delete({ where: { id } });
    await prisma.targetCategoryMaster.deleteMany({ where: { name: existing.name } });
  }

  revalidatePath('/cases');
  revalidatePath('/cases/new');
  revalidatePath('/admin/customer-types');
  revalidatePath('/admin/functionality');
  return { success: true };
}

// ==========================================
// 23. CASE FILING STATUSES MASTER ACTIONS
// ==========================================
export async function getCaseStatusMastersAction() {
  try {
    const statuses = await prisma.caseStatusMaster.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return { success: true, statuses };
  } catch (error: any) {
    return { success: false, error: error.message, statuses: [] };
  }
}

export async function createCaseStatusMasterAction(data: {
  name: string;
  color?: string;
  description?: string;
  displayOrder?: number;
  isDefault?: boolean;
}) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Status name is required.' };
  }

  const cleanName = data.name.trim();

  // Check duplicate
  const existing = await prisma.caseStatusMaster.findUnique({
    where: { name: cleanName },
  });
  if (existing) {
    return { success: false, error: 'A case status with this name already exists.' };
  }

  const status = await prisma.caseStatusMaster.create({
    data: {
      name: cleanName,
      color: data.color?.trim() || '#3b82f6',
      description: data.description?.trim() || null,
      displayOrder: data.displayOrder ?? 0,
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath('/cases');
  revalidatePath('/admin/case-statuses');
  return { success: true, status };
}

export async function updateCaseStatusMasterAction(
  id: string,
  data: {
    name: string;
    color?: string;
    description?: string;
    displayOrder?: number;
    isDefault?: boolean;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Status name is required.' };
  }

  const existing = await prisma.caseStatusMaster.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Status not found.' };
  }

  const cleanName = data.name.trim();
  const oldName = existing.name;

  if (cleanName.toLowerCase() !== oldName.toLowerCase()) {
    const duplicate = await prisma.caseStatusMaster.findFirst({
      where: {
        name: cleanName,
        NOT: { id },
      },
    });
    if (duplicate) {
      return { success: false, error: 'A status with this name already exists.' };
    }

    // Cascade update to existing cases so cases don't lose status
    await prisma.case.updateMany({
      where: { status: oldName },
      data: { status: cleanName },
    });
  }

  const updated = await prisma.caseStatusMaster.update({
    where: { id },
    data: {
      name: cleanName,
      color: data.color?.trim() || existing.color,
      description: data.description !== undefined ? (data.description.trim() || null) : existing.description,
      displayOrder: data.displayOrder !== undefined ? data.displayOrder : existing.displayOrder,
      isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
    },
  });

  revalidatePath('/cases');
  revalidatePath('/admin/case-statuses');
  return { success: true, status: updated };
}

export async function deleteCaseStatusMasterAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized.' };
  }

  const existing = await prisma.caseStatusMaster.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Status not found.' };
  }

  // Prevent deleting if it's the last status
  const count = await prisma.caseStatusMaster.count();
  if (count <= 1) {
    return { success: false, error: 'At least one case status must exist in the system.' };
  }

  await prisma.caseStatusMaster.delete({ where: { id } });

  revalidatePath('/cases');
  revalidatePath('/admin/case-statuses');
  return { success: true };
}

// ==========================================
// 22.1 PROPERTY SCOPES DYNAMIC ACTIONS
// ==========================================
export async function getPropertyScopesAction() {
  try {
    const scopes = await prisma.propertyScopeMaster.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, scopes };
  } catch (error: any) {
    return { success: false, error: error.message, scopes: [] };
  }
}

export async function createPropertyScopeAction(data: {
  name: string;
  description?: string;
}) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Property scope name is required.' };
  }

  const cleanName = data.name.trim();

  const existing = await prisma.propertyScopeMaster.findUnique({
    where: { name: cleanName },
  });
  if (existing) {
    return { success: false, error: 'A property scope with this name already exists.' };
  }

  const scope = await prisma.propertyScopeMaster.create({
    data: {
      name: cleanName,
      description: data.description?.trim() || null,
    },
  });

  revalidatePath('/admin/property-scopes');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true, scope };
}

export async function updatePropertyScopeAction(
  id: string,
  data: {
    name: string;
    description?: string;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Property scope name is required.' };
  }

  const existing = await prisma.propertyScopeMaster.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Property scope not found.' };
  }

  const cleanName = data.name.trim();
  const oldName = existing.name;

  if (cleanName.toLowerCase() !== oldName.toLowerCase()) {
    const duplicate = await prisma.propertyScopeMaster.findFirst({
      where: {
        name: cleanName,
        NOT: { id },
      },
    });
    if (duplicate) {
      return { success: false, error: 'Another property scope already has this name.' };
    }
  }

  const updated = await prisma.propertyScopeMaster.update({
    where: { id },
    data: {
      name: cleanName,
      description: data.description?.trim() || null,
    },
  });

  revalidatePath('/admin/property-scopes');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true, scope: updated };
}

export async function deletePropertyScopeAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized.' };
  }

  const existing = await prisma.propertyScopeMaster.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Property scope not found.' };
  }

  const count = await prisma.propertyScopeMaster.count();
  if (count <= 1) {
    return { success: false, error: 'At least one property scope must exist in the system.' };
  }

  await prisma.propertyScopeMaster.delete({ where: { id } });

  revalidatePath('/admin/property-scopes');
  revalidatePath('/admin/checklist-templates');
  revalidatePath('/cases');
  revalidatePath('/cases/new');
  return { success: true };
}

// ==========================================
// 23. SUB-PRODUCTS DYNAMIC ACTIONS
// ==========================================
export async function getSubProductsAction(productId?: string) {
  const where = productId ? { productId } : {};
  const subProducts = await prisma.subProductMaster.findMany({
    where,
    include: { product: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  return { success: true, subProducts };
}

export async function createSubProductAction(data: { productId: string; name: string }) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (!data.productId || !data.name?.trim()) {
    return { success: false, error: 'Product and Sub-product name are required.' };
  }

  const cleanName = data.name.trim();
  const subProduct = await prisma.subProductMaster.upsert({
    where: {
      productId_name: {
        productId: data.productId,
        name: cleanName,
      },
    },
    update: {},
    create: {
      productId: data.productId,
      name: cleanName,
    },
  });

  revalidatePath('/cases/new');
  revalidatePath('/admin/products');
  revalidatePath('/admin/functionality');
  return { success: true, subProduct };
}

export async function updateSubProductAction(id: string, data: { name: string; productId?: string }) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Sub-product name is required.' };
  }

  const cleanName = data.name.trim();
  const existing = await prisma.subProductMaster.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Sub-product not found.' };
  }

  const targetProductId = data.productId || existing.productId;

  // Check if duplicate exists under targetProductId
  const duplicate = await prisma.subProductMaster.findFirst({
    where: {
      productId: targetProductId,
      name: cleanName,
      NOT: { id },
    },
  });

  if (duplicate) {
    return { success: false, error: 'A sub-product with this name already exists under this product.' };
  }

  const updated = await prisma.subProductMaster.update({
    where: { id },
    data: {
      name: cleanName,
      productId: targetProductId,
    },
    include: { product: { select: { id: true, name: true } } },
  });

  revalidatePath('/cases/new');
  revalidatePath('/admin/products');
  revalidatePath('/admin/functionality');
  return { success: true, subProduct: updated };
}

export async function deleteSubProductAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  await prisma.subProductMaster.delete({ where: { id } });
  revalidatePath('/cases/new');
  revalidatePath('/admin/products');
  revalidatePath('/admin/functionality');
  return { success: true };
}

// ==========================================
// 24. EISENHOWER TASKS & SELF-TASKS ACTIONS
// ==========================================
export async function createSelfTaskAction(data: {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isUrgent?: boolean;
  isImportant?: boolean;
  dueDate?: string | null;
  dueTime?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!data.title?.trim()) {
    return { success: false, error: 'Task title is required.' };
  }

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority || (data.isUrgent ? 'URGENT' : 'MEDIUM'),
      isUrgent: data.isUrgent ?? false,
      isImportant: data.isImportant ?? false,
      isSelfTask: true,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      dueTime: data.dueTime || null,
      assignedToId: user.id,
      createdById: user.id,
      assignees: {
        create: [{ userId: user.id }],
      },
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { success: true, task };
}

export async function updateTaskEisenhowerAction(
  taskId: string,
  data: { isUrgent: boolean; isImportant: boolean }
) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      isUrgent: data.isUrgent,
      isImportant: data.isImportant,
      priority: data.isUrgent ? 'URGENT' : data.isImportant ? 'HIGH' : 'MEDIUM',
    },
  });

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { success: true, task };
}

export async function logTaskTimeSpentAction(taskId: string, minutes: number) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!minutes || minutes <= 0) {
    return { success: false, error: 'Valid minutes required.' };
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      timeSpentMinutes: { increment: minutes },
    },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  await prisma.taskActivityLog.create({
    data: {
      taskId,
      userId: user.id,
      action: 'TIME_SPENT_LOGGED',
      details: `${dbUser?.name || 'Staff'} logged ${minutes} minutes spent on this task.`,
    },
  });

  revalidatePath('/tasks');
  return { success: true, task };
}

// ==========================================
// 25. CHANNEL PARTNER CHILD ACCOUNTS
// ==========================================
export async function getChildChannelAccountsAction(parentChannelId?: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const where: any = { role: 'CHANNEL' };
  if (parentChannelId) {
    where.parentChannelId = parentChannelId;
  } else {
    where.parentChannelId = { not: null };
  }

  const childAccounts = await prisma.user.findMany({
    where,
    include: { parentChannel: { select: { id: true, name: true, email: true } } },
    orderBy: { name: 'asc' },
  });

  return { success: true, childAccounts };
}

export async function createChildChannelAccountAction(data: {
  parentChannelId?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
}) {
  const user = await getAuthUser();
  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  let effectiveParentId = data.parentChannelId;
  if (user.role === 'CHANNEL') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { parentChannelId: true },
    });
    effectiveParentId = dbUser?.parentChannelId || user.id;
  } else if (user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin or Channel Partner access required.' };
  }

  if (!data.name?.trim() || !data.username?.trim() || !data.password?.trim() || !effectiveParentId) {
    return { success: false, error: 'Parent Partner, Name, Username and Password are required.' };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: data.username.trim().toLowerCase() },
        { email: data.email?.trim() ? data.email.trim().toLowerCase() : undefined },
      ],
    },
  });

  if (existing) {
    return { success: false, error: 'A user with this username or email already exists.' };
  }

  const passwordHash = await bcrypt.hash(data.password.trim(), 10);

  const childUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      username: data.username.trim().toLowerCase(),
      email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
      phone: data.phone?.trim() || null,
      passwordHash,
      role: 'CHANNEL',
      accessPermission: 'VIEW', // Child channels are strictly VIEW only
      parentChannelId: effectiveParentId,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/admin/users');
  return { success: true, user: childUser };
}

export async function deleteChildChannelAccountAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  if (user.role !== 'SUPER_ADMIN') {
    if (user.role === 'CHANNEL') {
      const target = await prisma.user.findUnique({ where: { id }, select: { parentChannelId: true } });
      if (!target || target.parentChannelId !== user.id) {
        return { success: false, error: 'Unauthorized to delete this sub-account.' };
      }
    } else {
      return { success: false, error: 'Super Admin or Channel Partner access required.' };
    }
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath('/dashboard');
  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateChildChannelAccountAction(data: {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  password?: string;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  const target = await prisma.user.findUnique({
    where: { id: data.id },
    select: { id: true, parentChannelId: true, role: true },
  });

  if (!target || !target.parentChannelId) {
    return { success: false, error: 'Child account not found.' };
  }

  if (user.role !== 'SUPER_ADMIN') {
    if (user.role === 'CHANNEL') {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { parentChannelId: true },
      });
      const effectiveParentId = dbUser?.parentChannelId || user.id;
      if (target.parentChannelId !== effectiveParentId) {
        return { success: false, error: 'Unauthorized to edit this child account.' };
      }
    } else {
      return { success: false, error: 'Super Admin or Channel Partner access required.' };
    }
  }

  if (!data.name?.trim() || !data.username?.trim()) {
    return { success: false, error: 'Name and Username are required.' };
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: { not: data.id },
      OR: [
        { username: data.username.trim().toLowerCase() },
        { email: data.email?.trim() ? data.email.trim().toLowerCase() : undefined },
      ],
    },
  });

  if (existing) {
    return { success: false, error: 'A user with this username or email already exists.' };
  }

  const updatePayload: any = {
    name: data.name.trim(),
    username: data.username.trim().toLowerCase(),
    email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
    phone: data.phone?.trim() || null,
    accessPermission: 'VIEW', // Child channels are strictly VIEW only!
  };

  if (data.password && data.password.trim()) {
    updatePayload.passwordHash = await bcrypt.hash(data.password.trim(), 10);
  }

  const updated = await prisma.user.update({
    where: { id: data.id },
    data: updatePayload,
  });

  revalidatePath('/dashboard');
  revalidatePath('/admin/users');
  return { success: true, user: updated };
}

export async function createChannelPartnerAction(data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  firmName?: string;
  password?: string;
  dob?: string;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  if (!data.name?.trim()) {
    return { success: false, error: 'Partner Name is required.' };
  }
  if (!data.phone?.trim()) {
    return { success: false, error: 'Phone Number is required.' };
  }

  const cleanPhone = data.phone.trim();
  const rawPassword = data.password?.trim() || 'NestGuru@123';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const baseUsername = data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const uniqueSuffix = cleanPhone.slice(-4) || Math.floor(1000 + Math.random() * 9000).toString();
  let username = `cp_${baseUsername}_${uniqueSuffix}`;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        ...(data.email?.trim() ? [{ email: data.email.trim().toLowerCase() }] : []),
      ],
    },
  });

  if (existing) {
    username = `cp_${baseUsername}_${Date.now().toString().slice(-4)}`;
  }

  const newChannel = await prisma.user.create({
    data: {
      name: data.name.trim(),
      username,
      email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
      phone: cleanPhone,
      address: data.address?.trim() || null,
      jobRole: data.firmName?.trim() || 'Channel Partner',
      dob: data.dob ? new Date(data.dob) : null,
      passwordHash,
      role: 'CHANNEL',
      accessPermission: 'VIEW', // View Access By Default
    },
  });

  revalidatePath('/visits');
  revalidatePath('/visits/channel-partners');
  revalidatePath('/admin/users');
  return { success: true, partner: newChannel };
}

export async function getChannelPartnersAction() {
  const partners = await prisma.user.findMany({
    where: { role: 'CHANNEL' },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      address: true,
      jobRole: true,
      dob: true,
      accessPermission: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return { success: true, partners };
}

export async function updateChannelPartnerAction(data: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  firmName?: string;
  password?: string;
  dob?: string;
  accessPermission?: string;
}) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL' || user.accessPermission === 'VIEW') {
    return { success: false, error: 'Unauthorized to update channel partner.' };
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Partner Name is required.' };
  }
  if (!data.phone?.trim()) {
    return { success: false, error: 'Contact Number is required.' };
  }

  const existing = await prisma.user.findUnique({
    where: { id: data.id },
  });
  if (!existing || existing.role !== 'CHANNEL') {
    return { success: false, error: 'Channel partner not found.' };
  }

  const updateData: any = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email?.trim() ? data.email.trim().toLowerCase() : null,
    address: data.address?.trim() || null,
    jobRole: data.firmName?.trim() || 'Channel Partner',
    dob: data.dob ? new Date(data.dob) : null,
    accessPermission: data.accessPermission || existing.accessPermission || 'VIEW',
  };

  if (data.password?.trim()) {
    updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
  }

  const updated = await prisma.user.update({
    where: { id: data.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      address: true,
      jobRole: true,
      dob: true,
      accessPermission: true,
      createdAt: true,
    },
  });

  revalidatePath('/visits');
  revalidatePath('/visits/channel-partners');
  revalidatePath('/admin/users');
  return { success: true, partner: updated };
}

export async function deleteChannelPartnerAction(id: string) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL' || user.accessPermission === 'VIEW') {
    return { success: false, error: 'Permission denied: Unauthorized to delete channel partners.' };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
  });
  if (!existing || existing.role !== 'CHANNEL') {
    return { success: false, error: 'Channel partner not found.' };
  }

  await prisma.user.delete({
    where: { id },
  });

  revalidatePath('/visits');
  revalidatePath('/visits/channel-partners');
  revalidatePath('/admin/users');
  return { success: true };
}

// ==========================================
// 25B. ROLES & ACCESS PERMISSIONS MASTER
// ==========================================
export interface RoleMatrixItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  baseRole: 'SUPER_ADMIN' | 'TEAM_LEADER' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission: 'EDIT' | 'VIEW';
  modules: {
    cases: 'FULL' | 'VIEW' | 'ASSIGNED_ONLY' | 'NONE';
    tasks: 'FULL' | 'ASSIGNED_ONLY' | 'NONE';
    visits: 'FULL' | 'ASSIGNED_ONLY' | 'NONE';
    hrms: 'FULL' | 'VIEW' | 'NONE';
    salary: 'FULL' | 'MY_SLIP' | 'NONE';
    checklist: 'FULL' | 'VIEW' | 'NONE';
    settings: 'FULL' | 'VIEW' | 'NONE';
  };
  createdAt?: string;
}

const DEFAULT_ROLES_MATRIX: RoleMatrixItem[] = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full unrestricted system administration & security controls',
    isSystem: true,
    baseRole: 'SUPER_ADMIN',
    accessPermission: 'EDIT',
    modules: {
      cases: 'FULL',
      tasks: 'FULL',
      visits: 'FULL',
      hrms: 'FULL',
      salary: 'FULL',
      checklist: 'FULL',
      settings: 'FULL',
    },
  },
  {
    id: 'TEAM_LEADER',
    name: 'Team Leader',
    description: 'Oversee team members, case operations and task delegation',
    isSystem: true,
    baseRole: 'TEAM_LEADER',
    accessPermission: 'EDIT',
    modules: {
      cases: 'FULL',
      tasks: 'FULL',
      visits: 'FULL',
      hrms: 'VIEW',
      salary: 'MY_SLIP',
      checklist: 'VIEW',
      settings: 'NONE',
    },
  },
  {
    id: 'TEAM_MEMBER',
    name: 'Team Member',
    description: 'Standard back-office staff managing cases and checklists',
    isSystem: true,
    baseRole: 'TEAM_MEMBER',
    accessPermission: 'EDIT',
    modules: {
      cases: 'FULL',
      tasks: 'ASSIGNED_ONLY',
      visits: 'ASSIGNED_ONLY',
      hrms: 'VIEW',
      salary: 'MY_SLIP',
      checklist: 'VIEW',
      settings: 'NONE',
    },
  },
  {
    id: 'SALES',
    name: 'Sales Lead',
    description: 'Lead generation, sales intake and customer engagement',
    isSystem: true,
    baseRole: 'SALES',
    accessPermission: 'EDIT',
    modules: {
      cases: 'FULL',
      tasks: 'FULL',
      visits: 'FULL',
      hrms: 'VIEW',
      salary: 'MY_SLIP',
      checklist: 'VIEW',
      settings: 'NONE',
    },
  },
  {
    id: 'OPERATION',
    name: 'Operation Lead',
    description: 'Loan verification, document validation and disbursements',
    isSystem: true,
    baseRole: 'OPERATION',
    accessPermission: 'EDIT',
    modules: {
      cases: 'FULL',
      tasks: 'FULL',
      visits: 'FULL',
      hrms: 'VIEW',
      salary: 'MY_SLIP',
      checklist: 'VIEW',
      settings: 'NONE',
    },
  },
  {
    id: 'CHANNEL',
    name: 'Channel Partner',
    description: 'External broker/partner with restricted view-only case tracking',
    isSystem: true,
    baseRole: 'CHANNEL',
    accessPermission: 'VIEW',
    modules: {
      cases: 'ASSIGNED_ONLY',
      tasks: 'NONE',
      visits: 'NONE',
      hrms: 'NONE',
      salary: 'NONE',
      checklist: 'NONE',
      settings: 'NONE',
    },
  },
];

export async function getRolesMatrixAction() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'roles_matrix_config' },
    });

    let customRoles: RoleMatrixItem[] = [];
    if (setting?.dashboardConfig) {
      try {
        customRoles = JSON.parse(setting.dashboardConfig);
      } catch (e) {
        customRoles = [];
      }
    }

    // Merge system roles and custom roles
    const allRoles = [...DEFAULT_ROLES_MATRIX];
    for (const custom of customRoles) {
      if (!allRoles.some((r) => r.id === custom.id)) {
        allRoles.push(custom);
      }
    }

    // Get active user count per role
    const userRoleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const countMap: Record<string, number> = {};
    userRoleCounts.forEach((u) => {
      countMap[u.role] = u._count.id;
    });

    return { success: true, roles: allRoles, userCounts: countMap };
  } catch (error) {
    console.error('Error in getRolesMatrixAction:', error);
    return { success: true, roles: DEFAULT_ROLES_MATRIX, userCounts: {} };
  }
}

export async function saveCustomRoleAction(roleData: {
  id?: string;
  name: string;
  description?: string;
  baseRole: 'SUPER_ADMIN' | 'TEAM_LEADER' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission: 'EDIT' | 'VIEW';
  modules: {
    cases: 'FULL' | 'VIEW' | 'ASSIGNED_ONLY' | 'NONE';
    tasks: 'FULL' | 'ASSIGNED_ONLY' | 'NONE';
    visits: 'FULL' | 'ASSIGNED_ONLY' | 'NONE';
    hrms: 'FULL' | 'VIEW' | 'NONE';
    salary: 'FULL' | 'MY_SLIP' | 'NONE';
    checklist: 'FULL' | 'VIEW' | 'NONE';
    settings: 'FULL' | 'VIEW' | 'NONE';
  };
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required to manage roles.' };
  }

  if (!roleData.name?.trim()) {
    return { success: false, error: 'Role name is required.' };
  }

  const roleId = roleData.id || ('ROLE_' + roleData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_'));

  // Fetch current custom roles
  const setting = await prisma.systemSetting.findUnique({
    where: { id: 'roles_matrix_config' },
  });

  let customRoles: RoleMatrixItem[] = [];
  if (setting?.dashboardConfig) {
    try {
      customRoles = JSON.parse(setting.dashboardConfig);
    } catch (e) {
      customRoles = [];
    }
  }

  const newRole: RoleMatrixItem = {
    id: roleId,
    name: roleData.name.trim(),
    description: roleData.description?.trim() || '',
    isSystem: false,
    baseRole: roleData.baseRole,
    accessPermission: roleData.accessPermission,
    modules: roleData.modules,
    createdAt: new Date().toISOString(),
  };

  const existingIndex = customRoles.findIndex((r) => r.id === roleId);
  if (existingIndex >= 0) {
    customRoles[existingIndex] = newRole;
  } else {
    customRoles.push(newRole);
  }

  await prisma.systemSetting.upsert({
    where: { id: 'roles_matrix_config' },
    update: { dashboardConfig: JSON.stringify(customRoles) },
    create: { id: 'roles_matrix_config', dashboardConfig: JSON.stringify(customRoles) },
  });

  revalidatePath('/admin/users/roles');
  revalidatePath('/admin/users');
  return { success: true, role: newRole };
}

export async function deleteCustomRoleAction(roleId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (DEFAULT_ROLES_MATRIX.some((r) => r.id === roleId)) {
    return { success: false, error: 'System default roles cannot be deleted.' };
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { id: 'roles_matrix_config' },
  });

  if (!setting?.dashboardConfig) {
    return { success: true };
  }

  let customRoles: RoleMatrixItem[] = [];
  try {
    customRoles = JSON.parse(setting.dashboardConfig);
  } catch (e) {
    customRoles = [];
  }

  customRoles = customRoles.filter((r) => r.id !== roleId);

  await prisma.systemSetting.update({
    where: { id: 'roles_matrix_config' },
    data: { dashboardConfig: JSON.stringify(customRoles) },
  });

  revalidatePath('/admin/users/roles');
  revalidatePath('/admin/users');
  return { success: true };
}

// ==========================================
// 25.5. DYNAMIC DEPARTMENTS CONFIGURATION
// ==========================================
const DEFAULT_DEPARTMENTS = [
  'Operations & Loan Processing',
  'Sales & Business Development',
  'Credit & Underwriting',
  'Verification & Field Inspection',
  'Accounts & Finance',
  'HR & Administration',
  'Customer Relationship & Support',
  'Management & Executive',
];

export async function getDepartmentsAction(): Promise<string[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'departments_config' },
    });
    if (setting?.dashboardConfig) {
      const list = JSON.parse(setting.dashboardConfig);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_DEPARTMENTS;
}

export async function saveDepartmentsAction(departments: string[]) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required to manage departments.' };
  }
  const cleanList = Array.from(new Set(departments.map((d) => d.trim()).filter(Boolean)));
  await prisma.systemSetting.upsert({
    where: { id: 'departments_config' },
    update: { dashboardConfig: JSON.stringify(cleanList) },
    create: { id: 'departments_config', dashboardConfig: JSON.stringify(cleanList) },
  });
  revalidatePath('/profile');
  revalidatePath('/admin/users');
  return { success: true, departments: cleanList };
}

// ==========================================
// 26. WORKING DAYS, LWP & AUTOMATED INCENTIVES
// ==========================================
export async function calculateAndCreateSalaryAction(data: {
  userId: string;
  month: string;
  monthlySalary: number;
  workingDays: number;
  lwpDays: number;
  allowances: number;
  deductions: number;
  incentiveEarned?: number;
  linkedCaseId?: string | null;
  linkedCaseName?: string | null;
  paymentStatus: string;
  remarks?: string;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (!data.userId || data.monthlySalary <= 0 || data.workingDays <= 0) {
    return { success: false, error: 'Valid employee, monthly salary, and working days are required.' };
  }

  const effectivePaidDays = Math.max(0, data.workingDays - (data.lwpDays || 0));
  const proratedBasic = Math.round((data.monthlySalary / data.workingDays) * effectivePaidDays);
  const allowances = Number(data.allowances) || 0;
  const deductions = Number(data.deductions) || 0;
  const incentive = Number(data.incentiveEarned) || 0;

  const netPayable = Math.max(0, proratedBasic + allowances + incentive - deductions);

  // Build notes including linked case if provided
  let finalRemarks = data.remarks?.trim() || '';
  if (data.linkedCaseName) {
    const caseTag = `Linked Case: ${data.linkedCaseName}`;
    finalRemarks = finalRemarks ? `${finalRemarks} | ${caseTag}` : caseTag;
  }

  const record = await prisma.salaryRecord.create({
    data: {
      userId: data.userId,
      month: data.month,
      basicSalary: proratedBasic,
      allowances,
      deductions,
      workingDays: data.workingDays,
      paidDays: effectivePaidDays,
      lwpDays: data.lwpDays || 0,
      incentiveEarned: incentive,
      netPayable,
      paymentStatus: data.paymentStatus || 'UNPAID',
      paidDate: data.paymentStatus === 'PAID' ? new Date() : null,
      remarks: finalRemarks || null,
    },
  });

  // Automatically count into Company Expenses when created as PAID
  if (data.paymentStatus === 'PAID') {
    await prisma.expenseRecord.create({
      data: {
        amount: netPayable,
        month: data.month,
      },
    });
  }

  revalidatePath('/salary');
  revalidatePath('/dashboard');
  revalidatePath('/admin/functionality');
  return { success: true, record };
}

// ==========================================
// 27. FORGOT PASSWORD & OLD PASSWORD VERIFICATION
// ==========================================
export async function requestPasswordResetAction(emailOrUsername: string) {
  if (!emailOrUsername?.trim()) {
    return { success: false, error: 'Please enter your registered Email address or Username.' };
  }

  const query = emailOrUsername.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: query },
        { username: query },
      ],
    },
    select: { id: true, email: true, name: true },
  });

  if (!user || !user.email) {
    // For privacy, don't disclose non-existence, but give friendly guidance
    return { success: false, error: 'No account found with this email/username or account has no email registered. Please contact Super Admin.' };
  }

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiry

  await prisma.passwordResetToken.create({
    data: {
      email: user.email,
      token,
      expiresAt,
    },
  });

  return {
    success: true,
    message: `Password reset request generated for ${user.email}. Use your reset token or link to update your password.`,
    token, // Provided for seamless local reset
  };
}

export async function resetPasswordWithTokenAction(token: string, newPassword: string) {
  if (!token?.trim() || !newPassword || newPassword.length < 6) {
    return { success: false, error: 'Token and a password of at least 6 characters are required.' };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: token.trim() },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { success: false, error: 'Invalid or expired password reset token.' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.updateMany({
    where: { email: resetToken.email },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.delete({ where: { token: token.trim() } });

  return { success: true, message: 'Password has been reset successfully! You can now log in.' };
}

export async function verifyAndChangePasswordAction(existingPassword: string, newPassword: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!existingPassword || !newPassword || newPassword.length < 6) {
    return { success: false, error: 'Please provide existing password and a new password with at least 6 characters.' };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.passwordHash) {
    return { success: false, error: 'User record not found.' };
  }

  const isValid = await bcrypt.compare(existingPassword, dbUser.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Existing password is incorrect. Verification failed.' };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: true, message: 'Password updated successfully!' };
}

// ==========================================
// 28. DEDUPLICATED CLIENTS DIRECTORY
// ==========================================
export interface ClientCoApplicant {
  name: string;
  mobile?: string | null;
  email?: string | null;
  dob?: Date | string | null;
  gender?: string | null;
  incomeRequired?: boolean;
  customerType?: string | null;
  caseId?: string;
  caseProduct?: string;
}

export interface LinkedCaseInfo {
  id: string;
  clientRole: 'PRIMARY_APPLICANT' | 'CO_APPLICANT';
  product: string;
  subProduct?: string | null;
  stage: number;
  status: string;
  createdAt: Date | string;
  coApplicants?: string[];
  coApplicantsDetails?: ClientCoApplicant[];
  primaryClientName?: string;
}

export interface UniqueClientItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  dob?: Date | string | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  caseCount: number;
  roles: ('PRIMARY_APPLICANT' | 'CO_APPLICANT')[];
  primaryApplicantFor: string[];
  coApplicantFor: string[];
  allCoApplicants: ClientCoApplicant[];
  linkedCases: LinkedCaseInfo[];
  latestActivityDate: Date | string;
}

export async function getClientsDirectoryAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized', clients: [] };

  if (user.role === 'CHANNEL') {
    return { success: false, error: 'Permission denied: Channel partners cannot access client directory.', clients: [] };
  }

  const cases = await prisma.case.findMany({
    select: {
      id: true,
      clientName: true,
      mobile: true,
      email: true,
      gender: true,
      clientDob: true,
      clientState: true,
      clientCity: true,
      product: true,
      subProduct: true,
      stage: true,
      status: true,
      coApplicantsData: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const clientMap = new Map<string, UniqueClientItem>();

  for (const c of cases) {
    // 1. Process Main Client (Primary Applicant only for top-level directory entries)
    const normPhone = c.mobile ? c.mobile.replace(/\D/g, '').slice(-10) : '';
    const key = normPhone ? `phone_${normPhone}` : (c.email ? `email_${c.email.trim().toLowerCase()}` : `name_${c.clientName.trim().toLowerCase()}`);

    const caseCoApps: ClientCoApplicant[] = [];
    if (c.coApplicantsData) {
      try {
        const parsed = JSON.parse(c.coApplicantsData);
        if (Array.isArray(parsed)) {
          for (const ca of parsed) {
            if (!ca || !ca.name) continue;
            caseCoApps.push({
              name: ca.name.trim(),
              mobile: ca.mobile ? String(ca.mobile).trim() : null,
              email: ca.email ? String(ca.email).trim() : null,
              dob: ca.dob || null,
              gender: ca.gender || null,
              incomeRequired: ca.incomeRequired !== false,
              customerType: ca.customerType || (Array.isArray(ca.customerTypes) ? ca.customerTypes.join(', ') : null),
              caseId: c.id,
              caseProduct: c.product,
            });
          }
        }
      } catch (e) {}
    }

    const coAppNames = caseCoApps.map((ca) => ca.name);

    const linkedCaseInfo: LinkedCaseInfo = {
      id: c.id,
      clientRole: 'PRIMARY_APPLICANT',
      product: c.product,
      subProduct: c.subProduct,
      stage: c.stage,
      status: c.status,
      createdAt: c.createdAt,
      coApplicants: coAppNames,
      coApplicantsDetails: caseCoApps,
    };

    if (clientMap.has(key)) {
      const existing = clientMap.get(key)!;
      existing.caseCount += 1;
      if (!existing.roles.includes('PRIMARY_APPLICANT')) {
        existing.roles.push('PRIMARY_APPLICANT');
      }
      if (!existing.primaryApplicantFor.includes(c.product)) {
        existing.primaryApplicantFor.push(c.product);
      }
      existing.linkedCases.push(linkedCaseInfo);

      // Merge co-applicants into allCoApplicants (deduplicate by phone/name)
      for (const ca of caseCoApps) {
        const caNormPhone = ca.mobile ? ca.mobile.replace(/\D/g, '').slice(-10) : '';
        const alreadyExists = existing.allCoApplicants.some((x) => {
          const xPhone = x.mobile ? x.mobile.replace(/\D/g, '').slice(-10) : '';
          return (caNormPhone && xPhone && caNormPhone === xPhone) || x.name.toLowerCase() === ca.name.toLowerCase();
        });
        if (!alreadyExists) {
          existing.allCoApplicants.push(ca);
        }
      }

      if (!existing.email && c.email) existing.email = c.email;
      if (!existing.dob && c.clientDob) existing.dob = c.clientDob;
      if (!existing.city && c.clientCity) existing.city = c.clientCity;
      if (!existing.state && c.clientState) existing.state = c.clientState;
      if (!existing.gender && c.gender) existing.gender = c.gender;
    } else {
      clientMap.set(key, {
        id: `client_${key}`,
        name: c.clientName,
        phone: normPhone || c.mobile || 'N/A',
        email: c.email || null,
        dob: c.clientDob || null,
        gender: c.gender || null,
        city: c.clientCity || null,
        state: c.clientState || null,
        caseCount: 1,
        roles: ['PRIMARY_APPLICANT'],
        primaryApplicantFor: [c.product],
        coApplicantFor: [],
        allCoApplicants: [...caseCoApps],
        linkedCases: [linkedCaseInfo],
        latestActivityDate: c.createdAt,
      });
    }
  }

  // 2. Link cases where a primary client was ALSO a co-applicant on someone else's case
  for (const c of cases) {
    if (!c.coApplicantsData) continue;
    try {
      const coApps = JSON.parse(c.coApplicantsData);
      if (Array.isArray(coApps)) {
        for (const coApp of coApps) {
          if (!coApp || !coApp.name) continue;
          const coPhone = coApp.mobile ? String(coApp.mobile).replace(/\D/g, '').slice(-10) : '';
          const coKey = coPhone ? `phone_${coPhone}` : (coApp.email ? `email_${coApp.email.trim().toLowerCase()}` : `name_${coApp.name.trim().toLowerCase()}`);

          // Only tag existing primary clients who also happen to be co-applicant elsewhere
          if (clientMap.has(coKey)) {
            const existing = clientMap.get(coKey)!;
            if (!existing.roles.includes('CO_APPLICANT')) {
              existing.roles.push('CO_APPLICANT');
            }
            if (!existing.coApplicantFor.includes(c.clientName)) {
              existing.coApplicantFor.push(c.clientName);
            }
            const alreadyLinked = existing.linkedCases.some((lc) => lc.id === c.id);
            if (!alreadyLinked) {
              existing.linkedCases.push({
                id: c.id,
                clientRole: 'CO_APPLICANT',
                product: c.product,
                subProduct: c.subProduct,
                stage: c.stage,
                status: c.status,
                createdAt: c.createdAt,
                primaryClientName: c.clientName,
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  const clients = Array.from(clientMap.values()).sort(
    (a, b) => b.caseCount - a.caseCount || a.name.localeCompare(b.name)
  );

  return { success: true, clients };
}

// ==========================================
// 30. NOTIFICATIONS ACTIONS & AJAX POLLING
// ==========================================
export async function getNotificationsAction() {
  const user = await getAuthUser();
  if (!user) return { success: false, notifications: [], unreadCount: 0 };

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  // Strict Notification Routing:
  // - Super Admin receives ALL notifications in the entire system without restriction
  // - Specific users/roles receive ONLY notifications targeted to their account (userId), their role, or general broadcast
  const where: any = isSuperAdmin
    ? {}
    : {
        OR: [
          { userId: user.id },
          {
            userId: null,
            OR: [{ role: null }, { role: user.role }],
          },
        ],
      };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return { success: true, notifications, unreadCount };
}

export async function markNotificationAsReadAction(id?: string, all?: boolean) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (all) {
    if (user.role === 'SUPER_ADMIN') {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: {
          OR: [
            { userId: user.id },
            {
              userId: null,
              OR: [{ role: null }, { role: user.role }],
            },
          ],
          isRead: false,
        },
        data: { isRead: true },
      });
    }
  } else if (id) {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  return { success: true };
}

export async function deleteNotificationAction(notificationId?: string, deleteAll?: boolean, deleteRead?: boolean) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (deleteAll) {
    if (user.role === 'SUPER_ADMIN') {
      await prisma.notification.deleteMany({});
    } else {
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            {
              userId: null,
              OR: [{ role: null }, { role: user.role }],
            },
          ],
        },
      });
    }
  } else if (deleteRead) {
    if (user.role === 'SUPER_ADMIN') {
      await prisma.notification.deleteMany({ where: { isRead: true } });
    } else {
      await prisma.notification.deleteMany({
        where: {
          isRead: true,
          OR: [
            { userId: user.id },
            {
              userId: null,
              OR: [{ role: null }, { role: user.role }],
            },
          ],
        },
      });
    }
  } else if (notificationId) {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  return { success: true };
}

export async function recordSystemNotification({
  title,
  message,
  type = 'INFO',
  link,
  userId,
  role,
}: {
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'CASE_UPDATE' | 'TASK_UPDATE';
  link?: string | null;
  userId?: string | null;
  role?: any;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: userId || null,
        role: role || null,
        title,
        message,
        type: type || 'INFO',
        link: link || null,
      },
    });
    return { success: true, notification };
  } catch (e: any) {
    console.warn('Notification log error:', e.message);
    return { success: false, error: e.message };
  }
}

// 21. Builder Master Actions (Super Admin & Team Leader)
export async function getBuildersAction() {
  const builders = await prisma.builder.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { visits: true } },
    },
  });
  return { success: true, builders };
}

async function checkIsTeamLeaderOrSuperAdmin(user: UserContext): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isTeamLeader: true },
  });
  return Boolean(dbUser?.isTeamLeader);
}

export async function createBuilderAction(data: {
  name: string;
  contactPerson?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  officeAddress?: string | null;
  reraNumber?: string | null;
  approvedBanks?: string | null;
  notes?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (user.role === 'CHANNEL') {
    return { success: false, error: 'Channel partners cannot add builders.' };
  }

  const cleanName = data.name.trim();
  if (!cleanName) return { success: false, error: 'Builder name is required.' };

  const existing = await prisma.builder.findUnique({
    where: { name: cleanName },
  });
  if (existing) {
    return { success: false, error: `Builder "${cleanName}" already exists in directory.` };
  }

  const builder = await prisma.builder.create({
    data: {
      name: cleanName,
      contactPerson: data.contactPerson?.trim() || null,
      designation: data.designation?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      officeAddress: data.officeAddress?.trim() || null,
      reraNumber: data.reraNumber?.trim() || null,
      approvedBanks: data.approvedBanks?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath('/visits');

  return { success: true, builder };
}

export async function updateBuilderAction(data: {
  id: string;
  name: string;
  contactPerson?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  officeAddress?: string | null;
  reraNumber?: string | null;
  approvedBanks?: string | null;
  notes?: string | null;
}) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const canManage = await checkIsTeamLeaderOrSuperAdmin(user);
  if (!canManage) {
    return { success: false, error: 'Only Super Admin and Team Leaders can edit builders.' };
  }

  const cleanName = data.name.trim();
  if (!cleanName) return { success: false, error: 'Builder name is required.' };

  const existing = await prisma.builder.findFirst({
    where: {
      name: cleanName,
      id: { not: data.id },
    },
  });
  if (existing) {
    return { success: false, error: `Another builder named "${cleanName}" already exists.` };
  }

  const builder = await prisma.builder.update({
    where: { id: data.id },
    data: {
      name: cleanName,
      contactPerson: data.contactPerson?.trim() || null,
      designation: data.designation?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      officeAddress: data.officeAddress?.trim() || null,
      reraNumber: data.reraNumber?.trim() || null,
      approvedBanks: data.approvedBanks?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath('/visits');

  return { success: true, builder };
}

export async function deleteBuilderAction(id: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const canManage = await checkIsTeamLeaderOrSuperAdmin(user);
  if (!canManage) {
    return { success: false, error: 'Only Super Admin and Team Leaders can delete builders.' };
  }

  await prisma.builder.delete({
    where: { id },
  });

  revalidatePath('/visits');

  return { success: true };
}

// 76. Re-sync Case Checklist Action with Template Rules
export async function resyncCaseChecklistAction(caseId: string) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized to resync checklist' };
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      checklistItems: true,
    },
  });

  if (!existingCase) {
    return { success: false, error: 'Case not found' };
  }

  let parsedCoApplicants: any[] = [];
  try {
    if (existingCase.coApplicantsData) {
      parsedCoApplicants = JSON.parse(existingCase.coApplicantsData);
    }
  } catch {
    parsedCoApplicants = [];
  }

  let parsedIncomeTypes: string[] = [];
  try {
    if (existingCase.incomeTypes) {
      parsedIncomeTypes = JSON.parse(existingCase.incomeTypes);
    }
  } catch {
    parsedIncomeTypes = existingCase.customerType ? existingCase.customerType.split(',').map((s: string) => s.trim()) : [];
  }

  // Preserved items: items where staff has already done work (uploaded doc, remark, or marked Received/NA)
  const preservedItems = existingCase.checklistItems.filter(
    (i) => i.status === 'Received' || i.status === 'Not Applicable' || (i.documentUrl && i.documentUrl.trim()) || (i.remark && i.remark.trim())
  );

  // Delete pending, empty items so they can be re-evaluated cleanly
  const itemsToDelete = existingCase.checklistItems.filter(
    (i) => !preservedItems.some((p) => p.id === i.id)
  );

  if (itemsToDelete.length > 0) {
    await prisma.caseChecklistItem.deleteMany({
      where: {
        id: { in: itemsToDelete.map((i) => i.id) },
      },
    });
  }

  // Re-generate using strict condition engine
  const count = await generateChecklistForCase(
    existingCase.id,
    existingCase.product,
    existingCase.customerType,
    existingCase.propertyType,
    existingCase.coApplicantCount,
    parsedCoApplicants,
    user.id,
    {
      subProduct: existingCase.subProduct,
      clientName: existingCase.clientName,
      incomeTypes: parsedIncomeTypes,
      propertyState: existingCase.propertyState,
      clientState: existingCase.clientState,
      existingItems: preservedItems.map((p) => ({ label: p.label, appliesTo: p.appliesTo })),
    }
  );

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/cases');
  return { success: true, count };
}
