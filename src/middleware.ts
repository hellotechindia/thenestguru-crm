import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Strict security guard: Only SUPER_ADMIN can access any /admin routes
    if (pathname.startsWith('/admin') && token?.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protect all private CRM pages against unauthorized access
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/cases/:path*',
    '/birthdays/:path*',
    '/hrms/:path*',
    '/admin/:path*',
    '/profile/:path*',
  ],
};
