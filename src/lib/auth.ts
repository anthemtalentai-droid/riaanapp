import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
    // Foreman Mode quick login (Objective 1). The foreman taps their own name
    // card first (so this only ever needs to check ONE user's PIN, not scan
    // every foreman's hash), then types a 4-digit PIN — no email keyboard.
    // Same NextAuth session shape as the email/password provider, so every
    // existing getSession()/getToken() check in the app keeps working
    // unchanged for a PIN-authenticated foreman.
    CredentialsProvider({
      id: "foreman-pin",
      name: "Foreman PIN",
      credentials: {
        userId: { label: "User", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.pin) return null;
        if (!/^\d{4}$/.test(credentials.pin)) return null;

        const user = await prisma.user.findUnique({ where: { id: credentials.userId } });
        if (!user) return null;
        if (user.role !== "FOREMAN") return null;
        if (!user.pinEnabled || !user.pinHash) return null;

        const valid = await bcrypt.compare(credentials.pin, user.pinHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
