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
  clientCity?: string;
  clientDob?: string | Date | null;
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
      clientState: formData.clientState || null,
      clientCity: formData.clientCity || null,
      clientDob: formData.clientDob ? new Date(formData.clientDob) : null,
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

export async function updateCaseIntakeDetailsAction(
  caseId: string,
  data: {
    clientName: string;
    mobile: string;
    email?: string | null;
    clientState?: string | null;
    clientCity?: string | null;
    clientDob?: string | Date | null;
    product?: string;
    customerType?: string;
    propertyType?: string;
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
    const appsToRemove: string[] = [];
    for (let i = data.coApplicantCount + 1; i <= existingCase.coApplicantCount; i++) {
      appsToRemove.push(`Co-Applicant ${i}`);
    }
    if (appsToRemove.length > 0) {
      await prisma.caseChecklistItem.deleteMany({
        where: {
          caseId,
          appliesTo: { in: appsToRemove },
        },
      });
    }
  } else if (data.coApplicantCount !== undefined && data.coApplicantCount > existingCase.coApplicantCount) {
    // If increased, generate checklist items for newly added co-applicants
    const categories = await prisma.checklistCategory.findMany({
      where: { product: newProduct, customerType: newCustomerType },
      include: { items: true },
    });
    const categoriesToUse = categories.length > 0 ? categories : await prisma.checklistCategory.findMany({ include: { items: true } });

    let normalizedPropScope: string | null = null;
    if (newPropertyType.toLowerCase().includes('resale')) normalizedPropScope = 'RESALE';
    else if (newPropertyType.toLowerCase().includes('takeover') || newPropertyType.toLowerCase().includes('seller bt')) normalizedPropScope = 'TAKEOVER_SELLER_BT';
    else if (newPropertyType.toLowerCase().includes('direct allotment') || newPropertyType.toLowerCase().includes('under construction')) normalizedPropScope = 'DIRECT_ALLOTMENT';

    const newItemsToCreate: any[] = [];
    for (let i = existingCase.coApplicantCount + 1; i <= data.coApplicantCount; i++) {
      const coAppData = data.coApplicantsData && data.coApplicantsData[i - 1];
      const incomeRequired = coAppData ? coAppData.incomeRequired !== false : true;

      for (const cat of categoriesToUse) {
        const isIncomeCat = cat.name.toLowerCase().includes('income');
        if (isIncomeCat && !incomeRequired) continue;

        for (const item of cat.items) {
          if (item.propertyTypeScope && item.propertyTypeScope !== normalizedPropScope) continue;
          if (item.coApplicantRequirement !== 'NA') {
            newItemsToCreate.push({
              caseId,
              category: cat.name,
              label: item.label,
              appliesTo: `Co-Applicant ${i}`,
              status: 'Pending',
              stage: item.stage,
              updatedById: user.id,
              requireOnedrive: item.requireOnedrive !== false,
              requireRemark: item.requireRemark === true,
              remarkPlaceholder: item.remarkPlaceholder || null,
            });
          }
        }
      }
    }
    if (newItemsToCreate.length > 0) {
      await prisma.caseChecklistItem.createMany({ data: newItemsToCreate });
    }
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      clientName: data.clientName.trim(),
      mobile: data.mobile.trim(),
      email: data.email?.trim() || null,
      clientState: data.clientState || null,
      clientCity: data.clientCity || null,
      ...(data.clientDob !== undefined && { clientDob: data.clientDob ? new Date(data.clientDob) : null }),
      ...(data.product && { product: data.product }),
      ...(data.customerType && { customerType: data.customerType }),
      ...(data.propertyType && { propertyType: data.propertyType }),
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

  revalidatePath('/cases');
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/dashboard');
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
  username: string;
  email?: string;
  password: string;
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
  accessPermission?: 'EDIT' | 'VIEW';
  teamId?: string;
  dob?: string;
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
  stage: number;
  requireOnedrive?: boolean;
  requireRemark?: boolean;
  remarkPlaceholder?: string;
}) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistItemTemplate.create({
    data: {
      categoryId: data.categoryId,
      label: data.label.trim(),
      applicantRequirement: data.applicantRequirement,
      coApplicantRequirement: data.coApplicantRequirement,
      propertyTypeScope: data.propertyTypeScope || null,
      stage: data.stage,
      requireOnedrive: data.requireOnedrive !== false,
      requireRemark: data.requireRemark === true,
      remarkPlaceholder: data.remarkPlaceholder?.trim() || null,
    },
  });

  revalidatePath('/admin/checklist-templates');
  return { success: true };
}

export async function updateTemplateItemAction(
  id: string,
  data: {
    categoryId: string;
    label: string;
    applicantRequirement: any;
    coApplicantRequirement: any;
    propertyTypeScope?: string;
    stage: number;
    requireOnedrive?: boolean;
    requireRemark?: boolean;
    remarkPlaceholder?: string;
  }
) {
  const user = await getAuthUser();
  if (!user || !can(user, 'manage_templates', 'template')) {
    return { success: false, error: 'Permission denied' };
  }

  await prisma.checklistItemTemplate.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      label: data.label.trim(),
      applicantRequirement: data.applicantRequirement,
      coApplicantRequirement: data.coApplicantRequirement,
      propertyTypeScope: data.propertyTypeScope || null,
      stage: data.stage,
      requireOnedrive: data.requireOnedrive !== false,
      requireRemark: data.requireRemark === true,
      remarkPlaceholder: data.remarkPlaceholder?.trim() || null,
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
export async function updateUserProfileAction(data: { name: string; password?: string; avatarUrl?: string | null }) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!isValidName(data.name)) {
    return { success: false, error: 'Display name must contain only alphabetic characters and spaces.' };
  }

  const updateData: any = { name: data.name.trim() };
  if (data.password && data.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl ? data.avatarUrl.trim() : null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  revalidatePath('/profile');
  revalidatePath('/admin/settings');
  return { success: true };
}

// 6. Birthday Management Actions (All Database Sources: Staff, Clients, Co-Applicants & Manual Entries)
export async function getUpcomingBirthdaysAction(includeAll = false) {
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
      role: true,
      dob: true,
      team: { select: { name: true } },
    },
  });

  // 2. Intake Clients & Co-Applicants (Cases)
  const casesWithDob = await prisma.case.findMany({
    where: {
      OR: [
        { clientDob: { not: null } },
        { coApplicantsData: { not: null } },
      ],
    },
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

  // 3. Custom Manual Birthday Entries
  const manualEntries = await prisma.manualBirthdayEntry.findMany({
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

  // Map Intake Cases (Client & Co-Applicants)
  for (const c of casesWithDob) {
    // Main Client
    if (c.clientDob) {
      const evaluation = evaluateUpcomingBirthday(c.clientDob);
      allItems.push({
        id: `client-${c.id}`,
        name: c.clientName,
        phone: c.mobile,
        email: c.email,
        role: 'LOAN_CLIENT',
        category: 'CLIENT',
        categoryLabel: 'Loan Client',
        teamName: 'Client File',
        association: `Loan: ${c.product} (#${c.id.slice(-6).toUpperCase()})`,
        remark: `Status: ${c.status}${c.clientCity ? ` | City: ${c.clientCity}` : ''}${c.clientState ? `, ${c.clientState}` : ''}`,
        dob: c.clientDob,
        isWithin30Days: evaluation.isWithin30Days,
        isToday: evaluation.isToday,
        daysRemaining: evaluation.daysRemaining,
        formattedBirthday: evaluation.formattedBirthday,
      });
    }

    // Co-Applicants
    if (c.coApplicantsData) {
      try {
        const coApps = JSON.parse(c.coApplicantsData);
        if (Array.isArray(coApps)) {
          coApps.forEach((coApp: any, idx: number) => {
            if (coApp.dob) {
              const dobDate = new Date(coApp.dob);
              if (!isNaN(dobDate.getTime())) {
                const evaluation = evaluateUpcomingBirthday(dobDate);
                allItems.push({
                  id: `coapp-${c.id}-${idx}`,
                  name: coApp.name || `Co-Applicant ${idx + 1}`,
                  phone: coApp.mobile || null,
                  email: coApp.email || null,
                  role: 'CO_APPLICANT',
                  category: 'CO_APPLICANT',
                  categoryLabel: 'Co-Applicant',
                  teamName: 'Co-Applicant',
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
          });
        }
      } catch (e) {
        // Ignore parse errors on malformed legacy JSON
      }
    }
  }

  // Map Manual Entries
  for (const m of manualEntries) {
    const evaluation = evaluateUpcomingBirthday(m.dob);
    allItems.push({
      id: `manual-${m.id}`,
      manualId: m.id,
      name: m.name,
      phone: m.phone,
      email: null,
      role: 'CUSTOM_ENTRY',
      category: 'MANUAL',
      categoryLabel: 'Manual Entry',
      teamName: 'Custom Entry',
      association: m.remark || 'Direct Birthday Entry',
      remark: m.remark || 'Direct Birthday Entry',
      dob: m.dob,
      isWithin30Days: evaluation.isWithin30Days,
      isToday: evaluation.isToday,
      daysRemaining: evaluation.daysRemaining,
      formattedBirthday: evaluation.formattedBirthday,
      isManual: true,
    });
  }

  const processed = allItems
    .filter((b) => (includeAll ? true : b.isWithin30Days))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

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
  dob: string;
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

  const entry = await prisma.manualBirthdayEntry.update({
    where: { id: data.id },
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      dob: new Date(data.dob),
      remark: data.remark?.trim() || null,
    },
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

  // Fetch all staff members (non-super-admins)
  const staff = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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

// 9. HRMS Leave Management Actions
export async function applyLeaveAction(data: {
  leaveType: 'CASUAL' | 'SICK' | 'PAID';
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

  const quota = {
    casualTotal: 12,
    casualRemaining: Math.max(0, 12 - usedCL),
    sickTotal: 8,
    sickRemaining: Math.max(0, 8 - usedSL),
    paidTotal: 15,
    paidRemaining: Math.max(0, 15 - usedPL),
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
  leaveType: 'CASUAL' | 'SICK' | 'PAID';
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

// 10. Product Master Actions
export async function getProductsAction() {
  let products = await prisma.productMaster.findMany({
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
      orderBy: { name: 'asc' },
    });
  }

  return { success: true, products };
}

export async function createProductAction(name: string) {
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

  const product = await prisma.productMaster.create({
    data: { name: trimmed },
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/checklist-templates');
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
      'Self Employed Non-Professional',
      'NRI',
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

  const where: any = {};

  if (filters?.view === 'my') {
    where.assignedToId = user.id;
  } else if (filters?.view === 'assigned_by_me') {
    where.createdById = user.id;
  }

  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }

  if (filters?.priority && filters.priority !== 'ALL') {
    where.priority = filters.priority;
  }

  if (filters?.assignedToId && filters.assignedToId !== 'ALL') {
    where.assignedToId = filters.assignedToId;
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { case: { clientName: { contains: q } } },
      { assignedTo: { name: { contains: q } } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: { id: true, name: true, role: true, username: true },
      },
      createdBy: {
        select: { id: true, name: true, role: true, username: true },
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
      { priority: 'desc' },
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
    select: { id: true, assignedToId: true, createdById: true },
  });

  if (!task) {
    return { success: false, error: 'Task not found.' };
  }

  // Assignee, creator, or Super Admin can update status
  if (user.role !== 'SUPER_ADMIN' && task.assignedToId !== user.id && task.createdById !== user.id) {
    return { success: false, error: 'Permission denied to update this task.' };
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });

  revalidatePath('/tasks');
  return { success: true, task: updated };
}

export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status?: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
    dueDate?: string | null;
    assignedToId?: string;
    caseId?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role === 'CHANNEL') {
    return { success: false, error: 'Unauthorized' };
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!existing) {
    return { success: false, error: 'Task not found.' };
  }

  // Only Super Admin or Creator can edit full task details
  if (user.role !== 'SUPER_ADMIN' && existing.createdById !== user.id) {
    return { success: false, error: 'Only task creator or Super Admin can edit task details.' };
  }

  if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { role: true },
    });
    if (targetUser?.role === 'CHANNEL') {
      return { success: false, error: 'Tasks cannot be assigned to Channel partners.' };
    }
  }

  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.status !== undefined) {
    updatePayload.status = data.status;
    updatePayload.completedAt = data.status === 'COMPLETED' ? new Date() : null;
  }
  if (data.dueDate !== undefined) {
    updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    updatePayload.assignedToId = data.assignedToId;
    updatePayload.assignedAt = new Date(); // reset elapsed time on reassignment
  }
  if (data.caseId !== undefined) {
    updatePayload.caseId = data.caseId || null;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updatePayload,
  });

  revalidatePath('/tasks');
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



