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
    teamId: (session.user as any).teamId,
  };
}

// 1. Case Actions
export async function createCaseAction(formData: {
  clientName: string;
  mobile: string;
  email?: string;
  product: string;
  customerType: string;
  propertyType: string;
  coApplicantCount: number;
  assignedTeamId?: string;
}) {
  const user = await getAuthUser();
  if (!user) throw new Error('Unauthorized');

  const newCase = await prisma.case.create({
    data: {
      clientName: formData.clientName,
      mobile: formData.mobile,
      email: formData.email || null,
      product: formData.product,
      customerType: formData.customerType,
      propertyType: formData.propertyType,
      coApplicantCount: formData.coApplicantCount,
      createdById: user.id,
      assignedTeamId: formData.assignedTeamId || user.teamId || null,
      status: 'Pending Documents',
      stage: 1,
    },
  });

  // Auto-generate checklist items
  await generateChecklistForCase(
    newCase.id,
    formData.product,
    formData.customerType,
    formData.propertyType,
    formData.coApplicantCount,
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
  }
) {
  const user = await getAuthUser();
  if (!user) throw new Error('Unauthorized');

  if (!can(user, 'update', 'checklist_item')) {
    throw new Error('Permission denied');
  }

  await prisma.caseChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.remark !== undefined && { remark: data.remark }),
      ...(data.documentUrl !== undefined && { documentUrl: data.documentUrl }),
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

export async function updateCaseStatusAction(caseId: string, status: string, stage?: number) {
  const user = await getAuthUser();
  if (!user) throw new Error('Unauthorized');

  if (!can(user, 'update', 'case')) {
    throw new Error('Permission denied');
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status,
      ...(stage !== undefined && { stage }),
    },
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCaseAction(caseId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error('Unauthorized');

  // Enforce delete restriction strictly on server side
  if (!can(user, 'delete', 'case')) {
    return { success: false, error: 'Permission denied: Team Members cannot delete cases.' };
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
  if (!user) throw new Error('Unauthorized');

  if (!can(user, 'delete', 'checklist_item')) {
    return { success: false, error: 'Permission denied: Team Members cannot delete document items.' };
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
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER';
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

export async function deleteUserAction(userId: string) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_users', 'user')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/users');
  return { success: true };
}

// 3. Checklist Template Management Actions (Super Admin Only)
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

// 4. User Self Profile Update Action
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

