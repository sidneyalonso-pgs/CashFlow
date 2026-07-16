import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-ps-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar userEmail={user.email} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
