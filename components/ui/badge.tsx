import { cn } from "@/lib/cn";

type BadgeTone = "vip" | "verified" | "online" | "new" | "reel" | "muted";

const tones: Record<BadgeTone, string> = {
  vip: "border-gold/45 bg-gold/15 text-gold-light",
  verified: "border-verified/30 bg-verified/10 text-verified",
  online: "border-verified/30 bg-verified/10 text-verified",
  new: "border-burgundy/30 bg-burgundy/10 text-burgundy",
  reel: "border-gold/45 bg-gold/15 text-burgundy-dark",
  muted: "border-cream-300 bg-cream-200 text-mauve-dark",
};

export function Badge({ tone = "muted", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}
