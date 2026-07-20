"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ClipboardCheck, Coins, Eye, Gift, History, LifeBuoy, Search, Shield, SlidersHorizontal, UserCog } from "lucide-react";
import { Badge, Card, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

type AdminItemUser = {
  id: string;
  email: string;
  name: string;
  profileName: string;
  status: string;
  shadowRestricted: boolean;
  ipFlagged: boolean;
  vpnSuspected: boolean;
  ipCountry: string;
  membership: string;
  coinBalance: number;
  activeVipUntil: string;
  createdAt: string;
};

type AdminReport = {
  id: string;
  category: string;
  status: string;
  decision: string;
  note: string;
  reporter: string;
  reported: string;
  reportedUserId: string | null;
  conversationId: string | null;
  reelId: string | null;
  createdAt: string;
};

type AdminVerification = {
  id: string;
  type: string;
  status: string;
  evidenceUrl: string;
  note: string;
  user: string;
  userId: string;
  submittedAt: string;
};

type AdminSupport = {
  id: string;
  type: string;
  status: string;
  subject: string;
  message: string;
  email: string;
  user: string;
  userId: string | null;
  replyNote: string;
  createdAt: string;
};

type AdminAudit = {
  id: string;
  admin: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
};

type AdminCoinTxn = {
  id: string;
  user: string;
  amount: number;
  type: string;
  balanceAfter: number;
  note: string;
  createdAt: string;
};

type AdminGiftLog = {
  id: string;
  gift: string;
  sender: string;
  receiver: string;
  coinsSpent: number;
  createdAt: string;
};

type AdminPlanSetting = {
  id: string;
  tier: string;
  maxPhotos: number;
  maxVideos: number;
  videoMaxSeconds: number;
};

type AdminModRule = {
  id: string;
  kind: string;
  pattern: string;
  action: string;
  active: boolean;
  createdAt: string;
};

export type AdminConsoleData = {
  dbAvailable: boolean;
  reports: AdminReport[];
  verifications: AdminVerification[];
  supportRequests: AdminSupport[];
  members: AdminItemUser[];
  coinTransactions: AdminCoinTxn[];
  giftLogs: AdminGiftLog[];
  planSettings: AdminPlanSetting[];
  moderationRules: AdminModRule[];
  auditLog: AdminAudit[];
  counts: {
    openReports: number;
    pendingVerifications: number;
    openAppeals: number;
    suspendedMembers: number;
  };
};

const tabs = [
  { id: "reports", label: "Reports", icon: AlertTriangle },
  { id: "verifications", label: "Verification", icon: ClipboardCheck },
  { id: "support", label: "Support & Appeals", icon: LifeBuoy },
  { id: "members", label: "Members", icon: UserCog },
  { id: "economy", label: "Economy", icon: Coins },
  { id: "godEye", label: "God-Eye", icon: Eye },
  { id: "audit", label: "Audit Log", icon: History },
] as const;

type TabId = (typeof tabs)[number]["id"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatusPill({ value }: { value: string }) {
  const tone = value === "OPEN" || value === "PENDING"
    ? "border-gold bg-gold/15 text-gold-light"
    : value === "ACTIVE" || value === "APPROVED" || value === "ANSWERED"
      ? "border-verified/40 bg-verified/15 text-emerald-100"
      : "border-danger/40 bg-danger/20 text-rose-100";
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold", tone)}>{value.replaceAll("_", " ")}</span>;
}

export function AdminConsole({ data }: { data: AdminConsoleData }) {
  const router = useRouter();
  const [active, setActive] = useState<TabId>("reports");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

  function mutate(url: string, body: Record<string, unknown>) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || "Admin action failed.");
        return;
      }
      setMessage("Action saved and audited.");
      router.refresh();
    });
  }

  function post(url: string, body: Record<string, unknown>) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || "Admin action failed.");
        return;
      }
      setMessage("Action saved and audited.");
      router.refresh();
    });
  }

  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.members;
    return data.members.filter((member) => [member.email, member.name, member.profileName, member.status].some((value) => value.toLowerCase().includes(needle)));
  }, [data.members, query]);

  const flaggedMembers = useMemo(() => data.members.filter((member) => member.ipFlagged || member.vpnSuspected), [data.members]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 text-cream sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge tone="vip">Admin</Badge>
          <h1 className="mt-4 font-serif text-4xl font-bold text-gold-light md:text-5xl">Moderation & Safety Console</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-cream-200">Review reports, verification, support appeals, member restrictions, and the audit trail from one admin-only control room.</p>
        </div>
        {!data.dbAvailable && (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-light">
            Database is not configured, so live queues are unavailable.
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Open reports", data.counts.openReports],
          ["Pending verification", data.counts.pendingVerifications],
          ["Open appeals", data.counts.openAppeals],
          ["Suspended members", data.counts.suspendedMembers],
        ].map(([label, count]) => (
          <div key={label} className="rounded-2xl border border-gold/15 bg-white/8 p-4">
            <div className="text-2xl font-black text-gold-light">{count}</div>
            <div className="mt-1 text-xs font-bold uppercase text-cream/60">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-gold/15 bg-white/5 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" onClick={() => setActive(tab.id)} className={cn("inline-flex min-h-10 flex-none items-center gap-2 rounded-xl px-4 text-sm font-bold text-cream/70", active === tab.id && "bg-gold text-burgundy-dark")}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {message && <div className="mb-5 rounded-2xl border border-gold/20 bg-white/8 px-4 py-3 text-sm font-semibold text-gold-light">{message}</div>}

      {active === "reports" && (
        <div className="grid gap-4">
          {data.reports.map((report) => (
            <Card key={report.id} className="bg-chrome p-5 text-cream">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={report.status} />
                    <span className="text-sm font-bold text-gold-light">{report.category.replaceAll("_", " ")}</span>
                    <span className="text-xs text-cream/55">{formatDate(report.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-cream-200">Reporter: {report.reporter} · Reported: {report.reported}</p>
                  {report.conversationId && <p className="mt-1 text-xs text-cream/55">Conversation: {report.conversationId}</p>}
                  {report.reelId && <p className="mt-1 text-xs text-cream/55">Reel: {report.reelId}</p>}
                  {report.note && <p className="mt-3 rounded-2xl bg-white/8 p-3 text-sm leading-6 text-cream-100">{report.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.reelId && <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/reports/${report.id}`, { action: "remove-reel", decision: "Reel removed after report review." })} className="min-h-9 rounded-full bg-danger px-3 text-xs font-bold text-white disabled:opacity-50">Remove reel</button>}
                  <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/reports/${report.id}`, { action: "resolve", decision: "Resolved by admin." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">Resolve</button>
                  <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/reports/${report.id}`, { action: "dismiss", decision: "Dismissed by admin." })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">Dismiss</button>
                </div>
              </div>
            </Card>
          ))}
          {!data.reports.length && <EmptyState label="No reports yet." />}
        </div>
      )}

      {active === "verifications" && (
        <div className="grid gap-4">
          {data.verifications.map((verification) => (
            <Card key={verification.id} className="bg-chrome p-5 text-cream">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={verification.status} />
                    <span className="text-sm font-bold text-gold-light">{verification.type}</span>
                    <span className="text-xs text-cream/55">{formatDate(verification.submittedAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-cream-200">{verification.user}</p>
                  {verification.evidenceUrl && <a href={verification.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-gold-light">Open evidence</a>}
                  {verification.note && <p className="mt-3 text-sm text-cream/70">{verification.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/verifications/${verification.id}`, { action: "approve", note: "Approved by admin." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">Approve</button>
                  <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/verifications/${verification.id}`, { action: "needs-resubmission", note: "Needs clearer evidence." })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">Needs resubmission</button>
                  <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/verifications/${verification.id}`, { action: "reject", note: "Rejected by admin." })} className="min-h-9 rounded-full bg-danger px-3 text-xs font-bold text-white disabled:opacity-50">Reject</button>
                </div>
              </div>
            </Card>
          ))}
          {!data.verifications.length && <EmptyState label="No pending verification requests." />}
        </div>
      )}

      {active === "support" && (
        <div className="grid gap-4">
          {data.supportRequests.map((request) => (
            <Card key={request.id} className="bg-chrome p-5 text-cream">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={request.status} />
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", request.type === "APPEAL" ? "bg-danger/25 text-rose-100" : "bg-white/10 text-cream")}>{request.type}</span>
                    <span className="text-xs text-cream/55">{formatDate(request.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-gold-light">{request.subject}</h3>
                  <p className="mt-1 text-sm text-cream-200">{request.user} · {request.email}</p>
                  <p className="mt-3 rounded-2xl bg-white/8 p-3 text-sm leading-6 text-cream-100">{request.message}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/support/${request.id}`, { action: "answer", replyNote: "Answered by support." })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">Mark answered</button>
                  {request.type === "APPEAL" && request.userId && (
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/support/${request.id}`, { action: "reactivate", replyNote: "Appeal accepted. Account reactivated." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">Reactivate member</button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {!data.supportRequests.length && <EmptyState label="No open support requests." />}
        </div>
      )}

      {active === "members" && (
        <div>
          <label className="mb-4 flex max-w-md items-center gap-3 rounded-2xl border border-gold/20 bg-white/8 px-4">
            <Search className="h-4 w-4 text-gold-light" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="border-0 bg-transparent text-cream shadow-none placeholder:text-cream/45" />
          </label>
          <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="bg-chrome p-5 text-cream">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill value={member.status} />
                      {member.shadowRestricted && <span className="rounded-full border border-gold/30 px-2.5 py-1 text-[11px] font-bold text-gold-light">SHADOW</span>}
                      <span className="text-xs text-cream/55">{member.membership}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-gold-light">{member.profileName || member.name || "Member"}</h3>
                    <p className="text-sm text-cream-200">{member.email}</p>
                    <p className="mt-1 text-xs text-cream/50">Joined {formatDate(member.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/members/${member.id}`, { action: "suspend", reason: "Suspended by admin." })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">Suspend</button>
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/members/${member.id}`, { action: "shadow", reason: "Shadow restricted by admin." })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">Shadow</button>
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/members/${member.id}`, { action: "restore", reason: "Restored by admin." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">Restore</button>
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/members/${member.id}`, { action: "ban", reason: "Banned by admin." })} className="min-h-9 rounded-full bg-danger px-3 text-xs font-bold text-white disabled:opacity-50">Ban</button>
                  </div>
                </div>
              </Card>
            ))}
            {!filteredMembers.length && <EmptyState label="No members found." />}
          </div>
        </div>
      )}

      {active === "economy" && (
        <div className="grid gap-6">
          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold text-gold-light">Coins & VIP</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.members.slice(0, 12).map((member) => (
                <Card key={member.id} className="bg-chrome p-5 text-cream">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-gold-light">{member.profileName || member.name || member.email}</h3>
                      <p className="mt-1 text-sm text-cream-200">{member.email}</p>
                      <p className="mt-2 text-xs text-cream/60">Coins: {member.coinBalance} · {member.membership}{member.activeVipUntil ? ` · VIP until ${formatDate(member.activeVipUntil)}` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/economy/coins/${member.id}`, { amount: 50, note: "Admin grant." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">+50 coins</button>
                      <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/economy/coins/${member.id}`, { amount: -50, note: "Admin debit." })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">-50 coins</button>
                      <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/economy/vip/${member.id}`, { action: "grant", days: 30, note: "Admin VIP grant." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">Grant VIP 30d</button>
                      <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/economy/vip/${member.id}`, { action: "expire", days: 1, note: "Admin VIP expiry." })} className="min-h-9 rounded-full bg-danger px-3 text-xs font-bold text-white disabled:opacity-50">Expire VIP</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-chrome p-5 text-cream">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl font-bold text-gold-light"><Coins className="h-5 w-5" /> Coin Ledger</h2>
              <div className="grid gap-3">
                {data.coinTransactions.map((txn) => (
                  <div key={txn.id} className="rounded-2xl bg-white/8 p-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="font-bold text-cream">{txn.user}</span><span className={txn.amount >= 0 ? "text-emerald-100" : "text-rose-100"}>{txn.amount}</span></div>
                    <p className="mt-1 text-xs text-cream/60">{txn.type} · balance {txn.balanceAfter} · {formatDate(txn.createdAt)}</p>
                    {txn.note && <p className="mt-2 text-xs text-cream/70">{txn.note}</p>}
                  </div>
                ))}
                {!data.coinTransactions.length && <EmptyState label="No coin transactions yet." />}
              </div>
            </Card>
            <Card className="bg-chrome p-5 text-cream">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl font-bold text-gold-light"><Gift className="h-5 w-5" /> Gift Logs</h2>
              <div className="grid gap-3">
                {data.giftLogs.map((gift) => (
                  <div key={gift.id} className="rounded-2xl bg-white/8 p-3 text-sm">
                    <div className="font-bold text-cream">{gift.gift} · {gift.coinsSpent} coins</div>
                    <p className="mt-1 text-xs text-cream/60">{gift.sender} to {gift.receiver} · {formatDate(gift.createdAt)}</p>
                  </div>
                ))}
                {!data.giftLogs.length && <EmptyState label="No gift logs yet." />}
              </div>
            </Card>
          </div>

          <Card className="bg-chrome p-5 text-cream">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold text-gold-light"><SlidersHorizontal className="h-5 w-5" /> Tier Limits</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.planSettings.map((setting) => (
                <form key={setting.id} className="rounded-2xl bg-white/8 p-4" onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  mutate(`/api/admin/plan-settings/${setting.id}`, {
                    maxPhotos: Number(form.get("maxPhotos")),
                    maxVideos: Number(form.get("maxVideos")),
                    videoMaxSeconds: Number(form.get("videoMaxSeconds")),
                  });
                }}>
                  <h3 className="mb-3 font-black text-gold-light">{setting.tier}</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input name="maxPhotos" type="number" min={0} defaultValue={setting.maxPhotos} />
                    <Input name="maxVideos" type="number" min={0} defaultValue={setting.maxVideos} />
                    <Input name="videoMaxSeconds" type="number" min={0} defaultValue={setting.videoMaxSeconds} />
                  </div>
                  <button type="submit" disabled={busy} className="mt-3 min-h-9 rounded-full bg-gold px-4 text-xs font-bold text-burgundy-dark disabled:opacity-50">Save limits</button>
                </form>
              ))}
              {!data.planSettings.length && <EmptyState label="No plan settings configured." />}
            </div>
          </Card>
        </div>
      )}

      {active === "godEye" && (
        <div className="grid gap-6">
          <Card className="bg-chrome p-5 text-cream">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gold-light">IP / VPN Review</h2>
            <div className="grid gap-4">
              {flaggedMembers.map((member) => (
                <div key={member.id} className="rounded-2xl bg-white/8 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-gold-light">{member.profileName || member.name || member.email}</h3>
                      <p className="mt-1 text-sm text-cream-200">{member.email} · {member.ipCountry || "Unknown country"}</p>
                      <p className="mt-1 text-xs text-cream/60">IP flagged: {String(member.ipFlagged)} · VPN suspected: {String(member.vpnSuspected)}</p>
                    </div>
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/flags/${member.id}`, { ipFlagged: false, vpnSuspected: false, note: "Cleared by admin." })} className="min-h-9 rounded-full bg-gold px-3 text-xs font-bold text-burgundy-dark disabled:opacity-50">Clear flags</button>
                  </div>
                </div>
              ))}
              {!flaggedMembers.length && <EmptyState label="No IP/VPN flags currently." />}
            </div>
          </Card>

          <Card className="bg-chrome p-5 text-cream">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gold-light">Moderation Rules</h2>
            <form className="mb-5 grid gap-3 rounded-2xl bg-white/8 p-4 md:grid-cols-[150px_1fr_150px_auto]" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              post("/api/admin/moderation-rules", {
                kind: form.get("kind"),
                pattern: form.get("pattern"),
                action: form.get("action"),
              });
              event.currentTarget.reset();
            }}>
              <select name="kind" className="rounded-2xl border border-gold/20 bg-chrome-deep px-3 py-2 text-sm text-cream">
                <option value="LEAKAGE">Leakage</option>
                <option value="TRIGGER_WORD">Trigger word</option>
              </select>
              <Input name="pattern" placeholder="Pattern or phrase" className="bg-chrome-deep text-cream placeholder:text-cream/45" />
              <select name="action" className="rounded-2xl border border-gold/20 bg-chrome-deep px-3 py-2 text-sm text-cream">
                <option value="BLOCK">Block</option>
                <option value="FLAG">Flag</option>
                <option value="SUSPEND">Suspend</option>
              </select>
              <button type="submit" disabled={busy} className="min-h-10 rounded-full bg-gold px-4 text-xs font-bold text-burgundy-dark disabled:opacity-50">Add rule</button>
            </form>
            <div className="grid gap-3">
              {data.moderationRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl bg-white/8 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill value={rule.active ? "ACTIVE" : "DISABLED"} />
                        <span className="text-xs font-bold text-gold-light">{rule.kind} · {rule.action}</span>
                      </div>
                      <p className="mt-2 break-all text-sm text-cream-100">{rule.pattern}</p>
                    </div>
                    <button type="button" disabled={busy} onClick={() => mutate(`/api/admin/moderation-rules/${rule.id}`, { active: !rule.active })} className="min-h-9 rounded-full border border-gold/30 px-3 text-xs font-bold text-gold-light disabled:opacity-50">{rule.active ? "Disable" : "Enable"}</button>
                  </div>
                </div>
              ))}
              {!data.moderationRules.length && <EmptyState label="No moderation rules configured." />}
            </div>
          </Card>
        </div>
      )}

      {active === "audit" && (
        <div className="grid gap-3">
          {data.auditLog.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-gold/15 bg-white/8 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Shield className="h-4 w-4 text-gold-light" />
                <span className="text-sm font-black text-gold-light">{entry.action}</span>
                <span className="text-xs text-cream/55">{formatDate(entry.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-cream-200">{entry.admin} · {entry.targetType} · {entry.targetId}</p>
              {entry.detail && <p className="mt-2 rounded-xl bg-black/15 p-3 text-xs leading-5 text-cream/70">{entry.detail}</p>}
            </div>
          ))}
          {!data.auditLog.length && <EmptyState label="No audit actions yet." />}
        </div>
      )}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-white/8 p-8 text-center text-sm font-semibold text-cream/60">
      <Check className="mx-auto mb-3 h-6 w-6 text-gold-light" />
      {label}
    </div>
  );
}
