import { cn } from "@/lib/cn";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-11 w-full rounded-2xl border border-cream-300 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-mauve focus:border-gold focus:ring-2 focus:ring-gold/25",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "min-h-11 w-full rounded-2xl border border-cream-300 bg-white px-4 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25",
        props.className
      )}
    />
  );
}
