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
  description: string | null;
  official_price: number | null;
  price_status: string;
  status: string;
  location_id: string | null;
};

export default function PublicationPage() {
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
    const { data, error: e } = await supabase.from("physical_products")
      .select("id,internal_ref,name,brand,model,category,description,official_price,price_status,status,location_id")
      .eq("is_deleted", false)
      .in("status", ["controlled", "in_stock", "ready_for_publication"])
      .order("created_at", { ascending: false });
    if (e) setError(e.message);
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function checks(p: Product) {
    return [
      { label: "Nom", ok: !!p.name },
      { label: "Catégorie", ok: !!p.category },
      { label: "Description", ok: !!p.description },
      { label: "Prix officiel confirmé", ok: p.official_price != null && p.price_status === "confirmed" },
      { label: "Emplacement", ok: !!p.location_id },
    ];
  }

  async function prepare(p: Product) {
    if (!["owner","main_admin"].includes(role)) return;
    const missing = checks(p).filter(x=>!x.ok);
    if (missing.length) { setError("Impossible de préparer : " + missing.map(x=>x.label).join(", ") + "."); return; }
    setBusy(p.id); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setBusy(null); return; }
    const { error: e } = await supabase.from("physical_products").update({ status:"ready_for_publication" }).eq("id",p.id);
    if (e) { setError(e.message); setBusy(null); return; }
    await supabase.from("audit_logs").insert({
      actor_user_id:u.user.id,
      action:"publication_prepared",
      object_type:"physical_product",
      object_id:p.id,
      old_data:{status:p.status},
      new_data:{status:"ready_for_publication"},
      result:"success",
      context:{source:"publication_page"},
    });
    setMessage("Produit préparé pour publication.");
    await load();
    setBusy(null);
  }

  if (!["owner","main_admin"].includes(role) && !loading) {
    return <main className="min-h-screen bg-[#f7f7f5] p-8"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8"><h1 className="text-xl font-bold">Préparation publication</h1><p className="mt-2 text-sm text-neutral-500">Cette action est réservée au Owner et au Main Admin.</p><Link href="/admin/products" className="mt-5 inline-block rounded-xl bg-[#ff5722] px-4 py-2 text-sm font-semibold text-white">Retour produits</Link></div></main>;
  }

  return <main className="min-h-screen bg-[#f7f7f5]">
    <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><Link href="/admin/products" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Préparer la publication</h1></div><Link href="/admin/products" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Produits</Link></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6"><h2 className="text-2xl font-bold">Checklist avant publication</h2><p className="mt-1 text-sm text-neutral-500">Aucune publication Shopify n'est déclenchée ici. On prépare d'abord le produit.</p></div>
      {message&&<div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {error&&<div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading?<p className="text-sm text-neutral-500">Chargement...</p>:products.length===0?<div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5"><p className="font-semibold">Aucun produit à préparer.</p></div>:
      <div className="grid gap-4 lg:grid-cols-2">{products.map(p=>{const c=checks(p);const ok=c.every(x=>x.ok);return <div key={p.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-[#ff5722]">{p.internal_ref}</p><h3 className="mt-1 font-bold">{p.name||"Produit à identifier"}</h3><p className="mt-1 text-sm text-neutral-500">{[p.brand,p.model,p.category].filter(Boolean).join(" · ")}</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">{p.status}</span></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">{c.map(x=><div key={x.label} className={`rounded-xl p-3 text-sm ${x.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>{x.ok?"✓":"✕"} {x.label}</div>)}</div>
        <div className="mt-4 flex gap-2"><Link href={`/admin/products/${p.id}`} className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-center text-sm font-semibold">Ouvrir</Link><button onClick={()=>prepare(p)} disabled={!ok||busy===p.id||p.status==="ready_for_publication"} className="flex-1 rounded-xl bg-[#ff5722] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{p.status==="ready_for_publication"?"Prêt":"Préparer"}</button></div>
      </div>})}</div>}
    </div>
  </main>;
}
