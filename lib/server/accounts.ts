import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { UserRole } from "@/lib/prisma/client";

export type StoredAccount = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  passwordHash: string;
};

function toStoredAccount(user: {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  passwordHash: string;
}): StoredAccount {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "",
    role: user.role === UserRole.ADMIN ? "admin" : "member",
    passwordHash: user.passwordHash,
  };
}

export async function readAccounts(): Promise<StoredAccount[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(toStoredAccount);
}

export async function findAccountByEmail(email: string): Promise<StoredAccount | null> {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  return user ? toStoredAccount(user) : null;
}

export async function updateAccountPassword(email: string, nextPassword: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return false;
  }

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return true;
}

type UpsertMemberInput = {
  email: string;
  name: string;
  password?: string;
  emailVerified?: Date;
  ipCountry?: string | null;
  vpnSuspected?: boolean;
  profile?: {
    age?: number;
    gender?: "WOMAN" | "MAN" | "LADYBOY" | "OTHER";
    seeking?: "WOMAN" | "MAN" | "LADYBOY" | "OTHER";
    locationText?: string;
    countryCode?: string;
    headline?: string;
    bio?: string;
    heightCm?: number;
    bodyType?: string;
    children?: string;
    wantChildren?: string;
    smoking?: string;
    drinking?: string;
    religion?: string;
    profession?: string;
    exercise?: string;
    relocate?: string;
    languages?: string[];
    interests?: string[];
    goals?: string[];
  };
};

export async function upsertMemberAccount(input: UpsertMemberInput) {
  const normalizedEmail = String(input.email || "").trim().toLowerCase();
  const normalizedName = String(input.name || "").trim() || "Member";

  if (!normalizedEmail) {
    throw new Error("email-required");
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: normalizedName,
        ...(input.emailVerified ? { emailVerified: input.emailVerified } : {}),
        ...(input.ipCountry ? { ipCountry: input.ipCountry } : {}),
        ...(input.vpnSuspected ? { vpnSuspected: true, ipFlagged: true } : {}),
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {}),
        ...(input.profile
          ? {
              profile: {
                upsert: {
                  update: profileData(normalizedName, input.profile),
                  create: profileData(normalizedName, input.profile),
                },
              },
            }
          : {}),
      },
    });
    return { created: false, updated: true };
  }

  if (!input.password) {
    throw new Error("password-required-for-new-account");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: normalizedName,
      role: UserRole.MEMBER,
      passwordHash,
      emailVerified: input.emailVerified,
      ipCountry: input.ipCountry || undefined,
      vpnSuspected: input.vpnSuspected || false,
      ipFlagged: input.vpnSuspected || false,
      // Give every new member a wallet up front so the coin economy can credit it.
      wallet: { create: { coinBalance: 0 } },
      ...(input.profile ? { profile: { create: profileData(normalizedName, input.profile) } } : {}),
    },
  });
  return { created: true, updated: false };
}

function profileData(displayName: string, profile: NonNullable<UpsertMemberInput["profile"]>) {
  return {
    displayName,
    age: profile.age,
    gender: profile.gender,
    seeking: profile.seeking,
    locationText: profile.locationText,
    countryCode: profile.countryCode,
    headline: profile.headline,
    bio: profile.bio,
    heightCm: profile.heightCm,
    bodyType: profile.bodyType,
    children: profile.children,
    wantChildren: profile.wantChildren,
    smoking: profile.smoking,
    drinking: profile.drinking,
    religion: profile.religion,
    profession: profile.profession,
    exercise: profile.exercise,
    relocate: profile.relocate,
    languages: JSON.stringify(profile.languages || []),
    interests: JSON.stringify(profile.interests || []),
    goals: JSON.stringify(profile.goals || []),
    completion: estimateCompletion(profile),
  };
}

function estimateCompletion(profile: NonNullable<UpsertMemberInput["profile"]>) {
  const values = [
    profile.age,
    profile.gender,
    profile.seeking,
    profile.locationText,
    profile.bio,
    profile.heightCm,
    profile.bodyType,
    profile.children,
    profile.smoking,
    profile.drinking,
    profile.profession,
    profile.languages?.length,
    profile.interests?.length,
  ];
  const filled = values.filter(Boolean).length;
  return Math.min(100, Math.round((filled / values.length) * 100));
}
