import Image from "next/image";
import { cn } from "@/lib/cn";

export function Avatar({ src, name, className }: { src?: string; name: string; className?: string }) {
  if (src) {
    return <Image src={src} alt={name} width={48} height={48} className={cn("h-12 w-12 rounded-full object-cover", className)} />;
  }

  return <span className={cn("grid h-12 w-12 place-items-center rounded-full bg-gold font-bold text-burgundy-dark", className)}>{name.slice(0, 2).toUpperCase()}</span>;
}
