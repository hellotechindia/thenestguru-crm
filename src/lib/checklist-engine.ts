import { prisma } from './prisma';

export async function generateChecklistForCase(
  caseId: string,
  product: string,
  customerType: string,
  propertyType: string,
  coApplicantCount: number,
  coApplicantsData: any[] | null | undefined,
  userId: string
) {
  let normalizedPropScope: string | null = null;
  if (propertyType.toLowerCase().includes('resale')) {
    normalizedPropScope = 'RESALE';
  } else if (propertyType.toLowerCase().includes('takeover') || propertyType.toLowerCase().includes('seller bt')) {
    normalizedPropScope = 'TAKEOVER_SELLER_BT';
  } else if (propertyType.toLowerCase().includes('direct allotment') || propertyType.toLowerCase().includes('under construction')) {
    normalizedPropScope = 'DIRECT_ALLOTMENT';
  }

  const categories = await prisma.checklistCategory.findMany({
    where: { product, customerType },
    include: { items: true },
  });

  let categoriesToUse = categories;
  if (categoriesToUse.length === 0) {
    categoriesToUse = await prisma.checklistCategory.findMany({
      include: { items: true },
    });
  }

  const itemsToCreate: {
    caseId: string;
    category: string;
    label: string;
    appliesTo: string;
    status: string;
    stage: number;
    updatedById: string;
    requireOnedrive?: boolean;
    requireRemark?: boolean;
    remarkPlaceholder?: string | null;
  }[] = [];

  for (const cat of categoriesToUse) {
    const isIncomeCat = cat.name.toLowerCase().includes('income');

    for (const templateItem of cat.items) {
      if (templateItem.propertyTypeScope && templateItem.propertyTypeScope !== normalizedPropScope) {
        continue;
      }

      // Add for Applicant
      if (templateItem.applicantRequirement !== 'NA') {
        itemsToCreate.push({
          caseId,
          category: cat.name,
          label: templateItem.label,
          appliesTo: 'Applicant',
          status: 'Pending',
          stage: templateItem.stage,
          updatedById: userId,
          requireOnedrive: templateItem.requireOnedrive !== false,
          requireRemark: templateItem.requireRemark === true,
          remarkPlaceholder: templateItem.remarkPlaceholder || null,
        });
      }

      // Add for Co-Applicants based on individual incomeRequired toggle
      if (templateItem.coApplicantRequirement !== 'NA' && coApplicantCount > 0) {
        for (let i = 1; i <= coApplicantCount; i++) {
          const coAppData = coApplicantsData && coApplicantsData[i - 1];
          const incomeRequired = coAppData ? coAppData.incomeRequired !== false : true;

          // If this is income category and co-applicant does NOT require income details, skip!
          if (isIncomeCat && !incomeRequired) {
            continue;
          }

          itemsToCreate.push({
            caseId,
            category: cat.name,
            label: templateItem.label,
            appliesTo: `Co-Applicant ${i}`,
            status: 'Pending',
            stage: templateItem.stage,
            updatedById: userId,
            requireOnedrive: templateItem.requireOnedrive !== false,
            requireRemark: templateItem.requireRemark === true,
            remarkPlaceholder: templateItem.remarkPlaceholder || null,
          });
        }
      }
    }
  }

  if (itemsToCreate.length > 0) {
    await prisma.caseChecklistItem.createMany({
      data: itemsToCreate,
    });
  }

  return itemsToCreate.length;
}
