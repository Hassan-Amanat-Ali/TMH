import { AdminConsole, type AdminConsoleData } from "@/components/feature/admin/admin-console";
import { getPrismaClient } from "@/lib/server/prisma";
import { getLaunchSettings } from "@/lib/server/services/launch-settings";
import { requireAdmin } from "@/lib/server/session";

function labelUser(user?: { email?: string | null; name?: string | null; profile?: { displayName?: string | null } | null } | null) {
  if (!user) return "Unknown";
  return user.profile?.displayName || user.name || user.email || "Member";
}

function emptyData(): AdminConsoleData {
  return {
    dbAvailable: false,
    reports: [],
    verifications: [],
    supportRequests: [],
    members: [],
    coinTransactions: [],
    giftLogs: [],
    planSettings: [],
    moderationRules: [],
    auditLog: [],
    launchSettings: {
      launchMode: "COMING_SOON",
      headline: "Thai My Heart is almost ready",
      subtext: "Invited members can sign in while we prepare the public launch.",
      comingSoonImageUrl: "",
    },
    counts: {
      openReports: 0,
      pendingVerifications: 0,
      openAppeals: 0,
      suspendedMembers: 0,
    },
  };
}

export default async function AdminPage() {
  await requireAdmin();
  const db = getPrismaClient();
  if (!db) return <AdminConsole data={emptyData()} />;

  const [
    reports,
    verifications,
    supportRequests,
    members,
    auditLog,
    coinTransactions,
    giftLogs,
    planSettings,
    moderationRules,
    launchSettings,
    openReports,
    pendingVerifications,
    openAppeals,
    suspendedMembers,
  ] = await Promise.all([
    db.report.findMany({
      include: {
        reporter: { select: { email: true, name: true, profile: { select: { displayName: true } } } },
        reportedUser: { select: { id: true, email: true, name: true, profile: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.verification.findMany({
      where: { status: { in: ["PENDING", "ESCALATED", "NEEDS_RESUBMISSION"] } },
      include: { user: { select: { id: true, email: true, name: true, profile: { select: { displayName: true } } } } },
      orderBy: { submittedAt: "desc" },
      take: 40,
    }),
    db.supportRequest.findMany({
      where: { status: "OPEN" },
      include: { user: { select: { id: true, email: true, name: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.user.findMany({
      where: { role: "MEMBER" },
      include: {
        profile: { select: { displayName: true } },
        wallet: { select: { coinBalance: true } },
        vipSubscriptions: { where: { active: true }, orderBy: { expiresAt: "desc" }, take: 1, select: { expiresAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.adminAction.findMany({
      include: { admin: { select: { email: true, name: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.coinTransaction.findMany({
      include: { user: { select: { email: true, name: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.giftTransaction.findMany({
      include: {
        gift: { select: { name: true, icon: true } },
        sender: { select: { email: true, name: true, profile: { select: { displayName: true } } } },
        receiver: { select: { email: true, name: true, profile: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.planSetting.findMany({ orderBy: { tier: "asc" } }),
    db.moderationRule.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    getLaunchSettings(),
    db.report.count({ where: { status: "OPEN" } }),
    db.verification.count({ where: { status: "PENDING" } }),
    db.supportRequest.count({ where: { status: "OPEN", type: "APPEAL" } }),
    db.user.count({ where: { status: "SUSPENDED" } }),
  ]);

  const openFirst = reports.sort((a, b) => {
    if (a.status === b.status) return b.createdAt.getTime() - a.createdAt.getTime();
    return a.status === "OPEN" ? -1 : 1;
  });

  const data: AdminConsoleData = {
    dbAvailable: true,
    reports: openFirst.map((report) => ({
      id: report.id,
      category: report.category,
      status: report.status,
      decision: report.decision || "",
      note: report.note || "",
      reporter: labelUser(report.reporter),
      reported: labelUser(report.reportedUser),
      reportedUserId: report.reportedUserId,
      conversationId: report.conversationId,
      reelId: report.reelId,
      createdAt: report.createdAt.toISOString(),
    })),
    verifications: verifications.map((verification) => ({
      id: verification.id,
      type: verification.type,
      status: verification.status,
      evidenceUrl: verification.evidenceUrl || "",
      note: verification.note || "",
      user: labelUser(verification.user),
      userId: verification.userId,
      submittedAt: verification.submittedAt.toISOString(),
    })),
    supportRequests: supportRequests.map((request) => ({
      id: request.id,
      type: request.type,
      status: request.status,
      subject: request.subject,
      message: request.message,
      email: request.email,
      user: labelUser(request.user) || request.userName || request.email,
      userId: request.userId,
      replyNote: request.replyNote || "",
      createdAt: request.createdAt.toISOString(),
    })),
    members: members.map((member) => ({
      id: member.id,
      email: member.email,
      name: member.name || "",
      profileName: member.profile?.displayName || "",
      status: member.status,
      shadowRestricted: member.shadowRestricted,
      ipFlagged: member.ipFlagged,
      vpnSuspected: member.vpnSuspected,
      ipCountry: member.ipCountry || "",
      membership: member.membership,
      coinBalance: member.wallet?.coinBalance || 0,
      activeVipUntil: member.vipSubscriptions[0]?.expiresAt.toISOString() || "",
      createdAt: member.createdAt.toISOString(),
    })),
    coinTransactions: coinTransactions.map((transaction) => ({
      id: transaction.id,
      user: labelUser(transaction.user),
      amount: transaction.amount,
      type: transaction.type,
      balanceAfter: transaction.balanceAfter,
      note: transaction.note || "",
      createdAt: transaction.createdAt.toISOString(),
    })),
    giftLogs: giftLogs.map((gift) => ({
      id: gift.id,
      gift: `${gift.gift.icon} ${gift.gift.name}`,
      sender: labelUser(gift.sender),
      receiver: labelUser(gift.receiver),
      coinsSpent: gift.coinsSpent,
      createdAt: gift.createdAt.toISOString(),
    })),
    planSettings: planSettings.map((setting) => ({
      id: setting.id,
      tier: setting.tier,
      maxPhotos: setting.maxPhotos,
      maxVideos: setting.maxVideos,
      videoMaxSeconds: setting.videoMaxSeconds,
    })),
    moderationRules: moderationRules.map((rule) => ({
      id: rule.id,
      kind: rule.kind,
      pattern: rule.pattern,
      action: rule.action,
      active: rule.active,
      createdAt: rule.createdAt.toISOString(),
    })),
    auditLog: auditLog.map((entry) => ({
      id: entry.id,
      admin: labelUser(entry.admin),
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      detail: entry.detail || "",
      createdAt: entry.createdAt.toISOString(),
    })),
    launchSettings: {
      launchMode: launchSettings.launchMode,
      headline: launchSettings.headline,
      subtext: launchSettings.subtext || "",
      comingSoonImageUrl: launchSettings.comingSoonImageUrl || "",
    },
    counts: {
      openReports,
      pendingVerifications,
      openAppeals,
      suspendedMembers,
    },
  };

  return <AdminConsole data={data} />;
}
