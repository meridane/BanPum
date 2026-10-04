"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Product = { id:string; internal_ref:string; name:string|null; brand:string|null; model:string|null; category:string|null; status:string; condition_notes:string|null; created_at:string };

const statusLabel: Record<string,string> = {
  received:"Réceptionné", pending_control:"À contrôler", controlled:"Contrôlé",
  ready_for_publication:"Prêt à publier", in_stock:"En stock", published:"Publié",
  non_functional:"Non fonctionnel", for_parts:"Pour pièces"
};

export default function ProductsPage(){
  const supabase=createClient();
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");

  async function load(){
    const {data}=await supabase.from("physical_products")
      .select("id,internal_ref,name,brand,model,category,status,condition_notes,created_at")
      .eq("is_deleted",false).order("created_at",{ascending:false});
    setProducts((data??[]) as Product[]); setLoading(false);
  }
  useEffect(()=>{load()},[]);

  const visible=filter==="all"?products:products.filter(p=>p.status===filter);

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5722]">2 · Contrôle & Produits</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Produits</h1>
        <p className="mt-1 text-sm text-slate-500">Une fiche unique pour suivre chaque produit jusqu'à la publication.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/admin/products/price" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Prix à confirmer</Link>
        <Link href="/admin/products/new" className="rounded-xl bg-[#ff5722] px-4 py-2.5 text-sm font-bold text-white">+ Nouveau produit</Link>
      </div>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ["Tous", "all"], ["À contrôler", "pending_control"], ["En stock", "in_stock"], ["Prêts à publier", "ready_for_publication"]
      ].map(([label,value])=><button key={value} onClick={()=>setFilter(value)} className={"rounded-xl border px-4 py-3 text-left "+(filter===value?"border-orange-200 bg-orange-50":"border-slate-200 bg-white")}>
        <div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 text-xl font-bold text-slate-950">{value==="all"?products.length:products.filter(p=>p.status===value).length}</div>
      </button>)}
    </div>

    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-950">Catalogue physique</h2><p className="mt-1 text-xs text-slate-400">{visible.length} produit(s)</p></div>
      {loading ? <div className="p-8 text-sm text-slate-400">Chargement...</div> : visible.length===0 ? <div className="p-12 text-center"><p className="font-semibold text-slate-700">Aucun produit dans cette étape.</p><p className="mt-1 text-sm text-slate-400">Les produits apparaîtront automatiquement ici.</p></div> :
      <div className="divide-y divide-slate-100">
        {visible.map(p=><Link key={p.id} href={`/admin/products/${p.id}`} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-orange-50/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#ff5722]">{p.internal_ref}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{statusLabel[p.status]||p.status}</span></div><div className="mt-1 truncate font-semibold text-slate-900">{p.name||"Produit à identifier"}</div><div className="mt-1 truncate text-xs text-slate-400">{[p.brand,p.model,p.category].filter(Boolean).join(" · ")||"Informations à compléter"}</div></div>
          <div className="flex items-center gap-4 text-xs text-slate-400"><span>Fiche produit</span><span className="text-[#ff5722]">→</span></div>
        </Link>)}
      </div>}
    </div>
  </div>;
}
