import { cn } from "@/lib/cn";

export function Toast({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "success" | "warning" }) {
  const tones = {
    info: "border-gold/25 bg-white text-ink",
    success: "border-verified/25 bg-verified/10 text-verified",
    warning: "border-gold/35 bg-gold/15 text-burgundy-dark",
  };
  return <div className={cn("rounded-2xl border px-4 py-3 text-sm shadow-soft", tones[tone])}>{children}</div>;
}
