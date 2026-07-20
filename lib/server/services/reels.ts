import { MediaType, MembershipLevel, Prisma, type ReelStatus } from "@/lib/prisma/client";
import { prisma, getPrismaClient } from "@/lib/server/prisma";
import { getOrCreateConversation, sendConversationMessage } from "@/lib/server/services/messaging";

const REEL_TTL_MS = 24 * 60 * 60 * 1000;
const STANDARD_DAILY_LIMIT = 3;
const VIP_DAILY_LIMIT = 8;
const fallbackPhoto = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";
const fallbackReels: ReelCard[] = [
  {
    id: "fallback-mali-reel",
    authorId: "demo-mali",
    authorName: "Mali",
    authorAge: 29,
    authorPhoto: fallbackPhoto,
    authorLocation: "Chiang Mai, Thailand",
    membership: MembershipLevel.VIP,
    mediaUrl: fallbackPhoto,
    mediaType: MediaType.IMAGE,
    thumbnailUrl: fallbackPhoto,
    caption: "A small hello from my day.",
    viewsCount: 12000,
    viewedByMe: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + REEL_TTL_MS).toISOString(),
    expiresIn: "24h",
  },
];

const reelInclude = {
  user: {
    include: {
      profile: true,
      photos: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }], take: 1 },
    },
  },
  views: true,
} satisfies Prisma.ReelInclude;

type ReelRecord = Prisma.ReelGetPayload<{ include: typeof reelInclude }>;

export type ReelCard = {
  id: string;
  authorId: string;
  authorName: string;
  authorAge: number;
  authorPhoto: string;
  authorLocation: string;
  membership: MembershipLevel;
  mediaUrl: string;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  caption: string | null;
  viewsCount: number;
  viewedByMe: boolean;
  createdAt: string;
  expiresAt: string;
  expiresIn: string;
};

export type ReelFeed = {
  reels: ReelCard[];
  dailyLimit: number;
  createdToday: number;
  remainingToday: number;
  isVip: boolean;
};

const remoteMediaPattern = /^https?:\/\/\S+$/i;
const dataImagePattern = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;

function inferMediaType(mediaUrl: string): MediaType {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(mediaUrl) ? MediaType.VIDEO : MediaType.IMAGE;
}

function validateMediaUrl(mediaUrl: string) {
  if (!mediaUrl || mediaUrl.length > 700_000) {
    throw new Error("Reel media is required.");
  }
  if (!remoteMediaPattern.test(mediaUrl) && !dataImagePattern.test(mediaUrl)) {
    throw new Error("Use a PNG, JPG, WEBP, GIF, MP4, WEBM, or MOV URL for this temporary reel uploader.");
  }
}

function expiresIn(expiresAt: Date) {
  const minutes = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.ceil(minutes / 60)}h`;
}

function mapReel(reel: ReelRecord, viewerId?: string | null): ReelCard | null {
  if (!reel.user.profile) return null;
  const profile = reel.user.profile;
  return {
    id: reel.id,
    authorId: reel.userId,
    authorName: profile.displayName || reel.user.name || "Member",
    authorAge: profile.age || 30,
    authorPhoto: reel.user.photos[0]?.url || fallbackPhoto,
    authorLocation: profile.locationText || "Thailand",
    membership: reel.user.membership,
    mediaUrl: reel.mediaUrl,
    mediaType: reel.mediaType,
    thumbnailUrl: reel.thumbnailUrl,
    caption: reel.caption,
    viewsCount: reel.viewsCount,
    viewedByMe: viewerId ? reel.views.some((view) => view.viewerId === viewerId) : false,
    createdAt: reel.createdAt.toISOString(),
    expiresAt: reel.expiresAt.toISOString(),
    expiresIn: expiresIn(reel.expiresAt),
  };
}

async function expireOldReels() {
  await prisma.reel.updateMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" as ReelStatus },
  });
}

async function getDailyLimit(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { membership: true } });
  const isVip = user?.membership === MembershipLevel.VIP;
  return { isVip, dailyLimit: isVip ? VIP_DAILY_LIMIT : STANDARD_DAILY_LIMIT };
}

export async function getReelFeed(viewerId?: string | null, limit = 24): Promise<ReelFeed> {
  const db = getPrismaClient();
  if (!db) {
    return { reels: fallbackReels, dailyLimit: STANDARD_DAILY_LIMIT, createdToday: 0, remainingToday: STANDARD_DAILY_LIMIT, isVip: false };
  }

  await expireOldReels();
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const [quota, createdToday, reels] = await Promise.all([
    viewerId ? getDailyLimit(viewerId) : Promise.resolve({ isVip: false, dailyLimit: STANDARD_DAILY_LIMIT }),
    viewerId ? db.reel.count({ where: { userId: viewerId, createdAt: { gte: dayStart } } }) : Promise.resolve(0),
    db.reel.findMany({
      where: {
        status: "ACTIVE",
        moderation: "APPROVED",
        createdAt: { gt: new Date(now.getTime() - REEL_TTL_MS) },
        expiresAt: { gt: now },
        ...(viewerId ? { userId: { not: viewerId } } : {}),
        user: {
          role: "MEMBER",
          status: "ACTIVE",
          profile: { is: { stealthMode: false } },
          ...(viewerId
            ? {
                NOT: [
                  { blocksMade: { some: { blockedId: viewerId } } },
                  { blocksReceived: { some: { blockerId: viewerId } } },
                ],
              }
            : {}),
        },
      },
      include: reelInclude,
      orderBy: [{ user: { membership: "desc" } }, { viewsCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  ]);
  const mapped = reels.map((reel) => mapReel(reel, viewerId)).filter((reel): reel is ReelCard => reel !== null);

  return {
    reels: mapped.length ? mapped : fallbackReels,
    dailyLimit: quota.dailyLimit,
    createdToday,
    remainingToday: Math.max(0, quota.dailyLimit - createdToday),
    isVip: quota.isVip,
  };
}

export async function createReel(userId: string, input: { mediaUrl: string; thumbnailUrl?: string; caption?: string }) {
  const mediaUrl = input.mediaUrl.trim();
  const thumbnailUrl = input.thumbnailUrl?.trim() || null;
  const caption = input.caption?.trim().slice(0, 220) || null;
  validateMediaUrl(mediaUrl);
  if (thumbnailUrl) validateMediaUrl(thumbnailUrl);

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER", status: "ACTIVE" },
    select: { id: true, membership: true },
  });
  if (!user) throw new Error("Member unavailable.");

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dailyLimit = user.membership === MembershipLevel.VIP ? VIP_DAILY_LIMIT : STANDARD_DAILY_LIMIT;
  const createdToday = await prisma.reel.count({ where: { userId, createdAt: { gte: dayStart } } });
  if (createdToday >= dailyLimit) {
    throw new Error(`Daily reel limit reached. ${user.membership === MembershipLevel.VIP ? "VIP" : "Standard"} members can post ${dailyLimit} reels per day.`);
  }

  const reel = await prisma.reel.create({
    data: {
      userId,
      mediaUrl,
      mediaType: inferMediaType(mediaUrl),
      thumbnailUrl: thumbnailUrl || (inferMediaType(mediaUrl) === MediaType.IMAGE ? mediaUrl : null),
      caption,
      status: "ACTIVE",
      moderation: "APPROVED",
      expiresAt: new Date(Date.now() + REEL_TTL_MS),
    },
  });
  return { id: reel.id, expiresAt: reel.expiresAt.toISOString(), remainingToday: Math.max(0, dailyLimit - createdToday - 1) };
}

export async function recordReelView(userId: string, reelId: string) {
  const reel = await prisma.reel.findFirst({
    where: {
      id: reelId,
      status: "ACTIVE",
      moderation: "APPROVED",
      expiresAt: { gt: new Date() },
      userId: { not: userId },
      user: {
        role: "MEMBER",
        status: "ACTIVE",
        profile: { is: { stealthMode: false } },
        NOT: [
          { blocksMade: { some: { blockedId: userId } } },
          { blocksReceived: { some: { blockerId: userId } } },
        ],
      },
    },
    select: { id: true },
  });
  if (!reel) throw new Error("Reel unavailable.");

  const existing = await prisma.reelView.findUnique({ where: { reelId_viewerId: { reelId, viewerId: userId } } });
  if (existing) return { viewed: false };
  await prisma.$transaction([
    prisma.reelView.create({ data: { reelId, viewerId: userId } }),
    prisma.reel.update({ where: { id: reelId }, data: { viewsCount: { increment: 1 } } }),
  ]);
  return { viewed: true };
}

export async function replyToReel(userId: string, reelId: string, body: string) {
  const text = body.trim();
  if (!text || text.length > 1000) throw new Error("Reply must be 1-1000 characters.");
  const reel = await prisma.reel.findFirst({
    where: {
      id: reelId,
      status: "ACTIVE",
      moderation: "APPROVED",
      expiresAt: { gt: new Date() },
      userId: { not: userId },
      user: {
        role: "MEMBER",
        status: "ACTIVE",
        profile: { is: { stealthMode: false } },
        NOT: [
          { blocksMade: { some: { blockedId: userId } } },
          { blocksReceived: { some: { blockerId: userId } } },
        ],
      },
    },
    select: { id: true, userId: true, caption: true },
  });
  if (!reel) throw new Error("Reel unavailable.");

  const conversation = await getOrCreateConversation(userId, reel.userId);
  const intro = reel.caption ? `Replying to your Heart Reel: "${reel.caption.slice(0, 120)}"` : "Replying to your Heart Reel";
  const result = await sendConversationMessage(userId, conversation.id, `${intro}\n\n${text}`);
  return { conversationId: conversation.id, messageId: result.message.id, warning: result.warning };
}
