"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Crown, Eye, Loader2, Plus, Send, Sparkles, Video } from "lucide-react";
import { Badge, Button, Card, Input, Toast } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { getReelFeed } from "@/lib/server/services/reels";

type ReelFeedData = Awaited<ReturnType<typeof getReelFeed>>;
type ReelCard = ReelFeedData["reels"][number];

function formatViews(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return String(count);
}

function ReelMedia({ reel, className }: { reel: ReelCard; className?: string }) {
  if (reel.mediaType === "VIDEO") {
    return <video src={reel.mediaUrl} poster={reel.thumbnailUrl || reel.authorPhoto} className={cn("h-full w-full object-cover", className)} muted playsInline controls />;
  }
  return <div role="img" aria-label={`${reel.authorName} Heart Reel`} className={cn("h-full w-full bg-cover bg-center", className)} style={{ backgroundImage: `url("${reel.mediaUrl}")` }} />;
}

export function ReelsExperience({ initialData }: { initialData: ReelFeedData }) {
  const [data, setData] = useState(initialData);
  const [selectedId, setSelectedId] = useState(initialData.reels[0]?.id || "");
  const [reply, setReply] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const selected = useMemo(() => data.reels.find((reel) => reel.id === selectedId) || data.reels[0], [data.reels, selectedId]);

  async function refreshFeed(selectId?: string) {
    const response = await fetch("/api/reels", { cache: "no-store" });
    const next = await response.json();
    if (!response.ok) throw new Error(next?.error || "Could not refresh reels.");
    setData(next);
    setSelectedId(selectId || next.reels[0]?.id || "");
  }

  async function openReel(reel: ReelCard) {
    setSelectedId(reel.id);
    if (reel.viewedByMe) return;
    try {
      const response = await fetch(`/api/reels/${reel.id}/view`, { method: "POST" });
      if (response.ok) {
        setData((current) => ({
          ...current,
          reels: current.reels.map((item) => item.id === reel.id ? { ...item, viewedByMe: true, viewsCount: item.viewsCount + 1 } : item),
        }));
      }
    } catch {
      // Viewing should never interrupt browsing.
    }
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setPending("create");
    setNotice(null);
    try {
      const response = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl, thumbnailUrl, caption }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not create reel.");
      setMediaUrl("");
      setThumbnailUrl("");
      setCaption("");
      setNotice({ tone: "success", text: "Heart Reel posted for 24 hours." });
      await refreshFeed(result.id);
    } catch (error) {
      setNotice({ tone: "warning", text: error instanceof Error ? error.message : "Could not create reel." });
    } finally {
      setPending(null);
    }
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setPending("reply");
    setNotice(null);
    try {
      const response = await fetch(`/api/reels/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not reply to reel.");
      setReply("");
      setNotice({ tone: "success", text: "Reply sent to messages." });
    } catch (error) {
      setNotice({ tone: "warning", text: error instanceof Error ? error.message : "Could not reply to reel." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="bg-cream-100">
      <section className="bg-[radial-gradient(circle_at_80%_15%,rgba(233,199,118,.26),transparent_28%),linear-gradient(135deg,#4a1b26,#8a2438_58%,#5e1622)] text-cream">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-light">
                <Video className="h-4 w-4" /> Heart Reels
              </div>
              <h1 className="mt-4 font-serif text-5xl font-bold text-gold-light sm:text-6xl">24-hour stories for real connection</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-cream-200">Browse fresh member moments, post your own, and turn a reel into a private message.</p>
            </div>
            <Card className="border-gold/30 bg-cream/95 p-5 text-ink">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">Today</p>
                  <p className="mt-1 text-4xl font-bold text-burgundy">{data.remainingToday}/{data.dailyLimit}</p>
                  <p className="mt-1 text-xs text-mauve-dark">reels remaining</p>
                </div>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/20 text-burgundy">
                  {data.isVip ? <Crown className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
                </span>
              </div>
              {!data.isVip && (
                <Link href="/vip" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-gold px-4 text-sm font-bold text-burgundy-dark">
                  Unlock VIP reel priority
                </Link>
              )}
            </Card>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex gap-3 overflow-x-auto pb-1 lg:block lg:space-y-3 lg:overflow-visible">
            {data.reels.map((reel) => (
              <button
                key={reel.id}
                type="button"
                onClick={() => void openReel(reel)}
                className={cn(
                  "grid w-56 flex-none grid-cols-[72px_1fr] gap-3 rounded-2xl border bg-white p-2 text-left shadow-[0_10px_24px_rgba(74,27,38,.08)] transition lg:w-full",
                  selected?.id === reel.id ? "border-gold ring-2 ring-gold/25" : "border-cream-200 hover:border-gold/60"
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-24 overflow-hidden rounded-xl bg-chrome bg-cover bg-center"
                  style={{ backgroundImage: `url("${reel.thumbnailUrl || (reel.mediaType === "IMAGE" ? reel.mediaUrl : reel.authorPhoto)}")` }}
                >
                </span>
                <span className="min-w-0 py-1">
                  <span className="block truncate text-sm font-bold text-burgundy">{reel.authorName}, {reel.authorAge}</span>
                  <span className="mt-1 block truncate text-xs text-mauve-dark">{reel.authorLocation}</span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {reel.membership === "VIP" && <Badge tone="vip" className="px-2 py-0.5 text-[10px]">VIP</Badge>}
                    <Badge tone="reel" className="px-2 py-0.5 text-[10px]">{reel.expiresIn}</Badge>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <Card className="overflow-hidden bg-white">
            {selected ? (
              <>
                <div className="relative min-h-[520px] bg-chrome sm:min-h-[620px]">
                  <ReelMedia reel={selected} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-chrome-deep/95 via-chrome-deep/70 to-transparent p-5 pt-24 text-cream">
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate font-serif text-3xl font-bold text-gold-light">{selected.authorName}, {selected.authorAge}</h2>
                          {selected.membership === "VIP" && <Badge tone="vip">VIP</Badge>}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-cream-200">{selected.authorLocation}</p>
                        {selected.caption && <p className="mt-3 max-w-xl text-sm leading-6 text-cream">{selected.caption}</p>}
                      </div>
                      <div className="grid shrink-0 gap-2 text-right text-xs font-bold text-cream-200">
                        <span className="inline-flex items-center justify-end gap-1"><Eye className="h-4 w-4" /> {formatViews(selected.viewsCount)}</span>
                        <span>{selected.expiresIn} left</span>
                      </div>
                    </div>
                  </div>
                </div>
                <form onSubmit={submitReply} className="grid gap-3 border-t border-cream-200 p-4 sm:grid-cols-[1fr_auto]">
                  <Input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1000} placeholder={`Reply to ${selected.authorName}`} />
                  <Button type="submit" disabled={pending === "reply"}>
                    {pending === "reply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send reply
                  </Button>
                </form>
              </>
            ) : (
              <div className="grid min-h-[420px] place-items-center p-8 text-center text-mauve-dark">No active Heart Reels yet.</div>
            )}
          </Card>
        </section>

        <aside className="space-y-5">
          <Card className="bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Create</p>
                <h2 className="font-serif text-3xl font-bold text-burgundy">Add your reel</h2>
              </div>
              <Plus className="text-burgundy" />
            </div>
            <form onSubmit={submitCreate} className="mt-5 space-y-3">
              <Input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Media URL" />
              <Input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="Thumbnail URL (optional)" />
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={220}
                placeholder="Caption"
                className="min-h-24 w-full rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-mauve focus:border-gold focus:ring-2 focus:ring-gold/25"
              />
              <Button type="submit" disabled={pending === "create" || data.remainingToday <= 0} className="w-full">
                {pending === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Post for 24 hours
              </Button>
            </form>
          </Card>
          <Card className="bg-chrome p-5 text-cream">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">VIP advantage</p>
            <div className="mt-4 grid gap-3 text-sm text-cream-200">
              <p>VIP reels appear first in the feed and have a higher daily posting limit.</p>
              <Link href="/vip" className="inline-flex min-h-10 items-center justify-center rounded-full border border-gold/35 px-4 font-bold text-gold-light">View VIP</Link>
            </div>
          </Card>
        </aside>
      </main>
      {notice && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 lg:bottom-8">
          <Toast tone={notice.tone}>
            <span className="flex items-center justify-between gap-4">
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} className="rounded-full border border-current/20 px-3 py-1 text-xs font-bold">
                Close
              </button>
            </span>
          </Toast>
        </div>
      )}
    </div>
  );
}
