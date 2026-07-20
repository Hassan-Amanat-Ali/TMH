import { getPrismaClient } from "@/lib/server/prisma";

export type MemberProfileForm = {
  name: string;
  displayName: string;
  headline: string;
  bio: string;
  intent: string;
  locationText: string;
  countryCode: string;
  profession: string;
  languages: string;
  interests: string;
  goals: string;
  completion: number;
  membership: "STANDARD" | "VIP";
  coinBalance: number;
  photoCount: number;
  reelCount: number;
  verificationStatus: string;
};

export type ActivityItem = {
  id: string;
  kind: "visit" | "like" | "recommendation";
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

export type DashboardData = {
  profile: MemberProfileForm;
  vipExpiresAt?: string | null;
  planLimits: { maxPhotos: number; maxVideos: number; videoMaxSeconds: number };
  activity: ActivityItem[];
  recommendations: Array<{ id: string; name: string; age: number; location: string; photo: string; matchPercent: number }>;
};

export type EngagementProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  photo: string;
  headline: string;
  createdAt: string;
};

const fallbackPhoto = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";

function parseList(value?: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(", ") : value;
  } catch {
    return value;
  }
}

function toJsonList(value: string) {
  return JSON.stringify(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function estimateCompletion(input: {
  displayName?: string | null;
  headline?: string | null;
  bio?: string | null;
  locationText?: string | null;
  profession?: string | null;
  languages?: string | null;
  interests?: string | null;
  goals?: string | null;
}) {
  const fields = [input.displayName, input.headline, input.bio, input.locationText, input.profession, input.languages, input.interests, input.goals];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function profilePatchToData(input: Partial<MemberProfileForm>) {
  const profile = {
    displayName: input.displayName?.trim() || undefined,
    headline: input.headline?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    intent: input.intent?.trim() || undefined,
    locationText: input.locationText?.trim() || undefined,
    countryCode: input.countryCode?.trim().toUpperCase() || undefined,
    profession: input.profession?.trim() || undefined,
    languages: input.languages !== undefined ? toJsonList(input.languages) : undefined,
    interests: input.interests !== undefined ? toJsonList(input.interests) : undefined,
    goals: input.goals !== undefined ? toJsonList(input.goals) : undefined,
  };
  return {
    profile,
    completion: estimateCompletion(profile),
  };
}

function fallbackProfile(): MemberProfileForm {
  return {
    name: "Member",
    displayName: "Member",
    headline: "Ready to meet someone kind.",
    bio: "Your profile will appear here once the database is connected.",
    intent: "Serious dating",
    locationText: "Thailand",
    countryCode: "TH",
    profession: "",
    languages: "Thai, English",
    interests: "Travel, Food, Family",
    goals: "Long-term relationship",
    completion: 62,
    membership: "STANDARD",
    coinBalance: 0,
    photoCount: 0,
    reelCount: 0,
    verificationStatus: "NOT_SUBMITTED",
  };
}

export async function getOwnProfile(userId: string): Promise<MemberProfileForm> {
  const db = getPrismaClient();
  if (!db) return fallbackProfile();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
      photos: { select: { id: true } },
      reels: { where: { status: "ACTIVE" }, select: { id: true } },
      verifications: { where: { type: "PHOTO" }, orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });
  if (!user) return fallbackProfile();

  return {
    name: user.name || user.email,
    displayName: user.profile?.displayName || user.name || "",
    headline: user.profile?.headline || "",
    bio: user.profile?.bio || "",
    intent: user.profile?.intent || "",
    locationText: user.profile?.locationText || "",
    countryCode: user.profile?.countryCode || "",
    profession: user.profile?.profession || "",
    languages: parseList(user.profile?.languages),
    interests: parseList(user.profile?.interests),
    goals: parseList(user.profile?.goals),
    completion: user.profile?.completion || 0,
    membership: user.membership,
    coinBalance: user.wallet?.coinBalance || 0,
    photoCount: user.photos.length,
    reelCount: user.reels.length,
    verificationStatus: user.verifications[0]?.status || "NOT_SUBMITTED",
  };
}

function relativeDate(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const db = getPrismaClient();
  const profile = await getOwnProfile(userId);
  if (!db) {
    return {
      profile,
      planLimits: { maxPhotos: 5, maxVideos: 2, videoMaxSeconds: 12 },
      activity: [],
      recommendations: [],
    };
  }

  const [plan, vip, visits, likes, recommendations] = await Promise.all([
    db.planSetting.findUnique({ where: { tier: profile.membership } }),
    db.vipSubscription.findFirst({ where: { userId, active: true, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "desc" } }),
    db.profileVisit.findMany({
      where: { profileId: userId },
      include: { visitor: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.interaction.findMany({
      where: { toId: userId, type: "LIKE" },
      include: { from: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.user.findMany({
      where: { id: { not: userId }, role: "MEMBER", status: "ACTIVE", profile: { isNot: null } },
      include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } },
      orderBy: [{ membership: "desc" }, { lastActiveAt: "desc" }],
      take: 4,
    }),
  ]);

  const activity: ActivityItem[] = [
    ...visits.map((visit) => ({
      id: `visit-${visit.id}`,
      kind: "visit" as const,
      title: `${visit.visitor.profile?.displayName || visit.visitor.name || "Someone"} viewed your profile`,
      body: "A recent visitor checked your photos and profile details.",
      href: `/profiles/${visit.visitorId}`,
      createdAt: relativeDate(visit.createdAt),
    })),
    ...likes.map((like) => ({
      id: `like-${like.id}`,
      kind: "like" as const,
      title: `${like.from.profile?.displayName || like.from.name || "Someone"} liked you`,
      body: "Like back or send a careful first message.",
      href: `/profiles/${like.fromId}`,
      createdAt: relativeDate(like.createdAt),
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    profile,
    vipExpiresAt: vip?.expiresAt.toISOString() || null,
    planLimits: plan || { maxPhotos: 5, maxVideos: 2, videoMaxSeconds: 12 },
    activity,
    recommendations: recommendations.map((user, index) => ({
      id: user.id,
      name: user.profile?.displayName || user.name || "Member",
      age: user.profile?.age || 30,
      location: user.profile?.locationText || "Thailand",
      photo: user.photos[0]?.url || fallbackPhoto,
      matchPercent: 86 + index,
    })),
  };
}

export async function getLikedYou(userId: string): Promise<EngagementProfile[]> {
  const db = getPrismaClient();
  if (!db) return [];
  const likes = await db.interaction.findMany({
    where: {
      toId: userId,
      type: "LIKE",
      from: {
        role: "MEMBER",
        status: "ACTIVE",
        NOT: [
          { blocksMade: { some: { blockedId: userId } } },
          { blocksReceived: { some: { blockerId: userId } } },
        ],
      },
    },
    include: { from: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return likes.map((like) => ({
    id: like.fromId,
    name: like.from.profile?.displayName || like.from.name || "Member",
    age: like.from.profile?.age || 30,
    location: like.from.profile?.locationText || "Thailand",
    photo: like.from.photos[0]?.url || fallbackPhoto,
    headline: like.from.profile?.headline || "Liked your profile.",
    createdAt: relativeDate(like.createdAt),
  }));
}

export async function getFavourites(userId: string): Promise<EngagementProfile[]> {
  const db = getPrismaClient();
  if (!db) return [];
  const favourites = await db.interaction.findMany({
    where: {
      fromId: userId,
      type: "FAVOURITE",
      to: {
        role: "MEMBER",
        status: "ACTIVE",
        NOT: [
          { blocksMade: { some: { blockedId: userId } } },
          { blocksReceived: { some: { blockerId: userId } } },
        ],
      },
    },
    include: { to: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return favourites.map((favourite) => ({
    id: favourite.toId,
    name: favourite.to.profile?.displayName || favourite.to.name || "Member",
    age: favourite.to.profile?.age || 30,
    location: favourite.to.profile?.locationText || "Thailand",
    photo: favourite.to.photos[0]?.url || fallbackPhoto,
    headline: favourite.to.profile?.headline || "Saved favourite.",
    createdAt: relativeDate(favourite.createdAt),
  }));
}

export async function getVisitors(userId: string): Promise<EngagementProfile[]> {
  const db = getPrismaClient();
  if (!db) return [];
  const visits = await db.profileVisit.findMany({
    where: {
      profileId: userId,
      visitor: {
        role: "MEMBER",
        status: "ACTIVE",
        NOT: [
          { blocksMade: { some: { blockedId: userId } } },
          { blocksReceived: { some: { blockerId: userId } } },
        ],
      },
    },
    include: { visitor: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return visits.map((visit) => ({
    id: visit.visitorId,
    name: visit.visitor.profile?.displayName || visit.visitor.name || "Member",
    age: visit.visitor.profile?.age || 30,
    location: visit.visitor.profile?.locationText || "Thailand",
    photo: visit.visitor.photos[0]?.url || fallbackPhoto,
    headline: visit.visitor.profile?.headline || "Viewed your profile.",
    createdAt: relativeDate(visit.createdAt),
  }));
}
