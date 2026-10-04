import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CaseIntakeForm from '@/components/CaseIntakeForm';
import { prisma } from '@/lib/prisma';

export default async function NewCasePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  // Channel accounts cannot create new intake cases directly
  if ((session.user as any).role === 'CHANNEL') {
    redirect('/cases');
  }

  const [
    teams,
    states,
    users,
    productsRes,
    profilesRes,
    subProductsRes,
    propertyScopesRes,
    targetCategoriesRes,
  ] = await Promise.all([
    prisma.team.findMany(),
    prisma.stateConfig.findMany({
      include: { cities: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        role: { not: 'SUPER_ADMIN' },
      },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.productMaster.findMany({
      include: { subProducts: true },
      orderBy: { name: 'asc' },
    }),
    prisma.profileMaster.findMany({ orderBy: { name: 'asc' } }),
    prisma.subProductMaster.findMany({ orderBy: { name: 'asc' } }),
    prisma.propertyScopeMaster.findMany({ orderBy: { name: 'asc' } }),
    prisma.targetCategoryMaster.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const isSuperAdmin = (session.user as any)?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          New Case Intake Form
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Specify Loan Product, Sub-Product, Client & Co-applicant details, and assignments
        </p>
      </div>

      <CaseIntakeForm
        teams={teams}
        states={states}
        users={users}
        products={productsRes}
        profiles={profilesRes}
        subProducts={subProductsRes}
        propertyScopes={propertyScopesRes}
        targetCategories={targetCategoriesRes}
        isSuperAdmin={isSuperAdmin}
        currentUser={{
          name: session.user.name || 'Staff User',
          role: (session.user as any)?.role || 'TEAM_MEMBER',
        }}
      />
    </div>
  );
}
