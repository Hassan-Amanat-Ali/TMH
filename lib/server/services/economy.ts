import { CoinTxnType, MembershipLevel, OrderKind, OrderStatus, type PrismaClient } from "@/lib/prisma/client";
import { prisma, getPrismaClient } from "@/lib/server/prisma";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const txInclude = {
  orderBy: { createdAt: "desc" as const },
  take: 12,
};

function money(value: { toString(): string }) {
  return value.toString();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function getWallet(tx: Tx, userId: string) {
  return tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, coinBalance: 0 },
  });
}

async function ensureSpendableWallet(tx: Tx, userId: string, amount: number) {
  const wallet = await getWallet(tx, userId);
  if (wallet.coinBalance < amount) {
    throw new Error("Insufficient coin balance.");
  }
  return wallet;
}

export async function getEconomyDashboard(userId: string) {
  const db = getPrismaClient();
  if (!db) {
    return {
      balance: 0,
      membership: MembershipLevel.STANDARD,
      activeVipUntil: null,
      coinPackages: [],
      vipPlans: [],
      gifts: [],
      transactions: [],
      receivedGifts: [],
      sentGifts: [],
    };
  }

  const [user, wallet, coinPackages, vipPlans, gifts, transactions, activeVip, receivedGifts, sentGifts] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { membership: true } }),
    db.wallet.upsert({ where: { userId }, update: {}, create: { userId, coinBalance: 0 } }),
    db.coinPackage.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { coins: "asc" }] }),
    db.vipPlan.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }] }),
    db.gift.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { costCoins: "asc" }] }),
    db.coinTransaction.findMany({ where: { userId }, ...txInclude }),
    db.vipSubscription.findFirst({ where: { userId, active: true, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "desc" } }),
    db.giftTransaction.findMany({
      where: { receiverId: userId },
      include: { gift: true, sender: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.giftTransaction.findMany({
      where: { senderId: userId },
      include: { gift: true, receiver: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    balance: wallet.coinBalance,
    membership: user?.membership || MembershipLevel.STANDARD,
    activeVipUntil: activeVip?.expiresAt.toISOString() || null,
    coinPackages: coinPackages.map((pack) => ({
      id: pack.id,
      label: pack.label,
      coins: pack.coins,
      bonus: pack.bonus,
      totalCoins: pack.coins + pack.bonus,
      priceGBP: money(pack.priceGBP),
    })),
    vipPlans: vipPlans.map((plan) => ({
      id: plan.id,
      label: plan.label,
      durationDays: plan.durationDays,
      priceGBP: money(plan.priceGBP),
      costCoins: plan.costCoins,
      bonusCoins: plan.bonusCoins,
    })),
    gifts: gifts.map((gift) => ({
      id: gift.id,
      name: gift.name,
      icon: gift.icon,
      costCoins: gift.costCoins,
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      balanceAfter: transaction.balanceAfter,
      reference: transaction.reference,
      note: transaction.note,
      createdAt: transaction.createdAt.toISOString(),
    })),
    receivedGifts: receivedGifts.map((item) => ({
      id: item.id,
      giftName: item.gift.name,
      icon: item.gift.icon,
      coinsSpent: item.coinsSpent,
      message: item.message,
      fromName: item.sender.profile?.displayName || item.sender.name || "Member",
      createdAt: item.createdAt.toISOString(),
    })),
    sentGifts: sentGifts.map((item) => ({
      id: item.id,
      giftName: item.gift.name,
      icon: item.gift.icon,
      coinsSpent: item.coinsSpent,
      message: item.message,
      toName: item.receiver.profile?.displayName || item.receiver.name || "Member",
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function purchaseCoinPackage(userId: string, packageId: string) {
  return prisma.$transaction(async (tx) => {
    const pack = await tx.coinPackage.findFirst({ where: { id: packageId, active: true } });
    if (!pack) throw new Error("Coin package unavailable.");

    const wallet = await getWallet(tx, userId);
    const credited = pack.coins + pack.bonus;
    const balanceAfter = wallet.coinBalance + credited;
    const order = await tx.order.create({
      data: {
        userId,
        kind: OrderKind.COINS,
        reference: pack.id,
        amountGBP: pack.priceGBP,
        coins: credited,
        status: OrderStatus.PAID,
        provider: "mock",
        providerRef: `mock-coin-${Date.now()}`,
      },
    });
    await tx.wallet.update({ where: { userId }, data: { coinBalance: balanceAfter } });
    const transaction = await tx.coinTransaction.create({
      data: {
        userId,
        amount: credited,
        type: CoinTxnType.PURCHASE,
        balanceAfter,
        reference: order.id,
        note: `Mock checkout: ${pack.label}`,
      },
    });
    return { balanceAfter, orderId: order.id, transactionId: transaction.id, credited };
  });
}

export async function purchaseVipWithCoins(userId: string, planId: string) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.vipPlan.findFirst({ where: { id: planId, active: true } });
    if (!plan || !plan.costCoins) throw new Error("VIP plan unavailable.");

    const wallet = await ensureSpendableWallet(tx, userId, plan.costCoins);
    const balanceAfterSpend = wallet.coinBalance - plan.costCoins;
    const balanceAfter = balanceAfterSpend + plan.bonusCoins;
    const currentVip = await tx.vipSubscription.findFirst({
      where: { userId, active: true, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    });
    const startsFrom = currentVip && currentVip.expiresAt > new Date() ? currentVip.expiresAt : new Date();
    const expiresAt = addDays(startsFrom, plan.durationDays);

    await tx.wallet.update({ where: { userId }, data: { coinBalance: balanceAfter } });
    const spendTransaction = await tx.coinTransaction.create({
      data: {
        userId,
        amount: -plan.costCoins,
        type: CoinTxnType.SPEND,
        balanceAfter: balanceAfterSpend,
        reference: plan.id,
        note: `VIP purchase: ${plan.label}`,
      },
    });
    const bonusTransaction = plan.bonusCoins > 0
      ? await tx.coinTransaction.create({
          data: {
            userId,
            amount: plan.bonusCoins,
            type: CoinTxnType.BONUS,
            balanceAfter,
            reference: plan.id,
            note: `VIP bonus: ${plan.label}`,
          },
        })
      : null;
    const subscription = await tx.vipSubscription.create({
      data: {
        userId,
        planId: plan.id,
        expiresAt,
        active: true,
        source: spendTransaction.id,
      },
    });
    await tx.user.update({ where: { id: userId }, data: { membership: MembershipLevel.VIP } });
    return { balanceAfter, subscriptionId: subscription.id, expiresAt: expiresAt.toISOString(), transactionId: spendTransaction.id, bonusTransactionId: bonusTransaction?.id || null, bonusCoins: plan.bonusCoins };
  });
}

export async function sendGift(userId: string, giftId: string, receiverId: string, message: string) {
  return prisma.$transaction(async (tx) => {
    if (userId === receiverId) throw new Error("You cannot send a gift to yourself.");

    const [gift, receiver] = await Promise.all([
      tx.gift.findFirst({ where: { id: giftId, active: true } }),
      tx.user.findFirst({ where: { id: receiverId, role: "MEMBER", status: "ACTIVE" }, select: { id: true } }),
    ]);
    if (!gift) throw new Error("Gift unavailable.");
    if (!receiver) throw new Error("Receiver unavailable.");

    const wallet = await ensureSpendableWallet(tx, userId, gift.costCoins);
    const balanceAfter = wallet.coinBalance - gift.costCoins;
    await tx.wallet.update({ where: { userId }, data: { coinBalance: balanceAfter } });
    const giftTransaction = await tx.giftTransaction.create({
      data: {
        giftId: gift.id,
        senderId: userId,
        receiverId,
        coinsSpent: gift.costCoins,
        message: message.trim() || null,
      },
    });
    const coinTransaction = await tx.coinTransaction.create({
      data: {
        userId,
        amount: -gift.costCoins,
        type: CoinTxnType.GIFT_SENT,
        balanceAfter,
        reference: giftTransaction.id,
        note: `Gift sent: ${gift.name}`,
      },
    });

    const [participantAId, participantBId] = [userId, receiverId].sort();
    const conversation = await tx.conversation.upsert({
      where: { participantAId_participantBId: { participantAId, participantBId } },
      update: {},
      create: { participantAId, participantBId },
    });
    const chatMessage = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        type: "GIFT",
        body: message.trim() || `Sent ${gift.name}`,
        mediaUrl: gift.icon,
      },
    });
    await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: chatMessage.createdAt } });

    return {
      balanceAfter,
      giftTransactionId: giftTransaction.id,
      transactionId: coinTransaction.id,
      conversationId: conversation.id,
      messageId: chatMessage.id,
    };
  });
}
