import { z } from "zod";

export const companySchema = z.object({
  legal_name: z.string().min(3, "Razão social obrigatória"),
  trade_name: z.string().optional(),
  cnpj: z
    .string()
    .regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "CNPJ inválido"),
  default_currency: z.string().default("BRL"),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

export type CompanyInput = z.infer<typeof companySchema>;
