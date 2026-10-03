"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type Product = {
  id: string;
  internal_ref: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  status: string;
  condition_notes: string | null;
  created_at: string;
};

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("physical_products")
      .select("id,internal_ref,name,brand,model,category,status,condition_notes,created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div><Link href="/admin" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Produits</h1></div>
          <div className="flex gap-2"><Link href="/admin/products/price" className="rounded-xl border border-[#ff5722]/30 bg-[#fff7f3] px-4 py-2 text-sm font-semibold text-[#ff5722]">Prix à confirmer</Link><Link href="/admin/products/new" className="rounded-xl bg-[#ff5722] px-4 py-2 text-sm font-semibold text-white">Nouveau</Link><Link href="/admin" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Dashboard</Link></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6"><h2 className="text-2xl font-bold">Produits physiques</h2><p className="mt-1 text-sm text-neutral-500">Contrôle, photos, prix et préparation de publication.</p></div>
        {loading ? <p className="text-sm text-neutral-500">Chargement...</p> : products.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5"><p className="font-semibold">Aucun produit</p><p className="mt-1 text-sm text-neutral-500">Commence par créer un produit depuis un arrivage.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map(p => (
              <Link key={p.id} href={`/admin/products/${p.id}`} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#ff5722]">{p.internal_ref}</p><h3 className="mt-1 font-bold text-neutral-900">{p.name || "Produit à identifier"}</h3></div><span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium">{p.status}</span></div>
                <p className="mt-3 text-sm text-neutral-500">{[p.brand,p.model,p.category].filter(Boolean).join(" · ") || "Informations à compléter"}</p>
                {p.condition_notes && <p className="mt-3 line-clamp-2 text-xs text-amber-700">{p.condition_notes}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
