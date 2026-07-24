import bcrypt from "bcryptjs";
import { AccountStatus, Gender, LaunchMode, UserRole, type PrismaClient } from "@/lib/prisma/client";
import { getPrismaClient, prisma } from "@/lib/server/prisma";
import type { SessionUser } from "@/lib/server/session";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const defaultSettings = {
  id: "default",
  launchMode: LaunchMode.COMING_SOON,
  comingSoonImageUrl: null,
  headline: "Thai My Heart is almost ready",
  subtext: "Invited members can sign in while we prepare the public launch.",
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseGender(value: unknown) {
  return typeof value === "string" && Object.values(Gender).includes(value as Gender) ? (value as Gender) : Gender.OTHER;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

async function logAdminAction(db: Db, admin: SessionUser, action: string, targetType: string, targetId: string, detail: Record<string, unknown>) {
  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action,
      targetType,
      targetId,
      detail: JSON.stringify(detail),
    },
  });
}

export async function getLaunchSettings() {
  const db = getPrismaClient();
  if (!db) return defaultSettings;
  try {
    return await db.appSetting.upsert({
      where: { id: "default" },
      update: {},
      create: defaultSettings,
    });
  } catch {
    return defaultSettings;
  }
}

export async function isPublicSignupOpen() {
  const settings = await getLaunchSettings();
  return settings.launchMode === LaunchMode.LIVE;
}

export async function updateLaunchSettings(
  admin: SessionUser,
  input: { launchMode?: unknown; comingSoonImageUrl?: unknown; headline?: unknown; subtext?: unknown }
) {
  return prisma.$transaction(async (tx) => {
    const comingSoonImageUrl =
      typeof input.comingSoonImageUrl === "string" ? input.comingSoonImageUrl.trim() : undefined;
    if (comingSoonImageUrl && comingSoonImageUrl.length > 2_000_000) {
      throw new Error("Coming-soon image is too large. Use an image under 1.5 MB.");
    }
    if (
      comingSoonImageUrl &&
      !comingSoonImageUrl.startsWith("data:image/") &&
      !/^https?:\/\//i.test(comingSoonImageUrl)
    ) {
      throw new Error("Use an image upload or a valid image URL.");
    }
    const data = {
      ...(input.launchMode === LaunchMode.LIVE || input.launchMode === LaunchMode.COMING_SOON ? { launchMode: input.launchMode } : {}),
      ...(comingSoonImageUrl !== undefined ? { comingSoonImageUrl: comingSoonImageUrl || null } : {}),
      ...(typeof input.headline === "string" ? { headline: input.headline.trim().slice(0, 120) || defaultSettings.headline } : {}),
      ...(typeof input.subtext === "string" ? { subtext: input.subtext.trim().slice(0, 240) || null } : {}),
    };
    const settings = await tx.appSetting.upsert({
      where: { id: "default" },
      update: data,
      create: { ...defaultSettings, ...data },
    });
    await logAdminAction(tx, admin, "LAUNCH_SETTINGS_UPDATED", "AppSetting", settings.id, data);
    return settings;
  });
}

export async function createAdminMember(
  admin: SessionUser,
  input: { email?: unknown; password?: unknown; displayName?: unknown; gender?: unknown; seeking?: unknown; age?: unknown; locationText?: unknown; countryCode?: unknown }
) {
  const email = cleanText(input.email).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  const displayName = cleanText(input.displayName, "Invited Member");
  const age = Number(input.age) || 30;

  if (!validEmail(email)) throw new Error("Enter a valid member email.");
  if (!validPassword(password)) throw new Error("Password must be at least 8 characters and include one capital letter and one number.");
  if (age < 18) throw new Error("Member must be at least 18.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new Error("A member already exists for this email.");

    const user = await tx.user.create({
      data: {
        email,
        name: displayName,
        role: UserRole.MEMBER,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
        passwordHash: await bcrypt.hash(password, 10),
        wallet: { create: { coinBalance: 0 } },
        profile: {
          create: {
            displayName,
            age,
            gender: parseGender(input.gender),
            seeking: parseGender(input.seeking),
            locationText: cleanText(input.locationText),
            countryCode: cleanText(input.countryCode).slice(0, 2).toUpperCase() || null,
            completion: 50,
          },
        },
      },
    });
    await logAdminAction(tx, admin, "MEMBER_CREATED_BY_ADMIN", "User", user.id, { email, displayName, comingSoonInvite: true });
    return user;
  });
}
