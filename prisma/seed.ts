import { PrismaClient, Role, AccessPermission, RequirementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with expanded CRM data...');

  // 1. Seed Bank Configurations
  const banks = [
    { bankName: 'SBI', requiredSalaryMonths: 6 },
    { bankName: 'Bank of Baroda', requiredSalaryMonths: 3 },
    { bankName: 'PNB', requiredSalaryMonths: 2 },
    { bankName: 'HDFC Bank', requiredSalaryMonths: 6 },
    { bankName: 'ICICI Bank', requiredSalaryMonths: 6 },
  ];
  for (const b of banks) {
    await prisma.bankConfig.upsert({
      where: { bankName: b.bankName },
      update: { requiredSalaryMonths: b.requiredSalaryMonths },
      create: b,
    });
  }

  // 2. Seed State Configurations
  const states = ['Karnataka', 'Maharashtra', 'Delhi NCR', 'Telangana', 'Tamil Nadu', 'Haryana', 'Uttar Pradesh'];
  for (const s of states) {
    await prisma.stateConfig.upsert({
      where: { name: s },
      update: {},
      create: { name: s },
    });
  }

  // 3. Create Teams & Users
  const teamOps = await prisma.team.upsert({
    where: { id: 'team-ops-1' },
    update: {},
    create: { id: 'team-ops-1', name: 'Operations & Verification Team' },
  });

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const agentPasswordHash = await bcrypt.hash('agent123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash, role: Role.SUPER_ADMIN, accessPermission: AccessPermission.EDIT },
    create: {
      name: 'Super Admin User',
      username: 'admin',
      email: 'admin@nestguru.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      accessPermission: AccessPermission.EDIT,
      teamId: teamOps.id,
    },
  });

  const channelUser = await prisma.user.upsert({
    where: { username: 'channel' },
    update: { name: 'Anil Sharma', passwordHash: agentPasswordHash, role: Role.CHANNEL, accessPermission: AccessPermission.EDIT },
    create: {
      name: 'Anil Sharma',
      username: 'channel',
      email: 'channel@nestguru.com',
      passwordHash: agentPasswordHash,
      role: Role.CHANNEL,
      accessPermission: AccessPermission.EDIT,
      teamId: teamOps.id,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { username: 'sales' },
    update: { name: 'Vikram Sethi', passwordHash: agentPasswordHash, role: Role.SALES, accessPermission: AccessPermission.EDIT },
    create: {
      name: 'Vikram Sethi',
      username: 'sales',
      email: 'sales@nestguru.com',
      passwordHash: agentPasswordHash,
      role: Role.SALES,
      accessPermission: AccessPermission.EDIT,
      teamId: teamOps.id,
    },
  });

  const opsUser = await prisma.user.upsert({
    where: { username: 'ops' },
    update: { name: 'Pooja Nair', passwordHash: agentPasswordHash, role: Role.OPERATION, accessPermission: AccessPermission.EDIT },
    create: {
      name: 'Pooja Nair',
      username: 'ops',
      email: 'ops@nestguru.com',
      passwordHash: agentPasswordHash,
      role: Role.OPERATION,
      accessPermission: AccessPermission.EDIT,
      teamId: teamOps.id,
    },
  });

  // 4. Checklist Templates (KYC, Income, Personal, Property)
  await prisma.checklistItemTemplate.deleteMany({});
  await prisma.checklistCategory.deleteMany({});

  const product = 'Home Loan';
  const customerType = 'Salaried';

  await prisma.checklistCategory.create({
    data: {
      name: 'KYC Documents',
      product,
      customerType,
      items: {
        create: [
          { label: 'PAN Card', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Aadhar Card', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Current Address Proof (Rent agreement / Utility Bill)', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Latest 2 passport size photos / Live Photo', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
        ],
      },
    },
  });

  await prisma.checklistCategory.create({
    data: {
      name: 'Income Documents',
      product,
      customerType,
      items: {
        create: [
          { label: 'Salary Slips for required months', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Last 1 year Salary Account Statement', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Form 16 (Part A & B)', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Form 26AS', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'Acknowledged ITR copy with computation', applicantRequirement: RequirementType.IF_APPLICABLE, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
          { label: 'ITR Forms', applicantRequirement: RequirementType.IF_APPLICABLE, coApplicantRequirement: RequirementType.IF_APPLICABLE, stage: 1 },
        ],
      },
    },
  });

  await prisma.checklistCategory.create({
    data: {
      name: 'Property Documents',
      product,
      customerType,
      items: {
        create: [
          { label: 'Agreement to Sale, Approved Map', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.NA, propertyTypeScope: 'RESALE', stage: 1 },
          { label: 'Copy of chain of title, last 13 years', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.NA, propertyTypeScope: 'RESALE', stage: 1 },
          { label: 'Allotment Letter / BBA / Cost Sheet & Approved Map', applicantRequirement: RequirementType.YES, coApplicantRequirement: RequirementType.NA, propertyTypeScope: 'DIRECT_ALLOTMENT', stage: 1 },
        ],
      },
    },
  });

  // 5. Seed Sample Cases & Revenue/Expense Records
  await prisma.caseChecklistItem.deleteMany({});
  await prisma.revenueRecord.deleteMany({});
  await prisma.expenseRecord.deleteMany({});
  await prisma.case.deleteMany({});

  const now = new Date();
  const case1 = await prisma.case.create({
    data: {
      clientName: 'Siddharth Varma',
      mobile: '9876543210',
      email: 'siddharth@example.com',
      clientState: 'Karnataka',
      product: 'Home Loan',
      customerType: 'Salaried',
      propertyType: 'Resale',
      coApplicantCount: 1,
      coApplicantsData: JSON.stringify([
        { name: 'Kavita Varma', mobile: '9876543211', email: 'kavita@example.com', state: 'Karnataka', incomeRequired: true }
      ]),
      channelUserId: channelUser.id,
      salesUserId: salesUser.id,
      operationUserId: opsUser.id,
      motherName: 'Sunita Varma',
      spouseName: 'Kavita Varma',
      dojCompany: new Date('2020-04-15'),
      totalExperienceYears: '8 Years',
      residenceYears: '4 Years',
      referencesData: JSON.stringify([
        { name: 'Rohan Gupta', address: 'Indiranagar, Bangalore', phone: '9812345678', email: 'rohan@example.com' }
      ]),
      stage: 2,
      status: 'Ready for Submission',
      createdById: admin.id,
      assignedTeamId: teamOps.id,
      stage1CompletedAt: new Date(now.getTime() - 48 * 3600 * 1000), // 2 days ago
    },
  });

  const case2 = await prisma.case.create({
    data: {
      clientName: 'Megha Rastogi',
      mobile: '9812345670',
      email: 'megha@example.com',
      clientState: 'Maharashtra',
      product: 'Home Loan',
      customerType: 'Salaried',
      propertyType: 'Direct Allotment (Under Construction)',
      coApplicantCount: 0,
      channelUserId: channelUser.id,
      salesUserId: salesUser.id,
      stage: 1,
      status: 'Pending Documents',
      createdById: admin.id,
      assignedTeamId: teamOps.id,
    },
  });

  // Seed Revenues & Expenses
  await prisma.revenueRecord.createMany({
    data: [
      { amount: 150000, month: 'September 2026', state: 'Karnataka', caseId: case1.id },
      { amount: 95000, month: 'September 2026', state: 'Maharashtra', caseId: case2.id },
      { amount: 120000, month: 'August 2026', state: 'Delhi NCR' },
    ],
  });

  await prisma.expenseRecord.createMany({
    data: [
      { amount: 45000, month: 'September 2026' },
      { amount: 38000, month: 'August 2026' },
    ],
  });

  console.log('Seeded database successfully with BankConfigs, StateConfigs, Revenue, Expenses, and Cases.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
