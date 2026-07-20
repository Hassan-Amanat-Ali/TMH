import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserRole, AccountStatus } from "@/lib/prisma/client";
import { prisma } from "@/lib/server/prisma";
import { requestMetaFromHeaders } from "@/lib/server/request-meta";

/**
 * Real, server-validated authentication.
 *
 * Note: NextAuth's Credentials provider only supports the JWT session
 * strategy (not database sessions). The session is therefore a signed,
 * httpOnly JWT cookie validated on every request — which is what replaces
 * the old, trivially-forgeable localStorage flags.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        if (user.status === AccountStatus.BANNED || user.status === AccountStatus.SUSPENDED) {
          throw new Error("account-restricted");
        }

        // Best-effort activity stamp; never block login on failure.
        const requestMeta = requestMetaFromHeaders(request.headers);
        prisma.user
          .update({
            where: { id: user.id },
            data: {
              lastActiveAt: new Date(),
              ...(requestMeta.ipCountry ? { ipCountry: requestMeta.ipCountry } : {}),
              ...(requestMeta.vpnSuspected ? { vpnSuspected: true, ipFlagged: true } : {}),
            },
          })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          membership: user.membership,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.membership = user.membership;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.membership = token.membership;
        session.user.status = token.status;
        session.user.isAdmin = token.role === UserRole.ADMIN;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
