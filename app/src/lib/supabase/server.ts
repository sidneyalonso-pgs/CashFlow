import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Sem generic <Database> até os tipos reais serem gerados via
// `supabase gen types typescript` (ver src/types/database.ts).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component sem permissão de escrita de cookie.
            // Ignorado: o middleware cuida da renovação de sessão.
          }
        },
      },
    }
  );
}
