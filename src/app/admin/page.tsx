import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "./dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-4 py-10">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-black/5 ring-1 ring-black/5">
          <p className="text-sm font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</p>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">Compte en attente</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Votre compte est authentifié, mais votre profil BanPum n’est pas encore activé par un administrateur.
          </p>
        </div>
      </main>
    );
  }

  if (profile.must_change_password) redirect("/admin/change-password");

  return <AdminDashboard fullName={profile.full_name || user.email || "Utilisateur"} role={profile.role} />;
}