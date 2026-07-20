export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 pb-5 border-b border-ps-navy/[0.06]">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 w-1 h-6 rounded-full bg-ps-green shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-ps-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ps-muted mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
