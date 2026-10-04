import { prisma } from './prisma';

export async function generateChecklistForCase(
  caseId: string,
  product: string,
  customerType: string,
  propertyType: string,
  coApplicantCount: number,
  coApplicantsData: any[] | null | undefined,
  userId: string,
  options?: {
    subProduct?: string | null;
    clientName?: string;
    incomeTypes?: string[] | null;
  }
) {
  const clientName = options?.clientName || 'Applicant';
  const subProduct = options?.subProduct || null;
  const incomeTypes = options?.incomeTypes && options.incomeTypes.length > 0
    ? options.incomeTypes
    : [customerType]; // Fallback to customerType or profile

  // Dynamic matching for property scope
  const propertyScopes = await prisma.propertyScopeMaster.findMany();
  let matchedPropScope: string | null = null;
  for (const s of propertyScopes) {
    if (propertyType.toLowerCase().includes(s.name.toLowerCase())) {
      matchedPropScope = s.name;
      break;
    }
  }

  // Fallback heuristic for legacy scopes
  if (!matchedPropScope) {
    if (propertyType.toLowerCase().includes('resale')) {
      matchedPropScope = 'Resale';
    } else if (propertyType.toLowerCase().includes('takeover') || propertyType.toLowerCase().includes('seller bt')) {
      matchedPropScope = 'Takeover / Seller BT';
    } else if (propertyType.toLowerCase().includes('plot')) {
      matchedPropScope = 'Direct Allotment - Plot';
    } else if (propertyType.toLowerCase().includes('direct allotment') || propertyType.toLowerCase().includes('flat') || propertyType.toLowerCase().includes('under construction')) {
      matchedPropScope = 'Direct Allotment - Flat';
    }
  }

  // Fetch categories matching product or customerType or generic/universal (ALL)
  let categories = await prisma.checklistCategory.findMany({
    where: {
      OR: [
        { product: 'ALL' },
        { product: 'All Products' },
        { customerType: 'ALL' },
        { customerType: 'All Profiles' },
        { product, customerType },
        { product },
        { customerType },
      ],
    },
    include: { items: true },
  });

  if (categories.length === 0) {
    categories = await prisma.checklistCategory.findMany({
      include: { items: true },
    });
  }

  const itemsToCreate: {
    caseId: string;
    category: string;
    categoryPart: string;
    label: string;
    appliesTo: string;
    personName: string;
    status: string;
    isMandatory: boolean;
    stage: number;
    updatedById: string;
    requireOnedrive?: boolean;
    requireRemark?: boolean;
    remarkPlaceholder?: string | null;
  }[] = [];

  const isIndividual = customerType.toLowerCase().includes('individual') || customerType.toLowerCase().includes('salaried');

  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    
    // Classify category part
    let categoryPart = 'OTHER';
    if (catNameLower.includes('kyc')) {
      categoryPart = 'KYC';
    } else if (catNameLower.includes('income')) {
      categoryPart = 'INCOME';
    } else if (catNameLower.includes('personal')) {
      categoryPart = 'PERSONAL';
    } else if (catNameLower.includes('property')) {
      categoryPart = 'PROPERTY';
    }

    // Pointer 5: "Personal Information must be for only individuals"
    if (categoryPart === 'PERSONAL' && !isIndividual) {
      continue;
    }

    for (const templateItem of cat.items) {
      // Sub-Product Filter if defined on template
      if (templateItem.subProduct && templateItem.subProduct !== 'ALL' && subProduct) {
        const allowedSubs = templateItem.subProduct.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (allowedSubs.length > 0) {
          const sLower = subProduct.toLowerCase();
          const matches = allowedSubs.some((sp: string) => sp === sLower || sLower.includes(sp) || sp.includes(sLower));
          if (!matches) continue;
        }
      }

      // Customer Type Filter if defined on template
      if (templateItem.customerType && templateItem.customerType !== 'ALL') {
        const allowedCustomerTypes = templateItem.customerType.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (allowedCustomerTypes.length > 0) {
          const cTypeLower = customerType.toLowerCase();
          const matchesCustType = allowedCustomerTypes.some((ct: string) => cTypeLower.includes(ct) || ct.includes(cTypeLower));
          if (!matchesCustType) continue;
        }
      }

      // Property Type Scope Filter
      if (templateItem.propertyTypeScope && templateItem.propertyTypeScope !== 'ALL') {
        const allowedScopes = templateItem.propertyTypeScope.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (allowedScopes.length > 0) {
          const caseScope = (matchedPropScope || propertyType).toLowerCase();
          const matches = allowedScopes.some((as: string) => caseScope.includes(as) || as.includes(caseScope));
          if (!matches) continue;
        }
      }

      // Income type check if template item is specific to an income type
      if (categoryPart === 'INCOME' && templateItem.incomeType && templateItem.incomeType !== 'ALL') {
        const allowedIncomes = templateItem.incomeType.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (allowedIncomes.length > 0) {
          const matchesAnyIncome = incomeTypes.some((it: string) => 
            allowedIncomes.some((ai: string) => it.toLowerCase().includes(ai) || ai.includes(it.toLowerCase()))
          );
          if (!matchesAnyIncome) {
            continue;
          }
        }
      }

      // Target Workflow Stages (Support multiple stages if configured)
      const targetStages: number[] = templateItem.stages
        ? templateItem.stages.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n) && n > 0)
        : [templateItem.stage || 1];
      const finalStages = targetStages.length > 0 ? targetStages : [templateItem.stage || 1];

      for (const currentStage of finalStages) {
        // Add for Applicant
        if (templateItem.applicantRequirement !== 'NA') {
          const appliesToLabel = `${clientName} (Applicant)`;
          itemsToCreate.push({
            caseId,
            category: cat.name,
            categoryPart,
            label: templateItem.label,
            appliesTo: appliesToLabel,
            personName: clientName,
            status: 'Pending',
            isMandatory: templateItem.isMandatory !== false,
            stage: currentStage,
            updatedById: userId,
            requireOnedrive: templateItem.requireOnedrive !== false,
            requireRemark: templateItem.requireRemark === true,
            remarkPlaceholder: templateItem.remarkPlaceholder || null,
          });
        }

        // Add for Co-Applicants
        if (templateItem.coApplicantRequirement !== 'NA' && coApplicantCount > 0) {
          for (let i = 1; i <= coApplicantCount; i++) {
            const coAppData = coApplicantsData && coApplicantsData[i - 1];
            const coAppName = coAppData?.name?.trim() || `Co-Applicant ${i}`;
            const isHousewife = (coAppData?.incomeTypes && Array.isArray(coAppData.incomeTypes) && coAppData.incomeTypes.some((t: string) => t.toLowerCase().includes('housewife'))) || (coAppData?.customerType && coAppData.customerType.toLowerCase().includes('housewife'));
            const incomeRequired = isHousewife ? false : (coAppData ? coAppData.incomeRequired === true : false);

            // If this is income category and co-applicant does NOT require income, skip
            if (categoryPart === 'INCOME' && !incomeRequired) {
              continue;
            }

            // If template item is specific to an income type, verify against co-applicant's income types
            if (categoryPart === 'INCOME' && templateItem.incomeType && templateItem.incomeType !== 'ALL') {
              const coIncomeTypes: string[] = (coAppData?.incomeTypes && Array.isArray(coAppData.incomeTypes) && coAppData.incomeTypes.length > 0)
                ? coAppData.incomeTypes
                : incomeTypes;
              const allowedIncomes = templateItem.incomeType.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
              if (allowedIncomes.length > 0) {
                const matchesAnyIncome = coIncomeTypes.some((it: string) =>
                  allowedIncomes.some((ai: string) => it.toLowerCase().includes(ai) || ai.includes(it.toLowerCase()))
                );
                if (!matchesAnyIncome) {
                  continue;
                }
              }
            }

            const appliesToLabel = `${coAppName} (Co-Applicant ${i})`;
            itemsToCreate.push({
              caseId,
              category: cat.name,
              categoryPart,
              label: templateItem.label,
              appliesTo: appliesToLabel,
              personName: coAppName,
              status: 'Pending',
              isMandatory: templateItem.isMandatory !== false,
              stage: currentStage,
              updatedById: userId,
              requireOnedrive: templateItem.requireOnedrive !== false,
              requireRemark: templateItem.requireRemark === true,
              remarkPlaceholder: templateItem.remarkPlaceholder || null,
            });
          }
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
