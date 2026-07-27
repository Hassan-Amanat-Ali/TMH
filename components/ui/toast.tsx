import { cn } from "@/lib/cn";

export function Toast({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "success" | "warning" }) {
  const tones = {
    info: "border-gold/25 bg-white text-ink",
    success: "border-verified/30 bg-emerald-50 text-emerald-900",
    warning: "border-gold/45 bg-cream text-burgundy-dark",
  };
  return (
    <div role={tone === "warning" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 shadow-soft", tones[tone])}>
      {children}
    </div>
  );
}
