export function companyLabel(company?: { legal_name?: string | null; trade_name?: string | null } | null): string {
  if (!company) return "—";
  return company.trade_name || company.legal_name || "—";
}
