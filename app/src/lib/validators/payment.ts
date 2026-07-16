import { z } from "zod";

export const paymentSchema = z.object({
  company_id: z.string().uuid("Selecione a empresa"),
  supplier_id: z.string().uuid("Selecione o fornecedor"),
  description: z.string().min(3, "Descrição obrigatória"),
  gross_amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  currency: z.string().default("BRL"),
  document_date: z.string(),
  due_date: z.string(),
  expected_payment_date: z.string(),
  competence_date: z.string(),
  category_id: z.string().uuid("Selecione a categoria"),
  document_number: z.string().min(1, "Informe o número do documento"),
  subcategory_id: z.string().uuid().optional(),
  cost_center_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  payment_method: z
    .enum(["pix", "ted", "boleto", "debito_automatico", "cartao", "transferencia_interna", "outro"])
    .optional(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
