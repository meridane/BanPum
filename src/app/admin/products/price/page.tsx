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
  proposed_price: number | null;
  official_price: number | null;
  price_status: "not_set" | "pending" | "confirmed" | "rejected";
  status: string;
};

export default function PriceConfirmationPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
    setRole(profile?.role || "");
    const { data, error: e } = await supabase
      .from("physical_products")
      .select("id,internal_ref,name,brand,model,category,proposed_price,official_price,price_status,status")
      .eq("is_deleted", false)
      .eq("price_status", "pending")
      .order("price_proposed_at", { ascending: true });
    if (e) setError(e.message);
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function confirm(product: Product) {
    if (!["owner", "main_admin"].includes(role) || product.proposed_price == null) return;
    setBusy(product.id); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setBusy(null); return; }
    const { data: full } = await supabase.from("physical_products")
      .select("official_price,proposed_price,price_status,location_id,name,category,description")
      .eq("id", product.id).single();
    const nextStatus = full?.location_id && full?.name && full?.category && full?.description ? "in_stock" : "controlled";
    const { error: e } = await supabase.from("physical_products").update({
      official_price: product.proposed_price,
      price_status: "confirmed",
      price_confirmed_by: u.user.id,
      price_confirmed_at: new Date().toISOString(),
      price_rejection_reason: null,
      status: nextStatus,
    }).eq("id", product.id);
    if (e) { setError(e.message); setBusy(null); return; }
    await supabase.from("audit_logs").insert({
      actor_user_id: u.user.id,
      action: "price_confirmed",
      object_type: "physical_product",
      object_id: product.id,
      old_data: { official_price: full?.official_price, proposed_price: full?.proposed_price, price_status: full?.price_status },
      new_data: { official_price: product.proposed_price, price_status: "confirmed", status: nextStatus },
      result: "success",
      context: { source: "price_confirmation_page" },
    });
    setMessage("Prix confirmé.");
    await load();
    setBusy(null);
  }

  if (!["owner", "main_admin"].includes(role) && !loading) {
    return <main className="min-h-screen bg-[#f7f7f5] p-8"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8"><h1 className="text-xl font-bold">Validation des prix</h1><p className="mt-2 text-sm text-neutral-500">Cette page est réservée au Owner et au Main Admin.</p><Link href="/admin/products" className="mt-5 inline-block rounded-xl bg-[#ff5722] px-4 py-2 text-sm font-semibold text-white">Retour produits</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div><Link href="/admin/products" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Prix à confirmer</h1></div>
          <Link href="/admin/products" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Produits</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6"><h2 className="text-2xl font-bold">Validation des prix officiels</h2><p className="mt-1 text-sm text-neutral-500">Les propositions des employés arrivent ici. Une confirmation crée une trace d'audit.</p></div>
        {message && <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? <p className="text-sm text-neutral-500">Chargement...</p> : products.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5"><p className="font-semibold">Aucune proposition en attente.</p><p className="mt-1 text-sm text-neutral-500">Les nouveaux prix proposés apparaîtront ici.</p></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map(p => (
              <div key={p.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-bold text-[#ff5722]">{p.internal_ref}</p><h3 className="mt-1 font-bold">{p.name || "Produit à identifier"}</h3><p className="mt-1 text-sm text-neutral-500">{[p.brand,p.model,p.category].filter(Boolean).join(" · ")}</p></div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">En attente</span>
                </div>
                <div className="mt-5 rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Prix proposé</p><p className="mt-1 text-2xl font-bold">{p.proposed_price?.toLocaleString("ko-KR")} ₩</p><p className="mt-1 text-xs text-neutral-400">Prix officiel actuel : {p.official_price != null ? p.official_price.toLocaleString("ko-KR")+" ₩" : "non défini"}</p></div>
                <div className="mt-4 flex gap-2"><Link href={`/admin/products/${p.id}`} className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold">Ouvrir</Link><button onClick={()=>confirm(p)} disabled={busy===p.id} className="flex-1 rounded-xl bg-[#ff5722] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy===p.id?"...":"Confirmer"}</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
