import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getClientsDirectoryAction } from '@/app/actions';
import ClientDirectoryClient from '@/components/ClientDirectoryClient';

export const revalidate = 0;

export const metadata = {
  title: 'Client Directory | TheNestGuru CRM',
  description: 'Deduplicated master roster of all primary applicants and co-applicants across loan intake cases.',
};

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  if (userRole === 'CHANNEL') {
    redirect('/sub-accounts');
  }

  const res = await getClientsDirectoryAction();
  const clients = res.success && res.clients ? res.clients : [];

  return (
    <div className="max-w-[1600px] mx-auto py-2">
      <ClientDirectoryClient initialClients={clients} userRole={userRole} />
    </div>
  );
}
