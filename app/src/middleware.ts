import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão a cada navegação e restringe a rota por papel.
 *
 * A renovação é o motivo original: o cliente do servidor não consegue gravar cookie a partir de
 * um Server Component, e contava com um middleware que nunca chegou a existir — a sessão só
 * durava o que o token durasse.
 *
 * A restrição atende ao perfil "diretoria", que enxerga apenas a Posição Executiva de Recursos.
 * Esconder item de menu não é controle de acesso: quem soubesse o endereço entraria assim mesmo.
 * Aqui a rota é barrada no servidor, antes de a página renderizar. A leitura dos dados em si
 * continua governada pelas policies do banco, que é onde ela tem de ser garantida.
 */

/** Rotas liberadas para quem só pode ver a dashboard executiva. */
const LIBERADAS_DIRETORIA = ["/", "/configuracoes/senha", "/configuracoes/2fa"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // renova a sessão; sem isto o cookie não é atualizado durante a navegação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;

  // rota já permitida para todo mundo: não custa uma consulta de papel
  if (!user || LIBERADAS_DIRETORIA.includes(caminho)) return response;

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (perfil?.role === "diretoria") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: [
    // tudo, menos arquivos estáticos, imagem otimizada, favicon e a tela de login
    "/((?!_next/static|_next/image|favicon.ico|login|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
