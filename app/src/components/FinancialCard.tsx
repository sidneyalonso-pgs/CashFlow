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
  const accentClass = tone === "positive" ? "bg-ps-green" : tone === "negative" ? "bg-red-500" : "bg-ps-navy/20";

  return (
    <div className="relative bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 pl-6 overflow-hidden transition-shadow hover:shadow-ps">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`} />
      <p className="text-xs uppercase tracking-wide text-ps-muted font-mono">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ps-muted">{hint}</p>}
    </div>
  );
}
