import { SignOutButton } from "./SignOutButton";

export function Topbar({ userEmail }: { userEmail?: string }) {
  return (
    <header className="sticky top-0 z-10 h-16 border-b border-ps-navy/10 bg-white/85 backdrop-blur-sm flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-ps-muted">{userEmail}</span>
        <span className="w-px h-4 bg-ps-navy/10" />
        <SignOutButton />
      </div>
    </header>
  );
}
