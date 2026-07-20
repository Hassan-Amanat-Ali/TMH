import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { UserRole } from "@/lib/prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  isAdmin: boolean;
};

/** Returns the current signed-in user, or null. Use in route handlers / RSC. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
    isAdmin: session.user.role === UserRole.ADMIN,
  };
}

/** Throws an Unauthorized-style error if not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, "Authentication required.");
  }
  return user;
}

/** Throws if not signed in, or not an admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new AuthError(403, "Administrator access required.");
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
