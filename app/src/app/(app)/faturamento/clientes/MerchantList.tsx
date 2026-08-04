"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBillingClient,
  updateBillingClient,
  deleteBillingClient,
  createSubconta,
  updateSubconta,
  deleteSubconta,
} from "../actions";

type Faixa = { ate: number; val: number };
type Subconta = {
  id: string; client_id: string; razao: string; cnpj?: string; num_conta?: string;
  in_tipo?: string; in_val?: number; rep_in?: number;
  out_tipo?: string; out_val?: number; rep_out?: number; status?: string;
};
type Client = {
  id: string; razao: string; cnpj?: string; email_cobranca?: string; chave_pix?: string;
  agencia?: string; conta?: string; num_conta?: string; contrato?: boolean;
  modelo: string; in_tipo?: string; in_val?: number; out_tipo?: string; out_val?: number;
  rep_in?: number; rep_out?: number; faixas_mens?: Faixa[]; status?: string;
  billing_subcontas?: Subconta[];
};

const MODELO_LABEL: Record<string, string> = {
  transacao: "Transação", transacao_intro: "Transação Intro",
  mensalidade: "Mensalidade", mensalidade_intro: "Mensalidade Intro",
  bet: "Bets", bets: "Bets",
};
const TIPO_LABEL: Record<string, string> = { fixo: "R$/tx", perc: "%vol", fixo_perc: "R$+%" };

const inputCls = "w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-ps-green";
const labelCls = "block text-xs font-semibold text-ps-ink mb-1";

// ── Formulário de merchant (criar / editar) ───────────────────────────────────

function MerchantForm({ initial, onSaved, onCancel }: {
  initial?: Client;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [modelo, setModelo] = useState(initial?.modelo ?? "transacao");
  const [inTipo, setInTipo] = useState(initial?.in_tipo ?? "fixo");
  const [outTipo, setOutTipo] = useState(initial?.out_tipo ?? "fixo");
  const [faixas, setFaixas] = useState<Faixa[]>(
    initial?.faixas_mens ?? [{ ate: 50, val: 30000 }, { ate: 100, val: 50000 }]
  );
  const [error, setError] = useState<string | null>(null);

  const isBets = ["bet", "bets"].includes(modelo);
  const isMens = ["mensalidade", "mensalidade_intro"].includes(modelo);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => fd.get(k) as string;
    const payload = {
      razao: g("razao"), cnpj: g("cnpj"), email_cobranca: g("email_cobranca"),
      chave_pix: g("chave_pix"), agencia: g("agencia"), conta: g("conta"),
      num_conta: g("num_conta"), contrato: g("contrato") === "sim",
      modelo, in_tipo: inTipo, in_val: parseFloat(g("in_val") || "0"),
      out_tipo: outTipo, out_val: parseFloat(g("out_val") || "0"),
      rep_in: parseFloat(g("rep_in") || "0"), rep_out: parseFloat(g("rep_out") || "0"),
      faixas_mens: isMens ? faixas : undefined,
      ...(initial ? { status: g("status") } : {}),
    };
    startTransition(async () => {
      const res = initial
        ? await updateBillingClient(initial.id, payload)
        : await createBillingClient(payload);
      if (res.error) { setError(res.error); return; }
      setError(null);
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      <div><label className={labelCls}>Razão Social *</label>
        <input name="razao" required defaultValue={initial?.razao} className={inputCls} /></div>
      <div><label className={labelCls}>CNPJ</label>
        <input name="cnpj" defaultValue={initial?.cnpj} className={inputCls} /></div>
      <div><label className={labelCls}>Email de cobrança</label>
        <input name="email_cobranca" type="email" defaultValue={initial?.email_cobranca} className={inputCls} /></div>
      <div><label className={labelCls}>Chave PIX</label>
        <input name="chave_pix" defaultValue={initial?.chave_pix} className={inputCls} /></div>

      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Agência</label>
          <input name="agencia" defaultValue={initial?.agencia} className={inputCls} /></div>
        <div><label className={labelCls}>Nº Conta</label>
          <input name="num_conta" defaultValue={initial?.num_conta} className={inputCls} /></div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Contrato</label>
          <select name="contrato" defaultValue={initial?.contrato ? "sim" : "nao"} className={inputCls}>
            <option value="sim">Sim</option><option value="nao">Não</option>
          </select>
        </div>
        {initial && (
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" defaultValue={initial.status ?? "ativo"} className={inputCls}>
              <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Modelo de faturamento</label>
        <select value={modelo} onChange={e => setModelo(e.target.value)} className={inputCls}>
          <option value="transacao">Transação (PIX IN/OUT)</option>
          <option value="transacao_intro">Transação Introducer</option>
          <option value="mensalidade">Mensalidade</option>
          <option value="mensalidade_intro">Mensalidade Introducer</option>
          <option value="bet">Bets</option>
        </select>
      </div>

      {/* Campos de tarifa — transação e bets */}
      {!isMens && (
        <div className="space-y-3 bg-ps-bg-2 rounded-ps-sm p-3">
          {!isBets && (
            <>
              <div>
                <label className={labelCls}>Tipo tarifa PIX IN</label>
                <select value={inTipo} onChange={e => setInTipo(e.target.value)} className={inputCls}>
                  <option value="fixo">Fixo (R$/tx)</option>
                  <option value="perc">Percentual (%vol)</option>
                  <option value="fixo_perc">Fixo + Percentual</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>Fee IN</label>
                  <input name="in_val" type="number" step="0.0001" min="0" defaultValue={initial?.in_val ?? 0} className={inputCls} /></div>
                <div><label className={labelCls}>Repasse IN</label>
                  <input name="rep_in" type="number" step="0.0001" min="0" defaultValue={initial?.rep_in ?? 0} className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>Tipo tarifa PIX OUT</label>
                <select value={outTipo} onChange={e => setOutTipo(e.target.value)} className={inputCls}>
                  <option value="fixo">Fixo (R$/tx)</option>
                  <option value="perc">Percentual (%vol)</option>
                  <option value="fixo_perc">Fixo + Percentual</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>Fee OUT</label>
                  <input name="out_val" type="number" step="0.0001" min="0" defaultValue={initial?.out_val ?? 0} className={inputCls} /></div>
                <div><label className={labelCls}>Repasse OUT</label>
                  <input name="rep_out" type="number" step="0.0001" min="0" defaultValue={initial?.rep_out ?? 0} className={inputCls} /></div>
              </div>
            </>
          )}
          {isBets && (
            <>
              <p className="text-xs text-ps-muted">Tarifas de bets são configuradas por tipo de operação nas subcontas.</p>
              <input name="in_val" type="hidden" defaultValue="0" />
              <input name="out_val" type="hidden" defaultValue="0" />
              <input name="rep_in" type="hidden" defaultValue="0" />
              <input name="rep_out" type="hidden" defaultValue="0" />
            </>
          )}
        </div>
      )}

      {/* Faixas mensalidade */}
      {isMens && (
        <div className="bg-ps-bg-2 rounded-ps-sm p-3 space-y-2">
          <p className="text-xs font-semibold text-ps-ink mb-2">Faixas de mensalidade (até X contas → R$/mês)</p>
          {faixas.map((f, i) => (
            <div key={i} className="grid grid-cols-5 gap-1 items-center">
              <div className="col-span-2">
                <input type="number" value={f.ate} onChange={e => setFaixas(faixas.map((x, idx) => idx === i ? { ...x, ate: Number(e.target.value) } : x))} placeholder="Até X contas" className={inputCls} />
              </div>
              <div className="col-span-2">
                <input type="number" value={f.val} onChange={e => setFaixas(faixas.map((x, idx) => idx === i ? { ...x, val: Number(e.target.value) } : x))} placeholder="R$/mês" className={inputCls} />
              </div>
              <button type="button" onClick={() => setFaixas(faixas.filter((_, idx) => idx !== i))} className="text-red-500 text-sm font-bold">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setFaixas([...faixas, { ate: 0, val: 0 }])} className="text-xs text-ps-navy underline">+ Adicionar faixa</button>
          <input name="in_val" type="hidden" defaultValue="0" />
          <input name="out_val" type="hidden" defaultValue="0" />
          <input name="rep_in" type="hidden" defaultValue="0" />
          <input name="rep_out" type="hidden" defaultValue="0" />
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="flex-1 bg-ps-navy text-white text-sm font-semibold rounded-ps-sm py-2 hover:bg-ps-navy-700 disabled:opacity-60">
          {isPending ? "Salvando..." : initial ? "Salvar alterações" : "Adicionar merchant"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 bg-white border border-ps-navy/15 text-ps-ink text-sm rounded-ps-sm">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// ── Formulário de subconta ────────────────────────────────────────────────────

function SubcontaForm({ clientId, initial, onSaved, onCancel }: {
  clientId: string; initial?: Subconta;
  onSaved: () => void; onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [inTipo, setInTipo] = useState(initial?.in_tipo ?? "fixo");
  const [outTipo, setOutTipo] = useState(initial?.out_tipo ?? "fixo");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => fd.get(k) as string;
    const payload = {
      client_id: clientId,
      razao: g("razao"), cnpj: g("cnpj"), num_conta: g("num_conta"),
      in_tipo: inTipo, in_val: parseFloat(g("in_val") || "0"), rep_in: parseFloat(g("rep_in") || "0"),
      out_tipo: outTipo, out_val: parseFloat(g("out_val") || "0"), rep_out: parseFloat(g("rep_out") || "0"),
      ...(initial ? { status: g("status") } : { status: "ativa" }),
    };
    startTransition(async () => {
      const res = initial
        ? await updateSubconta(initial.id, payload)
        : await createSubconta(payload);
      if (res.error) { setError(res.error); return; }
      setError(null);
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-ps-bg-2 rounded-ps-sm">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div><label className={labelCls}>Razão Social *</label>
        <input name="razao" required defaultValue={initial?.razao} className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>CNPJ</label>
          <input name="cnpj" defaultValue={initial?.cnpj} className={inputCls} /></div>
        <div><label className={labelCls}>Nº Conta</label>
          <input name="num_conta" defaultValue={initial?.num_conta} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Tipo IN</label>
          <select value={inTipo} onChange={e => setInTipo(e.target.value)} className={inputCls}>
            <option value="fixo">Fixo R$/tx</option>
            <option value="perc">% volume</option>
            <option value="fixo_perc">Fixo + %</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo OUT</label>
          <select value={outTipo} onChange={e => setOutTipo(e.target.value)} className={inputCls}>
            <option value="fixo">Fixo R$/tx</option>
            <option value="perc">% volume</option>
            <option value="fixo_perc">Fixo + %</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div><label className={labelCls}>Fee IN</label>
          <input name="in_val" type="number" step="0.0001" min="0" defaultValue={initial?.in_val ?? 0} className={inputCls} /></div>
        <div><label className={labelCls}>Rep IN</label>
          <input name="rep_in" type="number" step="0.0001" min="0" defaultValue={initial?.rep_in ?? 0} className={inputCls} /></div>
        <div><label className={labelCls}>Fee OUT</label>
          <input name="out_val" type="number" step="0.0001" min="0" defaultValue={initial?.out_val ?? 0} className={inputCls} /></div>
        <div><label className={labelCls}>Rep OUT</label>
          <input name="rep_out" type="number" step="0.0001" min="0" defaultValue={initial?.rep_out ?? 0} className={inputCls} /></div>
      </div>
      {initial && (
        <div><label className={labelCls}>Status</label>
          <select name="status" defaultValue={initial.status ?? "ativa"} className={inputCls}>
            <option value="ativa">Ativa</option><option value="inativa">Inativa</option>
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending} className="flex-1 bg-ps-navy text-white text-xs font-semibold rounded-ps-sm py-1.5 disabled:opacity-60">
          {isPending ? "Salvando..." : initial ? "Salvar subconta" : "Adicionar subconta"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 bg-white border border-ps-navy/15 text-ps-ink text-xs rounded-ps-sm">Cancelar</button>
      </div>
    </form>
  );
}

// ── Card de merchant (expansível) ─────────────────────────────────────────────

function MerchantCard({ client, onRefresh }: { client: Client; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subcontas = client.billing_subcontas ?? [];
  const isBets = ["bet", "bets"].includes(client.modelo);
  const isMens = ["mensalidade", "mensalidade_intro"].includes(client.modelo);

  function handleDelete() {
    if (!confirm(`Excluir ${client.razao}? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteBillingClient(client.id);
      onRefresh();
    });
  }

  function handleDeleteSub(sub: Subconta) {
    if (!confirm(`Excluir subconta ${sub.razao}?`)) return;
    startTransition(async () => {
      await deleteSubconta(sub.id);
      onRefresh();
    });
  }

  return (
    <div className="border border-ps-navy/10 rounded-ps overflow-hidden">
      {/* Header do card */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-ps-bg-2/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-ps-navy/40 text-xs">{expanded ? "▼" : "▶"}</span>
          <div className="min-w-0">
            <p className="font-semibold text-ps-ink text-sm truncate">{client.razao}</p>
            <p className="text-xs text-ps-muted">{client.cnpj || "Sem CNPJ"} · {MODELO_LABEL[client.modelo] ?? client.modelo} · {subcontas.length} subconta{subcontas.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${client.status === "ativo" || !client.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {client.status ?? "ativo"}
          </span>
          <button onClick={() => { setEditing(!editing); setExpanded(true); }} className="text-xs text-ps-navy px-2 py-1 rounded hover:bg-ps-bg-2">Editar</button>
          <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50">Excluir</button>
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="border-t border-ps-navy/5 px-4 py-4 space-y-4">
          {/* Form de edição */}
          {editing && (
            <div>
              <p className="text-xs font-bold text-ps-ink uppercase tracking-wide mb-3">Editar Merchant</p>
              <MerchantForm
                initial={client}
                onSaved={() => { setEditing(false); onRefresh(); }}
                onCancel={() => setEditing(false)}
              />
            </div>
          )}

          {/* Info tarifas (quando não editando) */}
          {!editing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {client.email_cobranca && <div><p className="text-ps-muted">Email</p><p className="font-medium">{client.email_cobranca}</p></div>}
              {client.chave_pix && <div><p className="text-ps-muted">Chave PIX</p><p className="font-medium">{client.chave_pix}</p></div>}
              {client.num_conta && <div><p className="text-ps-muted">Conta</p><p className="font-medium">{client.agencia ? `Ag. ${client.agencia} ` : ""}{client.num_conta}</p></div>}
              {!isMens && !isBets && (
                <>
                  <div><p className="text-ps-muted">Fee IN</p><p className="font-medium">{TIPO_LABEL[client.in_tipo ?? "fixo"]}: {client.in_val}</p></div>
                  <div><p className="text-ps-muted">Repasse IN</p><p className="font-medium">{client.rep_in}</p></div>
                  <div><p className="text-ps-muted">Fee OUT</p><p className="font-medium">{TIPO_LABEL[client.out_tipo ?? "fixo"]}: {client.out_val}</p></div>
                  <div><p className="text-ps-muted">Repasse OUT</p><p className="font-medium">{client.rep_out}</p></div>
                </>
              )}
              {isMens && client.faixas_mens && (
                <div className="col-span-4">
                  <p className="text-ps-muted mb-1">Faixas de mensalidade</p>
                  <div className="flex flex-wrap gap-2">
                    {(client.faixas_mens as Faixa[]).map((f, i) => (
                      <span key={i} className="bg-ps-bg-2 px-2 py-0.5 rounded text-xs">até {f.ate} contas → R$ {f.val}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subcontas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-ps-ink uppercase tracking-wide">Subcontas</p>
              <button onClick={() => setAddingSub(!addingSub)} className="text-xs text-ps-navy px-2 py-1 rounded hover:bg-ps-bg-2">
                {addingSub ? "Cancelar" : "+ Adicionar subconta"}
              </button>
            </div>

            {addingSub && (
              <SubcontaForm
                clientId={client.id}
                onSaved={() => { setAddingSub(false); onRefresh(); }}
                onCancel={() => setAddingSub(false)}
              />
            )}

            {subcontas.length === 0 && !addingSub && (
              <p className="text-xs text-ps-muted italic">Nenhuma subconta cadastrada.</p>
            )}

            <div className="space-y-2 mt-2">
              {subcontas.map(sub => (
                <div key={sub.id}>
                  {editingSub === sub.id ? (
                    <SubcontaForm
                      clientId={client.id}
                      initial={sub}
                      onSaved={() => { setEditingSub(null); onRefresh(); }}
                      onCancel={() => setEditingSub(null)}
                    />
                  ) : (
                    <div className="flex items-center justify-between py-2 px-3 border border-ps-navy/5 rounded bg-white hover:bg-ps-bg-2/30 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-ps-ink truncate">{sub.razao}</p>
                        <p className="text-ps-muted">{sub.cnpj || "—"} · Conta: {sub.num_conta || "—"}</p>
                        {(sub.in_val || sub.out_val) && (
                          <p className="text-ps-muted">IN: {sub.in_val} / OUT: {sub.out_val}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sub.status === "ativa" || !sub.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {sub.status ?? "ativa"}
                        </span>
                        <button onClick={() => setEditingSub(sub.id)} className="text-ps-navy hover:underline">Editar</button>
                        <button onClick={() => handleDeleteSub(sub)} disabled={isPending} className="text-red-500 hover:underline">Excluir</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lista principal ───────────────────────────────────────────────────────────

export function MerchantList({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = clients.filter(c =>
    c.razao.toLowerCase().includes(search.toLowerCase()) ||
    (c.cnpj ?? "").includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Barra de busca + botão novo */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por razão social ou CNPJ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-ps-green"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-ps-navy text-white text-sm font-semibold rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700"
        >
          {showForm ? "Cancelar" : "+ Novo merchant"}
        </button>
      </div>

      {/* Form de novo merchant */}
      {showForm && (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
          <p className="text-sm font-bold text-ps-ink mb-4">Novo Merchant</p>
          <MerchantForm
            onSaved={() => { setShowForm(false); router.refresh(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4 space-y-2">
        <p className="text-xs text-ps-muted mb-3">{filtered.length} merchant{filtered.length !== 1 ? "s" : ""}</p>
        {filtered.length === 0 && (
          <p className="text-sm text-ps-muted text-center py-6">Nenhum merchant encontrado.</p>
        )}
        {filtered.map(c => (
          <MerchantCard key={c.id} client={c} onRefresh={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}
