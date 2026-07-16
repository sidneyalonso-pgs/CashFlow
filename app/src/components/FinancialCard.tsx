export function FinancialCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-ps-green-700" : tone === "negative" ? "text-red-600" : "text-ps-ink";

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <p className="text-xs uppercase tracking-wide text-ps-muted font-mono">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ps-muted">{hint}</p>}
    </div>
  );
}
