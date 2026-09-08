import { type ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-[#0B0F1A] font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_-8px_rgba(139,92,246,0.65)] hover:brightness-110 active:brightness-95",
  secondary: "bg-[var(--color-background-raised)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
  outline: "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-white/5",
  ghost: "bg-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-white/5",
  danger: "bg-[var(--color-danger)]/90 text-white hover:bg-[var(--color-danger)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => (
    <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  ),
);
Button.displayName = "Button";

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}
