import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "gold" | "ghost" | "danger";
};

const variants = {
  primary: "bg-burgundy text-cream shadow-soft hover:bg-burgundy-dark",
  gold: "bg-gold text-burgundy-dark shadow-soft hover:bg-gold-light",
  ghost: "border border-gold/35 bg-white/5 text-cream hover:bg-white/10",
  danger: "bg-danger text-white hover:bg-danger/90",
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
