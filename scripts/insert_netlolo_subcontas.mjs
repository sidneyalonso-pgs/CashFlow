/**
 * Insere subcontas da Netlolo no Supabase.
 *
 * Uso:
 *   SUPABASE_SERVICE_KEY=eyJ... node scripts/insert_netlolo_subcontas.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cbgkfdigjqkgfbfruiuv.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error("❌  Defina SUPABASE_SERVICE_KEY antes de rodar.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const NOVAS = [
  { cnpj: "37.072.833/0001-78", razao: "STTART PAGAMENTOS LTDA",                                                          num_conta: "17028827" },
  { cnpj: "63.625.563/0001-05", razao: "APS SOLUCOES DIGITAIS LTDA",                                                      num_conta: "21284239" },
  { cnpj: "60.441.260/0001-24", razao: "BC ACCESS BRASIL SOCIEDADE PRESTADORA DE SERVICOS DE ATIVOS VIRTUAIS LTDA",       num_conta: "26463153" },
  { cnpj: "43.684.116/0001-08", razao: "MERCADO EASY SOLUCOES E TECNOLOGIA LTDA",                                         num_conta: "43260984" },
  { cnpj: "63.789.777/0001-05", razao: "JUNG COMERCIAL ELETRONICOS LTDA",                                                  num_conta: "45313545" },
  { cnpj: "66.612.137/0001-05", razao: "RAV GESTAO DE COBRANCAS LTDA",                                                    num_conta: "63513529" },
  { cnpj: "66.546.753/0001-05", razao: "AGLA COBRANCAS DIGITAIS LTDA",                                                    num_conta: "67158443" },
  { cnpj: "64.716.825/0001-90", razao: "INNOTECH PAYMENT SOLUTIONS LTDA",                                                 num_conta: "72957865" },
  { cnpj: "21.005.023/0001-69", razao: "GOLDWARE BRASIL GESTAO DE CAPITAL LTDA",                                          num_conta: "76720374" },
  { cnpj: "64.573.626/0001-70", razao: "ASSETIFY NEGOCIOS MUNDIAL LTDA",                                                  num_conta: "96332147" },
  { cnpj: "65.107.410/0001-81", razao: "JM INTERMEDIACAO DE PAGAMENTOS LTDA",                                             num_conta: "98577468" },
];

async function main() {
  // 1. Achar a Netlolo
  const { data: clients, error: ce } = await supabase
    .from("billing_clients")
    .select("id, razao")
    .ilike("razao", "%netlolo%");

  if (ce) { console.error("Erro ao buscar clientes:", ce.message); process.exit(1); }
  if (!clients?.length) { console.error("❌  Netlolo não encontrada em billing_clients."); process.exit(1); }

  const netlolo = clients[0];
  console.log(`✅  Netlolo encontrada: ${netlolo.razao} (${netlolo.id})`);

  // 2. Subcontas já existentes
  const { data: existentes } = await supabase
    .from("billing_subcontas")
    .select("cnpj, razao, num_conta")
    .eq("client_id", netlolo.id);

  const cnpjsExistentes = new Set((existentes ?? []).map(s => s.cnpj?.replace(/\D/g, "")));

  // 3. Separar novas x duplicadas
  const inserir = [];
  for (const s of NOVAS) {
    const cnpjLimpo = s.cnpj.replace(/\D/g, "");
    if (cnpjsExistentes.has(cnpjLimpo)) {
      console.log(`⚠️   DUPLICADA — ${s.razao} (${s.cnpj}) — pulando`);
    } else {
      inserir.push({ ...s, client_id: netlolo.id });
    }
  }

  if (!inserir.length) {
    console.log("ℹ️   Nada a inserir — todas já existem.");
    return;
  }

  // 4. Inserir
  const { error: ie } = await supabase.from("billing_subcontas").insert(inserir);
  if (ie) { console.error("Erro ao inserir:", ie.message); process.exit(1); }

  console.log(`\n✅  ${inserir.length} subconta(s) inserida(s) com sucesso:`);
  inserir.forEach(s => console.log(`   • ${s.razao} — ${s.cnpj} — conta ${s.num_conta}`));
}

main();
