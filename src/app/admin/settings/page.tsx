import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminSettingsClient from '@/components/AdminSettingsClient';

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  if (userRole !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const [user, systemSetting] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        team: { select: { name: true } },
      },
    }),
    prisma.systemSetting.findUnique({
      where: { id: 'default' },
    }),
  ]);

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Super Admin Settings & CRM Branding
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize your profile photo, CRM brand logo, system name, and enterprise settings
        </p>
      </div>

      <AdminSettingsClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email || '',
          role: user.role,
          avatarUrl: user.avatarUrl || null,
          teamName: user.team?.name || 'Operations',
        }}
        initialBranding={{
          crmName: systemSetting?.crmName || 'TheNestGuru',
          crmTagline: systemSetting?.crmTagline || 'Loan Processing Desk',
          crmLogoUrl: systemSetting?.crmLogoUrl || 'https://thenestguru.com/thenestgurulogo.png',
        }}
      />
    </div>
  );
}
