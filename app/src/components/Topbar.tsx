export function Topbar({ userEmail }: { userEmail?: string }) {
  return (
    <header className="h-16 border-b border-ps-navy/10 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ps-ink">Todas as empresas</span>
        <span className="text-xs text-ps-muted font-mono">Julho 2026</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ps-muted">{userEmail}</span>
      </div>
    </header>
  );
}
