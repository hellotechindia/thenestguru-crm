import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'NestGuru Loan Processing Desk | Dynamic Checklist & Case Tracker',
  description: 'Multi-Tenant Loan Processing Dashboard for loan consultancy with automated dynamic checklist engine and OneDrive tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen selection:bg-sky-500 selection:text-white">
        <Providers>
          <Navigation />
          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
