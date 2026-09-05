# Project Build Prompt — Loan Processing Dashboard (Next.js)

Copy-paste this entire prompt into Antigravity (or any AI coding agent) to scaffold the project.

---

## 1. Project Overview

Build a **multi-tenant Loan Processing Dashboard** (web app) for a loan consultancy business. The core purpose: when a new client case comes in, the team creates a **case entry** by selecting a few basic parameters, and the system **auto-generates a dynamic, profile-specific document checklist**. Team members then track document collection, upload proof (via OneDrive links), add remarks, and move the case through processing stages. Admins get a dashboard with pending-work tiles, pivot-style breakdowns, and trend charts to monitor file processing speed and conversion.

Initial product scope: **Home Loan — Salaried customers**. Architecture must be extensible to more products (Loan Against Property, MSME Business Loans) and more customer types (Professional, Business/Self-employed) later — do NOT hardcode logic only for the first case; build a data-driven checklist engine.

---

## 2. Tech Stack

- **Framework:** Next.js 14+ (App Router), TypeScript
- **UI:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts (for trend line/bar charts) + a simple pivot-table component (e.g. react-pivottable or a custom groupby table)
- **Database:** MySQL with Prisma ORM (relational fits well because of roles, cases, checklist items, stages). Project will run on a **local MySQL server** during development (e.g. via XAMPP/WAMP or a native MySQL install) — see Section 10 for local setup.
- **Auth:** NextAuth.js (credentials-based login; email+password to start, extensible to SSO later)
- **File/Document storage:** No file upload to server — documents live on OneDrive/Google Drive; the app only stores a **pasted URL + remark + status** per document line item (per meeting notes: avoid heavy in-app drive storage, just track links).
- **State/Data fetching:** Server Components + Server Actions where possible; React Query for client-side interactive tables/dashboards.
- **Deployment target:** Vercel-compatible (keep this in mind for file storage — no local disk writes).

---

## 3. User Roles & Permissions

Two roles for now, structured so more can be added later:

| Role | Scope | Permissions |
|---|---|---|
| **Super Admin** (owner) | Sees everything, across all teams and all cases | Full CRUD on cases, documents, checklist templates, users. Can create teams, add/remove team members, view all dashboards/reports. |
| **Team Member** | Belongs to a team, created by Super Admin | Same UI/functionality as Super Admin **except**: cannot **delete** any case, document line-item, or client detail. Can **add** and **modify** (edit/update status, remarks, URLs). No access to user management. |

Notes for the build:
- Model roles as an enum (`SUPER_ADMIN`, `TEAM_MEMBER`) on the `User` table, plus a `teamId` for grouping.
- Enforce delete-restriction at both UI (hide delete buttons for team members) and API/server-action level (never trust the client).
- Design permission checks as a small reusable `can(user, action, resource)` helper so adding roles later (e.g. "Reviewer") is easy.

---

## 4. Core Workflow: New Case Intake Form

When a Super Admin or Team Member adds a new case to the dashboard, they fill a short intake form:

- **Product** — dropdown, e.g. `Home Loan`, `Loan Against Property`, `MSME Business Loan` (start with Home Loan active; others can exist as disabled/future options)
- **Customer Type** — dropdown: `Salaried`, `Professional`, `Business`
- **Property Type** — dropdown: `Resale`, `Takeover / Seller BT`, `Direct Allotment (Under Construction)`
- **No. of Co-Applicants** — numeric input (0, 1, 2, 3...)
- Basic client fields: Client Name, Mobile No., Email ID (from meeting: login data capture)

On submit → create a `Case` record → **auto-generate the checklist** for this case by combining Product + Customer Type + Property Type using the Checklist Engine (Section 5). If `No. of Co-Applicants > 0`, generate the co-applicant-specific line items per co-applicant.

---

## 5. Dynamic Checklist Engine (Data-Driven, from the attached PDF)

Do NOT hardcode checklist items in UI components. Model them as **seed data** in the database so admins can edit/extend checklists later without code changes.

### Data model for checklist templates:

```
ChecklistCategory
  id, name (e.g. "KYC Documents", "Income Documents", "Personal Information", "Property Documents")
  product, customerType   // which combination this category applies to

ChecklistItemTemplate
  id, categoryId
  label                      // e.g. "PAN Card, Aadhar Card"
  applicantRequirement       // enum: YES | IF_APPLICABLE | NA | ONLY_IF_SELLER_BT | ONLY_MAHARASHTRA
  coApplicantRequirement     // same enum
  propertyTypeScope          // null (applies to all property types) OR one of: RESALE | TAKEOVER_SELLER_BT | DIRECT_ALLOTMENT
  stage                      // 1,2,3,4 (per meeting: checklist stages 1-4 for processing)
```

### Seed this checklist data (extracted from the client's PDF — "Home Loan Checklist for Salaried"):

**KYC Documents** (applies to all property types):
1. PAN Card, Aadhar Card — Applicant: Yes, Co-applicant: If applicable
2. Current Address Proof (Rent agreement & Electricity Bill if rented / latest utility bill if owned) — Yes / If applicable
3. Relationship proof with co-applicant — If applicable / If applicable
4. Latest 2 passport size photos / Live Photo — Yes / If applicable

**Income Documents** (applies to all property types):
1. Salary Slips for last 6 months — Yes / If applicable
2. Last 1 year Salary Account Statement — Yes / If applicable
3. Employer ID Card / Service Certificate (defence employees) — Yes if working / If working
4. Previous Job relieving letter & New Job joining letter (if job changed in last 2 years) — If applicable / If applicable
5. Form 16 (Part A & B) and 26AS for 2 years — Yes if working / If working
6. Loan account statement & sanction letter of all running loans — If applicable / If applicable
7. Acknowledged ITR copy with computation + ITR forms for 2 years (if additional income considered) — If applicable / If applicable

**Personal Information** (applies to all property types):
1. Email ID & Mobile No. — Yes / If applicable
2. Education Qualification — Yes / Yes
3. Mother & Spouse Name — Yes / Yes
4. Date of Joining current company & Total Job Experience — Yes / Yes
5. No. of years in current residence — Yes / NA
6. 2 References (Name, Address, Mobile, Email) — Yes / NA

**Property Documents — scoped by `propertyTypeScope`:**

*RESALE:*
1. Agreement to Sale, Approved Map — Yes / NA
2. Possession & OC — If applicable / NA
3. Copy of chain of title, last 13 years — Yes / NA
4. Proof of margin payment (account statement) — Yes / NA
5. Seller ID, Address proof & cancelled cheque with vintage proof — Only in case of Seller BT / NA
6. Loan account statement since opening — Yes / NA
7. List of Documents (LOD) — Yes / NA
8. Foreclosure (FC) letter — Yes / NA

*TAKEOVER / SELLER BT:*
1. Possession & OC — If applicable / NA
2. Agreement to Sale — Only in case of Seller BT / NA
3. Copy of chain of title last 13 years & Approved Map — Yes / NA

*DIRECT_ALLOTMENT (Under Construction):*
1. Allotment Letter / BBA / Cost Sheet & Approved Map — Yes / NA
2. Payment receipts & Bank statement showing advance payment to Builder — Yes / NA
3. TDS Challan & Demand Letter — Yes / NA
4. Copy of Registry — Only for Maharashtra State Property / NA

### Checklist generation logic:
When a case is created with `Product=Home Loan, CustomerType=Salaried, PropertyType=X`:
1. Pull all KYC + Income + Personal Info items (always included).
2. Pull Property Document items where `propertyTypeScope == X`.
3. For each item where `coApplicantRequirement != NA`, generate one instance **per co-applicant** (using the case's "No. of Co-Applicants" count), labelled e.g. "PAN Card, Aadhar Card — Co-Applicant 1".
4. Instantiate as `CaseChecklistItem` rows (actual per-case tracked items, separate from the template), each with fields: `status` (Pending / Received / Not Applicable / Rejected), `remark` (text), `documentUrl` (OneDrive link), `updatedBy`, `updatedAt`.
5. Build the template/seed system so Super Admin can later add checklists for **Stage 2, 3, 4** of processing (per client's meeting notes — this is a known next step, so leave `stage` as a first-class field even though V1 only needs Stage 1).

---

## 6. Document Tracking Fields (per checklist item)

Each `CaseChecklistItem` row in the UI should be editable inline with:
- **Status** dropdown: Pending / Received / Not Applicable / Rejected
- **Remark** — free text field
- **Document URL** — text input for a pasted OneDrive/Google Drive share link (no in-app file upload; just link + open button)
- Last updated by (auto-filled from logged-in user) + timestamp

---

## 7. Dashboard Requirements

Build a dashboard home page with:

1. **Summary Tiles** (top of page):
   - Total Active Cases
   - Cases Pending Documents (checklist not 100% complete)
   - Cases Ready for Login/Submission (checklist 100% complete)
   - Cases by Stage (Stage 1/2/3/4 counts)
   - Avg. days to complete checklist (basic conversion-speed metric, per meeting's emphasis on tracking processing speed)

2. **Pivot-style Table** — group cases by any combination of: Customer Type, Property Type, Product, Assigned Team Member, Stage, Status — with counts. Allow the admin to switch grouping dimensions (simple client-side pivot, doesn't need to be a full OLAP tool).

3. **Trend Charts** (Recharts):
   - Line chart: New cases created per week/month
   - Bar chart: Cases completed (checklist done) per week/month, to visualize conversion/throughput trend
   - Optional: Stacked bar of case status breakdown over time

4. **Case List / Search view** — searchable, filterable table of all cases (by client name, mobile, status, team member) linking to the case detail page (where the checklist lives). This corresponds to the "search dashboard to track customer details" requirement from the meeting.

---

## 8. Suggested Data Model Summary (Prisma-style, MySQL)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      Role     // SUPER_ADMIN | TEAM_MEMBER
  teamId    String?
  team      Team?    @relation(fields: [teamId], references: [id])
  createdAt DateTime @default(now())
}

model Team {
  id      String @id @default(cuid())
  name    String
  members User[]
}

model Case {
  id               String   @id @default(cuid())
  clientName       String
  mobile           String
  email            String?
  product          String
  customerType     String
  propertyType     String
  coApplicantCount Int      @default(0)
  stage            Int      @default(1)
  createdById      String
  assignedTeamId   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  checklistItems   CaseChecklistItem[]
}

model CaseChecklistItem {
  id           String   @id @default(cuid())
  caseId       String
  case         Case     @relation(fields: [caseId], references: [id])
  category     String
  label        String
  appliesTo    String   // "Applicant" | "Co-Applicant 1" | "Co-Applicant 2" ...
  status       String   @default("Pending")
  remark       String?  @db.Text
  documentUrl  String?  @db.Text
  stage        Int      @default(1)
  updatedById  String?
  updatedAt    DateTime @updatedAt
}
```

---

## 9. Pages / Routes

- `/login`
- `/dashboard` — tiles + pivot table + trend charts (Section 7)
- `/cases` — searchable case list
- `/cases/new` — intake form (Section 4)
- `/cases/[id]` — case detail: client info + dynamic checklist grouped by category, editable inline, progress bar (% documents received)
- `/admin/users` — Super Admin only: manage teams & team members
- `/admin/checklist-templates` — Super Admin only: view/edit the checklist template data (so future Stage 2/3/4 and other products/customer types can be added without a developer)

---

## 10. Local Development Setup (MySQL)

The developer/agent should scaffold the project to run against a **local MySQL server**:

1. Install MySQL locally — either a native MySQL Server install, or an easier bundled option like XAMPP/WAMP (includes phpMyAdmin for a GUI).
2. Create the local database:
   ```sql
   CREATE DATABASE loan_dashboard;
   ```
3. Add a `.env` file at the project root:
   ```
   DATABASE_URL="mysql://root:yourpassword@localhost:3306/loan_dashboard"
   ```
4. Set the Prisma datasource provider to `mysql` (see Section 8 schema).
5. Run the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
6. Run the checklist template seed script (Section 5 data) via `npx prisma db seed`.
7. Start the dev server: `npm run dev`.

Note for the agent: use `@db.Text` on any long free-text Prisma fields (e.g. `remark`, `documentUrl`) since MySQL's default `VARCHAR(191)` will truncate longer values — this is already reflected in the schema in Section 8.

---

## 11. Build Notes / Priorities

1. Start with the **checklist engine as reusable, data-driven logic** — this is the core value of the product and needs to extend cleanly to other products/customer types/stages later, not just Home Loan + Salaried.
2. Enforce the **delete-restriction for Team Members** server-side, not just by hiding buttons.
3. Keep document storage as **URL + remark only** (no file uploads) per the client's stated preference to avoid heavy drive integration.
4. Dashboard tiles and pivot/trend charts should be driven by real query aggregations (not hardcoded), since ongoing conversion/speed tracking was called out as a priority by the client.
5. Leave `stage` as a first-class field everywhere (case, checklist item) since Stage 2–4 checklists are an explicit next step per the client's meeting notes.

---

**End of prompt.**
