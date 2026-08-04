"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { updateTransfer } from "./actions";

type BankAccount = { id: string; name: string; bank_name: string | null; company_name?: string | null };
type Company = { id: string; legal_name: string; trade_name: string | null };

const TIPOS = [
  { value: "pix_enviado", label: "Pix enviado para" },
  { value: "pix_recebido", label: "Pix recebido de" },
  { value: "ted_enviado", label: "TED enviado para" },
  { value: "ted_recebido", label: "TED recebido de" },
  { value: "transferencia_interna", label: "Transferência entre contas" },
  { value: "reembolso", label: "Reembolso a funcionário" },
  { value: "debito_bancario", label: "Débito bancário (tarifa/IOF)" },
  { value: "outro", label: "Outro" },
];

function accountLabel(a: BankAccount) {
  const parts = [a.name];
  if (a.bank_name) parts.push(a.bank_name);
  if (a.company_name) parts.push(`[${a.company_name}]`);
  return parts.join(" — ");
}

export function EditTransferButton({
  transfer,
  companies,
  bankAccounts,
}: {
  transfer: {
    id: string; tipo: string; description: string | null; amount: number;
    transfer_date: string; counterpart_name: string | null;
    company_id: string; from_account_id: string | null; to_account_id: string | null;
  };
  companies: Company[];
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState(transfer.tipo);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEnviado = tipo.includes("enviado") || tipo === "debito_bancario" || tipo === "reembolso";
  const isRecebido = tipo.includes("recebido");
  const isInterno = tipo === "transferencia_interna";
  const showCounterpart = !isInterno && tipo !== "debito_bancario";
  const showFromAccount = !isRecebido;
  const showToAccount = isRecebido || isInterno;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateTransfer(transfer.id, formData);
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
        className="p-1 text-ps-muted hover:text-ps-navy transition-colors"
        title="Editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar transferência">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Tipo</label>
            <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green">
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Empresa</label>
            <select name="company_id" defaultValue={transfer.company_id}
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
            </select>
          </div>

          {showCounterpart && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">
                {isEnviado ? "Destinatário" : "Origem"}
              </label>
              <input name="counterpart_name" defaultValue={transfer.counterpart_name ?? ""}
                placeholder={isEnviado ? "Nome ou instituição de destino" : "Nome ou instituição de origem"}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green" />
            </div>
          )}

          {showFromAccount && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Conta de débito</label>
              <select name="from_account_id" defaultValue={transfer.from_account_id ?? ""}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green">
                <option value="">— selecione —</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
            </div>
          )}

          {showToAccount && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Conta de crédito</label>
              <select name="to_account_id" defaultValue={transfer.to_account_id ?? ""}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green">
                <option value="">— selecione —</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
            </div>
          )}

          {isRecebido && (
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Conta de débito (origem, opcional)</label>
              <select name="from_account_id" defaultValue={transfer.from_account_id ?? ""}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green">
                <option value="">— não informar —</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Descrição</label>
            <input name="description" defaultValue={transfer.description ?? ""}
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Valor (R$)</label>
              <input name="amount" type="number" step="0.01" defaultValue={transfer.amount}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green" />
            </div>
            <div>
              <label className="block text-sm text-ps-ink-2 mb-1">Data</label>
              <input name="transfer_date" type="date" defaultValue={transfer.transfer_date}
                className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ps-muted hover:text-ps-ink">Cancelar</button>
            <button type="submit" disabled={isPending}
              className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60">
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
