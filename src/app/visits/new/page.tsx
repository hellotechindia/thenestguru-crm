import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientsDirectoryAction } from '@/app/actions';
import ScheduleVisitPageClient from '@/components/ScheduleVisitPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Schedule New Visit | TheNestGuru CRM',
  description: 'Schedule a property inspection, client document collection, or builder discussion.',
};

export default async function NewVisitPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  // Channel accounts have no visit tracker access
  if (userRole === 'CHANNEL') {
    redirect('/dashboard');
  }

  let [staffUsers, activeCases, builders, channelPartners, clientDirRes] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: 'CHANNEL' } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.case.findMany({
      select: { id: true, clientName: true, mobile: true, product: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.builder.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        reraNumber: true,
        approvedBanks: true,
        officeAddress: true,
        designation: true,
      },
    }),
    prisma.user.findMany({
      where: { role: 'CHANNEL' },
      select: { id: true, name: true, phone: true, email: true, address: true },
      orderBy: { name: 'asc' },
    }),
    getClientsDirectoryAction(),
  ]);

  // Auto seed default builders if empty
  if (builders.length === 0) {
    const defaultBuilders = [
      { name: 'DLF Limited', contactPerson: 'Sales Desk', phone: '011-45678900', approvedBanks: 'SBI, HDFC, ICICI, Axis Bank' },
      { name: 'Godrej Properties', contactPerson: 'Corporate Sales', phone: '022-68888888', approvedBanks: 'HDFC, SBI, ICICI, Kotak' },
      { name: 'ATS Homekraft', contactPerson: 'Project Coordinator', phone: '0120-7111111', approvedBanks: 'SBI, HDFC, PNB' },
      { name: 'Tata Housing', contactPerson: 'Customer Relations', phone: '1800-209-6660', approvedBanks: 'SBI, HDFC, ICICI, BoB' },
      { name: 'Prestige Group', contactPerson: 'Sales Operations', phone: '080-25591080', approvedBanks: 'HDFC, ICICI, SBI' },
      { name: 'M3M India', contactPerson: 'Site Incharge', phone: '0124-4777333', approvedBanks: 'ICICI, Axis, HDFC, SBI' },
      { name: 'Sobha Developers', contactPerson: 'Sales Office', phone: '080-49320000', approvedBanks: 'SBI, HDFC, Canara Bank' },
      { name: 'Gaursons India', contactPerson: 'Helpdesk', phone: '0120-4343333', approvedBanks: 'SBI, HDFC, PNB, BoB' },
    ];
    for (const b of defaultBuilders) {
      await prisma.builder.upsert({
        where: { name: b.name },
        update: {},
        create: b,
      });
    }
    builders = await prisma.builder.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        reraNumber: true,
        approvedBanks: true,
        officeAddress: true,
        designation: true,
      },
    });
  }

  // Format Client Directory records for dropdown
  const clients = (clientDirRes.success && clientDirRes.clients ? clientDirRes.clients : []).map((c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone || null,
    email: c.email || null,
    city: c.city || null,
    state: c.state || null,
  }));

  return (
    <div className="py-2">
      <ScheduleVisitPageClient
        staffUsers={staffUsers}
        activeCases={activeCases}
        builders={builders as any}
        channelPartners={channelPartners as any}
        clients={clients}
        currentUserId={userId}
      />
    </div>
  );
}
