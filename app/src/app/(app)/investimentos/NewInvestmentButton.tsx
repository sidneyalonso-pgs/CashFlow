"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { createInvestment } from "./actions";

export function NewInvestmentButton({
  companies,
  bankAccounts,
  defaultTipo,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null; company_id: string }>;
  defaultTipo?: "aplicacao" | "resgate";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"aplicacao" | "resgate">(defaultTipo ?? "aplicacao");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredAccounts = bankAccounts.filter((a) => !companyId || a.company_id === companyId);

  function handleSubmit(formData: FormData) {
    formData.set("tipo", tipo);
    startTransition(async () => {
      const result = await createInvestment(formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  const isResgate = tipo === "resgate";

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => { setTipo("aplicacao"); setOpen(true); }}
          className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
        >
          Nova aplicação
        </button>
        <button
          onClick={() => { setTipo("resgate"); setOpen(true); }}
          className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
        >
          Registrar resgate
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={isResgate ? "Registrar resgate" : "Nova aplicação"}>
        <form action={handleSubmit} className="space-y-3">
          <SelectField
            label="Empresa"
            name="company_id"
            required
            options={companies.map((c) => ({ value: c.id, label: c.trade_name || c.legal_name }))}
            onChange={(e: any) => setCompanyId(e.target.value)}
          />
          <SelectField
            label={isResgate ? "Conta de destino (onde entra o dinheiro)" : "Conta de origem (de onde sai o dinheiro)"}
            name="bank_account_id"
            options={filteredAccounts.map((a) => ({ value: a.id, label: a.nickname ?? a.bank_name }))}
          />
          <TextField
            label="Produto"
            name="product"
            placeholder={isResgate ? "Ex: CDB DI LIQ Banco Inter" : "Ex: CDB, Tesouro Selic"}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={isResgate ? "Valor resgatado" : "Valor aplicado"}
              name="applied_amount"
              type="number"
              step="0.01"
              min="0"
              required
            />
            <TextField
              label={isResgate ? "Data do resgate" : "Data da aplicação"}
              name="applied_date"
              type="date"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
