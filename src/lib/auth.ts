import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

function sanitizeAvatarUrl(url: any): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.length > 500 || trimmed.startsWith('data:')) {
    return null;
  }
  return trimmed || null;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Username or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your username/email and password');
        }

        const identifier = credentials.email.trim();

        // Support login by username or by email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: identifier },
              { email: identifier },
            ],
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid username/email or password');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Invalid username/email or password');
        }

        return {
          id: user.id,
          email: user.email || '',
          name: user.name,
          role: user.role,
          teamId: user.teamId,
          avatarUrl: sanitizeAvatarUrl(user.avatarUrl || user.photographUrl),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.teamId = (user as any).teamId;
        (token as any).avatarUrl = sanitizeAvatarUrl((user as any).avatarUrl);
      }
      // Always keep token in sync with current DB user state so role/profile updates take effect immediately
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, name: true, avatarUrl: true, photographUrl: true, teamId: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            if (dbUser.name) token.name = dbUser.name;
            token.teamId = dbUser.teamId;
            (token as any).avatarUrl = sanitizeAvatarUrl(dbUser.avatarUrl || dbUser.photographUrl);
          }
        } catch {
          // Ignore
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).teamId = token.teamId;
        (session.user as any).avatarUrl = (token as any).avatarUrl;
        if (token.name) {
          session.user.name = token.name;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'nestguru-loan-secret-key-2026',
};
