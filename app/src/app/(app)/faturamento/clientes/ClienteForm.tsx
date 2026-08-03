"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBillingClient } from "../actions";

type Faixa = { ate: number; val: number };

export function ClienteForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modelo, setModelo] = useState("transacao");
  const [inTipo, setInTipo] = useState("fixo");
  const [outTipo, setOutTipo] = useState("fixo");
  const [faixas, setFaixas] = useState<Faixa[]>([
    { ate: 50, val: 30000 },
    { ate: 100, val: 50000 },
    { ate: 400, val: 85000 },
  ]);
  const [error, setError] = useState<string | null>(null);

  function addFaixa() { setFaixas([...faixas, { ate: 0, val: 0 }]); }
  function removeFaixa(i: number) { setFaixas(faixas.filter((_, idx) => idx !== i)); }
  function updateFaixa(i: number, field: "ate" | "val", v: number) {
    setFaixas(faixas.map((f, idx) => idx === i ? { ...f, [field]: v } : f));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k) as string;
    startTransition(async () => {
      const res = await createBillingClient({
        razao: get("razao"), cnpj: get("cnpj"), email_cobranca: get("email_cobranca"),
        chave_pix: get("chave_pix"), agencia: get("agencia"), conta: get("conta"),
        num_conta: get("num_conta"), contrato: get("contrato") === "sim",
        modelo, in_tipo: inTipo, in_val: parseFloat(get("in_val") || "0"),
        out_tipo: outTipo, out_val: parseFloat(get("out_val") || "0"),
        rep_in: parseFloat(get("rep_in") || "0"), rep_out: parseFloat(get("rep_out") || "0"),
        faixas_mens: modelo === "mensalidade" ? faixas : undefined,
      });
      if (res.error) { setError(res.error); return; }
      setError(null);
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setModelo("transacao"); setInTipo("fixo"); setOutTipo("fixo");
    });
  }

  const inputCls = "w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-ps-green";
  const labelCls = "block text-xs font-semibold text-ps-ink mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
      <div><label className={labelCls}>Razão Social *</label><input name="razao" required className={inputCls} /></div>
      <div><label className={labelCls}>CNPJ</label><input name="cnpj" className={inputCls} /></div>
      <div><label className={labelCls}>Email de cobrança</label><input name="email_cobranca" type="email" className={inputCls} /></div>
      <div><label className={labelCls}>Chave PIX</label><input name="chave_pix" className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Agência</label><input name="agencia" className={inputCls} /></div>
        <div><label className={labelCls}>Conta</label><input name="conta" className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Nº Conta</label><input name="num_conta" className={inputCls} /></div>
        <div>
          <label className={labelCls}>Contrato</label>
          <select name="contrato" className={inputCls}>
            <option value="sim">Sim</option><option value="nao">Não</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Modelo de faturamento</label>
        <select value={modelo} onChange={e => setModelo(e.target.value)} className={inputCls}>
          <option value="transacao">Por transação (PIX IN/OUT)</option>
          <option value="mensalidade">Mensalidade por volume de contas</option>
        </select>
      </div>

      {modelo === "transacao" && (
        <div className="space-y-3 bg-ps-bg-2 rounded-ps-sm p-3">
          <div>
            <label className={labelCls}>Tipo tarifa PIX IN</label>
            <select value={inTipo} onChange={e => setInTipo(e.target.value)} className={inputCls}>
              <option value="fixo">Fixo (R$/transação)</option>
              <option value="perc">Percentual (% volume)</option>
              <option value="fixo_perc">Fixo + Percentual</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Fee IN</label><input name="in_val" type="number" step="0.0001" min="0" defaultValue="0" className={inputCls} /></div>
            <div><label className={labelCls}>Repasse IN</label><input name="rep_in" type="number" step="0.0001" min="0" defaultValue="0" className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>Tipo tarifa PIX OUT</label>
            <select value={outTipo} onChange={e => setOutTipo(e.target.value)} className={inputCls}>
              <option value="fixo">Fixo (R$/transação)</option>
              <option value="perc">Percentual (% volume)</option>
              <option value="fixo_perc">Fixo + Percentual</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Fee OUT</label><input name="out_val" type="number" step="0.0001" min="0" defaultValue="0" className={inputCls} /></div>
            <div><label className={labelCls}>Repasse OUT</label><input name="rep_out" type="number" step="0.0001" min="0" defaultValue="0" className={inputCls} /></div>
          </div>
        </div>
      )}

      {modelo === "mensalidade" && (
        <div className="bg-ps-bg-2 rounded-ps-sm p-3 space-y-2">
          <p className="text-xs font-semibold text-ps-ink mb-2">Faixas de mensalidade</p>
          {faixas.map((f, i) => (
            <div key={i} className="grid grid-cols-5 gap-1 items-center">
              <div className="col-span-2"><input type="number" value={f.ate} onChange={e => updateFaixa(i, "ate", Number(e.target.value))} placeholder="Até X contas" className={inputCls} /></div>
              <div className="col-span-2"><input type="number" value={f.val} onChange={e => updateFaixa(i, "val", Number(e.target.value))} placeholder="R$/mês" className={inputCls} /></div>
              <button type="button" onClick={() => removeFaixa(i)} className="text-red-500 text-sm font-bold">✕</button>
            </div>
          ))}
          <button type="button" onClick={addFaixa} className="text-xs text-ps-navy underline">+ Adicionar faixa</button>
          <input name="in_val" type="hidden" defaultValue="0" />
          <input name="out_val" type="hidden" defaultValue="0" />
          <input name="rep_in" type="hidden" defaultValue="0" />
          <input name="rep_out" type="hidden" defaultValue="0" />
        </div>
      )}

      <button type="submit" disabled={isPending} className="w-full bg-ps-navy text-white text-sm font-semibold rounded-ps-sm py-2 hover:bg-ps-navy-700 disabled:opacity-60 transition-colors">
        {isPending ? "Salvando..." : "Adicionar merchant"}
      </button>
    </form>
  );
}
