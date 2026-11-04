"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateBillingClient, updateSubconta } from "../actions";
import { modeloLabel, type LinhaTarifa } from "./dados";

const dataBR = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const th = "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";
const td = "px-3 py-2 align-top";
const inp = "rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-xs bg-white w-20 tabular-nums";
const inpTxt = "rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-xs bg-white";

type Grupo = { chave: string; introducer: string; introducerCnpj: string; linhas: LinhaTarifa[] };

function agrupa(linhas: LinhaTarifa[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const l of linhas) {
    const chave = `${l.introducer}|${l.introducerCnpj}`;
    if (!mapa.has(chave)) mapa.set(chave, { chave, introducer: l.introducer, introducerCnpj: l.introducerCnpj, linhas: [] });
    mapa.get(chave)!.linhas.push(l);
  }
  return Array.from(mapa.values());
}

function TipoSelect({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={inpTxt}>
      <option value="fixo">R$</option>
      <option value="perc">%</option>
    </select>
  );
}

function LinhaEmEdicao({ l, onFim }: { l: LinhaTarifa; onFim: () => void }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [v, setV] = useState({
    inTipo: l.raw.inTipo, inVal: l.raw.inVal, repIn: l.raw.repIn,
    outTipo: l.raw.outTipo, outVal: l.raw.outVal, repOut: l.raw.repOut,
    pix: Number(l.cfg?.pix ?? 0), ted: Number(l.cfg?.ted ?? 0), repassePerc: Number(l.cfg?.repasse_perc ?? 0),
    percFee: Number(l.cfg?.perc_repasse ?? 0),
  });
  const set = (k: keyof typeof v, val: any) => setV((p) => ({ ...p, [k]: val }));
  const n = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  function salvar() {
    start(async () => {
      let res: { error: string | null };
      if (l.edit === "subconta" && l.subId) {
        res = await updateSubconta(l.subId, {
          in_tipo: v.inTipo, in_val: v.inVal, rep_in: v.repIn, out_tipo: v.outTipo, out_val: v.outVal, rep_out: v.repOut,
        });
      } else if (l.edit === "cliente") {
        res = await updateBillingClient(l.clienteId, {
          in_tipo: v.inTipo, in_val: v.inVal, rep_in: v.repIn, out_tipo: v.outTipo, out_val: v.outVal, rep_out: v.repOut,
        });
      } else if (l.edit === "combo") {
        res = await updateBillingClient(l.clienteId, { faixas_mens: { ...l.cfg, pix: v.pix, ted: v.ted, repasse_perc: v.repassePerc } });
      } else {
        res = await updateBillingClient(l.clienteId, { faixas_mens: { ...l.cfg, perc_repasse: v.percFee } });
      }
      if (res.error) { setErro(res.error); return; }
      setErro(null);
      onFim();
      router.refresh();
    });
  }

  const celulas =
    l.edit === "combo" ? (
      <>
        <td className={td}>PIX R$ <input type="number" step="any" min="0" value={v.pix} onChange={(e) => set("pix", n(e))} className={inp} /></td>
        <td className={td}><input type="number" step="any" min="0" max="100" value={v.repassePerc} onChange={(e) => set("repassePerc", n(e))} className={inp} /> % da tarifa</td>
        <td className={td}>TED R$ <input type="number" step="any" min="0" value={v.ted} onChange={(e) => set("ted", n(e))} className={inp} /></td>
        <td className={`${td} text-ps-muted`}>mesmo %</td>
      </>
    ) : l.edit === "fee_perc" ? (
      <>
        <td className={`${td} text-ps-muted`}>Fee informado</td>
        <td className={td}><input type="number" step="any" min="0" max="100" value={v.percFee} onChange={(e) => set("percFee", n(e))} className={inp} /> % do fee</td>
        <td className={`${td} text-ps-muted`}>Fee informado</td>
        <td className={`${td} text-ps-muted`}>mesmo %</td>
      </>
    ) : (
      <>
        <td className={td}><div className="flex gap-1"><TipoSelect valor={v.inTipo} onChange={(x) => set("inTipo", x)} /><input type="number" step="any" min="0" value={v.inVal} onChange={(e) => set("inVal", n(e))} className={inp} /></div></td>
        <td className={td}><input type="number" step="any" min="0" value={v.repIn} onChange={(e) => set("repIn", n(e))} className={inp} /></td>
        <td className={td}><div className="flex gap-1"><TipoSelect valor={v.outTipo} onChange={(x) => set("outTipo", x)} /><input type="number" step="any" min="0" value={v.outVal} onChange={(e) => set("outVal", n(e))} className={inp} /></div></td>
        <td className={td}><input type="number" step="any" min="0" value={v.repOut} onChange={(e) => set("repOut", n(e))} className={inp} /></td>
      </>
    );

  return (
    <tr className="border-t border-ps-navy/5 bg-ps-navy-50/40">
      <td className={td} />
      <td className={td}>
        <div className="text-ps-ink">{l.empresa}</div>
        {l.numConta && <div className="text-[10px] text-ps-muted">Conta {l.numConta}</div>}
        {(l.edit === "combo" || l.edit === "fee_perc") && (
          <div className="text-[10px] text-amber-700 mt-1 max-w-[200px]">Vale para todas as empresas deste cliente.</div>
        )}
        {erro && <div className="text-[11px] text-red-600 mt-1 max-w-[220px]">{erro}</div>}
      </td>
      <td className={`${td} text-ps-muted whitespace-nowrap`}>{l.empresaCnpj || "—"}</td>
      {celulas}
      <td className={td} colSpan={3}>
        <div className="flex gap-2">
          <button type="button" onClick={salvar} disabled={pend} className="bg-ps-navy text-white text-xs font-medium rounded-full px-3 py-1 disabled:opacity-60">{pend ? "Salvando..." : "Salvar"}</button>
          <button type="button" onClick={onFim} disabled={pend} className="text-xs text-ps-muted underline">Cancelar</button>
        </div>
      </td>
    </tr>
  );
}

function EditorIntroducer({ g, onFim }: { g: Grupo; onFim: () => void }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const primeira = g.linhas[0];
  const [nome, setNome] = useState(primeira.introducerNome || g.introducer);
  const [cnpj, setCnpj] = useState(primeira.introducerCnpjRaw || g.introducerCnpj);
  const [freq, setFreq] = useState(primeira.frequenciaRaw);

  function salvar() {
    start(async () => {
      const ids = Array.from(new Set(g.linhas.map((l) => l.clienteId)));
      for (const id of ids) {
        const res = await updateBillingClient(id, { introducer_nome: nome, introducer_cnpj: cnpj, frequencia: freq });
        if (res.error) { setErro(res.error); return; }
      }
      setErro(null);
      onFim();
      router.refresh();
    });
  }

  return (
    <tr className="bg-ps-navy-50/40 border-t border-ps-navy/5">
      <td colSpan={10} className="px-3 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-[10px] font-semibold text-ps-muted mb-1">Introducer</label><input value={nome} onChange={(e) => setNome(e.target.value)} className={`${inpTxt} w-64`} /></div>
          <div><label className="block text-[10px] font-semibold text-ps-muted mb-1">CNPJ do introducer</label><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={`${inpTxt} w-44`} /></div>
          <div><label className="block text-[10px] font-semibold text-ps-muted mb-1">Tipo de faturamento</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)} className={inpTxt}>
              <option value="">Não definido</option><option value="mensal">Mensal</option><option value="semanal">Semanal</option>
            </select></div>
          <button type="button" onClick={salvar} disabled={pend} className="bg-ps-navy text-white text-xs font-medium rounded-full px-3 py-1.5 disabled:opacity-60">{pend ? "Salvando..." : "Salvar"}</button>
          <button type="button" onClick={onFim} disabled={pend} className="text-xs text-ps-muted underline">Cancelar</button>
          {erro && <span className="text-[11px] text-red-600">{erro}</span>}
        </div>
        <p className="text-[10px] text-ps-muted mt-2">Vale para todas as empresas deste introducer.</p>
      </td>
    </tr>
  );
}

export function TabelaTarifas({ linhas }: { linhas: LinhaTarifa[] }) {
  const grupos = agrupa(linhas);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [editandoLinha, setEditandoLinha] = useState<string | null>(null);
  const [editandoGrupo, setEditandoGrupo] = useState<string | null>(null);

  const alterna = (chave: string) =>
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) novo.delete(chave); else novo.add(chave);
      return novo;
    });
  const todosAbertos = grupos.length > 0 && abertos.size === grupos.length;

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button type="button" onClick={() => setAbertos(todosAbertos ? new Set() : new Set(grupos.map((g) => g.chave)))} className="text-xs text-ps-navy underline">
          {todosAbertos ? "Recolher todos" : "Abrir todos"}
        </button>
      </div>
      <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-ps-bg-2 sticky top-0 z-10">
            <tr>
              <th className={th}>Introducer</th>
              <th className={th}>Empresa</th>
              <th className={th}>CNPJ</th>
              <th className={th}>Tarifa IN</th>
              <th className={th}>Repasse IN</th>
              <th className={th}>Tarifa OUT</th>
              <th className={th}>Repasse OUT</th>
              <th className={th}>Tipo de faturamento</th>
              <th className={th}>Atualizado em</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-ps-muted">Nenhuma empresa encontrada.</td></tr>
            )}
            {grupos.map((g) => {
              const aberto = abertos.has(g.chave);
              const modelos = Array.from(new Set(g.linhas.map((l) => modeloLabel(l.modelo)))).join(", ");
              const freqs = Array.from(new Set(g.linhas.map((l) => l.frequencia).filter(Boolean)));
              const ultima = g.linhas.map((l) => l.atualizadoEm).filter(Boolean).sort().pop() ?? null;
              return (
                <GrupoLinhas key={g.chave}>
                  <tr className="border-t border-ps-navy/15 bg-ps-bg-2/50 cursor-pointer hover:bg-ps-bg-2" onClick={() => alterna(g.chave)}>
                    <td className="px-3 py-2.5 font-medium text-ps-ink whitespace-nowrap" colSpan={2}>
                      <span className="inline-block w-4 text-ps-muted">{aberto ? "▾" : "▸"}</span>
                      {g.introducer}
                      <span className="ml-2 text-[10px] text-ps-muted font-normal">{g.linhas.length} empresa(s) · {modelos}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ps-muted whitespace-nowrap">{g.introducerCnpj || "—"}</td>
                    <td className="px-3 py-2.5 text-ps-muted" colSpan={4}>{aberto ? "" : "Clique para ver as empresas e as tarifas"}</td>
                    <td className="px-3 py-2.5 capitalize">{freqs.length ? freqs.join(" / ") : "—"}</td>
                    <td className="px-3 py-2.5 text-ps-muted whitespace-nowrap">{dataBR(ultima)}</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="text-xs text-ps-navy underline" onClick={() => { setEditandoGrupo(editandoGrupo === g.chave ? null : g.chave); if (!aberto) alterna(g.chave); }}>
                        Editar introducer
                      </button>
                    </td>
                  </tr>
                  {editandoGrupo === g.chave && <EditorIntroducer g={g} onFim={() => setEditandoGrupo(null)} />}
                  {aberto && g.linhas.map((l, i) => {
                    const id = `${l.clienteId}-${l.subId ?? "c"}-${i}`;
                    if (editandoLinha === id) return <LinhaEmEdicao key={id} l={l} onFim={() => setEditandoLinha(null)} />;
                    return (
                      <tr key={id} className="border-t border-ps-navy/5">
                        <td className={td} />
                        <td className={td}>
                          <div className="text-ps-ink">{l.empresa}</div>
                          {l.numConta && <div className="text-[10px] text-ps-muted">Conta {l.numConta}</div>}
                          {l.outras && <div className="text-[10px] text-ps-muted mt-0.5 max-w-xs">{l.outras}</div>}
                        </td>
                        <td className={`${td} text-ps-muted whitespace-nowrap`}>{l.empresaCnpj || "—"}</td>
                        <td className={`${td} tabular-nums`}>{l.tarIn}</td>
                        <td className={`${td} tabular-nums`}>
                          {l.repIn}
                          {l.pctRepasse != null && l.edit !== "combo" && l.edit !== "fee_perc" && (
                            <div className="text-[10px] text-ps-muted">{l.pctRepasse.toLocaleString("pt-BR")}% da tarifa</div>
                          )}
                        </td>
                        <td className={`${td} tabular-nums`}>{l.tarOut}</td>
                        <td className={`${td} tabular-nums`}>{l.repOut}</td>
                        <td className={`${td} capitalize ${l.frequenciaInferida ? "text-ps-muted italic" : ""}`}>
                          {l.frequencia || "—"}
                          {l.frequenciaInferida && <div className="text-[10px] not-italic normal-case">inferido pela última fatura</div>}
                        </td>
                        <td className={`${td} text-ps-muted whitespace-nowrap`}>{dataBR(l.atualizadoEm)}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          {l.edit === "nenhum" ? (
                            <Link href="/faturamento/clientes" className="text-xs text-ps-navy underline">Editar no cadastro</Link>
                          ) : (
                            <button type="button" className="text-xs text-ps-navy underline" onClick={() => setEditandoLinha(id)}>Editar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </GrupoLinhas>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// várias linhas por grupo dentro do mesmo tbody
function GrupoLinhas({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
