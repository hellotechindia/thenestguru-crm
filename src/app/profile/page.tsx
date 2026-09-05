import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileEditClient from '@/components/ProfileEditClient';

export const revalidate = 0;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Account & Profile Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal account details, display name, and security password
        </p>
      </div>

      <ProfileEditClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          teamName: user.team?.name || 'Operations',
        }}
      />
    </div>
  );
}
