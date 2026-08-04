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

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcFee(tipo: string, val: number, qtd: number, volume: number): number {
  if (tipo === "fixo") return qtd * val;
  if (tipo === "perc") return volume * (val / 100);
  if (tipo === "fixo_perc") return qtd * val;
  return 0;
}

function calcMensalidade(faixas: any[], numContas: number): { faixa: string; val: number } {
  if (!faixas || !faixas.length) return { faixa: "—", val: 0 };
  const sorted = [...faixas].sort((a, b) => a.ate - b.ate);
  for (const f of sorted) {
    if (numContas <= f.ate) return { faixa: `Até ${f.ate} contas`, val: f.val };
  }
  return { faixa: `Acima de ${sorted[sorted.length - 1]?.ate} contas`, val: sorted[sorted.length - 1]?.val ?? 0 };
}

export function EmitirFaturaForm({ clients, companies, subcontaCounts }: { clients: Client[]; companies: Company[]; subcontaCounts: Record<string, number> }) {
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const client = clients.find(c => c.id === clientId);
  const faixas = client?.faixas_mens ? (Array.isArray(client.faixas_mens) ? client.faixas_mens : []) : [];

  const feeIn = client ? calcFee(client.in_tipo, client.in_val, qtdIn, volumeIn) : 0;
  const feeOut = client ? calcFee(client.out_tipo, client.out_val, qtdOut, volumeOut) : 0;
  const repasseIn = client ? (client.in_tipo === "perc" ? volumeIn * (client.rep_in / 100) : qtdIn * client.rep_in) : 0;
  const repasseOut = client ? (client.out_tipo === "perc" ? volumeOut * (client.rep_out / 100) : qtdOut * client.rep_out) : 0;

  const mens = client?.modelo === "mensalidade" ? calcMensalidade(faixas, numContas) : null;

  const totalFaturado = client?.modelo === "mensalidade" ? (mens?.val ?? 0) : feeIn + feeOut;
  const descontoVal = totalFaturado * (descontoPerc / 100);
  const total = totalFaturado - descontoVal;
  const totalRepasse = client?.modelo === "mensalidade" ? 0 : repasseIn + repasseOut;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !companyId || !competencia) { setError("Selecione o merchant, empresa e competência."); return; }
    if (total <= 0 && totalRepasse <= 0) { setError("Valor calculado zerado. Verifique as quantidades."); return; }
    setError(null);
    startTransition(async () => {
      const res = await emitirFatura({
        client_id: clientId, company_id: companyId, competencia, inicio: inicio || undefined, fim: fim || undefined,
        modelo: client?.modelo ?? "transacao",
        qtd_in: qtdIn, qtd_out: qtdOut, fee_in: feeIn, fee_out: feeOut,
        repasse_in: repasseIn, repasse_out: repasseOut,
        num_contas: numContas, faixa_mens: mens?.faixa,
        total_faturado: totalFaturado, desconto_perc: descontoPerc, desconto_val: descontoVal,
        total_repasse: totalRepasse, total,
        obs: obs || undefined, data_vencimento: dataVencimento || undefined, data_repasse: dataRepasse || undefined,
      });
      if (res.error) { setError(res.error); return; }
      setSuccess("Demonstrativo emitido! Receita e pagamento criados automaticamente.");
      setTimeout(() => router.push(`/faturamento/${res.id}`), 1200);
    });
  }

  const inputCls = "w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-ps-green";
  const labelCls = "block text-xs font-semibold text-ps-ink mb-1";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: form */}
        <div className="lg:col-span-2 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-ps-sm">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-ps-sm">{success}</p>}

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Dados da fatura</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Merchant *</label>
                <select value={clientId} onChange={e => {
                  const id = e.target.value;
                  setClientId(id);
                  const c = clients.find(x => x.id === id);
                  if (c?.modelo === "mensalidade") setNumContas(subcontaCounts[id] ?? 0);
                }} className={inputCls} required>
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
                <div><label className={labelCls}>Início</label><input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Fim</label><input type="date" value={fim} onChange={e => setFim(e.target.value)} className={inputCls} /></div>
              </div>
            </div>
          </div>

          {client?.modelo === "transacao" && (
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

        {/* RIGHT: preview + submit */}
        <div className="space-y-4">
          <div className="bg-ps-navy text-white rounded-ps p-5 space-y-3 sticky top-4">
            <h3 className="font-semibold text-sm border-b border-white/10 pb-3">Resumo</h3>
            {client ? (
              <>
                <div className="text-xs text-white/60 mb-2">{client.razao}</div>
                {client.modelo === "transacao" && (
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
                  <div className="flex justify-between text-sm mt-1"><span className="text-white/60">Repasse total</span><span className="text-red-300">{fmt(totalRepasse)}</span></div>
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
