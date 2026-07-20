import { AccountStatus, CoinTxnType, MembershipLevel, ReportStatus, VerificationStatus, type PrismaClient } from "@/lib/prisma/client";
import type { SessionUser } from "@/lib/server/session";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type Db = PrismaClient | Tx;

function detail(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

async function logAdminAction(
  db: Db,
  admin: SessionUser,
  action: string,
  targetType: string,
  targetId: string,
  data: Record<string, unknown> = {}
) {
  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action,
      targetType,
      targetId,
      detail: detail(data),
    },
  });
}

export async function updateReportStatus(
  db: PrismaClient,
  admin: SessionUser,
  reportId: string,
  nextStatus: ReportStatus,
  decision: string
) {
  return db.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id: reportId },
      data: {
        status: nextStatus,
        decision,
        resolvedAt: nextStatus === ReportStatus.RESOLVED || nextStatus === ReportStatus.DISMISSED ? new Date() : null,
      },
    });
    await logAdminAction(tx, admin, `REPORT_${nextStatus}`, "Report", reportId, { decision, reportedUserId: report.reportedUserId });
    return report;
  });
}

export async function updateVerificationStatus(
  db: PrismaClient,
  admin: SessionUser,
  verificationId: string,
  nextStatus: VerificationStatus,
  note: string
) {
  return db.$transaction(async (tx) => {
    const verification = await tx.verification.update({
      where: { id: verificationId },
      data: {
        status: nextStatus,
        note,
        reviewerId: admin.id,
        reviewedAt: new Date(),
      },
    });
    await logAdminAction(tx, admin, `VERIFICATION_${nextStatus}`, "Verification", verificationId, { note, userId: verification.userId });
    return verification;
  });
}

export async function answerSupportRequest(
  db: PrismaClient,
  admin: SessionUser,
  requestId: string,
  replyNote: string,
  reactivate: boolean
) {
  return db.$transaction(async (tx) => {
    const request = await tx.supportRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Support request not found.");

    const matchedUser = reactivate
      ? request.userId
        ? await tx.user.findUnique({ where: { id: request.userId }, select: { id: true, email: true } })
        : await tx.user.findUnique({ where: { email: request.email }, select: { id: true, email: true } })
      : null;

    if (reactivate && matchedUser) {
      await tx.user.update({
        where: { id: matchedUser.id },
        data: {
          status: AccountStatus.ACTIVE,
          suspendedAt: null,
          suspensionReason: null,
          shadowRestricted: false,
        },
      });
      await logAdminAction(tx, admin, "MEMBER_REACTIVATED_FROM_APPEAL", "User", matchedUser.id, { supportRequestId: requestId, matchedByEmail: !request.userId });
    }

    const updated = await tx.supportRequest.update({
      where: { id: requestId },
      data: {
        status: "ANSWERED",
        replyNote,
        repliedToMessagesAt: new Date(),
      },
    });

    await logAdminAction(tx, admin, reactivate ? "APPEAL_ANSWERED" : "SUPPORT_ANSWERED", "SupportRequest", requestId, {
      replyNote,
      reactivate,
      userId: matchedUser?.id || request.userId,
      matchedByEmail: Boolean(reactivate && matchedUser && !request.userId),
    });
    return updated;
  });
}

export async function updateMemberModeration(
  db: PrismaClient,
  admin: SessionUser,
  userId: string,
  action: "SUSPEND" | "BAN" | "SHADOW" | "RESTORE",
  reason: string
) {
  return db.$transaction(async (tx) => {
    const data =
      action === "SUSPEND"
        ? { status: AccountStatus.SUSPENDED, suspendedAt: new Date(), suspensionReason: reason || "Admin suspension." }
        : action === "BAN"
          ? { status: AccountStatus.BANNED, suspendedAt: new Date(), suspensionReason: reason || "Admin ban." }
          : action === "SHADOW"
            ? { shadowRestricted: true }
            : { status: AccountStatus.ACTIVE, suspendedAt: null, suspensionReason: null, shadowRestricted: false };

    const member = await tx.user.update({ where: { id: userId }, data });
    await logAdminAction(tx, admin, `MEMBER_${action}`, "User", userId, { reason, status: member.status, shadowRestricted: member.shadowRestricted });
    return member;
  });
}

export async function adjustMemberCoins(db: PrismaClient, admin: SessionUser, userId: string, amount: number, note: string) {
  return db.$transaction(async (tx) => {
    await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, coinBalance: 0 },
    });
    if (amount < 0) {
      const affected = await tx.$executeRaw`
        UPDATE \`Wallet\`
        SET \`coinBalance\` = \`coinBalance\` + ${amount}
        WHERE \`userId\` = ${userId} AND \`coinBalance\` >= ${Math.abs(amount)}
      `;
      if (Number(affected) !== 1) throw new Error("Insufficient coin balance.");
    } else {
      await tx.wallet.update({ where: { userId }, data: { coinBalance: { increment: amount } } });
    }
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet unavailable.");
    const balanceAfter = wallet.coinBalance;
    const transaction = await tx.coinTransaction.create({
      data: {
        userId,
        amount,
        type: CoinTxnType.ADMIN_ADJUST,
        balanceAfter,
        note,
        reference: `admin:${admin.id}`,
      },
    });
    await logAdminAction(tx, admin, "COINS_ADMIN_ADJUST", "User", userId, { amount, balanceAfter, note, transactionId: transaction.id });
    return transaction;
  });
}

export async function grantOrExpireVip(db: PrismaClient, admin: SessionUser, userId: string, action: "GRANT" | "EXPIRE", days: number, note: string) {
  return db.$transaction(async (tx) => {
    if (action === "EXPIRE") {
      await tx.vipSubscription.updateMany({ where: { userId, active: true }, data: { active: false, expiresAt: new Date() } });
      const user = await tx.user.update({ where: { id: userId }, data: { membership: MembershipLevel.STANDARD } });
      await logAdminAction(tx, admin, "VIP_EXPIRED_BY_ADMIN", "User", userId, { note });
      return user;
    }

    const expiresAt = new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
    const subscription = await tx.vipSubscription.create({
      data: {
        userId,
        expiresAt,
        active: true,
        source: `admin:${admin.id}`,
      },
    });
    await tx.user.update({ where: { id: userId }, data: { membership: MembershipLevel.VIP } });
    await logAdminAction(tx, admin, "VIP_GRANTED_BY_ADMIN", "User", userId, { days, expiresAt: expiresAt.toISOString(), note, subscriptionId: subscription.id });
    return subscription;
  });
}

export async function updatePlanLimits(db: PrismaClient, admin: SessionUser, settingId: string, maxPhotos: number, maxVideos: number, videoMaxSeconds: number) {
  return db.$transaction(async (tx) => {
    const setting = await tx.planSetting.update({
      where: { id: settingId },
      data: { maxPhotos, maxVideos, videoMaxSeconds },
    });
    await logAdminAction(tx, admin, "PLAN_LIMITS_UPDATED", "PlanSetting", settingId, { tier: setting.tier, maxPhotos, maxVideos, videoMaxSeconds });
    return setting;
  });
}

export async function updateMemberIpFlags(db: PrismaClient, admin: SessionUser, userId: string, ipFlagged: boolean, vpnSuspected: boolean, note: string) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { ipFlagged, vpnSuspected } });
    await logAdminAction(tx, admin, "IP_VPN_FLAGS_UPDATED", "User", userId, { ipFlagged, vpnSuspected, note });
    return user;
  });
}

export async function createModerationRule(
  db: PrismaClient,
  admin: SessionUser,
  input: { kind: "LEAKAGE" | "TRIGGER_WORD"; pattern: string; action: "BLOCK" | "SUSPEND" | "FLAG" }
) {
  return db.$transaction(async (tx) => {
    const rule = await tx.moderationRule.create({
      data: {
        kind: input.kind,
        pattern: input.pattern,
        action: input.action,
        active: true,
      },
    });
    await logAdminAction(tx, admin, "MODERATION_RULE_CREATED", "ModerationRule", rule.id, input);
    return rule;
  });
}

export async function updateModerationRule(db: PrismaClient, admin: SessionUser, ruleId: string, input: { pattern?: string; action?: "BLOCK" | "SUSPEND" | "FLAG"; active?: boolean }) {
  return db.$transaction(async (tx) => {
    const rule = await tx.moderationRule.update({
      where: { id: ruleId },
      data: {
        ...(input.pattern !== undefined ? { pattern: input.pattern } : {}),
        ...(input.action !== undefined ? { action: input.action } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    await logAdminAction(tx, admin, "MODERATION_RULE_UPDATED", "ModerationRule", ruleId, input);
    return rule;
  });
}
