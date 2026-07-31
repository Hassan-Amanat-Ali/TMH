export function MatchBadge({ percent, size = "md" }: { percent: number; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-14 w-14 text-lg",
    md: "h-16 w-16 text-xl",
    lg: "h-20 w-20 text-2xl",
  };

  return (
    <div className={`grid ${sizes[size]} place-items-center rounded-full border border-gold/70 bg-burgundy text-center font-bold text-gold-light shadow-soft`}>
      <span>
        {percent}
        <small className="block text-[10px] uppercase tracking-[0.18em] text-cream">match</small>
      </span>
    </div>
  );
}
