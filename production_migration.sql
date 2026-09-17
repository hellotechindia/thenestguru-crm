-- ========================================================
-- PRODUCTION DATA MIGRATION SCRIPT
-- Source Database: thenestguru_crm (Local)
-- Target Database: thenestgurucrm_crm (Production)
-- Generated on: 2026-09-15T21:22:30.566Z
-- 
-- Notes:
-- 1. Schema has already been initialized via Prisma.
-- 2. DATA-ONLY: No CREATE TABLE, DROP TABLE, or ALTER TABLE.
-- 3. Exact case-sensitive Linux table names are used.
-- 4. Parent records are inserted before child records.
-- 5. Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotence.
-- 6. Preserves all IDs, timestamps, enums, and password hashes.
-- ========================================================

USE `thenestgurucrm_crm`;

SET NAMES utf8mb4;

START TRANSACTION;

-- --------------------------------------------------------
-- Data for table `Team` (1 rows)
-- Preserves existing production record if already present
-- --------------------------------------------------------
INSERT INTO `Team` (`id`, `name`, `createdAt`)
VALUES ('team-ops-1', 'Operations & Verification Team', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- --------------------------------------------------------
-- Data for table `User` (5 rows)
-- --------------------------------------------------------
INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `accessPermission`, `teamId`, `createdAt`, `updatedAt`)
VALUES ('cmu2l4ifl000d9nwtfpty9l8g', 'Super Admin User', 'admin@nestguru.com', '$2a$10$FA7V9C0aTXo4S9l2k/RsfeF6e2v9MMDH/dC7/sw65aVGoqL.RQlB6', 'SUPER_ADMIN', 'EDIT', 'team-ops-1', '2026-09-15 11:24:54', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `role` = VALUES(`role`), `accessPermission` = VALUES(`accessPermission`), `teamId` = VALUES(`teamId`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `accessPermission`, `teamId`, `createdAt`, `updatedAt`)
VALUES ('cmu2l4ifw000h9nwtchkl9ovj', 'Anil Sharma (Channel Partner)', 'channel@nestguru.com', '$2a$10$k78d8/AutW5kfEfxUwRjX.NW1S693gA6XFgpXEq14PC1kraMdklge', 'CHANNEL', 'EDIT', 'team-ops-1', '2026-09-15 11:24:55', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `role` = VALUES(`role`), `accessPermission` = VALUES(`accessPermission`), `teamId` = VALUES(`teamId`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `accessPermission`, `teamId`, `createdAt`, `updatedAt`)
VALUES ('cmu2l4ifz000j9nwtrnj13n9u', 'Vikram Sethi (Sales Lead)', 'sales@nestguru.com', '$2a$10$k78d8/AutW5kfEfxUwRjX.NW1S693gA6XFgpXEq14PC1kraMdklge', 'SALES', 'EDIT', 'team-ops-1', '2026-09-15 11:24:55', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `role` = VALUES(`role`), `accessPermission` = VALUES(`accessPermission`), `teamId` = VALUES(`teamId`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `accessPermission`, `teamId`, `createdAt`, `updatedAt`)
VALUES ('cmu2l4ig4000l9nwt169p8t7n', 'Pooja Nair (Operations Specialist)', 'ops@nestguru.com', '$2a$10$k78d8/AutW5kfEfxUwRjX.NW1S693gA6XFgpXEq14PC1kraMdklge', 'OPERATION', 'EDIT', 'team-ops-1', '2026-09-15 11:24:55', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `role` = VALUES(`role`), `accessPermission` = VALUES(`accessPermission`), `teamId` = VALUES(`teamId`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `accessPermission`, `teamId`, `createdAt`, `updatedAt`)
VALUES ('cmu2mnz6h0002dkbeu7z91pfb', 'Deepak Kumar', 'test@gmail.com', '$2a$10$gxhqXhcs6Yqay95Jbh8JEORvOvpgrL5A3OWvEaHZf1qnZCK3aluum', 'CHANNEL', 'EDIT', 'team-ops-1', '2026-09-15 12:08:02', '2026-09-15 12:08:15')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `role` = VALUES(`role`), `accessPermission` = VALUES(`accessPermission`), `teamId` = VALUES(`teamId`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

-- --------------------------------------------------------
-- Data for table `BankConfig` (5 rows)
-- --------------------------------------------------------
INSERT INTO `BankConfig` (`id`, `bankName`, `requiredSalaryMonths`, `createdAt`)
VALUES ('cmu2l4i9h00009nwt7ifb7p6m', 'SBI', 6, '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `bankName` = VALUES(`bankName`), `requiredSalaryMonths` = VALUES(`requiredSalaryMonths`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `BankConfig` (`id`, `bankName`, `requiredSalaryMonths`, `createdAt`)
VALUES ('cmu2l4i9u00019nwtpb1auceb', 'Bank of Baroda', 3, '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `bankName` = VALUES(`bankName`), `requiredSalaryMonths` = VALUES(`requiredSalaryMonths`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `BankConfig` (`id`, `bankName`, `requiredSalaryMonths`, `createdAt`)
VALUES ('cmu2l4i9x00029nwt1hkew7op', 'PNB', 2, '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `bankName` = VALUES(`bankName`), `requiredSalaryMonths` = VALUES(`requiredSalaryMonths`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `BankConfig` (`id`, `bankName`, `requiredSalaryMonths`, `createdAt`)
VALUES ('cmu2l4ia200039nwt3vqu2iyg', 'HDFC Bank', 6, '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `bankName` = VALUES(`bankName`), `requiredSalaryMonths` = VALUES(`requiredSalaryMonths`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `BankConfig` (`id`, `bankName`, `requiredSalaryMonths`, `createdAt`)
VALUES ('cmu2l4ia500049nwtkrkdprk9', 'ICICI Bank', 6, '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `bankName` = VALUES(`bankName`), `requiredSalaryMonths` = VALUES(`requiredSalaryMonths`), `createdAt` = VALUES(`createdAt`);

-- --------------------------------------------------------
-- Data for table `StateConfig` (7 rows)
-- --------------------------------------------------------
INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4ia800059nwtcvrh9ird', 'Karnataka', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4iae00069nwtgy46u7t7', 'Maharashtra', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4iaj00079nwtg4v8fcxy', 'Delhi NCR', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4iam00089nwtsci75vp6', 'Telangana', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4iap00099nwts7x03au2', 'Tamil Nadu', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4ias000a9nwtg0gbuf6q', 'Haryana', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `StateConfig` (`id`, `name`, `createdAt`)
VALUES ('cmu2l4iav000b9nwtvd0rwl28', 'Uttar Pradesh', '2026-09-15 11:24:54')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `createdAt` = VALUES(`createdAt`);

-- --------------------------------------------------------
-- Data for table `ExpenseRecord` (2 rows)
-- --------------------------------------------------------
INSERT INTO `ExpenseRecord` (`id`, `amount`, `month`, `createdAt`)
VALUES ('cmu2m70l80017xind0evab8k9', 45000, 'September 2026', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `month` = VALUES(`month`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ExpenseRecord` (`id`, `amount`, `month`, `createdAt`)
VALUES ('cmu2m70l80018xind27k5kuot', 38000, 'August 2026', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `month` = VALUES(`month`), `createdAt` = VALUES(`createdAt`);

-- --------------------------------------------------------
-- Data for table `ChecklistCategory` (3 rows)
-- --------------------------------------------------------
INSERT INTO `ChecklistCategory` (`id`, `name`, `product`, `customerType`, `createdAt`)
VALUES ('cmu2m70kg000kxindnaipwd0k', 'KYC Documents', 'Home Loan', 'Salaried', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `product` = VALUES(`product`), `customerType` = VALUES(`customerType`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistCategory` (`id`, `name`, `product`, `customerType`, `createdAt`)
VALUES ('cmu2m70ko000pxindyeru1hlf', 'Income Documents', 'Home Loan', 'Salaried', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `product` = VALUES(`product`), `customerType` = VALUES(`customerType`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistCategory` (`id`, `name`, `product`, `customerType`, `createdAt`)
VALUES ('cmu2m70kr000wxind3x1ac0w5', 'Property Documents', 'Home Loan', 'Salaried', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `product` = VALUES(`product`), `customerType` = VALUES(`customerType`), `createdAt` = VALUES(`createdAt`);

-- --------------------------------------------------------
-- Data for table `ChecklistItemTemplate` (13 rows)
-- --------------------------------------------------------
INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kg000lxinddjzsfmke', 'cmu2m70kg000kxindnaipwd0k', 'PAN Card', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kg000mxind9lu12q0p', 'cmu2m70kg000kxindnaipwd0k', 'Aadhar Card', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kg000nxind6a8rckek', 'cmu2m70kg000kxindnaipwd0k', 'Current Address Proof (Rent agreement / Utility Bill)', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kg000oxindwhqzxvyx', 'cmu2m70kg000kxindnaipwd0k', 'Latest 2 passport size photos / Live Photo', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70ko000qxindyokka0ea', 'cmu2m70ko000pxindyeru1hlf', 'Salary Slips for required months', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70ko000rxindwh78c1z5', 'cmu2m70ko000pxindyeru1hlf', 'Last 1 year Salary Account Statement', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70ko000sxindatnbp3rh', 'cmu2m70ko000pxindyeru1hlf', 'Form 16 (Part A & B)', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70ko000txindsu5usl1x', 'cmu2m70ko000pxindyeru1hlf', 'Form 26AS', 'YES', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70ko000uxindqvm217wr', 'cmu2m70ko000pxindyeru1hlf', 'Acknowledged ITR copy with computation', 'IF_APPLICABLE', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70ko000vxindyit83y95', 'cmu2m70ko000pxindyeru1hlf', 'ITR Forms', 'IF_APPLICABLE', 'IF_APPLICABLE', NULL, 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kr000xxindznswdbty', 'cmu2m70kr000wxind3x1ac0w5', 'Agreement to Sale, Approved Map', 'YES', 'NA', 'RESALE', 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kr000yxindgbjau86k', 'cmu2m70kr000wxind3x1ac0w5', 'Copy of chain of title, last 13 years', 'YES', 'NA', 'RESALE', 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `ChecklistItemTemplate` (`id`, `categoryId`, `label`, `applicantRequirement`, `coApplicantRequirement`, `propertyTypeScope`, `stage`, `createdAt`)
VALUES ('cmu2m70kr000zxind7czni2w9', 'cmu2m70kr000wxind3x1ac0w5', 'Allotment Letter / BBA / Cost Sheet & Approved Map', 'YES', 'NA', 'DIRECT_ALLOTMENT', 1, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `categoryId` = VALUES(`categoryId`), `label` = VALUES(`label`), `applicantRequirement` = VALUES(`applicantRequirement`), `coApplicantRequirement` = VALUES(`coApplicantRequirement`), `propertyTypeScope` = VALUES(`propertyTypeScope`), `stage` = VALUES(`stage`), `createdAt` = VALUES(`createdAt`);

-- --------------------------------------------------------
-- Data for table `Case` (3 rows)
-- --------------------------------------------------------
INSERT INTO `Case` (`id`, `clientName`, `mobile`, `email`, `clientState`, `product`, `customerType`, `propertyType`, `coApplicantCount`, `coApplicantsData`, `channelUserId`, `salesUserId`, `operationUserId`, `motherName`, `spouseName`, `dojCompany`, `totalExperienceYears`, `residenceYears`, `referencesData`, `stage`, `status`, `createdById`, `assignedTeamId`, `stage1CompletedAt`, `stage2CompletedAt`, `stage3CompletedAt`, `stage4CompletedAt`, `createdAt`, `updatedAt`)
VALUES ('cmu2m70kz0011xindw236s1w7', 'Siddharth Varma', '9876543210', 'siddharth@example.com', 'Karnataka', 'Home Loan', 'Salaried', 'Resale', 1, '[{"name":"Kavita Varma","mobile":"9876543211","email":"kavita@example.com","state":"Karnataka","incomeRequired":true}]', 'cmu2l4ifw000h9nwtchkl9ovj', 'cmu2l4ifz000j9nwtrnj13n9u', 'cmu2l4ig4000l9nwt169p8t7n', 'Sunita Varma', 'Kavita Varma', '2020-04-15 00:00:00', '8 Years', '4 Years', '[{"name":"Rohan Gupta","address":"Indiranagar, Bangalore","phone":"9812345678","email":"rohan@example.com"}]', 2, 'Ready for Submission', 'cmu2l4ifl000d9nwtfpty9l8g', 'team-ops-1', '2026-09-13 11:54:51', NULL, NULL, NULL, '2026-09-15 11:54:51', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `clientName` = VALUES(`clientName`), `mobile` = VALUES(`mobile`), `email` = VALUES(`email`), `clientState` = VALUES(`clientState`), `product` = VALUES(`product`), `customerType` = VALUES(`customerType`), `propertyType` = VALUES(`propertyType`), `coApplicantCount` = VALUES(`coApplicantCount`), `coApplicantsData` = VALUES(`coApplicantsData`), `channelUserId` = VALUES(`channelUserId`), `salesUserId` = VALUES(`salesUserId`), `operationUserId` = VALUES(`operationUserId`), `motherName` = VALUES(`motherName`), `spouseName` = VALUES(`spouseName`), `dojCompany` = VALUES(`dojCompany`), `totalExperienceYears` = VALUES(`totalExperienceYears`), `residenceYears` = VALUES(`residenceYears`), `referencesData` = VALUES(`referencesData`), `stage` = VALUES(`stage`), `status` = VALUES(`status`), `createdById` = VALUES(`createdById`), `assignedTeamId` = VALUES(`assignedTeamId`), `stage1CompletedAt` = VALUES(`stage1CompletedAt`), `stage2CompletedAt` = VALUES(`stage2CompletedAt`), `stage3CompletedAt` = VALUES(`stage3CompletedAt`), `stage4CompletedAt` = VALUES(`stage4CompletedAt`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `Case` (`id`, `clientName`, `mobile`, `email`, `clientState`, `product`, `customerType`, `propertyType`, `coApplicantCount`, `coApplicantsData`, `channelUserId`, `salesUserId`, `operationUserId`, `motherName`, `spouseName`, `dojCompany`, `totalExperienceYears`, `residenceYears`, `referencesData`, `stage`, `status`, `createdById`, `assignedTeamId`, `stage1CompletedAt`, `stage2CompletedAt`, `stage3CompletedAt`, `stage4CompletedAt`, `createdAt`, `updatedAt`)
VALUES ('cmu2m70l30013xindl0cw4dnk', 'Megha Rastogi', '9812345670', 'megha@example.com', 'Maharashtra', 'Home Loan', 'Salaried', 'Direct Allotment (Under Construction)', 0, NULL, 'cmu2l4ifw000h9nwtchkl9ovj', 'cmu2l4ifz000j9nwtrnj13n9u', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'Pending Documents', 'cmu2l4ifl000d9nwtfpty9l8g', 'team-ops-1', NULL, NULL, NULL, NULL, '2026-09-15 11:54:51', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `clientName` = VALUES(`clientName`), `mobile` = VALUES(`mobile`), `email` = VALUES(`email`), `clientState` = VALUES(`clientState`), `product` = VALUES(`product`), `customerType` = VALUES(`customerType`), `propertyType` = VALUES(`propertyType`), `coApplicantCount` = VALUES(`coApplicantCount`), `coApplicantsData` = VALUES(`coApplicantsData`), `channelUserId` = VALUES(`channelUserId`), `salesUserId` = VALUES(`salesUserId`), `operationUserId` = VALUES(`operationUserId`), `motherName` = VALUES(`motherName`), `spouseName` = VALUES(`spouseName`), `dojCompany` = VALUES(`dojCompany`), `totalExperienceYears` = VALUES(`totalExperienceYears`), `residenceYears` = VALUES(`residenceYears`), `referencesData` = VALUES(`referencesData`), `stage` = VALUES(`stage`), `status` = VALUES(`status`), `createdById` = VALUES(`createdById`), `assignedTeamId` = VALUES(`assignedTeamId`), `stage1CompletedAt` = VALUES(`stage1CompletedAt`), `stage2CompletedAt` = VALUES(`stage2CompletedAt`), `stage3CompletedAt` = VALUES(`stage3CompletedAt`), `stage4CompletedAt` = VALUES(`stage4CompletedAt`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `Case` (`id`, `clientName`, `mobile`, `email`, `clientState`, `product`, `customerType`, `propertyType`, `coApplicantCount`, `coApplicantsData`, `channelUserId`, `salesUserId`, `operationUserId`, `motherName`, `spouseName`, `dojCompany`, `totalExperienceYears`, `residenceYears`, `referencesData`, `stage`, `status`, `createdById`, `assignedTeamId`, `stage1CompletedAt`, `stage2CompletedAt`, `stage3CompletedAt`, `stage4CompletedAt`, `createdAt`, `updatedAt`)
VALUES ('cmu2mp1am0004dkbec75put5s', 'Deep', '9876543210', 'testsc@gmail.com', 'Haryana', 'Home Loan', 'Salaried', 'Resale', 1, '[{"name":"","mobile":"","email":"","state":"Delhi NCR","incomeRequired":true}]', 'cmu2mnz6h0002dkbeu7z91pfb', 'cmu2l4ifz000j9nwtrnj13n9u', 'cmu2l4ig4000l9nwt169p8t7n', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'Pending Documents', 'cmu2l4ifl000d9nwtfpty9l8g', 'team-ops-1', NULL, NULL, NULL, NULL, '2026-09-15 12:08:52', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `clientName` = VALUES(`clientName`), `mobile` = VALUES(`mobile`), `email` = VALUES(`email`), `clientState` = VALUES(`clientState`), `product` = VALUES(`product`), `customerType` = VALUES(`customerType`), `propertyType` = VALUES(`propertyType`), `coApplicantCount` = VALUES(`coApplicantCount`), `coApplicantsData` = VALUES(`coApplicantsData`), `channelUserId` = VALUES(`channelUserId`), `salesUserId` = VALUES(`salesUserId`), `operationUserId` = VALUES(`operationUserId`), `motherName` = VALUES(`motherName`), `spouseName` = VALUES(`spouseName`), `dojCompany` = VALUES(`dojCompany`), `totalExperienceYears` = VALUES(`totalExperienceYears`), `residenceYears` = VALUES(`residenceYears`), `referencesData` = VALUES(`referencesData`), `stage` = VALUES(`stage`), `status` = VALUES(`status`), `createdById` = VALUES(`createdById`), `assignedTeamId` = VALUES(`assignedTeamId`), `stage1CompletedAt` = VALUES(`stage1CompletedAt`), `stage2CompletedAt` = VALUES(`stage2CompletedAt`), `stage3CompletedAt` = VALUES(`stage3CompletedAt`), `stage4CompletedAt` = VALUES(`stage4CompletedAt`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);

-- --------------------------------------------------------
-- Data for table `CaseChecklistItem` (22 rows)
-- --------------------------------------------------------
INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk0005dkbetegftsrl', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'PAN Card', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk0006dkbehk6h3bhp', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'PAN Card', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk0007dkbeltfa43ud', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'Aadhar Card', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk0008dkberrwncmpo', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'Aadhar Card', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk0009dkbew2eu21zp', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'Current Address Proof (Rent agreement / Utility Bill)', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000adkbedxxujliq', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'Current Address Proof (Rent agreement / Utility Bill)', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000bdkbewqj56f5t', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'Latest 2 passport size photos / Live Photo', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000cdkbe2wlwnlut', 'cmu2mp1am0004dkbec75put5s', 'KYC Documents', 'Latest 2 passport size photos / Live Photo', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000ddkbetkiack97', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Salary Slips for required months', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000edkbejp6773kq', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Salary Slips for required months', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000fdkbech17l39v', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Last 1 year Salary Account Statement', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000gdkbedz0a60lo', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Last 1 year Salary Account Statement', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000hdkbey5lpi4zc', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Form 16 (Part A & B)', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000idkbeiwztqm8d', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Form 16 (Part A & B)', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bk000jdkbex9cy5i42', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Form 26AS', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000kdkbe7vsf70al', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Form 26AS', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000ldkbe2vo3zb6p', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Acknowledged ITR copy with computation', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000mdkbewdwsttfy', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'Acknowledged ITR copy with computation', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000ndkbeppjemwt4', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'ITR Forms', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000odkbe57sfkrm3', 'cmu2mp1am0004dkbec75put5s', 'Income Documents', 'ITR Forms', 'Co-Applicant 1', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000pdkbexyq7fmi4', 'cmu2mp1am0004dkbec75put5s', 'Property Documents', 'Agreement to Sale, Approved Map', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `CaseChecklistItem` (`id`, `caseId`, `category`, `label`, `appliesTo`, `status`, `remark`, `documentUrl`, `stage`, `bankName`, `monthName`, `financialYear`, `documentDate`, `periodDetails`, `startDate`, `endDate`, `extraDetails`, `updatedById`, `updatedAt`)
VALUES ('cmu2mp1bl000qdkbeu9qkzdeh', 'cmu2mp1am0004dkbec75put5s', 'Property Documents', 'Copy of chain of title, last 13 years', 'Applicant', 'Pending', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cmu2l4ifl000d9nwtfpty9l8g', '2026-09-15 12:08:52')
ON DUPLICATE KEY UPDATE `caseId` = VALUES(`caseId`), `category` = VALUES(`category`), `label` = VALUES(`label`), `appliesTo` = VALUES(`appliesTo`), `status` = VALUES(`status`), `remark` = VALUES(`remark`), `documentUrl` = VALUES(`documentUrl`), `stage` = VALUES(`stage`), `bankName` = VALUES(`bankName`), `monthName` = VALUES(`monthName`), `financialYear` = VALUES(`financialYear`), `documentDate` = VALUES(`documentDate`), `periodDetails` = VALUES(`periodDetails`), `startDate` = VALUES(`startDate`), `endDate` = VALUES(`endDate`), `extraDetails` = VALUES(`extraDetails`), `updatedById` = VALUES(`updatedById`), `updatedAt` = VALUES(`updatedAt`);

-- --------------------------------------------------------
-- Data for table `RevenueRecord` (3 rows)
-- --------------------------------------------------------
INSERT INTO `RevenueRecord` (`id`, `amount`, `month`, `state`, `caseId`, `createdAt`)
VALUES ('cmu2m70l50014xind6g32ckir', 150000, 'September 2026', 'Karnataka', 'cmu2m70kz0011xindw236s1w7', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `month` = VALUES(`month`), `state` = VALUES(`state`), `caseId` = VALUES(`caseId`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `RevenueRecord` (`id`, `amount`, `month`, `state`, `caseId`, `createdAt`)
VALUES ('cmu2m70l50015xind49um2308', 95000, 'September 2026', 'Maharashtra', 'cmu2m70l30013xindl0cw4dnk', '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `month` = VALUES(`month`), `state` = VALUES(`state`), `caseId` = VALUES(`caseId`), `createdAt` = VALUES(`createdAt`);

INSERT INTO `RevenueRecord` (`id`, `amount`, `month`, `state`, `caseId`, `createdAt`)
VALUES ('cmu2m70l50016xindlwkeie3o', 120000, 'August 2026', 'Delhi NCR', NULL, '2026-09-15 11:54:51')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `month` = VALUES(`month`), `state` = VALUES(`state`), `caseId` = VALUES(`caseId`), `createdAt` = VALUES(`createdAt`);

COMMIT;

-- ========================================================
-- VERIFICATION QUERIES
-- Run these queries to verify record counts after migration:
-- ========================================================
SELECT 'Team' AS `Table`, COUNT(*) AS `RecordCount`, 1 AS `ExpectedCount` FROM `Team`
UNION ALL
SELECT 'User', COUNT(*), 5 FROM `User`
UNION ALL
SELECT 'BankConfig', COUNT(*), 5 FROM `BankConfig`
UNION ALL
SELECT 'StateConfig', COUNT(*), 7 FROM `StateConfig`
UNION ALL
SELECT 'ExpenseRecord', COUNT(*), 2 FROM `ExpenseRecord`
UNION ALL
SELECT 'ChecklistCategory', COUNT(*), 3 FROM `ChecklistCategory`
UNION ALL
SELECT 'ChecklistItemTemplate', COUNT(*), 13 FROM `ChecklistItemTemplate`
UNION ALL
SELECT 'Case', COUNT(*), 3 FROM `Case`
UNION ALL
SELECT 'CaseChecklistItem', COUNT(*), 22 FROM `CaseChecklistItem`
UNION ALL
SELECT 'RevenueRecord', COUNT(*), 3 FROM `RevenueRecord`;
