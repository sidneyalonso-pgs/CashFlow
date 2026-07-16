import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Uso exclusivo em rotas de servidor (cron/jobs) que precisam ignorar RLS.
// NUNCA importar este arquivo em código que roda no browser.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
