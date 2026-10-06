import { prisma } from './prisma';
import {
  evaluateTemplateItem,
  hasIncomeRestriction,
  productTokens,
  ruleKey,
  toList,
  canonical,
  RulePersonContext,
} from './checklist-rules';

/**
 * Generates CaseChecklistItem rows for a case from the checklist templates.
 *
 * Every template field is evaluated per person (applicant and each co-applicant) using the
 * single universal rule in `checklist-rules.ts`:
 *   empty dropdown = applies to everyone, otherwise the person's selection must exactly match
 *   at least one selected option, and ALL dropdowns must pass (AND).
 */
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
    propertyState?: string | null;
    clientState?: string | null;
    existingItems?: Array<{ label: string; appliesTo: string }>;
  }
) {
  const clientName = options?.clientName || 'Applicant';
  const tokens = productTokens(product, options?.subProduct || null);

  // Applicant context: exactly what was selected on the intake form
  const applicantCtx: RulePersonContext = {
    productTokens: tokens,
    propertyScope: propertyType,
    customerTypes: toList(customerType),
    incomeTypes: toList(options?.incomeTypes),
  };

  const isIndividual = applicantCtx.customerTypes.some((ct) => ruleKey('customerType', ct) === canonical('Individual'));

  // Categories are universal (the editor creates them as ALL); every item carries its own conditions.
  const categories = await prisma.checklistCategory.findMany({
    include: { items: { orderBy: { stage: 'asc' } } },
    orderBy: { name: 'asc' },
  });

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

  const dedupeKey = (label: string, appliesTo: string) => `${canonical(label)}:::${canonical(appliesTo)}`;
  const existingSet = new Set((options?.existingItems || []).map((i) => dedupeKey(i.label, i.appliesTo)));

  const isSellerBT = /seller bt|takeover/i.test(propertyType || '');
  const isMaharashtra = /maharashtra/i.test(`${options?.clientState || ''} ${options?.propertyState || ''}`);

  // Pre-build co-applicant contexts
  const coApps = Array.from({ length: Math.max(0, coApplicantCount || 0) }, (_, idx) => {
    const data = (coApplicantsData && coApplicantsData[idx]) || null;
    const name = data?.name?.trim() || `Co-Applicant ${idx + 1}`;
    const ownCustTypes = toList(data?.customerTypes).length > 0 ? toList(data?.customerTypes) : toList(data?.customerType);
    const ownIncome = toList(data?.incomeTypes);
    const isHousewife =
      ownIncome.some((t) => ruleKey('incomeProfile', t) === canonical('Housewife')) ||
      ownCustTypes.some((t) => ruleKey('customerType', t) === canonical('Housewife'));
    const incomeRequired = isHousewife ? false : data?.incomeRequired === true;
    const ctx: RulePersonContext = {
      productTokens: tokens,
      propertyScope: propertyType,
      // Fall back to the applicant's selection only when the co-applicant has none of their own
      customerTypes: ownCustTypes.length > 0 ? ownCustTypes : applicantCtx.customerTypes,
      incomeTypes: ownIncome.length > 0 ? ownIncome : applicantCtx.incomeTypes,
    };
    return { index: idx + 1, name, incomeRequired, ctx };
  });

  const pushItem = (
    cat: { name: string },
    categoryPart: string,
    templateItem: any,
    stage: number,
    appliesTo: string,
    personName: string
  ) => {
    const key = dedupeKey(templateItem.label, appliesTo);
    if (existingSet.has(key)) return;
    existingSet.add(key);
    itemsToCreate.push({
      caseId,
      category: cat.name,
      categoryPart,
      label: templateItem.label,
      appliesTo,
      personName,
      status: 'Pending',
      isMandatory: templateItem.isMandatory !== false,
      stage,
      updatedById: userId,
      requireOnedrive: templateItem.requireOnedrive !== false,
      requireRemark: templateItem.requireRemark === true,
      remarkPlaceholder: templateItem.remarkPlaceholder || null,
    });
  };

  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    let categoryPart = 'OTHER';
    if (catNameLower.includes('kyc')) categoryPart = 'KYC';
    else if (catNameLower.includes('income')) categoryPart = 'INCOME';
    else if (catNameLower.includes('personal')) categoryPart = 'PERSONAL';
    else if (catNameLower.includes('property')) categoryPart = 'PROPERTY';

    // Personal Information applies to individual applicants only
    if (categoryPart === 'PERSONAL' && !isIndividual) continue;

    for (const templateItem of cat.items) {
      // Special requirement flags
      if (templateItem.applicantRequirement === 'ONLY_IF_SELLER_BT' && !isSellerBT) continue;
      if (templateItem.applicantRequirement === 'ONLY_MAHARASHTRA' && !isMaharashtra) continue;

      const stagesFromList = (templateItem.stages || '')
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n) && n > 0);
      const finalStages: number[] = stagesFromList.length > 0 ? stagesFromList : [templateItem.stage || 1];

      const applicantOk = templateItem.applicantRequirement !== 'NA' && evaluateTemplateItem(templateItem, applicantCtx).ok;

      const incomeRestricted = hasIncomeRestriction(templateItem);
      const eligibleCoApps =
        templateItem.coApplicantRequirement === 'NA'
          ? []
          : coApps.filter((co) => {
              // Non-financial co-applicants never get income documents
              if (!co.incomeRequired && (incomeRestricted || categoryPart === 'INCOME')) return false;
              if (!co.incomeRequired) {
                // Evaluate everything except income profile for KYC-only co-applicants
                return evaluateTemplateItem({ ...templateItem, incomeType: null }, co.ctx).ok;
              }
              return evaluateTemplateItem(templateItem, co.ctx).ok;
            });

      for (const stage of finalStages) {
        if (applicantOk) {
          pushItem(cat, categoryPart, templateItem, stage, `${clientName} (Applicant)`, clientName);
        }
        for (const co of eligibleCoApps) {
          pushItem(cat, categoryPart, templateItem, stage, `${co.name} (Co-Applicant ${co.index})`, co.name);
        }
      }
    }
  }

  if (itemsToCreate.length > 0) {
    await prisma.caseChecklistItem.createMany({ data: itemsToCreate });
  }

  return itemsToCreate.length;
}
