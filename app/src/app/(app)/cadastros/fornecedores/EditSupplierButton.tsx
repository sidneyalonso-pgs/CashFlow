"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { TextField, SelectField } from "@/components/FormField";
import { updateSupplier, deleteSupplier, generateRecurringProvisions } from "./actions";

const COST_TYPES = [
  { value: "despesas", label: "Despesas" },
  { value: "custo_direto", label: "Custo Direto" },
  { value: "custo_indireto", label: "Custo Indireto" },
];

type Supplier = {
  id: string;
  legal_name: string;
  cost_type: string;
  default_category_id: string | null;
  default_cost_center_id: string | null;
  default_description: string | null;
  status: string;
  is_recurring?: boolean;
  recurring_amount?: number | null;
  recurring_day_of_month?: number | null;
};

export function EditSupplierButton({
  supplier,
  categories,
  costCenters,
  companies,
}: {
  supplier: Supplier;
  categories: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; code: string; name: string }>;
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [costType, setCostType] = useState(supplier.cost_type);
  const [isRecurring, setIsRecurring] = useState(supplier.is_recurring ?? false);
  const [hasDescription, setHasDescription] = useState(!!supplier.default_description);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Para gerar provisionamentos
  const [showGenerate, setShowGenerate] = useState(false);
  const [genCompanyId, setGenCompanyId] = useState(companies[0]?.id ?? "");
  const [genMonths, setGenMonths] = useState(3);
  const [genResult, setGenResult] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSupplier(supplier.id, formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir o fornecedor "${supplier.legal_name}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateRecurringProvisions(supplier.id, genCompanyId, genMonths);
      if (result.error) {
        setGenResult(`Erro: ${result.error}`);
      } else {
        const n = (result as any).created?.length ?? 0;
        setGenResult(n === 0 ? "Todos os meses já tinham pagamentos lançados." : `${n} pagamento(s) provisionado(s) com sucesso.`);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-ps-navy underline">
        Editar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar fornecedor">
        <form action={handleSubmit} className="space-y-3">
          <TextField label="Razão social" name="legal_name" defaultValue={supplier.legal_name} required />

          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Tipo de custo</label>
            <select
              name="cost_type"
              value={costType}
              onChange={(e) => setCostType(e.target.value)}
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green"
            >
              {COST_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <SelectField
            label="Categoria padrão"
            name="default_category_id"
            defaultValue={supplier.default_category_id ?? ""}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <SelectField
            label="Departamento (centro de custo)"
            name="default_cost_center_id"
            defaultValue={supplier.default_cost_center_id ?? ""}
            options={costCenters.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
          />

          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">
              Descrição padrão <span className="text-xs text-ps-muted">(preenche o pagamento automaticamente)</span>
            </label>
            <input
              name="default_description"
              defaultValue={supplier.default_description ?? ""}
              onChange={(e) => setHasDescription(!!e.target.value)}
              placeholder="Ex: Consultoria de TI, aluguel..."
              className="w-full h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green"
            />
            {hasDescription && (
              <label className="flex items-center gap-2 mt-2 text-xs text-ps-muted cursor-pointer">
                <input type="checkbox" name="propagate_description" className="rounded accent-ps-green" />
                Atualizar descrição dos pagamentos futuros já lançados para este fornecedor
              </label>
            )}
          </div>

          {/* Recorrente */}
          <div className="rounded-ps-sm border border-ps-navy/10 bg-ps-bg-2/50 p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ps-ink cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded accent-ps-green"
              />
              Despesa recorrente mensal
            </label>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-3 pl-5">
                <div>
                  <label className="block text-xs text-ps-muted mb-1">Valor mensal (R$)</label>
                  <input
                    type="number"
                    name="recurring_amount"
                    step="0.01"
                    defaultValue={supplier.recurring_amount ?? ""}
                    placeholder="0,00"
                    className="w-full h-9 rounded-ps-sm border border-ps-navy/15 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ps-muted mb-1">Dia do vencimento</label>
                  <input
                    type="number"
                    name="recurring_day_of_month"
                    min="1"
                    max="28"
                    defaultValue={supplier.recurring_day_of_month ?? ""}
                    placeholder="Ex: 15"
                    className="w-full h-9 rounded-ps-sm border border-ps-navy/15 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
                  />
                </div>
              </div>
            )}

            {isRecurring && (
              <p className="text-xs text-ps-muted pl-5">
                Salve o fornecedor e use o botão <strong>"Gerar provisionamentos"</strong> para criar os pagamentos futuros automaticamente.
              </p>
            )}
          </div>

          <SelectField
            label="Status"
            name="status"
            defaultValue={supplier.status}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ]}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-sm text-red-600 hover:underline">
              Excluir fornecedor
            </button>
            <div className="flex gap-2">
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
          </div>
        </form>

        {/* Seção gerar provisionamentos */}
        {(supplier.is_recurring || isRecurring) && supplier.recurring_amount && (
          <div className="mt-4 pt-4 border-t border-ps-navy/10">
            {!showGenerate ? (
              <button
                type="button"
                onClick={() => setShowGenerate(true)}
                className="text-sm text-ps-navy font-medium hover:text-ps-green transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                </svg>
                Gerar provisionamentos futuros
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-ps-ink">Gerar pagamentos provisionados</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ps-muted mb-1">Empresa</label>
                    <select
                      value={genCompanyId}
                      onChange={(e) => setGenCompanyId(e.target.value)}
                      className="w-full h-9 rounded-ps-sm border border-ps-navy/15 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ps-muted mb-1">Quantos meses à frente</label>
                    <select
                      value={genMonths}
                      onChange={(e) => setGenMonths(Number(e.target.value))}
                      className="w-full h-9 rounded-ps-sm border border-ps-navy/15 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
                    >
                      <option value={1}>1 mês</option>
                      <option value={2}>2 meses</option>
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                    </select>
                  </div>
                </div>
                {genResult && (
                  <p className={`text-sm ${genResult.startsWith("Erro") ? "text-red-600" : "text-ps-green"}`}>{genResult}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isPending || !genCompanyId}
                    className="bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-1.5 text-sm disabled:opacity-60"
                  >
                    {isPending ? "Gerando..." : "Gerar"}
                  </button>
                  <button type="button" onClick={() => setShowGenerate(false)} className="text-sm text-ps-muted hover:text-ps-ink">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
