// Base de tarifas: uma linha por empresa atendida, montada a partir do cadastro de merchants e subcontas
// (a mesma fonte que a fatura usa, então editar o cadastro atualiza a base e a fatura).

export type LinhaTarifa = {
  clienteId: string;
  introducer: string;
  introducerCnpj: string;
  empresa: string;
  empresaCnpj: string;
  numConta: string;
  modelo: string;
  tarIn: string;
  repIn: string;
  tarOut: string;
  repOut: string;
  /** repasse / tarifa em %, quando os dois são números comparáveis */
  pctRepasse: number | null;
  outras: string;
  frequencia: string;
  frequenciaInferida: boolean;
  atualizadoEm: string | null;
  status: string;
  /** como a linha é editada: subconta, cliente sem subcontas, ou configuração do cliente (combo / fee + %) */
  edit: "subconta" | "cliente" | "fee_perc" | "combo" | "nenhum";
  subId: string | null;
  raw: { inTipo: string; inVal: number; repIn: number; outTipo: string; outVal: number; repOut: number };
  cfg: any;
  /** valores guardados no cadastro do merchant (sem o preenchimento automático da tela) */
  introducerNome: string;
  introducerCnpjRaw: string;
  frequenciaRaw: string;
};

const brl = (n: number) => `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const num = (n: number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

function fmtValor(tipo: string | null | undefined, val: any): string {
  const v = Number(val ?? 0);
  if (tipo === "perc") return `${num(v)}%`;
  return brl(v);
}

const MODELO_LABEL: Record<string, string> = {
  transacao: "Transação", transacao_intro: "Transação Intro", mensalidade: "Mensalidade", mensalidade_intro: "Mensalidade Intro",
  combo: "Combo de contas", fee_perc: "Fee + % de divisão", bet: "Bets", bets: "Bets",
};
export const modeloLabel = (m: string) => MODELO_LABEL[m] ?? m;

function maisRecente(...datas: (string | null | undefined)[]): string | null {
  const v = datas.filter(Boolean) as string[];
  return v.length ? v.reduce((a, b) => (a > b ? a : b)) : null;
}

/** semanal se o último período faturado tem até 8 dias, senão mensal */
function inferirFrequencia(periodo?: { inicio: string | null; fim: string | null }): string {
  if (!periodo?.inicio || !periodo?.fim) return "";
  const dias = (Date.parse(periodo.fim) - Date.parse(periodo.inicio)) / 86400000 + 1;
  return dias <= 8 ? "semanal" : "mensal";
}

export function montaBaseTarifas(clients: any[], ultimoPeriodo: Record<string, { inicio: string | null; fim: string | null }>): LinhaTarifa[] {
  const linhas: LinhaTarifa[] = [];

  for (const c of clients) {
    const cfg = c.faixas_mens && !Array.isArray(c.faixas_mens) ? c.faixas_mens : {};
    const introducer = c.introducer_nome || (c.modelo === "combo" ? cfg.parceiro : null) || c.razao;
    const introducerCnpj = c.introducer_cnpj || (introducer === c.razao ? c.cnpj ?? "" : "");
    const frequencia = c.frequencia || inferirFrequencia(ultimoPeriodo[c.id]);
    const frequenciaInferida = !c.frequencia && !!frequencia;
    const subs: any[] = (c.billing_subcontas ?? []).filter((s: any) => s.status !== "inativa");

    const base = {
      clienteId: c.id, introducer, introducerCnpj, modelo: c.modelo, frequencia, frequenciaInferida, status: c.status ?? "ativo",
    };

    // tarifas por modelo (campos que não cabem em IN/OUT vão para "outras")
    const campos = (s: any | null) => {
      const origem = s ?? c;
      if (c.modelo === "combo") {
        const pix = Number(cfg.pix ?? 0), ted = Number(cfg.ted ?? 0), perc = Number(cfg.repasse_perc ?? 0);
        return {
          tarIn: `${brl(pix)} (PIX) · ${brl(ted)} (TED)`, repIn: `${num(perc)}% da tarifa`,
          tarOut: `${brl(pix)} (PIX) · ${brl(ted)} (TED)`, repOut: `${num(perc)}% da tarifa`,
          pct: perc,
          outras: `Master ${brl(Number(cfg.master ?? 0))}/mês · Subconta PJ ${brl(Number(cfg.sub_pj ?? 0))} · Manut. subconta ${brl(Number(cfg.manut_sub ?? 0))} · PA–PF ${brl(Number(cfg.conta_pa_pf ?? 0))} (repasse só sobre PIX/TED)`,
        };
      }
      if (c.modelo === "fee_perc") {
        const perc = Number(cfg.perc_repasse ?? 0);
        return { tarIn: "Fee informado", repIn: `${num(perc)}% do fee`, tarOut: "Fee informado", repOut: `${num(perc)}% do fee`, pct: perc, outras: "" };
      }
      if (c.modelo === "mensalidade" || c.modelo === "mensalidade_intro") {
        const faixas = Array.isArray(c.faixas_mens) ? c.faixas_mens : [];
        return {
          tarIn: "—", repIn: "—", tarOut: "—", repOut: "—", pct: null,
          outras: faixas.length ? "Mensalidade: " + faixas.map((f: any) => `até ${f.ate} contas ${brl(f.val)}`).join(" · ") : "Mensalidade por faixa",
        };
      }
      const pctDe = (rep: any, tar: any) => (Number(tar) > 0 ? (Number(rep) / Number(tar)) * 100 : null);
      const pIn = pctDe(origem.rep_in, origem.in_val);
      const pOut = pctDe(origem.rep_out, origem.out_val);
      return {
        tarIn: fmtValor(origem.in_tipo, origem.in_val), repIn: fmtValor(origem.in_tipo, origem.rep_in),
        tarOut: fmtValor(origem.out_tipo, origem.out_val), repOut: fmtValor(origem.out_tipo, origem.rep_out),
        pct: pIn ?? pOut,
        outras: c.modelo === "bet" || c.modelo === "bets" ? "Negadas R$ 0,10 · Refund R$ 5,00" : "",
      };
    };

    const montar = (s: any | null): LinhaTarifa => {
      const f = campos(s);
      const origem = s ?? c;
      const edit: LinhaTarifa["edit"] =
        c.modelo === "combo" ? "combo" : c.modelo === "fee_perc" ? "fee_perc"
        : c.modelo === "mensalidade" || c.modelo === "mensalidade_intro" ? "nenhum"
        : s ? "subconta" : "cliente";
      return {
        ...base,
        edit,
        subId: s ? s.id : null,
        raw: {
          inTipo: origem.in_tipo ?? "fixo", inVal: Number(origem.in_val ?? 0), repIn: Number(origem.rep_in ?? 0),
          outTipo: origem.out_tipo ?? "fixo", outVal: Number(origem.out_val ?? 0), repOut: Number(origem.rep_out ?? 0),
        },
        cfg,
        introducerNome: c.introducer_nome ?? "",
        introducerCnpjRaw: c.introducer_cnpj ?? "",
        frequenciaRaw: c.frequencia ?? "",
        empresa: s ? s.razao : c.razao,
        empresaCnpj: (s ? s.cnpj : c.cnpj) ?? "",
        numConta: (s ? s.num_conta : c.num_conta) ?? "",
        tarIn: f.tarIn, repIn: f.repIn, tarOut: f.tarOut, repOut: f.repOut,
        pctRepasse: f.pct == null ? null : Math.round(f.pct * 100) / 100,
        outras: f.outras,
        atualizadoEm: s ? maisRecente(s.updated_at, s.created_at) : maisRecente(c.updated_at, c.created_at),
      };
    };

    if (!subs.length) {
      linhas.push(montar(null));
    } else {
      for (const s of subs) linhas.push(montar(s));
    }
  }

  return linhas.sort((a, b) => a.introducer.localeCompare(b.introducer, "pt-BR") || a.empresa.localeCompare(b.empresa, "pt-BR") || a.numConta.localeCompare(b.numConta));
}
