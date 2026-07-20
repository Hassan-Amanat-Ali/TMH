import { cn } from "@/lib/cn";

export function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", active ? "border-gold bg-gold text-burgundy-dark" : "border-cream-300 bg-white text-mauve-dark")}>{children}</span>;
}
