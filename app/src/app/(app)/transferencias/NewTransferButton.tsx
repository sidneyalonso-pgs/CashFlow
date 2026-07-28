"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { createTransfer } from "./actions";

type BankAccount = { id: string; name: string; bank_name: string | null; company_name?: string | null };
type Company = { id: string; legal_name: string; trade_name: string | null };

const TIPOS = [
  { value: "pix_enviado", label: "Pix enviado para" },
  { value: "pix_recebido", label: "Pix recebido de" },
  { value: "ted_enviado", label: "TED enviado para" },
  { value: "ted_recebido", label: "TED recebido de" },
  { value: "transferencia_interna", label: "Transferência entre contas (mesma ou outra empresa)" },
  { value: "debito_bancario", label: "Débito bancário (tarifa/IOF)" },
  { value: "outro", label: "Outro" },
];

function accountLabel(a: BankAccount) {
  const parts = [a.name];
  if (a.bank_name) parts.push(a.bank_name);
  if (a.company_name) parts.push(`[${a.company_name}]`);
  return parts.join(" — ");
}

export function NewTransferButton({
  companies,
  bankAccounts,
}: {
  companies: Company[];
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("pix_enviado");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEnviado = tipo.includes("enviado") || tipo === "debito_bancario";
  const isRecebido = tipo.includes("recebido");
  const isInterno = tipo === "transferencia_interna";
  const showCounterpart = !isInterno && tipo !== "debito_bancario";

  // Conta débito: sempre mostra exceto pix/TED puramente recebido
  const showFromAccount = !isRecebido;
  // Conta crédito: sempre mostra para recebidos e internos
  const showToAccount = isRecebido || isInterno;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTransfer(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm hover:brightness-105 transition-all"
      >
        + Nova transferência
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova transferência">
        <form action={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Tipo</label>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Empresa (referência / registro) */}
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">
              Empresa {isInterno ? "(registro)" : ""}
            </label>
            <select
              name="company_id"
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
              ))}
            </select>
          </div>

          {/* Contraparte */}
          {showCounterpart && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">
                {isEnviado ? "Destinatário (para quem)" : "Origem (de quem)"}
              </label>
              <input
                name="counterpart_name"
                placeholder={isEnviado ? "Nome ou instituição de destino" : "Nome ou instituição de origem"}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
              />
            </div>
          )}

          {/* Conta débito (origem) */}
          {showFromAccount && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">
                {isInterno ? "Conta de débito (origem)" : "Conta de débito"}
              </label>
              <select
                name="from_account_id"
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
              >
                <option value="">— selecione —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Conta crédito (destino) */}
          {showToAccount && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">
                {isInterno ? "Conta de crédito (destino)" : "Conta que recebeu (crédito)"}
              </label>
              <select
                name="to_account_id"
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
              >
                <option value="">— selecione —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Conta para pix/TED recebido também permite informar a de débito se quiser */}
          {isRecebido && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Conta de débito (origem, opcional)</label>
              <select
                name="from_account_id"
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
              >
                <option value="">— não informar —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Descrição</label>
            <input
              name="description"
              placeholder="Ex: Aporte SC → IP, tarifa mensal..."
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
            />
          </div>

          {/* Valor e data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Valor (R$)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
              />
            </div>
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Data</label>
              <input
                name="transfer_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ps-muted hover:text-ps-ink">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
