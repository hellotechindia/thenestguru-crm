import { prisma } from './prisma';

export async function generateChecklistForCase(
  caseId: string,
  product: string,
  customerType: string,
  propertyType: string,
  coApplicantCount: number,
  userId: string
) {
  // Normalize property type scope string
  let normalizedPropScope: string | null = null;
  if (propertyType.toLowerCase().includes('resale')) {
    normalizedPropScope = 'RESALE';
  } else if (propertyType.toLowerCase().includes('takeover') || propertyType.toLowerCase().includes('seller bt')) {
    normalizedPropScope = 'TAKEOVER_SELLER_BT';
  } else if (propertyType.toLowerCase().includes('direct allotment') || propertyType.toLowerCase().includes('under construction')) {
    normalizedPropScope = 'DIRECT_ALLOTMENT';
  }

  // 1. Fetch relevant categories matching product & customerType (or fallback matching product)
  const categories = await prisma.checklistCategory.findMany({
    where: {
      product: product,
      customerType: customerType,
    },
    include: {
      items: true,
    },
  });

  // If no specific category found, fallback to fetching all default template items
  let categoriesToUse = categories;
  if (categoriesToUse.length === 0) {
    categoriesToUse = await prisma.checklistCategory.findMany({
      include: {
        items: true,
      },
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
  }[] = [];

  for (const cat of categoriesToUse) {
    for (const templateItem of cat.items) {
      // Filter by propertyTypeScope if specified on template
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
        });
      }

      // Add for Co-Applicants
      if (templateItem.coApplicantRequirement !== 'NA' && coApplicantCount > 0) {
        for (let i = 1; i <= coApplicantCount; i++) {
          itemsToCreate.push({
            caseId,
            category: cat.name,
            label: templateItem.label,
            appliesTo: `Co-Applicant ${i}`,
            status: 'Pending',
            stage: templateItem.stage,
            updatedById: userId,
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
