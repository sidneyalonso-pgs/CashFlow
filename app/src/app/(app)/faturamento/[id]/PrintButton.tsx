"use client";

export function PrintButton({ invoiceId, via }: { invoiceId: string; via?: string }) {
  return (
    <button
      onClick={() => window.open(`/print/faturamento/${invoiceId}${via ? `?via=${via}` : ""}`, "_blank")}
      className="w-full bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors print:hidden"
    >
      🖨️ Imprimir / PDF
    </button>
  );
}
