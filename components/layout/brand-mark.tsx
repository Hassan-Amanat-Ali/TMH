import { Heart } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/45 bg-gold/15 text-gold-light">
        <Heart className="h-5 w-5 fill-current" />
      </span>
      <span>
        <span className="block font-serif text-2xl font-bold leading-none text-gold-light">Thai My Heart</span>
        <span className="block text-[9.5px] font-medium uppercase tracking-[0.08em] text-gold">Find Love. Build a Future.</span>
      </span>
    </div>
  );
}
