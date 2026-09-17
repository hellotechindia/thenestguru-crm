import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getProfilesAction } from '@/app/actions';
import ProfileManagementClient from '@/components/ProfileManagementClient';

export const revalidate = 0;

export default async function AdminProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const { profiles = [] } = await getProfilesAction();

  return <ProfileManagementClient initialProfiles={profiles} />;
}
