import { formatBRL } from "@/lib/calculations/money";

const N = formatBRL;

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = String(d).split("-");
  return `${day}/${m}/${y}`;
}

export function fmtDateBR(d: string | null | undefined) {
  if (!d) return "—";
  const s = String(d);
  if (s.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, m, y] = s.split("-");
    return `${day}/${m}/${y}`;
  }
  return fmtDate(d);
}

export function fmtCompetencia(c: string | null) {
  if (!c) return "—";
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const [y, m] = c.split("-");
  return `${months[parseInt(m) - 1]}/${y}`;
}

export function parseInvoiceData(inv: any) {
  const client = inv.billing_clients as any;
  const isBets = ["bet", "bets"].includes(inv.modelo);
  const isMensalidade = ["mensalidade", "mensalidade_intro"].includes(inv.modelo);
  const rawDet = inv.subcontas_detalhe;

  let det: any = null;
  let subcontas: any[] = [];

  if (rawDet) {
    if (Array.isArray(rawDet)) {
      subcontas = rawDet;
    } else if (typeof rawDet === "object") {
      if (isBets) {
        det = rawDet;
      } else if (rawDet.subcontas) {
        subcontas = rawDet.subcontas;
      }
    }
  }

  if (!subcontas.length && !isBets && client?.billing_subcontas?.length) {
    subcontas = client.billing_subcontas.filter((s: any) => s.status === "ativa");
  }

  return { client, isBets, isMensalidade, det, subcontas };
}

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logos/pagsmile-ip-logo.png" alt="PagSmile IP" className="w-16 h-16 object-contain shrink-0" />
  );
}

export function MensalidadeDoc({ inv, client, subcontas }: { inv: any; client: any; subcontas: any[] }) {
  return (
    <div className="bg-white p-10">
      <div className="flex justify-between items-start mb-6">
        <Logo />
        <div className="text-right">
          <h1 className="text-xl font-black text-ps-navy tracking-tight uppercase">Demonstrativo de Mensalidade</h1>
          <p className="text-xs text-ps-muted mt-1">Emissão: <strong className="text-ps-ink">{fmtDate(inv.data_emissao)}</strong></p>
          <p className="text-xs text-ps-muted">Competência: <strong className="text-ps-ink">{fmtCompetencia(inv.competencia)}</strong></p>
          {(inv.inicio || inv.fim) && (
            <div className="mt-2 border border-ps-navy/15 rounded px-3 py-1.5 text-right">
              <p className="text-[10px] text-ps-muted uppercase tracking-wide font-semibold">Período</p>
              <p className="text-xs font-bold text-ps-navy">{fmtDate(inv.inicio)} a {fmtDate(inv.fim)}</p>
            </div>
          )}
        </div>
      </div>
      <hr className="border-ps-navy/10 mb-5" />
      <div className="mb-5">
        <p className="text-[10px] text-ps-muted uppercase tracking-widest font-semibold mb-1">Razão Social</p>
        <p className="font-bold text-ps-ink text-base">{client?.razao ?? "—"}</p>
        {client?.cnpj && <p className="text-xs text-ps-muted">CNPJ: {client.cnpj}</p>}
        {(client?.agencia || client?.num_conta) && (
          <p className="text-xs text-ps-muted">
            {client.agencia ? `Ag. ${client.agencia}` : ""}
            {client.agencia && client.num_conta ? " | " : ""}
            {client.num_conta ? `CC ${client.num_conta}` : ""}
          </p>
        )}
      </div>
      <div className="bg-ps-navy text-white grid grid-cols-3 rounded-t text-xs font-semibold">
        <div className="px-4 py-3">
          <p className="text-white/60 uppercase tracking-wide text-[10px]">Competência</p>
          <p className="font-bold mt-0.5 text-ps-green">{fmtCompetencia(inv.competencia)}</p>
        </div>
        <div className="px-4 py-3 border-l border-white/10">
          <p className="text-white/60 uppercase tracking-wide text-[10px]">Período</p>
          <p className="font-bold mt-0.5 text-ps-green">{inv.inicio && inv.fim ? `${fmtDate(inv.inicio)} a ${fmtDate(inv.fim)}` : "—"}</p>
        </div>
        <div className="px-4 py-3 border-l border-white/10">
          <p className="text-white/60 uppercase tracking-wide text-[10px]">Data de Pagamento</p>
          <p className="font-bold mt-0.5">{fmtDate(inv.data_pgto ?? inv.data_vencimento)}</p>
        </div>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-ps-navy/85 text-white">
            <th className="text-left px-4 py-2.5 font-semibold">Subconta</th>
            <th className="text-left px-4 py-2.5 font-semibold">CNPJ</th>
            <th className="text-left px-4 py-2.5 font-semibold">Nº Conta</th>
          </tr>
        </thead>
        <tbody>
          {subcontas.map((s, i) => (
            <tr key={i} className="border-b border-ps-navy/5">
              <td className="px-4 py-2.5 text-ps-ink">{s.razao ?? "—"}</td>
              <td className="px-4 py-2.5 text-ps-muted">{s.cnpj ?? "—"}</td>
              <td className="px-4 py-2.5 text-ps-muted">{s.num_conta ?? "—"}</td>
            </tr>
          ))}
          {subcontas.length === 0 && (
            <tr><td colSpan={3} className="px-4 py-4 text-center text-ps-muted">Nenhuma subconta registrada.</td></tr>
          )}
          <tr className="border-t-2 border-ps-navy/15 font-semibold">
            <td colSpan={2} className="px-4 py-3 text-ps-ink text-xs">Total de Subcontas Ativas</td>
            <td className="px-4 py-3 text-ps-ink text-xs text-right font-bold">{subcontas.length || inv.num_contas || 0} contas</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-5 flex justify-end">
        <div className="min-w-[300px] space-y-2">
          <div className="flex justify-between text-sm text-ps-muted">
            <span>Mensalidade {inv.faixa_mens ? `— ${inv.faixa_mens}` : ""}</span>
            <span className="tabular-nums">{N(inv.total_faturado)}</span>
          </div>
          {Number(inv.desconto_val) > 0 && (
            <div className="flex justify-between text-sm text-ps-muted">
              <span>Desconto ({inv.desconto_perc}%)</span>
              <span className="tabular-nums text-amber-600">−{N(inv.desconto_val)}</span>
            </div>
          )}
          <div className="bg-ps-navy text-white rounded px-5 py-3.5 flex justify-between items-center font-bold mt-2">
            <span className="text-sm uppercase tracking-wide">Total a Receber</span>
            <span className="text-ps-green tabular-nums text-xl">{N(inv.total)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-ps-navy/10 flex justify-between items-end text-xs text-ps-muted">
        <div>{inv.obs && <><p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Observações</p><p>{inv.obs}</p></>}</div>
        {(inv.data_pgto || inv.data_baixa) && (
          <div className="text-right">
            <p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Data de Pagamento</p>
            <p className="font-bold text-ps-ink text-sm">{fmtDate(inv.data_pgto ?? inv.data_baixa)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TransacaoDoc({ inv, client, subcontas }: { inv: any; client: any; subcontas: any[] }) {
  const totalApurado = subcontas.reduce((s: number, r: any) => {
    const qIn = Number(r.qtdIn ?? r.tIn ?? 0);
    const qOut = Number(r.qtdOut ?? r.tOut ?? 0);
    return s + qIn * Number(r.valIn ?? 0) + qOut * Number(r.valOut ?? 0);
  }, 0) || Number(inv.total_faturado);
  const totalRepasse = subcontas.reduce((s: number, r: any) => s + Number(r.repasse ?? 0), 0) || Number(inv.total_repasse);

  return (
    <div className="bg-white p-10">
      <div className="flex justify-between items-start mb-6">
        <Logo />
        <div className="text-right">
          <h1 className="text-xl font-black text-ps-navy tracking-tight uppercase">Demonstrativo de Repasse</h1>
          <p className="text-xs text-ps-muted mt-1">Emissão: <strong className="text-ps-ink">{fmtDate(inv.data_emissao)}</strong></p>
          <p className="text-xs text-ps-muted">Competência: <strong className="text-ps-ink">{fmtCompetencia(inv.competencia)}</strong></p>
          {(inv.inicio || inv.fim) && (
            <div className="mt-2 border border-ps-navy/15 rounded px-3 py-1.5 text-right">
              <p className="text-[10px] text-ps-muted uppercase tracking-wide font-semibold">Período</p>
              <p className="text-xs font-bold text-ps-navy">{fmtDate(inv.inicio)} a {fmtDate(inv.fim)}</p>
            </div>
          )}
        </div>
      </div>
      <hr className="border-ps-navy/10 mb-5" />
      <div className="mb-5">
        <p className="text-[10px] text-ps-muted uppercase tracking-widest font-semibold mb-1">Razão Social</p>
        <p className="font-bold text-ps-ink text-base">{client?.razao ?? "—"}</p>
        {client?.cnpj && <p className="text-xs text-ps-muted">CNPJ: {client.cnpj}</p>}
        {(client?.agencia || client?.num_conta) && (
          <p className="text-xs text-ps-muted">
            {client.agencia ? `Ag. ${client.agencia}` : ""}
            {client.agencia && client.num_conta ? " | " : ""}
            {client.num_conta ? `CC ${client.num_conta}` : ""}
          </p>
        )}
      </div>
      <div className="bg-ps-navy text-white grid grid-cols-3 rounded-t text-xs font-semibold">
        <div className="px-4 py-3">
          <p className="text-white/60 uppercase tracking-wide text-[10px]">Competência</p>
          <p className="font-bold mt-0.5 text-ps-green">{fmtCompetencia(inv.competencia)}</p>
        </div>
        <div className="px-4 py-3 border-l border-white/10">
          <p className="text-white/60 uppercase tracking-wide text-[10px]">Período</p>
          <p className="font-bold mt-0.5 text-ps-green">{inv.inicio && inv.fim ? `${fmtDate(inv.inicio)} a ${fmtDate(inv.fim)}` : "—"}</p>
        </div>
        <div className="px-4 py-3 border-l border-white/10">
          <p className="text-white/60 uppercase tracking-wide text-[10px]">{inv.status === "pago" ? "Data de Repasse" : "Vencimento"}</p>
          <p className="font-bold mt-0.5">{inv.status === "pago" ? fmtDate(inv.data_pgto ?? inv.data_baixa ?? inv.data_repasse) : fmtDate(inv.data_vencimento ?? inv.data_repasse)}</p>
        </div>
      </div>
      <div className="text-[10px] text-ps-muted uppercase tracking-widest font-semibold bg-ps-bg-2 px-4 py-2 border-b border-ps-navy/10">
        Detalhamento por Subconta
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-ps-navy/85 text-white">
            <th className="text-left px-3 py-2.5 font-semibold">Subconta</th>
            <th className="text-left px-3 py-2.5 font-semibold">Nº Conta</th>
            <th className="text-right px-3 py-2.5 font-semibold">Qtd IN</th>
            <th className="text-right px-3 py-2.5 font-semibold">Qtd OUT</th>
            <th className="text-right px-3 py-2.5 font-semibold">Apurado</th>
            <th className="text-right px-3 py-2.5 font-semibold">Valor de Repasse</th>
          </tr>
        </thead>
        <tbody>
          {subcontas.length > 0 ? subcontas.map((s: any, i: number) => {
            const qIn = Number(s.qtdIn ?? s.tIn ?? 0);
            const qOut = Number(s.qtdOut ?? s.tOut ?? 0);
            const apurado = qIn * Number(s.valIn ?? 0) + qOut * Number(s.valOut ?? 0);
            return (
              <tr key={i} className="border-b border-ps-navy/5">
                <td className="px-3 py-2.5"><p className="font-semibold text-ps-ink">{s.razao ?? "—"}</p>{s.cnpj && <p className="text-ps-muted text-[10px]">{s.cnpj}</p>}</td>
                <td className="px-3 py-2.5 text-ps-muted">{s.num_conta ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ps-muted">{(s.qtdIn ?? s.tIn ?? 0).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ps-muted">{(s.qtdOut ?? s.tOut ?? 0).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ps-ink">{N(apurado)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ps-green-700">{N(s.repasse ?? 0)}</td>
              </tr>
            );
          }) : (
            <tr className="border-b border-ps-navy/5">
              <td className="px-3 py-2.5"><p className="font-semibold text-ps-ink">{client?.razao ?? "—"}</p>{client?.cnpj && <p className="text-ps-muted text-[10px]">{client.cnpj}</p>}</td>
              <td className="px-3 py-2.5 text-ps-muted">{client?.num_conta ?? "—"}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-ps-muted">{Number(inv.qtd_in ?? 0).toLocaleString("pt-BR")}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-ps-muted">{Number(inv.qtd_out ?? 0).toLocaleString("pt-BR")}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-ps-ink">{N(inv.total_faturado)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ps-green-700">{N(inv.total_repasse)}</td>
            </tr>
          )}
          <tr className="bg-ps-bg-2 font-bold border-t-2 border-ps-navy/15">
            <td colSpan={4} className="px-3 py-2.5 text-ps-ink text-xs">TOTAL</td>
            <td className="px-3 py-2.5 text-right tabular-nums text-ps-ink">{N(totalApurado)}</td>
            <td className="px-3 py-2.5 text-right tabular-nums text-ps-green-700">{N(totalRepasse)}</td>
          </tr>
        </tbody>
      </table>
      {(client?.in_val || client?.out_val) && (
        <div className="border border-t-0 border-ps-navy/10 px-4 py-2 flex gap-6 text-[10px] text-ps-muted bg-white">
          {client.in_val > 0 && <span>Tarifa PIX IN: R$ {Number(client.in_val).toFixed(2).replace(".", ",")}/tx</span>}
          {client.out_val > 0 && <span>Tarifa PIX OUT: R$ {Number(client.out_val).toFixed(2).replace(".", ",")}/tx</span>}
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <div className="min-w-[300px] space-y-2">
          <div className="flex justify-between text-sm text-ps-muted">
            <span>Total Apurado</span><span className="tabular-nums">{N(totalApurado)}</span>
          </div>
          {Number(inv.desconto_val) > 0 && (
            <div className="flex justify-between text-sm text-ps-muted">
              <span>Desconto ({inv.desconto_perc}%)</span>
              <span className="tabular-nums text-amber-600">−{N(inv.desconto_val)}</span>
            </div>
          )}
          <div className="bg-ps-navy text-white rounded px-5 py-3.5 flex justify-between items-center font-bold mt-2">
            <span className="text-sm uppercase tracking-wide">Valor de Repasse</span>
            <span className="text-ps-green tabular-nums text-xl">{N(totalRepasse)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-ps-navy/10 flex justify-between items-end text-xs text-ps-muted">
        <div>{inv.obs && <><p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Observações</p><p>{inv.obs}</p></>}</div>
        {(inv.data_pgto || inv.data_baixa) && (
          <div className="text-right">
            <p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Data de Repasse</p>
            <p className="font-bold text-ps-ink text-sm">{fmtDate(inv.data_pgto ?? inv.data_baixa)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BetsDoc({ inv, client, det }: { inv: any; client: any; det: any }) {
  const compName = "Pagsmile Instituição de Pagamento Ltda";
  const companyCnpj = "37.753.531/0001-65";
  const qi = Number(det?.qi ?? inv.qtd_in ?? 0);
  const qo = Number(det?.qo ?? inv.qtd_out ?? 0);
  const qbt = Number(det?.qbt ?? 0);
  const qob = Number(det?.qob ?? 0);
  const qr = Number(det?.qr ?? 0);
  const tPixIn = Number(det?.tPixIn ?? inv.fee_in ?? 0);
  const tPixOut = Number(det?.tPixOut ?? inv.fee_out ?? 0);
  const tOpenBank = Number(det?.tOpenBank ?? 0);
  const tBankTransfer = Number(det?.tBankTransfer ?? 0);
  const tRefund = Number(det?.tRefund ?? 0);
  const tRemessa = Number(det?.tRemessa ?? 0);
  const subtotal = Number(det?.subtotal ?? inv.total_faturado ?? 0);
  const vencimento = det?.vencimento ? fmtDateBR(det.vencimento) : fmtDate(inv.data_vencimento);
  const dadosBanc = det?.dadosBanc ?? null;
  const valPixIn = Number(det?.val_pix_in ?? client?.in_val ?? 0);
  const valPixOut = Number(det?.val_pix_out ?? client?.out_val ?? 0);
  const valOpenBank = Number(det?.val_open_bank ?? 0);
  const valBankTransfer = Number(det?.val_bank_transfer ?? 0);
  const valRefund = Number(det?.val_refund ?? 0);
  const valRemessaPerc = Number(det?.val_remessa_perc ?? 0);

  return (
    <div className="bg-white p-10">
      <div className="flex justify-between items-start mb-6">
        <Logo />
        <div className="text-right">
          <h1 className="text-2xl font-black text-ps-navy tracking-tight uppercase">Fatura</h1>
          <p className="text-xs text-ps-muted mt-1">Emissão: <strong className="text-ps-ink">{fmtDate(inv.data_emissao)}</strong></p>
          <p className="text-xs text-ps-muted">Competência: <strong className="text-ps-ink">{fmtCompetencia(inv.competencia)}</strong></p>
          {(inv.inicio || inv.fim) && (
            <div className="mt-2 border border-ps-navy/15 rounded px-3 py-1.5 text-right">
              <p className="text-[10px] text-ps-muted uppercase tracking-wide font-semibold">Período</p>
              <p className="text-xs font-bold text-ps-navy">{fmtDate(inv.inicio)} a {fmtDate(inv.fim)}</p>
            </div>
          )}
        </div>
      </div>
      <hr className="border-ps-navy/10 mb-5" />
      <div className="grid grid-cols-2 gap-8 mb-5">
        <div>
          <p className="text-[10px] text-ps-muted uppercase tracking-widest font-semibold mb-1">Emitente</p>
          <p className="font-bold text-ps-ink">{compName}</p>
          <p className="text-xs text-ps-muted">CNPJ: {companyCnpj}</p>
        </div>
        <div>
          <p className="text-[10px] text-ps-muted uppercase tracking-widest font-semibold mb-1">Cliente</p>
          <p className="font-bold text-ps-ink">{client?.razao ?? "—"}</p>
          {client?.cnpj && <p className="text-xs text-ps-muted">CNPJ: {client.cnpj}</p>}
        </div>
      </div>
      <div className="bg-ps-navy text-white grid grid-cols-3 rounded-t text-xs font-semibold">
        <div className="px-4 py-3"><p className="text-white/60 uppercase tracking-wide text-[10px]">Competência</p><p className="font-bold mt-0.5 text-ps-green">{fmtCompetencia(inv.competencia)}</p></div>
        <div className="px-4 py-3 border-l border-white/10"><p className="text-white/60 uppercase tracking-wide text-[10px]">Período</p><p className="font-bold mt-0.5 text-ps-green">{inv.inicio && inv.fim ? `${fmtDate(inv.inicio)} a ${fmtDate(inv.fim)}` : "—"}</p></div>
        <div className="px-4 py-3 border-l border-white/10"><p className="text-white/60 uppercase tracking-wide text-[10px]">Vencimento</p><p className="font-bold mt-0.5">{vencimento}</p></div>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-ps-navy/85 text-white">
            <th className="text-left px-4 py-2.5 font-semibold">Tipo de Cobrança</th>
            <th className="text-left px-4 py-2.5 font-semibold">Moeda</th>
            <th className="text-right px-4 py-2.5 font-semibold">Qtd</th>
            <th className="text-right px-4 py-2.5 font-semibold">Valor Unit.</th>
            <th className="text-right px-4 py-2.5 font-semibold">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-ps-bg-2"><td colSpan={5} className="px-4 py-2 font-bold text-ps-ink text-[10px] uppercase tracking-wide">Recebimentos</td></tr>
          <tr className="border-b border-ps-navy/5"><td className="px-4 py-2.5 text-ps-ink">PIX</td><td className="px-4 py-2.5 text-ps-muted">BRL</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{qi.toLocaleString("pt-BR")}</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{N(valPixIn)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{tPixIn > 0 ? N(tPixIn) : "—"}</td></tr>
          <tr className="border-b border-ps-navy/5"><td className="px-4 py-2.5 text-ps-ink">Open Bank OpenFinance, Iniciador de Pagamento</td><td className="px-4 py-2.5 text-ps-muted">BRL</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{qob}</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{N(valOpenBank)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{tOpenBank > 0 ? N(tOpenBank) : "—"}</td></tr>
          <tr className="bg-ps-bg-2/50 border-b border-ps-navy/10"><td colSpan={4} className="px-4 py-2 text-right text-ps-muted font-semibold">Subtotal Recebimentos</td><td className="px-4 py-2 text-right tabular-nums font-bold text-ps-ink">{N(tPixIn + tOpenBank)}</td></tr>
          <tr className="bg-ps-bg-2"><td colSpan={5} className="px-4 py-2 font-bold text-ps-ink text-[10px] uppercase tracking-wide">Pagamentos Lote</td></tr>
          <tr className="border-b border-ps-navy/5"><td className="px-4 py-2.5 text-ps-ink">Bank Transfer</td><td className="px-4 py-2.5 text-ps-muted">BRL</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{qbt}</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{N(valBankTransfer)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{tBankTransfer > 0 ? N(tBankTransfer) : "—"}</td></tr>
          <tr className="border-b border-ps-navy/5"><td className="px-4 py-2.5 text-ps-ink">PIX</td><td className="px-4 py-2.5 text-ps-muted">BRL</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{qo.toLocaleString("pt-BR")}</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{N(valPixOut)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{tPixOut > 0 ? N(tPixOut) : "—"}</td></tr>
          <tr className="bg-ps-bg-2/50 border-b border-ps-navy/10"><td colSpan={4} className="px-4 py-2 text-right text-ps-muted font-semibold">Subtotal Pagamentos</td><td className="px-4 py-2 text-right tabular-nums font-bold text-ps-ink">{N(tBankTransfer + tPixOut)}</td></tr>
          <tr className="bg-ps-bg-2"><td colSpan={5} className="px-4 py-2 font-bold text-ps-ink text-[10px] uppercase tracking-wide">Outras Taxas</td></tr>
          <tr className="border-b border-ps-navy/5"><td className="px-4 py-2.5 text-ps-ink">Refund/Estorno</td><td className="px-4 py-2.5 text-ps-muted">BRL</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{qr}</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{N(valRefund)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{tRefund > 0 ? N(tRefund) : "—"}</td></tr>
          <tr className="border-b border-ps-navy/5"><td className="px-4 py-2.5 text-ps-ink">Remessas Internacionais – Taxa de Câmbio</td><td className="px-4 py-2.5 text-ps-muted">BRL</td><td className="px-4 py-2.5 text-right text-ps-muted">—</td><td className="px-4 py-2.5 text-right tabular-nums text-ps-muted">{valRemessaPerc > 0 ? `${valRemessaPerc}%` : "—"}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{tRemessa > 0 ? N(tRemessa) : "—"}</td></tr>
        </tbody>
      </table>
      <div className="mt-5 flex justify-end">
        <div className="min-w-[300px] space-y-2">
          <div className="flex justify-between text-sm text-ps-muted"><span>Subtotal</span><span className="tabular-nums">{N(subtotal)}</span></div>
          {Number(inv.desconto_val) > 0 && (
            <div className="flex justify-between text-sm text-ps-muted">
              <span>Desconto ({inv.desconto_perc}%)</span><span className="tabular-nums text-amber-600">−{N(inv.desconto_val)}</span>
            </div>
          )}
          <div className="bg-ps-navy text-white rounded px-5 py-3.5 flex justify-between items-center font-bold mt-2">
            <span className="text-sm uppercase tracking-wide">Total a Pagar</span>
            <span className="text-ps-green tabular-nums text-xl">{N(inv.total)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-ps-navy/10 grid grid-cols-2 gap-8 text-xs text-ps-muted">
        <div>
          {dadosBanc && <><p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Observações</p><p className="leading-relaxed">Dados bancários para pagamento: {dadosBanc}</p></>}
          {inv.obs && !dadosBanc && <p>{inv.obs}</p>}
        </div>
        <div className="text-right space-y-1">
          <div><span className="text-ps-muted">Data de emissão: </span><span className="font-semibold text-ps-ink">{fmtDate(inv.data_emissao)}</span></div>
          {det?.aceite && <div><span className="text-ps-muted">Data limite de aceite: </span><span className="font-semibold text-ps-ink">{fmtDateBR(det.aceite)}</span></div>}
          <div><span className="text-ps-muted">Data de vencimento: </span><span className="font-semibold text-ps-ink">{vencimento}</span></div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDocument({ inv }: { inv: any }) {
  const { client, isBets, isMensalidade, det, subcontas } = parseInvoiceData(inv);
  if (isMensalidade) return <MensalidadeDoc inv={inv} client={client} subcontas={subcontas} />;
  if (isBets) return <BetsDoc inv={inv} client={client} det={det} />;
  return <TransacaoDoc inv={inv} client={client} subcontas={subcontas} />;
}
