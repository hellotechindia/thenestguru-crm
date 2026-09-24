import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Property Scopes
  const propertyScopes = [
    'Resale',
    'Takeover / Seller BT',
    'Direct Allotment - Flat',
    'Direct Allotment - Plot',
    'Commercial Property',
    'Industrial Plot',
  ];

  for (const name of propertyScopes) {
    await prisma.propertyScopeMaster.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Seed Customer Types / Entities
  const customerEntities = [
    { name: 'Individual', description: 'Salaried or Self-employed individual applicant' },
    { name: 'Partnership Firm', description: 'Registered or unregistered partnership entity' },
    { name: 'Proprietorship', description: 'Sole proprietorship business entity' },
    { name: 'Private Limited Company', description: 'Incorporated company under Companies Act' },
    { name: 'Public Limited Company', description: 'Publicly listed or unlisted company' },
    { name: 'Limited Liability Partnership (LLP)', description: 'LLP registered under MCA' },
    { name: 'Hindu Undivided Family (HUF)', description: 'HUF represented by Karta' },
  ];

  for (const ent of customerEntities) {
    await prisma.customerTypeMaster.upsert({
      where: { name: ent.name },
      update: { description: ent.description },
      create: { name: ent.name, description: ent.description },
    });
    // also maintain backward-compatible TargetCategoryMaster
    await prisma.targetCategoryMaster.upsert({
      where: { name: ent.name },
      update: {},
      create: { name: ent.name },
    });
  }

  // 3. Seed Workflow Stages
  const workflowStages = [
    {
      stageNumber: 1,
      name: 'Lead Intake & KYC Verification',
      description: 'Applicant profile, co-applicant intake & initial KYC verification',
      color: '#0284c7', // Sky blue
      incentiveAmount: 500,
    },
    {
      stageNumber: 2,
      name: 'Property Legal & Technical Verification',
      description: 'Valuation, legal search report & property site inspection',
      color: '#8b5cf6', // Violet
      incentiveAmount: 1000,
    },
    {
      stageNumber: 3,
      name: 'Bank Login & Credit Underwriting',
      description: 'Submission to lender, credit assessment & portal tracking',
      color: '#f59e0b', // Amber
      incentiveAmount: 1500,
    },
    {
      stageNumber: 4,
      name: 'Sanction & Final Disbursement',
      description: 'Sanction letter issued, OTC/PDD collection & loan disbursement',
      color: '#10b981', // Emerald
      incentiveAmount: 3000,
    },
  ];

  for (const stg of workflowStages) {
    await prisma.workflowStageMaster.upsert({
      where: { stageNumber: stg.stageNumber },
      update: {
        name: stg.name,
        description: stg.description,
        color: stg.color,
        incentiveAmount: stg.incentiveAmount,
        isActive: true,
      },
      create: stg,
    });
  }

  console.log('Seeded property scopes, customer entity types, and workflow stages successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
