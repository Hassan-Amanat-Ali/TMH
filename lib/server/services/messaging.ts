import { prisma, getPrismaClient } from "@/lib/server/prisma";
import type { ReportCategory } from "@/lib/prisma/client";

export type ConversationSummary = {
  id: string;
  otherUserId: string;
  otherName: string;
  otherPhoto: string;
  otherHeadline: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  blocked: boolean;
  favourite: boolean;
  label: string | null;
  archived: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  type: "TEXT" | "IMAGE" | "GIFT" | "WINK";
  mediaUrl: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
  readReceiptVisible: boolean;
};

export type ConversationDetail = {
  id: string;
  otherUserId: string;
  otherName: string;
  otherPhoto: string;
  otherHeadline: string;
  otherLocation: string;
  blocked: boolean;
  blockedByMe: boolean;
  blockedByOther: boolean;
  favourite: boolean;
  label: string | null;
  archived: boolean;
  currentUserIsVip: boolean;
  translationEnabled: boolean;
  messages: ChatMessage[];
};

export type ConversationFilters = {
  favourite?: boolean;
  label?: string;
  archived?: boolean;
};

const fallbackPhoto = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";
const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;
const remoteImagePattern = /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i;

function orderedPair(userA: string, userB: string) {
  return [userA, userB].sort();
}

function relativeDate(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function getUnreadMessageCount(userId: string) {
  const db = getPrismaClient();
  if (!db) return 0;
  return db.message.count({
    where: {
      senderId: { not: userId },
      read: false,
      conversation: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
    },
  });
}

function scamWarningFor(body: string) {
  return /\b(investment|crypto|bitcoin|western union|gift card|wire transfer|urgent money)\b/i.test(body)
    ? "Safety note: never send money, gift cards, crypto, or banking details to someone you have not met."
    : null;
}

function canUseImageUrl(mediaUrl: string) {
  return imageDataUrlPattern.test(mediaUrl) || remoteImagePattern.test(mediaUrl);
}

async function assertImageMessageAllowed(userId: string, conversationId: string, mediaUrl: string) {
  if (!canUseImageUrl(mediaUrl) || mediaUrl.length > 700_000) {
    throw new Error("Use a PNG, JPG, WEBP, or GIF image under the temporary upload limit.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (!user) throw new Error("Member unavailable.");
  const ageMs = Date.now() - user.createdAt.getTime();
  if (ageMs < 30 * 24 * 60 * 60 * 1000) {
    throw new Error("Photo messages unlock after 30 days of membership.");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentToday = await prisma.message.count({
    where: {
      senderId: userId,
      type: "IMAGE",
      createdAt: { gte: since },
    },
  });
  if (sentToday >= 10) {
    throw new Error("Photo message limit reached for the last 24 hours.");
  }
}

async function enforceMessageSafety(userId: string, conversationId: string, otherUserId: string, body: string) {
  const rules = await prisma.moderationRule.findMany({ where: { active: true, kind: { in: ["LEAKAGE", "TRIGGER_WORD"] } } });
  const matched = rules.find((rule) => {
    try {
      return new RegExp(rule.pattern, "i").test(body);
    } catch {
      return body.toLowerCase().includes(rule.pattern.toLowerCase());
    }
  });
  if (!matched) return null;

  const reason = matched.kind === "LEAKAGE" ? "Contact-detail leakage in message." : "Trigger-word violation in message.";
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspensionReason: `${reason} Rule: ${matched.id}`,
      },
    }),
    prisma.report.create({
      data: {
        reporterId: null,
        reportedUserId: userId,
        conversationId,
        category: matched.kind === "LEAKAGE" ? "SCAM" : "HARASSMENT",
        note: `System report: ${reason} Pattern: ${matched.pattern}. Intended receiver: ${otherUserId}.`,
        status: "OPEN",
      },
    }),
    prisma.adminAction.create({
      data: {
        adminId: null,
        action: "AUTO_SUSPEND_MESSAGE_RULE",
        targetType: "User",
        targetId: userId,
        detail: `${reason} conversation=${conversationId}; rule=${matched.id}; pattern=${matched.pattern}`,
      },
    }),
  ]);

  throw new Error("Message blocked by safety rules. Your account has been suspended pending review. You may appeal via Contact Us.");
}

export async function reportConversation(userId: string, conversationId: string, data: { category: ReportCategory; note?: string }) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ participantAId: userId }, { participantBId: userId }] },
    select: { participantAId: true, participantBId: true },
  });
  if (!conversation) throw new Error("Conversation not found.");

  const reportedUserId = conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId;
  return prisma.report.create({
    data: {
      reporterId: userId,
      reportedUserId,
      conversationId,
      category: data.category,
      note: data.note?.trim() || null,
      status: "OPEN",
    },
  });
}

export async function listConversations(userId: string, filters: ConversationFilters = {}): Promise<ConversationSummary[]> {
  const db = getPrismaClient();
  if (!db) return [];

  const tagWhere = {
    userId,
    archived: Boolean(filters.archived),
    ...(filters.favourite ? { favourite: true } : {}),
    ...(filters.label ? { label: filters.label } : {}),
  };

  const conversations = await db.conversation.findMany({
    where: {
      AND: [
        { OR: [{ participantAId: userId }, { participantBId: userId }] },
        {
          NOT: [
            { participantA: { blocksMade: { some: { blockedId: userId } } } },
            { participantB: { blocksMade: { some: { blockedId: userId } } } },
          ],
        },
        filters.archived || filters.favourite || filters.label
          ? { tags: { some: tagWhere } }
          : { OR: [{ tags: { none: { userId, archived: true } } }, { tags: { some: { userId, archived: false } } }] },
      ],
    },
    include: {
      participantA: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } },
      participantB: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      tags: { where: { userId }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const unread = await db.message.groupBy({
    by: ["conversationId"],
    where: {
      senderId: { not: userId },
      read: false,
      conversationId: { in: conversations.map((conversation) => conversation.id) },
    },
    _count: { id: true },
  });
  const unreadByConversation = new Map(unread.map((item) => [item.conversationId, item._count.id]));

  return conversations.map((conversation) => {
    const other = conversation.participantAId === userId ? conversation.participantB : conversation.participantA;
    const tag = conversation.tags[0];
    return {
      id: conversation.id,
      otherUserId: other.id,
      otherName: other.profile?.displayName || other.name || "Member",
      otherPhoto: other.photos[0]?.url || fallbackPhoto,
      otherHeadline: other.profile?.headline || "Start a thoughtful conversation.",
      lastMessage: conversation.messages[0]?.body || "No messages yet.",
      lastMessageAt: relativeDate(conversation.lastMessageAt),
      unreadCount: unreadByConversation.get(conversation.id) || 0,
      blocked: false,
      favourite: Boolean(tag?.favourite),
      label: tag?.label || null,
      archived: Boolean(tag?.archived),
    };
  });
}

export async function getOrCreateConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    throw new Error("Cannot message yourself.");
  }
  const other = await prisma.user.findFirst({
    where: {
      id: otherUserId,
      role: "MEMBER",
      status: "ACTIVE",
      NOT: [
        { blocksMade: { some: { blockedId: userId } } },
        { blocksReceived: { some: { blockerId: userId } } },
      ],
    },
    select: { id: true },
  });
  if (!other) {
    throw new Error("Member unavailable.");
  }
  const [participantAId, participantBId] = orderedPair(userId, otherUserId);
  return prisma.conversation.upsert({
    where: { participantAId_participantBId: { participantAId, participantBId } },
    update: {},
    create: { participantAId, participantBId },
  });
}

export async function getConversationDetail(userId: string, conversationId: string): Promise<ConversationDetail | null> {
  const db = getPrismaClient();
  if (!db) return null;

  const [conversation, currentUser] = await Promise.all([
    db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
    include: {
      participantA: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } },
      participantB: { include: { profile: true, photos: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } },
      messages: { orderBy: { createdAt: "asc" }, take: 100 },
    },
    }),
    db.user.findUnique({ where: { id: userId }, select: { membership: true } }),
  ]);
  if (!conversation) return null;

  const other = conversation.participantAId === userId ? conversation.participantB : conversation.participantA;
  const blocks = await db.block.findMany({
    where: {
      OR: [
        { blockerId: userId, blockedId: other.id },
        { blockerId: other.id, blockedId: userId },
      ],
    },
  });
  const tag = await db.conversationTag.findUnique({ where: { userId_conversationId: { userId, conversationId } } });
  const blockedByMe = blocks.some((block) => block.blockerId === userId);
  const blockedByOther = blocks.some((block) => block.blockedId === userId);
  const currentUserIsVip = currentUser?.membership === "VIP";

  return {
    id: conversation.id,
    otherUserId: other.id,
    otherName: other.profile?.displayName || other.name || "Member",
    otherPhoto: other.photos[0]?.url || fallbackPhoto,
    otherHeadline: other.profile?.headline || "Start a thoughtful conversation.",
    otherLocation: other.profile?.locationText || "Thailand",
    blocked: blockedByMe || blockedByOther,
    blockedByMe,
    blockedByOther,
    favourite: Boolean(tag?.favourite),
    label: tag?.label || null,
    archived: Boolean(tag?.archived),
    currentUserIsVip,
    translationEnabled: Boolean(process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      body: message.body || "",
      type: message.type,
      mediaUrl: message.mediaUrl,
      createdAt: relativeDate(message.createdAt),
      read: message.read,
      readAt: message.readAt ? relativeDate(message.readAt) : null,
      readReceiptVisible: currentUserIsVip && message.senderId === userId,
    })),
  };
}

export async function sendConversationMessage(userId: string, conversationId: string, input: { body?: string; mediaUrl?: string; type?: "TEXT" | "IMAGE" } | string) {
  const body = typeof input === "string" ? input : input.body || "";
  const mediaUrl = typeof input === "string" ? undefined : input.mediaUrl?.trim();
  const type = typeof input === "string" ? "TEXT" : input.type || (mediaUrl ? "IMAGE" : "TEXT");
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ participantAId: userId }, { participantBId: userId }] },
  });
  if (!conversation) throw new Error("Conversation not found.");

  const otherUserId = conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId;
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
  });
  if (block) throw new Error("Conversation is blocked.");
  if (type === "IMAGE") {
    if (!mediaUrl) throw new Error("Image is required.");
    await assertImageMessageAllowed(userId, conversationId, mediaUrl);
  }
  const warning = scamWarningFor(body);
  if (body) await enforceMessageSafety(userId, conversationId, otherUserId, body);

  const message = await prisma.message.create({
    data: { conversationId, senderId: userId, body: body || null, mediaUrl: mediaUrl || null, type, flagged: Boolean(warning) },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
  return { message, warning };
}

export async function markConversationRead(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ participantAId: userId }, { participantBId: userId }] },
    select: { id: true },
  });
  if (!conversation) throw new Error("Conversation not found.");
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, read: false },
    data: { read: true, readAt: new Date() },
  });
}

export async function upsertConversationTag(userId: string, conversationId: string, data: { favourite?: boolean; label?: string | null; archived?: boolean }) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ participantAId: userId }, { participantBId: userId }] },
    select: { id: true },
  });
  if (!conversation) throw new Error("Conversation not found.");
  return prisma.conversationTag.upsert({
    where: { userId_conversationId: { userId, conversationId } },
    update: data,
    create: {
      userId,
      conversationId,
      favourite: data.favourite || false,
      label: data.label,
      archived: data.archived || false,
    },
  });
}

export async function unblockConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ participantAId: userId }, { participantBId: userId }] },
  });
  if (!conversation) throw new Error("Conversation not found.");
  const blockedId = conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId;
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId } });
}
