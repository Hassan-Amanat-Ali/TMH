"use client";

import { Check, Coins, Gift, History, Loader2, ShieldCheck, Sparkles, Star, Wallet, Crown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Toast } from "@/components/ui";
import type { getEconomyDashboard } from "@/lib/server/services/economy";

type EconomyData = Awaited<ReturnType<typeof getEconomyDashboard>>;

const comparison = [
  ["Additional photos", "5 photos", "12 photos"],
  ["Profile videos", "2 short videos", "4 longer videos"],
  ["Heart Reels", "Standard limits", "Priority reels"],
  ["Photo messaging", "Limited", "VIP-friendly"],
  ["Browsing & swipes", "Daily limits", "Unlimited"],
  ["Stealth mode", "Not included", "Included"],
  ["Read receipts", "Not included", "Sent, delivered, read"],
  ["Search ranking", "Standard", "Priority exposure"],
  ["Gifts", "Receive and view", "Send gifts"],
  ["Email sharing", "Blocked", "Allowed by policy"],
];

const faqs = [
  "What happens when VIP expires?",
  "Can I buy VIP with coins?",
  "Do bonus coins expire?",
  "Can admin add coins manually?",
  "Can I renew before expiry?",
];

function shortDate(value: string | null) {
  if (!value) return "No active VIP";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function txLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function VipCentre({ initialData }: { initialData: EconomyData }) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const bestPlan = useMemo(() => data.vipPlans.reduce((best, plan) => (plan.durationDays > (best?.durationDays || 0) ? plan : best), data.vipPlans[0] || null), [data.vipPlans]);

  async function mutate(endpoint: string, key: string, success: string) {
    setPending(key);
    setNotice(null);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Action failed.");
      setData((current) => ({
        ...current,
        balance: typeof result.balanceAfter === "number" ? result.balanceAfter : current.balance,
        membership: result.expiresAt ? "VIP" : current.membership,
        activeVipUntil: result.expiresAt || current.activeVipUntil,
      }));
      setNotice({ tone: "success", text: success });
    } catch (error) {
      setNotice({ tone: "warning", text: error instanceof Error ? error.message : "Action failed." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="bg-cream-100">
      <section className="bg-[radial-gradient(circle_at_80%_20%,rgba(233,199,118,.28),transparent_28%),linear-gradient(135deg,#5e1622,#8a2438_55%,#4a1b26)] text-cream">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8 lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-light">
              <Crown size={16} />
              VIP Centre
            </div>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl font-bold leading-none text-gold-light sm:text-7xl">Unlock warmer conversations with VIP</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-cream-200">Use coins for VIP, gifts, and premium dating tools. Everything here runs through the wallet ledger so every balance change is recorded.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#plans" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-burgundy-dark shadow-soft hover:bg-gold-light">
                <Star size={18} />
                View plans
              </a>
              <a href="#wallet" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold/35 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-white/10">
                <Wallet size={18} />
                Coin wallet
              </a>
            </div>
          </div>

          <Card className="border-gold/30 bg-cream/95 p-6 text-ink">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Current balance</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="font-serif text-6xl font-bold text-burgundy">{data.balance}</span>
                  <span className="pb-2 text-sm font-bold text-mauve-dark">coins</span>
                </div>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/20 text-burgundy">
                <Coins size={32} />
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="text-sm font-bold text-burgundy">{data.membership === "VIP" ? "VIP active" : "Standard member"}</p>
              <p className="mt-1 text-sm text-mauve-dark">VIP until: {shortDate(data.activeVipUntil)}</p>
            </div>
            {notice && <div className="mt-4"><Toast tone={notice.tone}>{notice.text}</Toast></div>}
          </Card>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section id="plans" className="grid gap-5 lg:grid-cols-3">
          {data.vipPlans.map((plan) => {
            const isBest = bestPlan?.id === plan.id;
            const disabled = pending !== null || !plan.costCoins || data.balance < plan.costCoins;
            return (
              <Card key={plan.id} className={isBest ? "bg-chrome p-6 text-cream ring-1 ring-gold" : "bg-white p-6"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={isBest ? "text-sm font-bold text-gold-light" : "text-sm font-bold text-mauve"}>{plan.durationDays} days</p>
                    <h2 className={isBest ? "mt-1 font-serif text-3xl font-bold text-gold-light" : "mt-1 font-serif text-3xl font-bold text-burgundy"}>{plan.label}</h2>
                  </div>
                  {isBest && <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-burgundy-dark">Best value</span>}
                </div>
                <div className="mt-6">
                  <span className={isBest ? "font-serif text-5xl font-bold text-cream" : "font-serif text-5xl font-bold text-burgundy"}>{plan.costCoins || 0}</span>
                  <span className={isBest ? "ml-2 text-sm font-bold text-cream-200" : "ml-2 text-sm font-bold text-mauve"}>coins</span>
                </div>
                <p className={isBest ? "mt-3 text-sm text-cream-200" : "mt-3 text-sm text-mauve-dark"}>Mock GBP price: GBP {plan.priceGBP}. Bonus coins on plan: {plan.bonusCoins}.</p>
                <Button
                  type="button"
                  variant={isBest ? "gold" : "primary"}
                  className="mt-6 w-full"
                  disabled={disabled}
                  onClick={() => mutate(`/api/economy/vip-plans/${plan.id}/purchase`, `vip-${plan.id}`, `VIP active until ${plan.durationDays} more days.`)}
                >
                  {pending === `vip-${plan.id}` ? <Loader2 className="animate-spin" size={18} /> : <Crown size={18} />}
                  {data.balance < (plan.costCoins || 0) ? "Need more coins" : "Buy with coins"}
                </Button>
              </Card>
            );
          })}
        </section>

        <section id="wallet" className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Mock checkout</p>
                <h2 className="mt-1 font-serif text-4xl font-bold text-burgundy">Buy coin packs</h2>
              </div>
              <Wallet className="text-gold" size={32} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.coinPackages.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => mutate(`/api/economy/coin-packages/${pack.id}/purchase`, `coins-${pack.id}`, `${pack.totalCoins} coins added to wallet.`)}
                  className="rounded-2xl border border-gold/20 bg-cream-100 p-4 text-left transition hover:border-gold hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-mauve">{pack.label}</span>
                  <span className="mt-2 block font-serif text-4xl font-bold text-burgundy">{pack.totalCoins}</span>
                  <span className="mt-1 block text-sm font-semibold text-mauve-dark">GBP {pack.priceGBP}</span>
                  {pack.bonus > 0 && <span className="mt-2 inline-flex rounded-full bg-gold/20 px-2 py-1 text-xs font-bold text-burgundy">+{pack.bonus} bonus</span>}
                </button>
              ))}
            </div>
          </Card>

          <Card className="bg-white p-6">
            <div className="flex items-center gap-3">
              <History className="text-burgundy" size={24} />
              <h2 className="font-serif text-3xl font-bold text-burgundy">Coin history</h2>
            </div>
            <div className="mt-5 space-y-3">
              {data.transactions.length === 0 && <p className="text-sm text-mauve-dark">No transactions yet.</p>}
              {data.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{transaction.note || txLabel(transaction.type)}</p>
                    <p className="text-xs text-mauve">Balance after {transaction.balanceAfter}</p>
                  </div>
                  <span className={transaction.amount >= 0 ? "font-bold text-verified" : "font-bold text-burgundy"}>{transaction.amount > 0 ? "+" : ""}{transaction.amount}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="bg-white p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="text-gold" size={26} />
              <h2 className="font-serif text-4xl font-bold text-burgundy">VIP comparison</h2>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-gold/20">
              {comparison.map(([feature, standard, vip], index) => (
                <div key={feature} className={`grid grid-cols-[1.3fr_1fr_1fr] gap-3 px-4 py-3 text-sm ${index % 2 === 0 ? "bg-cream-100" : "bg-white"}`}>
                  <span className="font-bold text-ink">{feature}</span>
                  <span className="text-mauve-dark">{standard}</span>
                  <span className="font-bold text-burgundy">{vip}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-chrome p-6 text-cream">
            <div className="flex items-center gap-3 text-gold-light">
              <ShieldCheck size={26} />
              <h2 className="font-serif text-3xl font-bold">FAQ</h2>
            </div>
            <div className="mt-5 space-y-3">
              {faqs.map((faq) => (
                <div key={faq} className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-white/5 px-4 py-3 text-sm font-semibold text-cream-200">
                  <Check size={16} className="text-gold-light" />
                  {faq}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white p-6">
            <div className="flex items-center gap-3">
              <Gift className="text-burgundy" size={24} />
              <h2 className="font-serif text-3xl font-bold text-burgundy">Gift catalogue</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              {data.gifts.map((gift) => (
                <div key={gift.id} className="rounded-2xl bg-cream-100 p-4 text-center">
                  <div className="text-3xl">{gift.icon}</div>
                  <p className="mt-2 text-sm font-bold text-ink">{gift.name}</p>
                  <p className="text-xs font-semibold text-mauve">{gift.costCoins} coins</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white p-6">
            <h2 className="font-serif text-3xl font-bold text-burgundy">Recent gifts</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.receivedGifts.length === 0 && data.sentGifts.length === 0 && <p className="text-sm text-mauve-dark">No gifts yet. Send the first rose from a profile.</p>}
              {data.receivedGifts.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl bg-cream-100 p-4">
                  <p className="text-2xl">{item.icon}</p>
                  <p className="mt-2 text-sm font-bold text-ink">{item.giftName} from {item.fromName}</p>
                  {item.message && <p className="mt-1 text-xs text-mauve-dark">{item.message}</p>}
                </div>
              ))}
              {data.sentGifts.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl bg-cream-100 p-4">
                  <p className="text-2xl">{item.icon}</p>
                  <p className="mt-2 text-sm font-bold text-ink">{item.giftName} to {item.toName}</p>
                  {item.message && <p className="mt-1 text-xs text-mauve-dark">{item.message}</p>}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
