import { SignOutButton } from "./SignOutButton";

// Faixa verde do topo: o conteúdo claro entra por baixo com o canto superior esquerdo arredondado
export function Topbar({ userEmail }: { userEmail?: string }) {
  return (
    <header className="sticky top-0 z-10 h-16 bg-ps-navy flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/70">{userEmail}</span>
        <span className="w-px h-4 bg-white/20" />
        <SignOutButton />
      </div>
    </header>
  );
}
