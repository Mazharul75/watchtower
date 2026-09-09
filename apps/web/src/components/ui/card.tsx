export function Card({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={`glass-card rounded-2xl ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
      {description && <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">{description}</p>}
    </div>
  );
}
