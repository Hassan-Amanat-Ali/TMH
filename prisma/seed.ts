import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

async function main() {
  // ----- Admin account (override via ADMIN_EMAIL / ADMIN_PASSWORD) -----
  const adminEmail = (process.env.ADMIN_EMAIL || "admins@tmh.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "TMH Admin",
      role: "ADMIN",
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      wallet: { create: { coinBalance: 0 } },
    },
  });

  // ----- Known dev member for shared QA (override via TEST_MEMBER_*) -----
  const testMemberEmail = (process.env.TEST_MEMBER_EMAIL || "member@tmh.com").toLowerCase();
  const testMemberPassword = process.env.TEST_MEMBER_PASSWORD || "Member123!";
  const testMember = await prisma.user.upsert({
    where: { email: testMemberEmail },
    update: {
      name: "TMH Test Member",
      role: "MEMBER",
      status: "ACTIVE",
      membership: "STANDARD",
      emailVerified: new Date(),
      passwordHash: bcrypt.hashSync(testMemberPassword, 10),
      lastActiveAt: new Date(),
    },
    create: {
      id: "test-member",
      email: testMemberEmail,
      name: "TMH Test Member",
      role: "MEMBER",
      status: "ACTIVE",
      membership: "STANDARD",
      emailVerified: new Date(),
      passwordHash: bcrypt.hashSync(testMemberPassword, 10),
      lastActiveAt: new Date(),
      wallet: { create: { coinBalance: 75 } },
    },
  });
  await prisma.wallet.upsert({
    where: { userId: testMember.id },
    update: { coinBalance: 75 },
    create: { userId: testMember.id, coinBalance: 75 },
  });
  await prisma.profile.upsert({
    where: { userId: testMember.id },
    update: {
      displayName: "Test Member",
      age: 36,
      gender: "MAN",
      seeking: "WOMAN",
      locationText: "London, United Kingdom",
      countryCode: "GB",
      headline: "Shared QA account for first DB pass.",
      bio: "This account is seeded for local development and first end-to-end testing only.",
      intent: "Serious dating",
      profession: "QA tester",
      languages: JSON.stringify(["English", "Thai"]),
      interests: JSON.stringify(["Travel", "Thai food", "Family"]),
      goals: JSON.stringify(["Long-term relationship"]),
      completion: 88,
      tier: "SILVER",
    },
    create: {
      userId: testMember.id,
      displayName: "Test Member",
      age: 36,
      gender: "MAN",
      seeking: "WOMAN",
      locationText: "London, United Kingdom",
      countryCode: "GB",
      headline: "Shared QA account for first DB pass.",
      bio: "This account is seeded for local development and first end-to-end testing only.",
      intent: "Serious dating",
      profession: "QA tester",
      languages: JSON.stringify(["English", "Thai"]),
      interests: JSON.stringify(["Travel", "Thai food", "Family"]),
      goals: JSON.stringify(["Long-term relationship"]),
      completion: 88,
      tier: "SILVER",
    },
  });
  await prisma.photo.upsert({
    where: { id: "test-member-photo-1" },
    update: {
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
      isPrimary: true,
      moderation: "APPROVED",
    },
    create: {
      id: "test-member-photo-1",
      userId: testMember.id,
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
      isPrimary: true,
      moderation: "APPROVED",
    },
  });

  // ----- Coin packages (£5→50, £8.50→100, £11→150, £15→250) -----
  const coinPackages = [
    { label: "Starter", coins: 50, priceGBP: "5.00", sortOrder: 1 },
    { label: "Plus", coins: 100, priceGBP: "8.50", sortOrder: 2 },
    { label: "Popular", coins: 150, priceGBP: "11.00", sortOrder: 3 },
    { label: "Best value", coins: 250, priceGBP: "15.00", bonus: 20, sortOrder: 4 },
  ];
  for (const pack of coinPackages) {
    await prisma.coinPackage.upsert({
      where: { id: `pack-${pack.coins}` },
      update: pack,
      create: { id: `pack-${pack.coins}`, ...pack },
    });
  }

  // ----- VIP plans (30 / 90 / 180 days) -----
  const vipPlans = [
    { id: "vip-30", label: "VIP 30 days", durationDays: 30, priceGBP: "9.99", costCoins: 120, bonusCoins: 20, sortOrder: 1 },
    { id: "vip-90", label: "VIP 90 days", durationDays: 90, priceGBP: "24.99", costCoins: 280, bonusCoins: 80, sortOrder: 2 },
    { id: "vip-180", label: "VIP 180 days", durationDays: 180, priceGBP: "44.99", costCoins: 500, bonusCoins: 200, sortOrder: 3 },
  ];
  for (const plan of vipPlans) {
    await prisma.vipPlan.upsert({ where: { id: plan.id }, update: plan, create: plan });
  }

  // ----- Admin-configurable tier media limits -----
  const planSettings = [
    { tier: "STANDARD" as const, maxPhotos: 5, maxVideos: 2, videoMaxSeconds: 12 },
    { tier: "VIP" as const, maxPhotos: 12, maxVideos: 4, videoMaxSeconds: 30 },
  ];
  for (const setting of planSettings) {
    await prisma.planSetting.upsert({
      where: { tier: setting.tier },
      update: setting,
      create: setting,
    });
  }

  // ----- Moderation rules for leakage / trigger filtering -----
  const moderationRules = [
    {
      id: "rule-email-leakage",
      kind: "LEAKAGE" as const,
      pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",
      action: "SUSPEND" as const,
    },
    {
      id: "rule-phone-leakage",
      kind: "LEAKAGE" as const,
      pattern: "(?:\\b(?:phone|mobile|call|text|whatsapp|line|number|tel)\\b\\D{0,20}(?:\\+?\\d[\\s().-]?){7,}\\d|\\+\\d[\\d\\s().-]{9,}\\d|\\b\\d{3,4}[\\s().-]\\d{3,4}[\\s().-]\\d{2,4}\\b)",
      action: "SUSPEND" as const,
    },
    {
      id: "rule-whatsapp-leakage",
      kind: "LEAKAGE" as const,
      pattern: "(whats\\s*app|wa\\.me|telegram|line\\s*id)",
      action: "SUSPEND" as const,
    },
    {
      id: "rule-abuse-threat",
      kind: "TRIGGER_WORD" as const,
      pattern: "\\b(kill|hurt you|blackmail|threaten)\\b",
      action: "SUSPEND" as const,
    },
    {
      id: "rule-abuse-extortion",
      kind: "TRIGGER_WORD" as const,
      pattern: "\\b(send money now|pay me|extortion)\\b",
      action: "SUSPEND" as const,
    },
  ];
  for (const rule of moderationRules) {
    await prisma.moderationRule.upsert({
      where: { id: rule.id },
      update: rule,
      create: rule,
    });
  }

  // ----- Gift catalogue -----
  const gifts = [
    { id: "gift-rose", name: "Rose", icon: "🌹", costCoins: 5, sortOrder: 1 },
    { id: "gift-chocolates", name: "Chocolates", icon: "🍫", costCoins: 10, sortOrder: 2 },
    { id: "gift-teddy", name: "Teddy", icon: "🧸", costCoins: 20, sortOrder: 3 },
    { id: "gift-heart", name: "Heart", icon: "❤️", costCoins: 30, sortOrder: 4 },
    { id: "gift-ring", name: "Diamond Ring", icon: "💍", costCoins: 100, sortOrder: 5 },
  ];
  for (const gift of gifts) {
    await prisma.gift.upsert({ where: { id: gift.id }, update: gift, create: gift });
  }

  // ----- Phase 2 discovery demo members -----
  const demoPasswordHash = bcrypt.hashSync("DemoMember123", 10);
  const demoMembers = [
    {
      id: "demo-mali",
      email: "mali.demo@tmh.local",
      name: "Mali",
      membership: "VIP" as const,
      lastActiveAt: new Date(),
      profile: {
        displayName: "Mali",
        age: 29,
        dateOfBirth: new Date("1997-03-12"),
        gender: "WOMAN" as const,
        seeking: "MAN" as const,
        locationText: "Chiang Mai, Thailand",
        countryCode: "TH",
        headline: "Kind heart, mountain weekends, real conversation.",
        bio: "I run a small flower studio near Nimman and love slow Sundays, temple fairs, and cooking northern Thai food for people I trust.",
        intent: "Serious relationship",
        profession: "Florist",
        languages: ["Thai", "English"],
        interests: ["Cooking", "Hiking", "Live music"],
        goals: ["Marriage", "Travel partner"],
        completion: 94,
        tier: "GOLD" as const,
      },
      photos: [
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80",
      ],
    },
    {
      id: "demo-nisa",
      email: "nisa.demo@tmh.local",
      name: "Nisa",
      membership: "STANDARD" as const,
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 45),
      profile: {
        displayName: "Nisa",
        age: 34,
        dateOfBirth: new Date("1992-08-22"),
        gender: "WOMAN" as const,
        seeking: "MAN" as const,
        locationText: "Bangkok, Thailand",
        countryCode: "TH",
        headline: "Warm, direct, and ready to build something steady.",
        bio: "Marketing manager by day, jazz listener by night. I value honesty, family respect, and a man who keeps his word.",
        intent: "Long-term",
        profession: "Marketing manager",
        languages: ["Thai", "English", "German"],
        interests: ["Jazz", "Food markets", "Fitness"],
        goals: ["Family", "Relocation open"],
        completion: 86,
        tier: "SILVER" as const,
      },
      photos: [
        "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=80",
      ],
    },
    {
      id: "demo-arisa",
      email: "arisa.demo@tmh.local",
      name: "Arisa",
      membership: "VIP" as const,
      lastActiveAt: new Date(),
      profile: {
        displayName: "Arisa",
        age: 31,
        dateOfBirth: new Date("1995-01-05"),
        gender: "WOMAN" as const,
        seeking: "MAN" as const,
        locationText: "Phuket, Thailand",
        countryCode: "TH",
        headline: "Ocean person. Looking for calm, loyal love.",
        bio: "Hospitality professional, beach walker, and auntie to three funny nieces. I like practical kindness more than big promises.",
        intent: "Marriage minded",
        profession: "Hotel guest relations",
        languages: ["Thai", "English", "French"],
        interests: ["Seafood", "Beach walks", "Photography"],
        goals: ["Marriage", "Shared home"],
        completion: 91,
        tier: "GOLD" as const,
      },
      photos: [
        "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80",
      ],
    },
    {
      id: "demo-pim",
      email: "pim.demo@tmh.local",
      name: "Pim",
      membership: "STANDARD" as const,
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 7),
      profile: {
        displayName: "Pim",
        age: 27,
        dateOfBirth: new Date("1999-05-16"),
        gender: "WOMAN" as const,
        seeking: "MAN" as const,
        locationText: "Khon Kaen, Thailand",
        countryCode: "TH",
        headline: "Teacher, reader, and patient optimist.",
        bio: "I teach primary school and spend weekends with family. I am shy at first, but very playful once I feel safe.",
        intent: "Serious dating",
        profession: "Teacher",
        languages: ["Thai", "English"],
        interests: ["Reading", "Cafe hopping", "Family"],
        goals: ["Marriage", "Children someday"],
        completion: 79,
        tier: "SILVER" as const,
      },
      photos: [
        "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
      ],
    },
    {
      id: "demo-sirin",
      email: "sirin.demo@tmh.local",
      name: "Sirin",
      membership: "STANDARD" as const,
      lastActiveAt: new Date(),
      profile: {
        displayName: "Sirin",
        age: 38,
        dateOfBirth: new Date("1988-11-02"),
        gender: "WOMAN" as const,
        seeking: "MAN" as const,
        locationText: "London, United Kingdom",
        countryCode: "GB",
        headline: "Thai in London, still close to home.",
        bio: "Nurse, mum of one grown-up son, and weekend market explorer. I want a thoughtful partner who enjoys both Thai and British life.",
        intent: "Companionship",
        profession: "Nurse",
        languages: ["Thai", "English"],
        interests: ["Gardens", "Thai cooking", "Museums"],
        goals: ["Life partner", "Travel"],
        completion: 84,
        tier: "BRONZE" as const,
      },
      photos: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=900&q=80",
      ],
    },
    {
      id: "demo-kan",
      email: "kan.demo@tmh.local",
      name: "Kan",
      membership: "VIP" as const,
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 25),
      profile: {
        displayName: "Kan",
        age: 30,
        dateOfBirth: new Date("1996-07-19"),
        gender: "LADYBOY" as const,
        seeking: "MAN" as const,
        locationText: "Pattaya, Thailand",
        countryCode: "TH",
        headline: "Confident, loyal, and looking for respect first.",
        bio: "Beauty stylist with a soft spot for karaoke and honest men. Chemistry matters, but respect matters more.",
        intent: "Long-term",
        profession: "Beauty stylist",
        languages: ["Thai", "English"],
        interests: ["Karaoke", "Fashion", "Street food"],
        goals: ["Stable partner", "Travel"],
        completion: 89,
        tier: "GOLD" as const,
      },
      photos: [
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=900&q=80",
      ],
    },
  ];

  for (const demo of demoMembers) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        membership: demo.membership,
        emailVerified: new Date(),
        lastActiveAt: demo.lastActiveAt,
      },
      create: {
        id: demo.id,
        email: demo.email,
        name: demo.name,
        membership: demo.membership,
        emailVerified: new Date(),
        lastActiveAt: demo.lastActiveAt,
        passwordHash: demoPasswordHash,
        wallet: { create: { coinBalance: demo.membership === "VIP" ? 180 : 40 } },
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        ...demo.profile,
        languages: JSON.stringify(demo.profile.languages),
        interests: JSON.stringify(demo.profile.interests),
        goals: JSON.stringify(demo.profile.goals),
      },
      create: {
        userId: user.id,
        ...demo.profile,
        languages: JSON.stringify(demo.profile.languages),
        interests: JSON.stringify(demo.profile.interests),
        goals: JSON.stringify(demo.profile.goals),
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { coinBalance: demo.membership === "VIP" ? 180 : 40 },
      create: { userId: user.id, coinBalance: demo.membership === "VIP" ? 180 : 40 },
    });

    for (const [position, url] of demo.photos.entries()) {
      await prisma.photo.upsert({
        where: { id: `${demo.id}-photo-${position + 1}` },
        update: { url, isPrimary: position === 0, position, moderation: "APPROVED" },
        create: {
          id: `${demo.id}-photo-${position + 1}`,
          userId: user.id,
          url,
          isPrimary: position === 0,
          position,
          moderation: "APPROVED",
        },
      });
    }

    if (demo.membership === "VIP") {
      await prisma.reel.upsert({
        where: { id: `${demo.id}-reel-1` },
        update: {
          status: "ACTIVE",
          moderation: "APPROVED",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
        create: {
          id: `${demo.id}-reel-1`,
          userId: user.id,
          mediaUrl: demo.photos[0],
          mediaType: "IMAGE",
          thumbnailUrl: demo.photos[0],
          caption: "A small hello from my day.",
          status: "ACTIVE",
          moderation: "APPROVED",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      });
    }
  }

  const ads = [
    {
      id: "ad-vip-weekend-grid",
      title: "VIP weekend boost",
      imageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
      targetUrl: "/vip",
      placement: "GRID_CARD" as const,
      advertiser: "Thai My Heart",
      weight: 10,
    },
    {
      id: "ad-rose-gift-grid",
      title: "Send a first rose",
      imageUrl: "https://images.unsplash.com/photo-1518709779341-56cf4535e94b?auto=format&fit=crop&w=900&q=80",
      targetUrl: "/vip",
      placement: "GRID_CARD" as const,
      advertiser: "Coin Wallet",
      weight: 8,
    },
    {
      id: "ad-vip-weekend-swipe",
      title: "VIP weekend boost",
      imageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
      targetUrl: "/vip",
      placement: "SWIPE_INTERSTITIAL" as const,
      advertiser: "Thai My Heart",
      weight: 10,
    },
  ];

  for (const ad of ads) {
    await prisma.ad.upsert({ where: { id: ad.id }, update: ad, create: ad });
  }

  console.log("Seed complete: admin, test member, economy, moderation, gifts, discovery demo members, and ads.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
