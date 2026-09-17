import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUpcomingBirthdaysAction } from '@/app/actions';
import BirthdaysDirectoryClient from '@/components/BirthdaysDirectoryClient';

export const revalidate = 0;

export const metadata = {
  title: 'TheNestGuru Birthdays Directory | Employee Celebrations Hub',
  description: 'Upcoming employee birthdays, full celebration directory schedules, and 1-click personalized wishes.',
};

export default async function BirthdaysPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const res = await getUpcomingBirthdaysAction(true); // includeAll = true for full directory
  const birthdays = res.success && res.birthdays ? (res.birthdays as any) : [];

  return (
    <div className="max-w-[1600px] mx-auto py-2">
      <BirthdaysDirectoryClient initialBirthdays={birthdays} />
    </div>
  );
}
