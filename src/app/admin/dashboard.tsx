"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  fullName: string;
  role: string;
};

const cards = [
  ["Réception", "0", "Lots à traiter"],
  ["Produits", "0", "En stock"],
  ["Commandes", "0", "À préparer"],
  ["Retours", "0", "À traiter"],
];

export default function AdminDashboard({ fullName, role }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</p>
            <p className="text-lg font-bold text-neutral-900">Operations Admin</p>
          </div>
          <button onClick={signOut} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-neutral-900 p-6 text-white sm:p-8">
          <p className="text-sm text-neutral-300">Bienvenue</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{fullName}</h1>
          <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-200">
            {role}
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([title, value, subtitle]) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-medium text-neutral-500">{title}</p>
              <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
              <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-bold text-neutral-900">Prochaine étape</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            La connexion Supabase est maintenant en place. Nous allons construire les modules BanPum à partir des données réelles : réception, produits, QR, stock, commandes, livraison, retours et commissions.
          </p>
        </section>
      </div>
    </main>
  );
}