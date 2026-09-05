import { PrismaClient, Role, RequirementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Teams
  const teamOps = await prisma.team.upsert({
    where: { id: 'team-ops-1' },
    update: {},
    create: {
      id: 'team-ops-1',
      name: 'Operations & Verification Team',
    },
  });

  const teamNorth = await prisma.team.upsert({
    where: { id: 'team-north-1' },
    update: {},
    create: {
      id: 'team-north-1',
      name: 'North Region Sales & Processing',
    },
  });

  // 2. Create Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const agentPasswordHash = await bcrypt.hash('agent123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nestguru.com' },
    update: { passwordHash: adminPasswordHash, role: Role.SUPER_ADMIN },
    create: {
      name: 'Super Admin User',
      email: 'admin@nestguru.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      teamId: teamOps.id,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@nestguru.com' },
    update: { passwordHash: agentPasswordHash, role: Role.TEAM_MEMBER },
    create: {
      name: 'Rajesh Kumar (Team Member)',
      email: 'agent@nestguru.com',
      passwordHash: agentPasswordHash,
      role: Role.TEAM_MEMBER,
      teamId: teamOps.id,
    },
  });

  console.log('Created Users:', { admin: admin.email, agent: agent.email });

  // 3. Clear existing Checklist Templates & Categories to avoid duplicates during re-seeding
  await prisma.checklistItemTemplate.deleteMany({});
  await prisma.checklistCategory.deleteMany({});

  // 4. Create Categories & Templates for Home Loan - Salaried
  const product = 'Home Loan';
  const customerType = 'Salaried';

  // Category 1: KYC Documents
  const kycCat = await prisma.checklistCategory.create({
    data: {
      name: 'KYC Documents',
      product,
      customerType,
      items: {
        create: [
          {
            label: 'PAN Card, Aadhar Card',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Current Address Proof (Rent agreement & Electricity Bill if rented / latest utility bill if owned)',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Relationship proof with co-applicant',
            applicantRequirement: RequirementType.IF_APPLICABLE,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Latest 2 passport size photos / Live Photo',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
        ],
      },
    },
  });

  // Category 2: Income Documents
  const incomeCat = await prisma.checklistCategory.create({
    data: {
      name: 'Income Documents',
      product,
      customerType,
      items: {
        create: [
          {
            label: 'Salary Slips for last 6 months',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Last 1 year Salary Account Statement',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Employer ID Card / Service Certificate (defence employees)',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Previous Job relieving letter & New Job joining letter (if job changed in last 2 years)',
            applicantRequirement: RequirementType.IF_APPLICABLE,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Form 16 (Part A & B) and 26AS for 2 years',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Loan account statement & sanction letter of all running loans',
            applicantRequirement: RequirementType.IF_APPLICABLE,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Acknowledged ITR copy with computation + ITR forms for 2 years (if additional income considered)',
            applicantRequirement: RequirementType.IF_APPLICABLE,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
        ],
      },
    },
  });

  // Category 3: Personal Information
  const personalCat = await prisma.checklistCategory.create({
    data: {
      name: 'Personal Information',
      product,
      customerType,
      items: {
        create: [
          {
            label: 'Email ID & Mobile No.',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.IF_APPLICABLE,
            stage: 1,
          },
          {
            label: 'Education Qualification',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.YES,
            stage: 1,
          },
          {
            label: 'Mother & Spouse Name',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.YES,
            stage: 1,
          },
          {
            label: 'Date of Joining current company & Total Job Experience',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.YES,
            stage: 1,
          },
          {
            label: 'No. of years in current residence',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            stage: 1,
          },
          {
            label: '2 References (Name, Address, Mobile, Email)',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            stage: 1,
          },
        ],
      },
    },
  });

  // Category 4: Property Documents
  const propCat = await prisma.checklistCategory.create({
    data: {
      name: 'Property Documents',
      product,
      customerType,
      items: {
        create: [
          // Resale Scoped
          {
            label: 'Agreement to Sale, Approved Map',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'Possession & OC',
            applicantRequirement: RequirementType.IF_APPLICABLE,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'Copy of chain of title, last 13 years',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'Proof of margin payment (account statement)',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'Seller ID, Address proof & cancelled cheque with vintage proof',
            applicantRequirement: RequirementType.ONLY_IF_SELLER_BT,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'Loan account statement since opening',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'List of Documents (LOD)',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },
          {
            label: 'Foreclosure (FC) letter',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'RESALE',
            stage: 1,
          },

          // Takeover / Seller BT Scoped
          {
            label: 'Possession & OC',
            applicantRequirement: RequirementType.IF_APPLICABLE,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'TAKEOVER_SELLER_BT',
            stage: 1,
          },
          {
            label: 'Agreement to Sale',
            applicantRequirement: RequirementType.ONLY_IF_SELLER_BT,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'TAKEOVER_SELLER_BT',
            stage: 1,
          },
          {
            label: 'Copy of chain of title last 13 years & Approved Map',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'TAKEOVER_SELLER_BT',
            stage: 1,
          },

          // Direct Allotment Scoped
          {
            label: 'Allotment Letter / BBA / Cost Sheet & Approved Map',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'DIRECT_ALLOTMENT',
            stage: 1,
          },
          {
            label: 'Payment receipts & Bank statement showing advance payment to Builder',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'DIRECT_ALLOTMENT',
            stage: 1,
          },
          {
            label: 'TDS Challan & Demand Letter',
            applicantRequirement: RequirementType.YES,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'DIRECT_ALLOTMENT',
            stage: 1,
          },
          {
            label: 'Copy of Registry',
            applicantRequirement: RequirementType.ONLY_MAHARASHTRA,
            coApplicantRequirement: RequirementType.NA,
            propertyTypeScope: 'DIRECT_ALLOTMENT',
            stage: 1,
          },
        ],
      },
    },
  });

  console.log('Seeded checklist templates successfully.');

  // 5. Seed sample cases for rich dashboard charts & pivot tables
  await prisma.caseChecklistItem.deleteMany({});
  await prisma.case.deleteMany({});

  const sampleCasesData = [
    {
      clientName: 'Amit Sharma',
      mobile: '9876543210',
      email: 'amit.sharma@example.com',
      product: 'Home Loan',
      customerType: 'Salaried',
      propertyType: 'Resale',
      coApplicantCount: 1,
      stage: 1,
      status: 'Pending Documents',
      createdById: admin.id,
      assignedTeamId: teamOps.id,
    },
    {
      clientName: 'Priya Verma',
      mobile: '9812345678',
      email: 'priya.verma@example.com',
      product: 'Home Loan',
      customerType: 'Salaried',
      propertyType: 'Direct Allotment (Under Construction)',
      coApplicantCount: 0,
      stage: 1,
      status: 'Ready for Submission',
      createdById: agent.id,
      assignedTeamId: teamOps.id,
    },
    {
      clientName: 'Vikram Mehta',
      mobile: '9988776655',
      email: 'vikram.m@example.com',
      product: 'Home Loan',
      customerType: 'Professional',
      propertyType: 'Takeover / Seller BT',
      coApplicantCount: 2,
      stage: 2,
      status: 'In Review',
      createdById: admin.id,
      assignedTeamId: teamNorth.id,
    },
    {
      clientName: 'Siddharth Rao',
      mobile: '9765432109',
      email: 'siddharth.rao@example.com',
      product: 'Loan Against Property',
      customerType: 'Business',
      propertyType: 'Resale',
      coApplicantCount: 1,
      stage: 3,
      status: 'Approved',
      createdById: admin.id,
      assignedTeamId: teamNorth.id,
    },
    {
      clientName: 'Ananya Gupta',
      mobile: '9123456789',
      email: 'ananya.g@example.com',
      product: 'Home Loan',
      customerType: 'Salaried',
      propertyType: 'Resale',
      coApplicantCount: 0,
      stage: 1,
      status: 'Pending Documents',
      createdById: agent.id,
      assignedTeamId: teamOps.id,
    },
  ];

  for (const caseInfo of sampleCasesData) {
    const createdCase = await prisma.case.create({
      data: caseInfo,
    });

    // Generate checklist items for this case
    const itemsToCreate = [];

    // KYC
    itemsToCreate.push(
      {
        category: 'KYC Documents',
        label: 'PAN Card, Aadhar Card',
        appliesTo: 'Applicant',
        status: caseInfo.status === 'Ready for Submission' || caseInfo.status === 'Approved' ? 'Received' : 'Received',
        remark: 'Verified via DigiLocker',
        documentUrl: 'https://onedrive.live.com/?id=sample-pan-aadhar-101',
      },
      {
        category: 'KYC Documents',
        label: 'Current Address Proof (Rent agreement & Electricity Bill)',
        appliesTo: 'Applicant',
        status: caseInfo.status === 'Ready for Submission' ? 'Received' : 'Pending',
        remark: caseInfo.status === 'Ready for Submission' ? 'Electricity bill attached' : 'Awaiting latest bill copy',
        documentUrl: caseInfo.status === 'Ready for Submission' ? 'https://onedrive.live.com/?id=sample-address-proof' : '',
      }
    );

    if (caseInfo.coApplicantCount > 0) {
      itemsToCreate.push({
        category: 'KYC Documents',
        label: 'PAN Card, Aadhar Card',
        appliesTo: 'Co-Applicant 1',
        status: 'Received',
        remark: 'Co-applicant PAN verified',
        documentUrl: 'https://onedrive.live.com/?id=sample-coapp-pan',
      });
    }

    // Income
    itemsToCreate.push(
      {
        category: 'Income Documents',
        label: 'Salary Slips for last 6 months',
        appliesTo: 'Applicant',
        status: caseInfo.status === 'Ready for Submission' || caseInfo.status === 'Approved' ? 'Received' : 'Pending',
        remark: '3 months received, awaiting remaining 3',
      },
      {
        category: 'Income Documents',
        label: 'Form 16 (Part A & B) and 26AS for 2 years',
        appliesTo: 'Applicant',
        status: caseInfo.status === 'Ready for Submission' ? 'Received' : 'Pending',
      }
    );

    // Property Documents based on type
    if (caseInfo.propertyType === 'Resale') {
      itemsToCreate.push(
        {
          category: 'Property Documents',
          label: 'Agreement to Sale, Approved Map',
          appliesTo: 'Applicant',
          status: 'Received',
          documentUrl: 'https://onedrive.live.com/?id=sale-agreement-doc',
        },
        {
          category: 'Property Documents',
          label: 'Copy of chain of title, last 13 years',
          appliesTo: 'Applicant',
          status: caseInfo.status === 'Approved' ? 'Received' : 'Pending',
        }
      );
    } else if (caseInfo.propertyType.includes('Direct Allotment')) {
      itemsToCreate.push(
        {
          category: 'Property Documents',
          label: 'Allotment Letter / BBA / Cost Sheet & Approved Map',
          appliesTo: 'Applicant',
          status: 'Received',
          documentUrl: 'https://onedrive.live.com/?id=builder-allotment-doc',
        },
        {
          category: 'Property Documents',
          label: 'Payment receipts & Bank statement showing advance payment to Builder',
          appliesTo: 'Applicant',
          status: 'Received',
        }
      );
    }

    for (const item of itemsToCreate) {
      await prisma.caseChecklistItem.create({
        data: {
          caseId: createdCase.id,
          category: item.category,
          label: item.label,
          appliesTo: item.appliesTo,
          status: item.status,
          remark: item.remark || null,
          documentUrl: item.documentUrl || null,
          stage: caseInfo.stage,
          updatedById: admin.id,
        },
      });
    }
  }

  console.log('Seeded sample cases and checklist items successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
