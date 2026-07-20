import { cn } from "@/lib/cn";

export function Tabs({ items, active }: { items: Array<{ label: string; href?: string }>; active?: string }) {
  return (
    <div className="flex rounded-full border border-gold/25 bg-white/10 p-1">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href || "#"}
          className={cn("rounded-full px-4 py-2 text-sm font-semibold text-cream/75 transition hover:text-cream", active === item.label && "bg-gold text-burgundy-dark")}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
