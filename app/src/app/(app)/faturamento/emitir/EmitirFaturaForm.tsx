"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitirFatura } from "../actions";

type Client = {
  id: string; razao: string; modelo: string;
  in_tipo: string; in_val: number; out_tipo: string; out_val: number;
  rep_in: number; rep_out: number; faixas_mens: any;
};
type Company = { id: string; legal_name: string; trade_name: string | null };
type Subconta = {
  id: string; client_id: string; razao: string; cnpj?: string; num_conta?: string;
  in_tipo: string; in_val: number; out_tipo: string; out_val: number;
  rep_in: number; rep_out: number;
};
type RowState = {
  qtdIn: number; volIn: number; qtdOut: number; volOut: number;
  repIn: number; repOut: number;
  repPercIn: number; repPercOut: number;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcSubFee(sub: Subconta, row: RowState) {
  const feeIn = sub.in_tipo === "fixo" ? row.qtdIn * sub.in_val : row.volIn * (sub.in_val / 100);
  const feeOut = sub.out_tipo === "fixo" ? row.qtdOut * sub.out_val : row.volOut * (sub.out_val / 100);
  // For perc subcontas, repasse is calculated from the % field; for fixo, it's a fixed R$ amount
  const repIn = sub.in_tipo === "perc" ? row.volIn * (row.repPercIn / 100) : row.repIn;
  const repOut = sub.out_tipo === "perc" ? row.volOut * (row.repPercOut / 100) : row.repOut;
  return { feeIn, feeOut, repIn, repOut };
}

function calcMensalidade(faixas: any[], numContas: number): { faixa: string; val: number } {
  if (!faixas || !faixas.length) return { faixa: "—", val: 0 };
  const sorted = [...faixas].sort((a, b) => a.ate - b.ate);
  for (const f of sorted) {
    if (numContas <= f.ate) return { faixa: `Até ${f.ate} contas`, val: f.val };
  }
  return { faixa: `Acima de ${sorted[sorted.length - 1]?.ate} contas`, val: sorted[sorted.length - 1]?.val ?? 0 };
}

const defaultRow: RowState = { qtdIn: 0, volIn: 0, qtdOut: 0, volOut: 0, repIn: 0, repOut: 0, repPercIn: 0, repPercOut: 0 };

export function EmitirFaturaForm({
  clients, companies, subcontaCounts, subcontasMap,
}: {
  clients: Client[]; companies: Company[];
  subcontaCounts: Record<string, number>;
  subcontasMap: Record<string, Subconta[]>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [qtdIn, setQtdIn] = useState(0);
  const [qtdOut, setQtdOut] = useState(0);
  const [volumeIn, setVolumeIn] = useState(0);
  const [volumeOut, setVolumeOut] = useState(0);
  const [numContas, setNumContas] = useState(0);
  const [descontoPerc, setDescontoPerc] = useState(0);
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataRepasse, setDataRepasse] = useState("");
  const [obs, setObs] = useState("");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  // Bets-specific state
  const [bQtdPixIn, setBQtdPixIn] = useState(0);
  const [bQtdOpenBank, setBQtdOpenBank] = useState(0);
  const [bQtdBankTransfer, setBQtdBankTransfer] = useState(0);
  const [bQtdPixOut, setBQtdPixOut] = useState(0);
  const [bQtdNegadas, setBQtdNegadas] = useState(0);
  const [bQtdRefund, setBQtdRefund] = useState(0);
  const [bRemessaPerc, setBRemessaPerc] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const client = clients.find(c => c.id === clientId);
  const clientSubcontas: Subconta[] = subcontasMap[clientId] ?? [];
  const hasSubcontas = clientSubcontas.length > 0 && client?.modelo === "transacao";
  const isBets = ["bet", "bets"].includes(client?.modelo ?? "");
  const faixas = client?.faixas_mens ? (Array.isArray(client.faixas_mens) ? client.faixas_mens : []) : [];

  function handleClientChange(id: string) {
    setClientId(id);
    const c = clients.find(x => x.id === id);
    if (c?.modelo === "mensalidade") setNumContas(subcontaCounts[id] ?? 0);
    // init subconta rows
    const subs = subcontasMap[id] ?? [];
    const newRows: Record<string, RowState> = {};
    for (const s of subs) newRows[s.id] = { ...defaultRow };
    setRows(newRows);
  }

  function updateRow(subId: string, field: keyof RowState, val: number) {
    setRows(prev => ({ ...prev, [subId]: { ...(prev[subId] ?? defaultRow), [field]: val } }));
  }

  // Aggregate totals from subconta rows
  let aggFeeIn = 0, aggFeeOut = 0, aggQtdIn = 0, aggQtdOut = 0, aggRepIn = 0, aggRepOut = 0;
  if (hasSubcontas) {
    for (const sub of clientSubcontas) {
      const row = rows[sub.id] ?? defaultRow;
      const { feeIn, feeOut, repIn, repOut } = calcSubFee(sub, row);
      aggFeeIn += feeIn;
      aggFeeOut += feeOut;
      aggQtdIn += sub.in_tipo === "fixo" ? row.qtdIn : 0;
      aggQtdOut += sub.out_tipo === "fixo" ? row.qtdOut : 0;
      aggRepIn += repIn;
      aggRepOut += repOut;
    }
  }

  const feeIn = hasSubcontas ? aggFeeIn : isBets ? bQtdPixIn * (client?.in_val ?? 0) : (client ? (client.in_tipo === "fixo" ? qtdIn * client.in_val : volumeIn * (client.in_val / 100)) : 0);
  const feeOut = hasSubcontas ? aggFeeOut : isBets ? bQtdPixOut * (client?.out_val ?? 0) : (client ? (client.out_tipo === "fixo" ? qtdOut * client.out_val : volumeOut * (client.out_val / 100)) : 0);
  const repasseIn = hasSubcontas ? aggRepIn : (client ? (client.in_tipo === "perc" ? volumeIn * (client.rep_in / 100) : qtdIn * client.rep_in) : 0);
  const repasseOut = hasSubcontas ? aggRepOut : (client ? (client.out_tipo === "perc" ? volumeOut * (client.rep_out / 100) : qtdOut * client.rep_out) : 0);

  // Bets-specific totals
  const bFeeNegadas = bQtdNegadas * 0.10;
  const bFeeRefund = bQtdRefund * 5.00;
  const bSubtotalRec = feeIn; // PIX IN + OpenBank (OpenBank = 0)
  const bSubtotalPag = feeOut; // Bank Transfer (0) + PIX OUT
  const bTotalOutras = bFeeNegadas + bFeeRefund;
  const bTotal = bSubtotalRec + bSubtotalPag + bTotalOutras;

  const mens = client?.modelo === "mensalidade" ? calcMensalidade(faixas, numContas) : null;
  const totalFaturado = client?.modelo === "mensalidade" ? (mens?.val ?? 0) : isBets ? bTotal : feeIn + feeOut;
  const descontoVal = totalFaturado * (descontoPerc / 100);
  const total = totalFaturado - descontoVal;
  const totalRepasse = (client?.modelo === "mensalidade" || isBets) ? 0 : repasseIn + repasseOut;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !companyId || !competencia) { setError("Selecione o merchant, empresa e competência."); return; }
    if (total <= 0 && totalRepasse <= 0) { setError("Valor calculado zerado. Verifique as quantidades."); return; }
    setError(null);

    // Build subcontas_detalhe for per-subconta breakdown
    const betsDetalhe = isBets ? {
      qi: bQtdPixIn, qob: bQtdOpenBank, qbt: bQtdBankTransfer, qo: bQtdPixOut,
      qneg: bQtdNegadas, qr: bQtdRefund,
      tPixIn: feeIn, tOpenBank: 0, tBankTransfer: 0, tPixOut: feeOut,
      tNegadas: bFeeNegadas, tRefund: bFeeRefund, tRemessa: 0,
      val_pix_in: client?.in_val ?? 0, val_pix_out: client?.out_val ?? 0,
      val_open_bank: 0, val_bank_transfer: 0, val_negadas: 0.10, val_refund: 5.00,
      val_remessa_perc: bRemessaPerc,
      subtotal: total,
      dadosBanc: "Banco Inter | Ag. 1 | CC 35635543-8 | CNPJ: 37.753.531/0001-65 | PIX: Pagsmile Instituição de Pagamento LTDA",
      vencimento: dataVencimento || null,
    } : undefined;

    const subcontasDetalhe = hasSubcontas ? {
      subcontas: clientSubcontas.map(sub => {
        const row = rows[sub.id] ?? defaultRow;
        const { feeIn: sfi, feeOut: sfo, repIn: sRepIn, repOut: sRepOut } = calcSubFee(sub, row);
        return {
          id: sub.id, razao: sub.razao, cnpj: sub.cnpj, num_conta: sub.num_conta,
          qtdIn: sub.in_tipo === "fixo" ? row.qtdIn : 0,
          qtdOut: sub.out_tipo === "fixo" ? row.qtdOut : 0,
          volIn: sub.in_tipo === "perc" ? row.volIn : 0,
          volOut: sub.out_tipo === "perc" ? row.volOut : 0,
          valIn: sub.in_val, valOut: sub.out_val,
          feeIn: sfi, feeOut: sfo,
          repasse: sRepIn + sRepOut,
        };
      }),
    } : undefined;

    startTransition(async () => {
      const res = await emitirFatura({
        client_id: clientId, company_id: companyId, competencia,
        inicio: inicio || undefined, fim: fim || undefined,
        modelo: client?.modelo ?? "transacao",
        qtd_in: hasSubcontas ? aggQtdIn : qtdIn,
        qtd_out: hasSubcontas ? aggQtdOut : qtdOut,
        fee_in: feeIn, fee_out: feeOut,
        repasse_in: repasseIn, repasse_out: repasseOut,
        num_contas: numContas, faixa_mens: mens?.faixa,
        total_faturado: totalFaturado, desconto_perc: descontoPerc, desconto_val: descontoVal,
        total_repasse: totalRepasse, total,
        obs: obs || undefined, data_vencimento: dataVencimento || undefined, data_repasse: dataRepasse || undefined,
        subcontas_detalhe: betsDetalhe ?? subcontasDetalhe,
      });
      if (res.error) { setError(res.error); return; }
      setSuccess("Demonstrativo emitido! Receita e pagamento criados automaticamente.");
      setTimeout(() => router.push(`/faturamento/${res.id}`), 1200);
    });
  }

  const inputCls = "w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-ps-green";
  const inputSmCls = "w-full rounded-ps-sm border border-ps-navy/15 px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-ps-green tabular-nums";
  const labelCls = "block text-xs font-semibold text-ps-ink mb-1";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-ps-sm">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-ps-sm">{success}</p>}

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Dados da fatura</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Merchant *</label>
                <select value={clientId} onChange={e => handleClientChange(e.target.value)} className={inputCls} required>
                  <option value="">-- Selecione --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.razao}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Empresa emissora *</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputCls} required>
                  <option value="">-- Selecione --</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Competência *</label>
                <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className={inputCls} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>Início</label><input type="date" value={inicio} onChange={e => { setInicio(e.target.value); if (e.target.value) setCompetencia(e.target.value.slice(0, 7)); }} className={inputCls} /></div>
                <div><label className={labelCls}>Fim</label><input type="date" value={fim} onChange={e => setFim(e.target.value)} className={inputCls} /></div>
              </div>
            </div>
          </div>

          {/* Per-subconta inputs (transacao with subcontas) */}
          {hasSubcontas && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-ps-navy/5">
                <h3 className="font-semibold text-ps-ink text-sm">Volumes por subconta</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-ps-bg-2 text-ps-muted border-b border-ps-navy/5">
                      <th className="text-left px-4 py-2 font-semibold">Subconta</th>
                      <th className="text-center px-2 py-2 font-semibold">Qtd / Vol. IN</th>
                      <th className="text-right px-2 py-2 font-semibold text-ps-green-700">Fee IN</th>
                      <th className="text-center px-2 py-2 font-semibold">Rep. IN</th>
                      <th className="text-center px-2 py-2 font-semibold">Qtd / Vol. OUT</th>
                      <th className="text-right px-2 py-2 font-semibold text-ps-green-700">Fee OUT</th>
                      <th className="text-center px-2 py-2 font-semibold">Rep. OUT</th>
                      <th className="text-right px-3 py-2 font-semibold text-ps-ink bg-ps-navy/5">Total Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientSubcontas.map((sub, i) => {
                      const row = rows[sub.id] ?? defaultRow;
                      const { feeIn: sFeeIn, feeOut: sFeeOut } = calcSubFee(sub, row);
                      return (
                        <tr key={sub.id} className={`border-b border-ps-navy/5 ${i % 2 === 1 ? "bg-ps-bg-2/40" : ""}`}>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-ps-ink leading-tight">{sub.razao}</p>
                            <p className="text-ps-muted text-[10px]">
                              {sub.cnpj ?? ""}{sub.cnpj && sub.num_conta ? " | " : ""}{sub.num_conta ? `Cta: ${sub.num_conta}` : ""}
                            </p>
                            <p className="text-[10px] text-ps-muted">
                              IN: {sub.in_tipo === "fixo" ? `R$${Number(sub.in_val).toFixed(2).replace(".",",")}` : `${sub.in_val}%`}
                              {" · "}
                              OUT: {sub.out_tipo === "fixo" ? `R$${Number(sub.out_val).toFixed(2).replace(".",",")}` : `${sub.out_val}%`}
                            </p>
                          </td>
                          {/* Qtd / Vol IN */}
                          <td className="px-2 py-2.5">
                            <input
                              type="number" min="0" step={sub.in_tipo === "perc" ? "0.01" : "1"}
                              value={sub.in_tipo === "fixo" ? row.qtdIn : row.volIn}
                              onChange={e => updateRow(sub.id, sub.in_tipo === "fixo" ? "qtdIn" : "volIn", Number(e.target.value))}
                              className={inputSmCls}
                            />
                          </td>
                          {/* Fee IN */}
                          <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-ps-green-700 whitespace-nowrap">
                            {fmt(sFeeIn)}
                          </td>
                          {/* Rep. IN */}
                          <td className="px-2 py-2.5">
                            {sub.in_tipo === "perc" ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <input type="number" min="0" max="100" step="0.01" value={row.repPercIn}
                                    onChange={e => updateRow(sub.id, "repPercIn", Number(e.target.value))}
                                    className={inputSmCls + " w-16"} />
                                  <span className="text-ps-muted text-xs font-medium">%</span>
                                </div>
                                <span className="text-[10px] text-ps-muted tabular-nums">{fmt(row.volIn * (row.repPercIn / 100))}</span>
                              </div>
                            ) : (
                              <input type="number" min="0" step="0.01" value={row.repIn}
                                onChange={e => updateRow(sub.id, "repIn", Number(e.target.value))}
                                className={inputSmCls} />
                            )}
                          </td>
                          {/* Qtd / Vol OUT */}
                          <td className="px-2 py-2.5">
                            <input
                              type="number" min="0" step={sub.out_tipo === "perc" ? "0.01" : "1"}
                              value={sub.out_tipo === "fixo" ? row.qtdOut : row.volOut}
                              onChange={e => updateRow(sub.id, sub.out_tipo === "fixo" ? "qtdOut" : "volOut", Number(e.target.value))}
                              className={inputSmCls}
                            />
                          </td>
                          {/* Fee OUT */}
                          <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-ps-green-700 whitespace-nowrap">
                            {fmt(sFeeOut)}
                          </td>
                          {/* Rep. OUT */}
                          <td className="px-2 py-2.5">
                            {sub.out_tipo === "perc" ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <input type="number" min="0" max="100" step="0.01" value={row.repPercOut}
                                    onChange={e => updateRow(sub.id, "repPercOut", Number(e.target.value))}
                                    className={inputSmCls + " w-16"} />
                                  <span className="text-ps-muted text-xs font-medium">%</span>
                                </div>
                                <span className="text-[10px] text-ps-muted tabular-nums">{fmt(row.volOut * (row.repPercOut / 100))}</span>
                              </div>
                            ) : (
                              <input type="number" min="0" step="0.01" value={row.repOut}
                                onChange={e => updateRow(sub.id, "repOut", Number(e.target.value))}
                                className={inputSmCls} />
                            )}
                          </td>
                          {/* Total Fee */}
                          <td className="px-3 py-2.5 text-right tabular-nums font-bold text-ps-ink whitespace-nowrap bg-ps-navy/3">
                            {fmt(sFeeIn + sFeeOut)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-ps-navy/5 font-bold border-t-2 border-ps-navy/15">
                      <td className="px-4 py-2.5 text-xs text-ps-ink">TOTAL</td>
                      <td />
                      <td className="px-2 py-2.5 text-right tabular-nums text-ps-green-700">{fmt(aggFeeIn)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ps-muted">{fmt(aggRepIn)}</td>
                      <td />
                      <td className="px-2 py-2.5 text-right tabular-nums text-ps-green-700">{fmt(aggFeeOut)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ps-muted">{fmt(aggRepOut)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ps-green font-bold">{fmt(aggFeeIn + aggFeeOut)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Bets inputs */}
          {isBets && client && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-ps-navy/5">
                <h3 className="font-semibold text-ps-ink text-sm">Volumes do período</h3>
                <p className="text-xs text-ps-muted mt-0.5">PIX IN: R${Number(client.in_val).toFixed(2).replace(".",",")} /tx · PIX OUT: R${Number(client.out_val).toFixed(2).replace(".",",")} /tx · Negadas: R$0,10/tx · Refund: R$5,00/tx</p>
              </div>
              <div className="p-5 space-y-4">
                {/* Recebimentos */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ps-muted mb-2">Recebimentos</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Qtd PIX IN</label>
                      <input type="number" min="0" value={bQtdPixIn} onChange={e => setBQtdPixIn(Number(e.target.value))} className={inputCls} />
                      <p className="text-xs text-ps-muted mt-1">= {fmt(feeIn)}</p>
                    </div>
                    <div>
                      <label className={labelCls}>Qtd OpenFinance (opcional)</label>
                      <input type="number" min="0" value={bQtdOpenBank} onChange={e => setBQtdOpenBank(Number(e.target.value))} className={inputCls} />
                    </div>
                  </div>
                </div>
                {/* Pagamentos Lote */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ps-muted mb-2">Pagamentos Lote</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Qtd Bank Transfer (opcional)</label>
                      <input type="number" min="0" value={bQtdBankTransfer} onChange={e => setBQtdBankTransfer(Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Qtd PIX OUT</label>
                      <input type="number" min="0" value={bQtdPixOut} onChange={e => setBQtdPixOut(Number(e.target.value))} className={inputCls} />
                      <p className="text-xs text-ps-muted mt-1">= {fmt(feeOut)}</p>
                    </div>
                  </div>
                </div>
                {/* Outras Taxas */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ps-muted mb-2">Outras Taxas</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Qtd Transações Negadas</label>
                      <input type="number" min="0" value={bQtdNegadas} onChange={e => setBQtdNegadas(Number(e.target.value))} className={inputCls} />
                      <p className="text-xs text-ps-muted mt-1">= {fmt(bFeeNegadas)}</p>
                    </div>
                    <div>
                      <label className={labelCls}>Qtd Refund/Estorno</label>
                      <input type="number" min="0" value={bQtdRefund} onChange={e => setBQtdRefund(Number(e.target.value))} className={inputCls} />
                      <p className="text-xs text-ps-muted mt-1">= {fmt(bFeeRefund)}</p>
                    </div>
                    <div>
                      <label className={labelCls}>Remessas (%)</label>
                      <input type="number" min="0" step="0.01" value={bRemessaPerc} onChange={e => setBRemessaPerc(Number(e.target.value))} className={inputCls} />
                    </div>
                  </div>
                </div>
                {/* Totais calculados */}
                <div className="bg-ps-bg-2 rounded-ps-sm px-4 py-3 grid grid-cols-3 gap-4 text-xs">
                  <div><p className="text-ps-muted">Subtotal Recebimentos</p><p className="font-bold text-ps-ink">{fmt(bSubtotalRec)}</p></div>
                  <div><p className="text-ps-muted">Subtotal Pagamentos</p><p className="font-bold text-ps-ink">{fmt(bSubtotalPag)}</p></div>
                  <div><p className="text-ps-muted">Outras Taxas</p><p className="font-bold text-ps-ink">{fmt(bTotalOutras)}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Simple transacao inputs (no subcontas) */}
          {client?.modelo === "transacao" && !hasSubcontas && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
              <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Volumes do período</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Qtd PIX IN</label>
                  <input type="number" min="0" value={qtdIn} onChange={e => setQtdIn(Number(e.target.value))} className={inputCls} />
                  {client.in_tipo !== "fixo" && (
                    <div className="mt-2"><label className={labelCls}>Volume PIX IN (R$)</label><input type="number" min="0" step="0.01" value={volumeIn} onChange={e => setVolumeIn(Number(e.target.value))} className={inputCls} /></div>
                  )}
                  <p className="text-xs text-ps-muted mt-1">Fee: {fmt(feeIn)} | Repasse: {fmt(repasseIn)}</p>
                </div>
                <div>
                  <label className={labelCls}>Qtd PIX OUT</label>
                  <input type="number" min="0" value={qtdOut} onChange={e => setQtdOut(Number(e.target.value))} className={inputCls} />
                  {client.out_tipo !== "fixo" && (
                    <div className="mt-2"><label className={labelCls}>Volume PIX OUT (R$)</label><input type="number" min="0" step="0.01" value={volumeOut} onChange={e => setVolumeOut(Number(e.target.value))} className={inputCls} /></div>
                  )}
                  <p className="text-xs text-ps-muted mt-1">Fee: {fmt(feeOut)} | Repasse: {fmt(repasseOut)}</p>
                </div>
              </div>
            </div>
          )}

          {client?.modelo === "mensalidade" && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
              <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Mensalidade</h3>
              <div>
                <label className={labelCls}>Nº de contas abertas no mês</label>
                <input type="number" min="0" value={numContas} onChange={e => setNumContas(Number(e.target.value))} className={inputCls} />
                {subcontaCounts[clientId] !== undefined && (
                  <p className="text-xs text-ps-muted mt-1">Carregado automaticamente: {subcontaCounts[clientId]} subconta(s) cadastradas</p>
                )}
              </div>
              {numContas > 0 && mens && (
                <div className="bg-ps-bg-2 rounded-ps-sm px-4 py-3 text-sm">
                  <span className="text-ps-muted">Faixa aplicada: </span>
                  <span className="font-semibold text-ps-ink">{mens.faixa}</span>
                  <span className="mx-3 text-ps-muted">→</span>
                  <span className="font-bold text-ps-green-700">{fmt(mens.val)}/mês</span>
                </div>
              )}
              {faixas.map((f: any, i: number) => (
                <div key={i} className={`flex justify-between text-xs px-3 py-2 rounded ${numContas <= f.ate && (i === 0 || numContas > faixas[i-1]?.ate) ? "bg-ps-green/10 text-ps-green-700 font-semibold" : "bg-ps-bg-2 text-ps-muted"}`}>
                  <span>Até {f.ate} contas</span><span>{fmt(f.val)}/mês</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Ajustes e datas</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelCls}>Desconto (%)</label><input type="number" min="0" max="100" step="0.01" value={descontoPerc} onChange={e => setDescontoPerc(Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>Vencimento</label><input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Data de repasse</label><input type="date" value={dataRepasse} onChange={e => setDataRepasse(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Observações</label><textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className={inputCls + " resize-none"} /></div>
          </div>
        </div>

        {/* RIGHT: preview */}
        <div className="space-y-4">
          <div className="bg-ps-navy text-white rounded-ps p-5 space-y-3 sticky top-4">
            <h3 className="font-semibold text-sm border-b border-white/10 pb-3">Resumo</h3>
            {client ? (
              <>
                <div className="text-xs text-white/60 mb-2">{client.razao}</div>
                {hasSubcontas && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-white/70">Fee IN total</span><span>{fmt(aggFeeIn)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70">Fee OUT total</span><span>{fmt(aggFeeOut)}</span></div>
                    {totalRepasse > 0 && <div className="flex justify-between text-sm"><span className="text-white/70">Repasse total</span><span className="text-red-300">−{fmt(totalRepasse)}</span></div>}
                  </>
                )}
                {isBets && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-white/70">PIX IN ({bQtdPixIn.toLocaleString("pt-BR")} tx)</span><span>{fmt(feeIn)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70">PIX OUT ({bQtdPixOut.toLocaleString("pt-BR")} tx)</span><span>{fmt(feeOut)}</span></div>
                    {bFeeNegadas > 0 && <div className="flex justify-between text-sm"><span className="text-white/70">Negadas ({bQtdNegadas.toLocaleString("pt-BR")})</span><span>{fmt(bFeeNegadas)}</span></div>}
                    {bFeeRefund > 0 && <div className="flex justify-between text-sm"><span className="text-white/70">Refund ({bQtdRefund})</span><span>{fmt(bFeeRefund)}</span></div>}
                  </>
                )}
                {client.modelo === "transacao" && !hasSubcontas && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-white/70">Fee IN ({qtdIn} tx)</span><span>{fmt(feeIn)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70">Fee OUT ({qtdOut} tx)</span><span>{fmt(feeOut)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70">Repasse IN</span><span className="text-red-300">−{fmt(repasseIn)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70">Repasse OUT</span><span className="text-red-300">−{fmt(repasseOut)}</span></div>
                  </>
                )}
                {client.modelo === "mensalidade" && mens && (
                  <div className="flex justify-between text-sm"><span className="text-white/70">Mensalidade ({mens.faixa})</span><span>{fmt(mens.val)}</span></div>
                )}
                {descontoPerc > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-white/70">Desconto ({descontoPerc}%)</span><span className="text-amber-300">−{fmt(descontoVal)}</span></div>
                )}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between text-sm font-semibold"><span>Nossa receita (fee)</span><span className="text-ps-green">{fmt(total)}</span></div>
                  {totalRepasse > 0 && <div className="flex justify-between text-sm mt-1"><span className="text-white/60">Repasse total</span><span className="text-red-300">{fmt(totalRepasse)}</span></div>}
                </div>
              </>
            ) : (
              <p className="text-xs text-white/50">Selecione um merchant para ver o resumo</p>
            )}
            <button type="submit" disabled={isPending || !client} className="w-full mt-2 bg-ps-green text-ps-navy font-bold text-sm py-2.5 rounded-ps-sm hover:bg-ps-green/90 disabled:opacity-50 transition-colors">
              {isPending ? "Emitindo..." : "Emitir demonstrativo"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
