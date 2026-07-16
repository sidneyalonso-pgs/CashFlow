// Tipos gerados a partir do schema Supabase.
// Regenerar com: supabase gen types typescript --project-id <id> > src/types/database.ts
// Placeholder manual enquanto o projeto Supabase ainda não existe.

export type UserRole =
  | "administrador"
  | "tesouraria"
  | "aprovador"
  | "conciliacao"
  | "fpa"
  | "visualizador";

export type PaymentStatus =
  | "rascunho"
  | "pendente_aprovacao"
  | "aprovado"
  | "rejeitado"
  | "agendado"
  | "pago_parcialmente"
  | "pago"
  | "vencido"
  | "cancelado";

export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
  };
}
