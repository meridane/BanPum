"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  fullName: string;
  role: string;
  counts: { reception: number; products: number; orders: number; returns: number };
};

const cards = [
  { key: "reception", title: "Réception", subtitle: "Lots à traiter", href: "/admin/reception" },
  { key: "products", title: "Produits", subtitle: "En stock", href: "/admin/products" },
  { key: "orders", title: "Commandes", subtitle: "À préparer", href: "/admin/orders" },
  { key: "returns", title: "Retours", subtitle: "À traiter", href: "/admin/returns" },
] as const;

export default function AdminDashboard({ fullName, role, counts }: Props) {
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
          <Link href="/admin" className="block">
            <p className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</p>
            <p className="text-lg font-bold text-neutral-900">Operations Admin</p>
          </Link>
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
          {cards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-medium text-neutral-500">{card.title}</p>
              <p className="mt-2 text-3xl font-bold text-neutral-900">{counts[card.key]}</p>
              <p className="mt-1 text-xs text-neutral-400">{card.subtitle}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/reception" className="rounded-2xl bg-[#ff5722] p-6 text-white shadow-sm transition hover:bg-[#e64a19]">
            <p className="text-sm font-medium text-white/80">Opérations</p>
            <h2 className="mt-1 text-xl font-bold">Nouvel arrivage</h2>
            <p className="mt-2 text-sm text-white/80">Créer un lot de réception et commencer l’identification des produits.</p>
          </Link>
          <Link href="/admin/stock/locations" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 hover:bg-neutral-50">
            <p className="text-sm font-medium text-neutral-500">Stock physique</p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">Réception → QR → Stock</h2>
            <p className="mt-2 text-sm text-neutral-500">Créer les zones, racks, étagères et places avec QR pour ranger chaque produit.</p>
          </Link>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-medium text-neutral-500">Système</p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">Supabase connecté</h2>
            <p className="mt-2 text-sm text-neutral-500">Les compteurs affichés viennent maintenant de la base BanPum.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
