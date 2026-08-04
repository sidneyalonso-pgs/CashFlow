"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors print:hidden"
    >
      🖨️ Imprimir / PDF
    </button>
  );
}
