'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/context/ThemeContext';

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: any;
}) {
  return (
    <SessionProvider session={session?.user ? session : undefined} refetchOnWindowFocus={true}>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}
