"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarNotaDebito } from "../../actions";

type Item = { desc: string; comp: string; val: number };

export function NovaNotaDebitoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo] = useState("reembolso");
  const [itens, setItens] = useState<Item[]>([{ desc: "", comp: "", val: 0 }]);
  const [error, setError] = useState<string | null>(null);

  function addItem() { setItens([...itens, { desc: "", comp: "", val: 0 }]); }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof Item, v: string | number) {
    setItens(itens.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  }

  const total = itens.reduce((s, it) => s + Number(it.val), 0);

  function fmt(n: number) {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k) as string;

    if (itens.length === 0 || itens.every(it => !it.desc)) {
      setError("Adicione pelo menos um item."); return;
    }

    startTransition(async () => {
      const res = await criarNotaDebito({
        pagador: get("pagador"), cnpj_pagador: get("cnpj_pagador"),
        end_pagador: get("end_pagador"),
        recebedor: get("recebedor"), cnpj_recebedor: get("cnpj_recebedor"),
        end_recebedor: get("end_recebedor"),
        debitado: get("debitado"), cnpj_debitado: get("cnpj_debitado"),
        tipo, ref: get("ref"), competencia: get("competencia"),
        vencimento: get("vencimento") || undefined,
        itens: itens.filter(it => it.desc),
        total, obs: get("obs"),
      });
      if (res.error) { setError(res.error); return; }
      router.push(`/faturamento/notas-debito/${res.id}`);
    });
  }

  const inputCls = "w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-ps-green";
  const labelCls = "block text-xs font-semibold text-ps-ink mb-1";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-ps-sm">{error}</p>}

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Dados gerais</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                  <option value="reembolso">Reembolso</option>
                  <option value="rateio">Rateio</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Competência</label>
                <input name="competencia" type="month" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Vencimento</label>
                <input name="vencimento" type="date" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Referência / descrição curta</label>
              <input name="ref" className={inputCls} />
            </div>
          </div>

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Pagador (quem emite)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Nome *</label><input name="pagador" required className={inputCls} /></div>
              <div><label className={labelCls}>CNPJ</label><input name="cnpj_pagador" className={inputCls} /></div>
              <div className="col-span-2"><label className={labelCls}>Endereço</label><input name="end_pagador" className={inputCls} /></div>
            </div>
          </div>

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Recebedor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Nome *</label><input name="recebedor" required className={inputCls} /></div>
              <div><label className={labelCls}>CNPJ</label><input name="cnpj_recebedor" className={inputCls} /></div>
              <div className="col-span-2"><label className={labelCls}>Endereço</label><input name="end_recebedor" className={inputCls} /></div>
            </div>
          </div>

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Debitado (empresa que arca)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Nome</label><input name="debitado" className={inputCls} /></div>
              <div><label className={labelCls}>CNPJ</label><input name="cnpj_debitado" className={inputCls} /></div>
            </div>
          </div>

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Itens</h3>
            {itens.map((it, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 items-start">
                <div className="col-span-3">
                  {i === 0 && <label className={labelCls}>Descrição</label>}
                  <input value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)} placeholder="Descrição do item" className={inputCls} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className={labelCls}>Competência</label>}
                  <input type="month" value={it.comp} onChange={e => updateItem(i, "comp", e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className={labelCls}>Valor (R$)</label>}
                  <input type="number" step="0.01" min="0" value={it.val} onChange={e => updateItem(i, "val", Number(e.target.value))} className={inputCls} />
                </div>
                <div className={i === 0 ? "pt-5" : ""}>
                  <button type="button" onClick={() => removeItem(i)} className="text-red-500 text-sm font-bold w-full text-center">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-xs text-ps-navy underline">+ Adicionar item</button>
          </div>

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
            <label className={labelCls}>Observações</label>
            <textarea name="obs" rows={2} className={inputCls + " resize-none"} />
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-ps-navy text-white rounded-ps p-5 space-y-3 sticky top-4">
            <h3 className="font-semibold text-sm border-b border-white/10 pb-3">Resumo</h3>
            {itens.filter(it => it.desc).map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white/70 truncate mr-2">{it.desc}</span>
                <span className="tabular-nums shrink-0">{fmt(Number(it.val))}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-ps-green tabular-nums text-lg">{fmt(total)}</span>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 bg-ps-green text-ps-navy font-bold text-sm py-2.5 rounded-ps-sm hover:bg-ps-green/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Emitindo..." : "Emitir nota de débito"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
