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
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-ps-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ps-muted mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
