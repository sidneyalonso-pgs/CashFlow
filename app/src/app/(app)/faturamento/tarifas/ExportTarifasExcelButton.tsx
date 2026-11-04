"use client";

import * as XLSX from "xlsx";
import type { LinhaTarifa } from "./dados";
import { modeloLabel } from "./dados";

const dataBR = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

export function ExportTarifasExcelButton({ linhas }: { linhas: LinhaTarifa[] }) {
  function exportar() {
    const cab = [
      "Introducer", "CNPJ Introducer", "Empresa", "CNPJ Empresa", "Conta", "Modelo", "Tarifa IN", "Repasse IN",
      "Tarifa OUT", "Repasse OUT", "% repasse / tarifa", "Outras tarifas", "Tipo de faturamento", "Atualizado em",
    ];
    const dados = linhas.map((l) => [
      l.introducer, l.introducerCnpj, l.empresa, l.empresaCnpj, l.numConta, modeloLabel(l.modelo), l.tarIn, l.repIn,
      l.tarOut, l.repOut, l.pctRepasse ?? "", l.outras, l.frequencia, dataBR(l.atualizadoEm),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([cab, ...dados]);
    ws["!cols"] = [34, 20, 44, 20, 12, 18, 18, 18, 18, 18, 12, 60, 16, 14].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base de tarifas");
    XLSX.writeFile(wb, `Base de tarifas - ${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button type="button" onClick={exportar} className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
      Extrair em Excel
    </button>
  );
}
