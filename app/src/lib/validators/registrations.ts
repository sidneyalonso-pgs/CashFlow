import { z } from "zod";

export const supplierSchema = z.object({
  legal_name: z.string().min(3, "Nome obrigatório"),
  tax_id: z.string().min(11, "CPF/CNPJ obrigatório"),
  person_type: z.enum(["fisica", "juridica"]),
  trade_name: z.string().optional(),
  pix_key: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const bankAccountSchema = z.object({
  company_id: z.string().uuid("Selecione a empresa"),
  bank_name: z.string().min(2, "Banco obrigatório"),
  bank_code: z.string().optional(),
  branch: z.string().optional(),
  account_number: z.string().min(1, "Número da conta obrigatório"),
  nickname: z.string().optional(),
  account_type: z.enum([
    "conta_corrente",
    "conta_pagamento",
    "conta_arrecadadora",
    "conta_garantia",
    "conta_investimento",
    "conta_restrita",
    "outra",
  ]),
  currency: z.string().default("BRL"),
  initial_balance: z.coerce.number().default(0),
  counts_as_available_cash: z.coerce.boolean().default(true),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const categorySchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  allowed_direction: z.enum(["entrada", "saida", "ambas"]).default("ambas"),
  financial_nature: z.string().optional(),
  economic_classification: z.string().optional(),
  fpa_classification: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const costCenterSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  name: z.string().min(2, "Nome obrigatório"),
  company_id: z.string().uuid("Selecione a empresa"),
  responsible_area: z.string().optional(),
  manager_name: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});
export type CostCenterInput = z.infer<typeof costCenterSchema>;

export const projectSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  name: z.string().min(2, "Nome obrigatório"),
  company_id: z.string().uuid("Selecione a empresa"),
  cost_center_id: z.string().uuid().optional().or(z.literal("")),
  responsible_name: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});
export type ProjectInput = z.infer<typeof projectSchema>;
