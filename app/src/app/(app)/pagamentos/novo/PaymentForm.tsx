"use client";

import { useState, useTransition } from "react";
import { TextField, SelectField } from "@/components/FormField";
import { createPayment } from "../actions";

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "ted", label: "TED" },
  { value: "boleto", label: "Boleto" },
  { value: "debito_automatico", label: "Débito automático" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia_interna", label: "Transferência interna" },
  { value: "outro", label: "Outro" },
];

export function PaymentForm({
  companies,
  suppliers,
  categories,
  subcategories,
  costCenters,
  projects,
}: {
  companies: Array<{ id: string; legal_name: string }>;
  suppliers: Array<{ id: string; legal_name: string }>;
  categories: Array<{ id: string; name: string }>;
  subcategories: Array<{ id: string; name: string; category_id: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
  projects: Array<{ id: string; code: string; name: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPayment(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-6 space-y-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Empresa"
          name="company_id"
          required
          options={companies.map((c) => ({ value: c.id, label: c.legal_name }))}
        />
        <SelectField
          label="Fornecedor"
          name="supplier_id"
          required
          options={suppliers.map((s) => ({ value: s.id, label: s.legal_name }))}
        />
      </div>

      <TextField label="Descrição" name="description" required />

      <div className="grid grid-cols-3 gap-4">
        <TextField label="Valor bruto" name="gross_amount" type="number" required />
        <TextField label="Moeda" name="currency" defaultValue="BRL" />
        <TextField label="Número do documento" name="document_number" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Categoria"
          name="category_id"
          required
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectField
          label="Subcategoria"
          name="subcategory_id"
          options={subcategories.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Centro de custo"
          name="cost_center_id"
          options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
        />
        <SelectField
          label="Projeto"
          name="project_id"
          options={projects.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <TextField label="Data do documento" name="document_date" type="date" required />
        <TextField label="Vencimento" name="due_date" type="date" required />
        <TextField label="Previsão de pagamento" name="expected_payment_date" type="date" required />
        <TextField label="Competência" name="competence_date" type="date" required />
      </div>

      <SelectField label="Forma de pagamento" name="payment_method" options={PAYMENT_METHODS} />

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Observações</label>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar rascunho"}
        </button>
      </div>
    </form>
  );
}
