'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can, UserContext } from '@/lib/permissions';
import { generateChecklistForCase } from '@/lib/checklist-engine';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

async function getAuthUser(): Promise<UserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as any).id,
    role: (session.user as any).role,
    accessPermission: (session.user as any).accessPermission || 'EDIT',
    teamId: (session.user as any).teamId,
  };
}

// 1. Case Actions
export async function createCaseAction(formData: {
  clientName: string;
  mobile: string;
  email?: string;
  clientState?: string;
  product: string;
  customerType: string;
  propertyType: string;
  coApplicantCount: number;
  coApplicantsData?: any[];
  channelUserId?: string;
  salesUserId?: string;
  operationUserId?: string;
  assignedTeamId?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'create', 'case')) throw new Error('Unauthorized');

  const newCase = await prisma.case.create({
    data: {
      clientName: formData.clientName,
      mobile: formData.mobile,
      email: formData.email || null,
      clientState: formData.clientState || null,
      product: formData.product,
      customerType: formData.customerType,
      propertyType: formData.propertyType,
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

  // Auto-generate dynamic checklist items (respecting co-applicant income required rules & bank months)
  await generateChecklistForCase(
    newCase.id,
    formData.product,
    formData.customerType,
    formData.propertyType,
    formData.coApplicantCount,
    formData.coApplicantsData,
    user.id
  );

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return { success: true, caseId: newCase.id };
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
  }
) {
  const user = await getAuthUser();
  if (!user || !can(user, 'update', 'checklist_item')) {
    throw new Error('Permission denied');
  }

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
  }>
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

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/cases');
  revalidatePath('/dashboard');
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
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission?: 'EDIT' | 'VIEW';
  teamId?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'user')) {
    return { success: false, error: 'Permission denied: Only Super Admin can create users.' };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { success: false, error: 'User with this email already exists.' };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      accessPermission: data.accessPermission || 'EDIT',
      teamId: data.teamId || null,
    },
  });

  revalidatePath('/admin/users');
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
  email: string;
  password?: string;
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission?: 'EDIT' | 'VIEW';
  teamId?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'user')) {
    return { success: false, error: 'Permission denied: Only Super Admin can edit users.' };
  }

  // Check email collision
  const existing = await prisma.user.findFirst({
    where: {
      email: data.email,
      NOT: { id: data.id },
    },
  });
  if (existing) {
    return { success: false, error: 'Another user with this email already exists.' };
  }

  const updatePayload: any = {
    name: data.name,
    email: data.email,
    role: data.role,
    accessPermission: data.accessPermission || 'EDIT',
    teamId: data.teamId || null,
  };

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

export async function createStateConfigAction(name: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.stateConfig.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  revalidatePath('/admin/functionality');
  return { success: true };
}

export async function deleteStateConfigAction(id: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_functionality', 'functionality')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.stateConfig.delete({ where: { id } });
  revalidatePath('/admin/functionality');
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

// 4. Template Category Actions
export async function createTemplateCategoryAction(name: string, product: string, customerType: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistCategory.create({
    data: { name, product, customerType },
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
  stage: number;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistItemTemplate.create({
    data: {
      categoryId: data.categoryId,
      label: data.label,
      applicantRequirement: data.applicantRequirement,
      coApplicantRequirement: data.coApplicantRequirement,
      propertyTypeScope: data.propertyTypeScope || null,
      stage: data.stage,
    },
  });

  revalidatePath('/admin/checklist-templates');
  return { success: true };
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
export async function updateUserProfileAction(data: { name: string; password?: string }) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const updateData: any = { name: data.name };
  if (data.password && data.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  revalidatePath('/profile');
  return { success: true };
}
