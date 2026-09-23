import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão a cada navegação e restringe a rota por papel.
 *
 * A renovação é o motivo original: o cliente do servidor não consegue gravar cookie a partir de
 * um Server Component, e contava com um middleware que nunca chegou a existir — a sessão só
 * durava o que o token durasse.
 *
 * A restrição atende aos perfis "diretoria" (só a Posição Executiva de Recursos) e "piloto" (só
 * a Central Piloto). Esconder item de menu não é controle de acesso: quem soubesse o endereço
 * entraria assim mesmo. Aqui a rota é barrada no servidor, antes de a página renderizar. A
 * leitura dos dados em si continua governada pelas policies do banco, que é onde ela tem de
 * ser garantida.
 */

/** Rotas liberadas para quem só pode ver a dashboard executiva. */
const LIBERADAS_DIRETORIA = ["/", "/configuracoes/senha", "/configuracoes/2fa"];

/** Rotas liberadas para quem só pode lançar na Central Piloto (prefixo — cobre sub-rotas). */
const PREFIXOS_PILOTO = ["/operacoes/central-piloto", "/print/salva-guarda"];
const LIBERADAS_PILOTO = ["/configuracoes/senha", "/configuracoes/2fa"];

/** Único lugar acessível pra quem ainda não configurou o segundo fator — precisa dar pra
 * chegar lá e cadastrar antes de qualquer outra tela liberar. */
const ROTAS_SETUP_MFA = ["/configuracoes/2fa", "/configuracoes/senha"];

function pilotoPodeAcessar(caminho: string) {
  return LIBERADAS_PILOTO.includes(caminho) || PREFIXOS_PILOTO.some((p) => caminho === p || caminho.startsWith(p + "/"));
}

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

  // sem sessão: manda pro login em vez de deixar passar — a página em si pode até checar de
  // novo, mas o controle de acesso não pode depender só disso (visto num invasor real usando
  // uma conta criada por fora do fluxo normal)
  if (!user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  // MFA obrigatório pra todo mundo: sem fator cadastrado, só dá pra ir pra tela de 2FA/senha.
  // getAuthenticatorAssuranceLevel() só sobe currentLevel pra "aal2" depois do desafio no
  // login (já forçado em login/actions.ts); currentLevel === nextLevel === "aal1" quer dizer
  // que a conta nunca cadastrou fator nenhum.
  if (!ROTAS_SETUP_MFA.includes(caminho)) {
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal1")) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/configuracoes/2fa";
      destino.search = "";
      return NextResponse.redirect(destino);
    }
  }

  // rota já permitida para os dois perfis restritos: não custa uma consulta de papel
  if (LIBERADAS_DIRETORIA.includes(caminho) && LIBERADAS_PILOTO.includes(caminho)) return response;

  const { data: perfil, error: perfilError } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  // falha ao ler o perfil: nega em vez de deixar passar sem restrição (fail-closed) — um erro
  // transitório não pode virar uma brecha pra quem deveria estar restrito a poucas telas
  if (perfilError) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (perfil?.role === "diretoria" && !LIBERADAS_DIRETORIA.includes(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (perfil?.role === "piloto" && !pilotoPodeAcessar(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/operacoes/central-piloto";
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
