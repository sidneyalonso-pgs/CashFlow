import { createBrowserClient } from "@supabase/ssr";

// Sem generic <Database> até os tipos reais serem gerados via
// `supabase gen types typescript` (ver src/types/database.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
