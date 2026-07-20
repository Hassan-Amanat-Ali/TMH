import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-3xl border border-gold/20 bg-cream shadow-soft", className)}>{children}</section>;
}
