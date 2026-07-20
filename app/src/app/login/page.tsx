import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialStep: "password" | "mfa" = "password";

  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      initialStep = "mfa";
    } else {
      redirect("/");
    }
  }

  return (
    <div className="min-h-screen bg-ps-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-ps shadow-ps p-8">
        <img src="/logos/pagsmile-logo-navy.png" alt="PagSmile" className="h-8 mb-6" />
        <h1 className="text-xl font-bold text-ps-ink mb-1">PagSmile Treasury</h1>
        <p className="text-sm text-ps-muted mb-6">Gestão de caixa, pagamentos e conciliação</p>

        <LoginForm initialStep={initialStep} />
      </div>
    </div>
  );
}
