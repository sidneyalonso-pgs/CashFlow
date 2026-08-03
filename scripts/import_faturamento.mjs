/**
 * Script de importação do banco_faturamento.xlsx → Supabase
 *
 * Uso:
 *   node scripts/import_faturamento.mjs
 *
 * Requer:
 *   npm install xlsx @supabase/supabase-js
 *   SUPABASE_SERVICE_KEY=eyJ... (service role key do dashboard)
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const SUPABASE_URL = "https://cbgkfdigjqkgfbfruiuv.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error("Defina SUPABASE_SERVICE_KEY antes de rodar.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── helpers ──────────────────────────────────────────────────────────────────

function parseMoney(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0;
}

function parseDate(v) {
  if (!v) return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    // "DD/MM/YYYY" or "YYYY-MM-DD"
    if (v.includes("/")) {
      const [d, m, y] = v.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return v.slice(0, 10);
  }
  return null;
}

function parseFaixas(raw) {
  if (!raw) return null;
  // format: "50:30000|100:50000|400:85000"
  return raw.split("|").map((seg) => {
    const [ate, val] = seg.split(":");
    return { ate: Number(ate), val: Number(val) };
  });
}

function sheetToRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = "C:/Users/SidneyAlonso/Downloads/banco_faturamento.xlsx";
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });

  // ── 1. billing_clients ────────────────────────────────────────────────────

  const clients = [];

  // Bets
  for (const r of sheetToRows(wb, "Bets")) {
    clients.push({
      external_id: r.id,
      tipo: "bets",
      razao: r.razao,
      cnpj: r.cnpj,
      agencia: r.agencia,
      conta: r.conta,
      num_conta: r.num_conta,
      email_cobranca: r.email_cobranca,
      chave_pix: r.chave_pix,
      contrato: r.contrato === "Sim" || r.contrato === true,
      modelo: "bets",
      in_tipo: "fixo",
      in_val: parseMoney(r.val_pix_in),
      out_tipo: "fixo",
      out_val: parseMoney(r.val_pix_out),
      val_open_bank: parseMoney(r.val_open_bank),
      val_negadas: parseMoney(r.val_negadas),
      val_bank_transfer: parseMoney(r.val_bank_transfer),
      val_refund: parseMoney(r.val_refund),
      val_remessa_perc: parseMoney(r.val_remessa_perc),
      status: "ativo",
    });
  }

  // Introducers
  for (const r of sheetToRows(wb, "Introducers")) {
    clients.push({
      external_id: r.id,
      tipo: "introducer",
      razao: r.razao,
      cnpj: r.cnpj,
      agencia: r.agencia,
      conta: r.conta,
      num_conta: r.num_conta,
      email_cobranca: r.email_cobranca,
      chave_pix: r.chave_pix,
      contrato: r.contrato === "Sim" || r.contrato === true,
      modelo: r.modelo ?? "transacao",
      in_tipo: r.in_tipo ?? "fixo",
      in_val: parseMoney(r.in_val),
      out_tipo: r.out_tipo ?? "fixo",
      out_val: parseMoney(r.out_val),
      rep_in: parseMoney(r.rep_in),
      rep_out: parseMoney(r.rep_out),
      faixas_mens: parseFaixas(r.faixas_mens),
      status: "ativo",
    });
  }

  // Clientes
  for (const r of sheetToRows(wb, "Clientes")) {
    if (!r.razao) continue;
    clients.push({
      external_id: r.id,
      tipo: "cliente",
      razao: r.razao,
      cnpj: r.cnpj,
      agencia: r.agencia,
      conta: r.conta,
      num_conta: r.num_conta,
      email_cobranca: r.email_cobranca,
      chave_pix: r.chave_pix,
      contrato: r.contrato === "Sim" || r.contrato === true,
      modelo: r.modelo ?? "transacao",
      in_tipo: r.in_tipo ?? "fixo",
      in_val: parseMoney(r.in_val),
      out_tipo: r.out_tipo ?? "fixo",
      out_val: parseMoney(r.out_val),
      rep_in: parseMoney(r.rep_in),
      rep_out: parseMoney(r.rep_out),
      repasse: parseMoney(r.repasse),
      status: "ativo",
    });
  }

  console.log(`Inserindo ${clients.length} billing_clients...`);
  const { data: insertedClients, error: cErr } = await supabase
    .from("billing_clients")
    .upsert(clients, { onConflict: "external_id", ignoreDuplicates: false })
    .select("id, external_id, razao");

  if (cErr) { console.error("Erro clientes:", cErr); process.exit(1); }
  console.log(`  ✓ ${insertedClients.length} clients inseridos`);

  // Map external_id → uuid
  const clientMap = {};
  for (const c of insertedClients) clientMap[c.external_id] = c.id;

  // Also build razao → uuid map for invoice lookup
  const razaoMap = {};
  for (const c of insertedClients) razaoMap[c.razao?.trim().toLowerCase()] = c.id;

  // ── 2. billing_subcontas ──────────────────────────────────────────────────

  const subcontas = [];
  for (const r of sheetToRows(wb, "Subcontas")) {
    if (!r.razao) continue;
    // Find introducer by external_id
    const clientUuid = clientMap[r.introducer_id] ?? null;
    subcontas.push({
      client_id: clientUuid,
      razao: r.razao,
      cnpj: r.cnpj,
      num_conta: r.num_conta,
      in_tipo: r.in_tipo ?? "fixo",
      in_val: parseMoney(r.in_val),
      rep_in: parseMoney(r.rep_in),
      out_tipo: r.out_tipo ?? "fixo",
      out_val: parseMoney(r.out_val),
      rep_out: parseMoney(r.rep_out),
      status: r.status ?? "ativa",
      external_id: r.id,
    });
  }

  if (subcontas.length) {
    console.log(`Inserindo ${subcontas.length} billing_subcontas...`);
    const { error: sErr } = await supabase
      .from("billing_subcontas")
      .upsert(subcontas, { onConflict: "external_id", ignoreDuplicates: false });
    if (sErr) console.error("Erro subcontas:", sErr);
    else console.log(`  ✓ ${subcontas.length} subcontas inseridas`);
  }

  // ── 3. billing_invoices ───────────────────────────────────────────────────

  const faturaRows = sheetToRows(wb, "Faturas");
  console.log(`Processando ${faturaRows.length} faturas...`);

  const invoices = [];
  for (const r of faturaRows) {
    if (!r.id) continue;

    // Try to find client_id
    let clientId = clientMap[r.clienteId] ?? null;
    if (!clientId && r.cliente) {
      clientId = razaoMap[String(r.cliente).trim().toLowerCase()] ?? null;
    }

    // Parse subcontas_detalhe JSON
    let subcDetalhe = null;
    if (r.subcontas_detalhe) {
      try { subcDetalhe = JSON.parse(r.subcontas_detalhe); } catch { subcDetalhe = r.subcontas_detalhe; }
    }

    invoices.push({
      external_id: r.id,
      client_id: clientId,
      client_external_id: r.clienteId,
      competencia: r.competencia,
      inicio: parseDate(r.inicio),
      fim: parseDate(r.fim),
      modelo: r.modelo ?? "transacao",
      qtd_in: r.qtdIn ?? 0,
      qtd_out: r.qtdOut ?? 0,
      fee_in: parseMoney(r.valIn),
      fee_out: parseMoney(r.valOut),
      repasse_in: parseMoney(r.rep_in),
      repasse_out: parseMoney(r.rep_out),
      total_faturado: parseMoney(r.totalFaturado),
      total_repasse: parseMoney(r.totalRepasse),
      desconto_perc: parseMoney(r.desconto_perc),
      desconto_val: parseMoney(r.desconto_val),
      total: parseMoney(r.total),
      obs: r.obs,
      status: r.status === "Pago" ? "pago" : "pendente",
      data_emissao: parseDate(r.emissao),
      data_vencimento: parseDate(r.vencimento),
      data_pgto: parseDate(r.data_pgto),
      data_baixa: parseDate(r.data_baixa),
      faixa_mens: r.faixa_mens ?? null,
      subcontas_detalhe: subcDetalhe,
    });
  }

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < invoices.length; i += 100) {
    const batch = invoices.slice(i, i + 100);
    const { error: iErr } = await supabase
      .from("billing_invoices")
      .upsert(batch, { onConflict: "external_id", ignoreDuplicates: false });
    if (iErr) { console.error(`Erro faturas batch ${i}:`, iErr); }
    else { inserted += batch.length; process.stdout.write(`\r  ${inserted}/${invoices.length} faturas...`); }
  }
  console.log(`\n  ✓ ${inserted} faturas inseridas`);

  // ── 4. billing_debit_notes ────────────────────────────────────────────────

  const ndRows = sheetToRows(wb, "NotasDebito");
  console.log(`Inserindo ${ndRows.length} notas de débito...`);

  const notes = [];
  for (const r of ndRows) {
    if (!r.id) continue;
    let itens = null;
    if (r.itens) {
      try { itens = JSON.parse(r.itens); } catch { itens = r.itens; }
    }
    notes.push({
      external_id: r.id,
      numero_nd: r.numero_nd,
      pagador: r.pagador,
      cnpj_pagador: r.cnpj_pagador,
      end_pagador: r.end_pagador,
      recebedor: r.recebedor,
      cnpj_recebedor: r.cnpj_recebedor,
      end_recebedor: r.end_recebedor,
      debitado: r.debitado,
      cnpj_debitado: r.cnpj,
      tipo: r.tipo,
      ref: r.ref,
      competencia: r.competencia,
      vencimento: parseDate(r.vencimento),
      itens,
      total: parseMoney(r.total),
      obs: r.obs,
      status: r.status ?? "Pendente",
      data_emissao: parseDate(r.emissao),
    });
  }

  if (notes.length) {
    const { error: nErr } = await supabase
      .from("billing_debit_notes")
      .upsert(notes, { onConflict: "external_id", ignoreDuplicates: false });
    if (nErr) console.error("Erro notas débito:", nErr);
    else console.log(`  ✓ ${notes.length} notas de débito inseridas`);
  }

  console.log("\n✅ Import concluído!");
}

main().catch(console.error);
