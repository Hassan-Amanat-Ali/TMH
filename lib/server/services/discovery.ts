import { getPrismaClient, prisma } from "@/lib/server/prisma";
import { Prisma, type Gender, type InteractionType, type MembershipLevel, type ProfileTier } from "@/lib/prisma/client";

export type DiscoveryAd = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  advertiser?: string | null;
};

export type DiscoveryProfile = {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: Gender | null;
  seeking: Gender | null;
  location: string;
  countryCode?: string | null;
  headline: string;
  bio: string;
  intent?: string | null;
  profession?: string | null;
  languages: string[];
  interests: string[];
  goals: string[];
  primaryPhoto: string;
  photos: string[];
  membership: MembershipLevel;
  tier: ProfileTier;
  verified: boolean;
  online: boolean;
  newHere: boolean;
  hasReel: boolean;
  likes: number;
  matchPercent: number;
  rankingScore: number;
  likedByViewer: boolean;
  favouritedByViewer: boolean;
};

export type LocationOption = {
  id: string;
  name: string;
  countryCode: string;
  type: string;
  parentId: string | null;
};

export type SavedSearchSummary = {
  id: string;
  name: string;
  filters: DiscoveryFilters;
  createdAt: string;
};

export type DiscoveryData = {
  profiles: DiscoveryProfile[];
  gridAds: DiscoveryAd[];
  swipeAds: DiscoveryAd[];
  locations: LocationOption[];
  savedSearches: SavedSearchSummary[];
};

export type DiscoveryFilters = {
  gender?: Gender | "ALL";
  minAge?: number;
  maxAge?: number;
  countryCode?: string;
  locationNodeId?: string;
  onlineOnly?: boolean;
  verifiedOnly?: boolean;
  newOnly?: boolean;
  hasReelOnly?: boolean;
  sort?: "best" | "popular" | "recent";
};

const discoveryUserInclude = {
  profile: true,
  photos: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }], take: 5 },
  reels: { where: { status: "ACTIVE" as const }, take: 1 },
  verifications: { where: { status: "APPROVED" as const, type: { in: ["PHOTO" as const, "ID" as const] } } },
  interactionsTo: { where: { type: "LIKE" as const }, select: { id: true } },
} satisfies Prisma.UserInclude;

type DiscoveryUserRecord = Prisma.UserGetPayload<{ include: typeof discoveryUserInclude }>;

const fallbackAds: DiscoveryAd[] = [
  {
    id: "ad-vip-weekend",
    title: "VIP weekend boost",
    imageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
    advertiser: "Thai My Heart",
    targetUrl: "/vip",
  },
  {
    id: "ad-rose-gift",
    title: "Send a first rose",
    imageUrl: "https://images.unsplash.com/photo-1518709779341-56cf4535e94b?auto=format&fit=crop&w=900&q=80",
    advertiser: "Coin Wallet",
    targetUrl: "/vip",
  },
];

export const fallbackProfiles: DiscoveryProfile[] = [
  {
    id: "demo-mali",
    userId: "demo-mali",
    name: "Mali",
    age: 29,
    gender: "WOMAN",
    seeking: "MAN",
    location: "Chiang Mai, Thailand",
    countryCode: "TH",
    headline: "Kind heart, mountain weekends, real conversation.",
    bio: "I run a small flower studio near Nimman and love slow Sundays, temple fairs, and cooking northern Thai food for people I trust.",
    intent: "Serious relationship",
    profession: "Florist",
    languages: ["Thai", "English"],
    interests: ["Cooking", "Hiking", "Live music"],
    goals: ["Marriage", "Travel partner"],
    primaryPhoto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    ],
    membership: "VIP",
    tier: "GOLD",
    verified: true,
    online: true,
    newHere: false,
    hasReel: true,
    likes: 148,
    matchPercent: 94,
    rankingScore: 94,
    likedByViewer: false,
    favouritedByViewer: false,
  },
  {
    id: "demo-nisa",
    userId: "demo-nisa",
    name: "Nisa",
    age: 34,
    gender: "WOMAN",
    seeking: "MAN",
    location: "Bangkok, Thailand",
    countryCode: "TH",
    headline: "Warm, direct, and ready to build something steady.",
    bio: "Marketing manager by day, jazz listener by night. I value honesty, family respect, and a man who keeps his word.",
    intent: "Long-term",
    profession: "Marketing manager",
    languages: ["Thai", "English", "German"],
    interests: ["Jazz", "Food markets", "Fitness"],
    goals: ["Family", "Relocation open"],
    primaryPhoto: "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=900&q=80",
    photos: [
      "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=80",
    ],
    membership: "STANDARD",
    tier: "SILVER",
    verified: true,
    online: false,
    newHere: true,
    hasReel: false,
    likes: 92,
    matchPercent: 88,
    rankingScore: 88,
    likedByViewer: false,
    favouritedByViewer: false,
  },
  {
    id: "demo-arisa",
    userId: "demo-arisa",
    name: "Arisa",
    age: 31,
    gender: "WOMAN",
    seeking: "MAN",
    location: "Phuket, Thailand",
    countryCode: "TH",
    headline: "Ocean person. Looking for calm, loyal love.",
    bio: "Hospitality professional, beach walker, and auntie to three funny nieces. I like practical kindness more than big promises.",
    intent: "Marriage minded",
    profession: "Hotel guest relations",
    languages: ["Thai", "English", "French"],
    interests: ["Seafood", "Beach walks", "Photography"],
    goals: ["Marriage", "Shared home"],
    primaryPhoto: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=900&q=80",
    photos: [
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80",
    ],
    membership: "VIP",
    tier: "GOLD",
    verified: true,
    online: true,
    newHere: false,
    hasReel: true,
    likes: 176,
    matchPercent: 91,
    rankingScore: 91,
    likedByViewer: false,
    favouritedByViewer: false,
  },
  {
    id: "demo-pim",
    userId: "demo-pim",
    name: "Pim",
    age: 27,
    gender: "WOMAN",
    seeking: "MAN",
    location: "Khon Kaen, Thailand",
    countryCode: "TH",
    headline: "Teacher, reader, and patient optimist.",
    bio: "I teach primary school and spend weekends with family. I am shy at first, but very playful once I feel safe.",
    intent: "Serious dating",
    profession: "Teacher",
    languages: ["Thai", "English"],
    interests: ["Reading", "Cafe hopping", "Family"],
    goals: ["Marriage", "Children someday"],
    primaryPhoto: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=900&q=80",
    photos: [
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    ],
    membership: "STANDARD",
    tier: "SILVER",
    verified: false,
    online: false,
    newHere: true,
    hasReel: false,
    likes: 64,
    matchPercent: 83,
    rankingScore: 83,
    likedByViewer: false,
    favouritedByViewer: false,
  },
  {
    id: "demo-sirin",
    userId: "demo-sirin",
    name: "Sirin",
    age: 38,
    gender: "WOMAN",
    seeking: "MAN",
    location: "London, United Kingdom",
    countryCode: "GB",
    headline: "Thai in London, still close to home.",
    bio: "Nurse, mum of one grown-up son, and weekend market explorer. I want a thoughtful partner who enjoys both Thai and British life.",
    intent: "Companionship",
    profession: "Nurse",
    languages: ["Thai", "English"],
    interests: ["Gardens", "Thai cooking", "Museums"],
    goals: ["Life partner", "Travel"],
    primaryPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=900&q=80",
    ],
    membership: "STANDARD",
    tier: "BRONZE",
    verified: true,
    online: true,
    newHere: false,
    hasReel: false,
    likes: 119,
    matchPercent: 86,
    rankingScore: 86,
    likedByViewer: false,
    favouritedByViewer: false,
  },
  {
    id: "demo-kan",
    userId: "demo-kan",
    name: "Kan",
    age: 30,
    gender: "LADYBOY",
    seeking: "MAN",
    location: "Pattaya, Thailand",
    countryCode: "TH",
    headline: "Confident, loyal, and looking for respect first.",
    bio: "Beauty stylist with a soft spot for karaoke and honest men. Chemistry matters, but respect matters more.",
    intent: "Long-term",
    profession: "Beauty stylist",
    languages: ["Thai", "English"],
    interests: ["Karaoke", "Fashion", "Street food"],
    goals: ["Stable partner", "Travel"],
    primaryPhoto: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    photos: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=900&q=80",
    ],
    membership: "VIP",
    tier: "GOLD",
    verified: true,
    online: false,
    newHere: false,
    hasReel: true,
    likes: 133,
    matchPercent: 89,
    rankingScore: 89,
    likedByViewer: false,
    favouritedByViewer: false,
  },
];

function parseList(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function estimateMatch(profile: {
  membership: MembershipLevel;
  tier: ProfileTier;
  verified: boolean;
  hasReel: boolean;
  completion: number;
  online: boolean;
  countryCode?: string | null;
}) {
  let score = 58;
  score += Math.min(18, Math.round(profile.completion / 5));
  if (profile.verified) score += 8;
  if (profile.hasReel) score += 5;
  if (profile.membership === "VIP") score += 6;
  if (profile.tier === "GOLD") score += 4;
  if (profile.online) score += 3;
  if (profile.countryCode === "TH") score += 2;
  return Math.max(62, Math.min(98, score));
}

function estimateRankingScore(user: DiscoveryUserRecord, verified: boolean, online: boolean, viewerCountryCode?: string | null) {
  const profile = user.profile;
  const hasPhoto = user.photos.length > 0;
  const hasReel = user.reels.length > 0;
  const completion = profile?.completion || 0;
  const lastActiveMinutes = user.lastActiveAt ? Math.max(0, (Date.now() - user.lastActiveAt.getTime()) / 60000) : 100000;
  const recency = Math.max(0, 18 - Math.min(18, Math.round(lastActiveMinutes / 60)));
  let score = 25;
  if (profile?.countryCode && viewerCountryCode && profile.countryCode === viewerCountryCode) score += 12;
  if (online) score += 8;
  score += recency;
  score += Math.min(16, Math.round(completion / 6));
  if (hasPhoto) score += 10;
  if (hasReel) score += 8;
  if (verified) score += 8;
  if (user.membership === "VIP") score += 10;
  score += Math.min(12, user.interactionsTo.length);
  return Math.max(1, Math.min(100, score));
}

function buildDiscoveryWhere(viewerId?: string | null, filters: DiscoveryFilters = {}): Prisma.UserWhereInput {
  const profileWhere: Prisma.ProfileWhereInput = {};
  const not: Prisma.UserWhereInput[] = [];

  if (filters.gender && filters.gender !== "ALL") {
    profileWhere.gender = filters.gender;
  }
  if (filters.minAge || filters.maxAge) {
    profileWhere.age = {
      ...(filters.minAge ? { gte: filters.minAge } : {}),
      ...(filters.maxAge ? { lte: filters.maxAge } : {}),
    };
  }
  if (filters.countryCode) {
    profileWhere.countryCode = filters.countryCode;
  }
  if (filters.locationNodeId) {
    profileWhere.locationNodeId = filters.locationNodeId;
  }
  if (filters.onlineOnly) {
    profileWhere.stealthMode = false;
  }

  if (viewerId) {
    not.push(
      { blocksReceived: { some: { blockerId: viewerId } } },
      { blocksMade: { some: { blockedId: viewerId } } }
    );
  }

  return {
    id: viewerId ? { not: viewerId } : undefined,
    role: "MEMBER",
    status: "ACTIVE",
    ...(filters.onlineOnly ? { lastActiveAt: { gte: new Date(Date.now() - 1000 * 60 * 15) } } : {}),
    ...(filters.verifiedOnly ? { verifications: { some: { status: "APPROVED", type: { in: ["PHOTO", "ID"] } } } } : {}),
    ...(filters.newOnly ? { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) } } : {}),
    ...(filters.hasReelOnly ? { reels: { some: { status: "ACTIVE", moderation: "APPROVED", expiresAt: { gt: new Date() } } } } : {}),
    ...(not.length ? { NOT: not } : {}),
    profile: { is: profileWhere },
  };
}

function mapUserToDiscoveryProfile(
  user: DiscoveryUserRecord,
  index: number,
  liked: Set<string>,
  favourites: Set<string>,
  viewerCountryCode?: string | null
): DiscoveryProfile | null {
  if (!user.profile) return null;

  const profile = user.profile;
  const photos = user.photos.length ? user.photos.map((photo) => photo.url) : fallbackProfiles[index % fallbackProfiles.length].photos;
  const verified = user.verifications.length > 0;
  const online = profile.stealthMode ? false : Boolean(user.lastActiveAt && Date.now() - user.lastActiveAt.getTime() < 1000 * 60 * 15);
  const matchPercent = estimateMatch({
    membership: user.membership,
    tier: profile.tier,
    verified,
    hasReel: user.reels.length > 0,
    completion: profile.completion,
    online,
    countryCode: profile.countryCode,
  });
  const rankingScore = estimateRankingScore(user, verified, online, viewerCountryCode);

  return {
    id: user.id,
    userId: user.id,
    name: profile.displayName || user.name || "Member",
    age: profile.age || 30,
    gender: profile.gender,
    seeking: profile.seeking,
    location: profile.locationText || "Thailand",
    countryCode: profile.countryCode,
    headline: profile.headline || "Looking for a meaningful connection.",
    bio: profile.bio || "This member is still writing their story.",
    intent: profile.intent,
    profession: profile.profession,
    languages: parseList(profile.languages),
    interests: parseList(profile.interests),
    goals: parseList(profile.goals),
    primaryPhoto: photos[0],
    photos,
    membership: user.membership,
    tier: profile.tier,
    verified,
    online,
    newHere: Date.now() - user.createdAt.getTime() < 1000 * 60 * 60 * 24 * 14,
    hasReel: user.reels.length > 0,
    likes: user.interactionsTo.length,
    matchPercent,
    rankingScore,
    likedByViewer: liked.has(user.id),
    favouritedByViewer: favourites.has(user.id),
  };
}

function filterFallbackProfiles(filters: DiscoveryFilters = {}) {
  return fallbackProfiles.filter((profile) => {
    if (filters.gender && filters.gender !== "ALL" && profile.gender !== filters.gender) return false;
    if (filters.minAge && profile.age < filters.minAge) return false;
    if (filters.maxAge && profile.age > filters.maxAge) return false;
    if (filters.countryCode && profile.countryCode !== filters.countryCode) return false;
    if (filters.hasReelOnly && !profile.hasReel) return false;
    if (filters.onlineOnly && !profile.online) return false;
    if (filters.verifiedOnly && !profile.verified) return false;
    if (filters.newOnly && !profile.newHere) return false;
    return true;
  });
}

async function getViewerInteractions(viewerId?: string | null) {
  const db = getPrismaClient();
  if (!viewerId || !db) return [];
  return db.interaction.findMany({
    where: { fromId: viewerId, type: { in: ["LIKE", "FAVOURITE"] } },
    select: { toId: true, type: true },
  });
}

function parseSavedFilters(value: string): DiscoveryFilters {
  try {
    const parsed = JSON.parse(value) as DiscoveryFilters;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function getViewerCountryCode(viewerId?: string | null) {
  const db = getPrismaClient();
  if (!viewerId || !db) return null;
  const viewer = await db.profile.findUnique({ where: { userId: viewerId }, select: { countryCode: true } });
  return viewer?.countryCode || null;
}

export async function getLocationOptions(): Promise<LocationOption[]> {
  const db = getPrismaClient();
  if (!db) return [];
  const nodes = await db.locationNode.findMany({
    orderBy: [{ countryCode: "asc" }, { type: "asc" }, { name: "asc" }],
    take: 300,
  });
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    countryCode: node.countryCode,
    type: node.type,
    parentId: node.parentId,
  }));
}

export async function listSavedSearches(userId: string): Promise<SavedSearchSummary[]> {
  const db = getPrismaClient();
  if (!db) return [];
  const searches = await db.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
  return searches.map((search) => ({
    id: search.id,
    name: search.name,
    filters: parseSavedFilters(search.filters),
    createdAt: search.createdAt.toISOString(),
  }));
}

export async function createSavedSearch(userId: string, name: string, filters: DiscoveryFilters) {
  const cleanedName = name.trim().slice(0, 80) || "Saved search";
  return prisma.savedSearch.create({
    data: {
      userId,
      name: cleanedName,
      filters: JSON.stringify(filters),
    },
  });
}

export async function deleteSavedSearch(userId: string, id: string) {
  const result = await prisma.savedSearch.deleteMany({ where: { id, userId } });
  if (result.count !== 1) throw new Error("Saved search not found.");
}

export async function getDiscoveryData(viewerId?: string | null, filters: DiscoveryFilters = {}): Promise<DiscoveryData> {
  const db = getPrismaClient();
  if (!db) {
    return { profiles: filterFallbackProfiles(filters), gridAds: fallbackAds, swipeAds: fallbackAds, locations: [], savedSearches: [] };
  }

  try {
    const [users, interactions, gridAds, swipeAds, locations, savedSearches, viewerCountryCode] = await Promise.all([
      db.user.findMany({
        where: buildDiscoveryWhere(viewerId, filters),
        include: discoveryUserInclude,
        orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
        take: 80,
      }),
      getViewerInteractions(viewerId),
      db.ad.findMany({ where: { active: true, placement: "GRID_CARD" }, orderBy: { weight: "desc" }, take: 4 }),
      db.ad.findMany({ where: { active: true, placement: "SWIPE_INTERSTITIAL" }, orderBy: { weight: "desc" }, take: 4 }),
      getLocationOptions(),
      viewerId ? listSavedSearches(viewerId) : Promise.resolve([]),
      getViewerCountryCode(viewerId),
    ]);

    if (!users.length) {
      return { profiles: filterFallbackProfiles(filters), gridAds: gridAds.length ? gridAds : fallbackAds, swipeAds: swipeAds.length ? swipeAds : fallbackAds, locations, savedSearches };
    }

    const liked = new Set(interactions.filter((item) => item.type === "LIKE").map((item) => item.toId));
    const favourites = new Set(interactions.filter((item) => item.type === "FAVOURITE").map((item) => item.toId));
    const profiles = users
      .map((user, index) => mapUserToDiscoveryProfile(user, index, liked, favourites, viewerCountryCode))
      .filter((profile): profile is DiscoveryProfile => profile !== null)
      .sort((a, b) => {
        if (filters.sort === "popular") return b.likes - a.likes || b.rankingScore - a.rankingScore;
        if (filters.sort === "recent") return Number(b.online) - Number(a.online) || Number(b.newHere) - Number(a.newHere) || b.rankingScore - a.rankingScore;
        return b.rankingScore - a.rankingScore || b.matchPercent - a.matchPercent;
      })
      .slice(0, 24);

    return {
      profiles,
      gridAds: gridAds.length ? gridAds : fallbackAds,
      swipeAds: swipeAds.length ? swipeAds : fallbackAds,
      locations,
      savedSearches,
    };
  } catch {
    return { profiles: filterFallbackProfiles(filters), gridAds: fallbackAds, swipeAds: fallbackAds, locations: [], savedSearches: [] };
  }
}

export async function getProfileDetail(id: string, viewerId?: string | null): Promise<DiscoveryProfile | null> {
  const db = getPrismaClient();
  if (!db) {
    return fallbackProfiles.find((profile) => profile.userId === id || profile.id === id) ?? null;
  }

  try {
    const [user, interactions] = await Promise.all([
      db.user.findFirst({
        where: {
          id,
          role: "MEMBER",
          status: "ACTIVE",
          profile: { isNot: null },
          ...(viewerId
            ? {
                NOT: [
                  { blocksReceived: { some: { blockerId: viewerId } } },
                  { blocksMade: { some: { blockedId: viewerId } } },
                ],
              }
            : {}),
        },
        include: discoveryUserInclude,
      }),
      getViewerInteractions(viewerId),
    ]);
    if (!user) return null;
    const [viewerCountryCode] = await Promise.all([getViewerCountryCode(viewerId)]);
    const liked = new Set(interactions.filter((item) => item.type === "LIKE").map((item) => item.toId));
    const favourites = new Set(interactions.filter((item) => item.type === "FAVOURITE").map((item) => item.toId));
    return mapUserToDiscoveryProfile(user, 0, liked, favourites, viewerCountryCode);
  } catch {
    return fallbackProfiles.find((profile) => profile.userId === id || profile.id === id) ?? null;
  }
}

export function normalizeInteractionType(value: unknown): InteractionType | null {
  if (value === "LIKE" || value === "FAVOURITE" || value === "WINK") {
    return value;
  }
  return null;
}
