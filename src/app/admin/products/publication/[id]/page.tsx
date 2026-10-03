"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Product = {
  id: string; internal_ref: string; qr_code: string; name: string | null; brand: string | null;
  model: string | null; category: string | null; description: string | null;
  condition_notes: string | null; official_price: number | null; price_status: string;
  status: string; location_id: string | null; publication_approved_at: string | null;
  publication_approval_note: string | null;
};
type Photo = { id:string; storage_path:string; photo_type:string; is_main:boolean; url?:string };

export default function PublicationPreviewPage() {
  const params = useParams<{id:string}>();
  const supabase=createClient();
  const [product,setProduct]=useState<Product|null>(null);
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [role,setRole]=useState("");
  const [note,setNote]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [shopifyPublishing,setShopifyPublishing]=useState(false);

  async function load(){
    setLoading(true); setError("");
    const {data:u}=await supabase.auth.getUser();
    if(!u.user){setError("Session expirée.");setLoading(false);return;}
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",u.user.id).maybeSingle();
    setRole(profile?.role||"");
    const {data:p,error:pe}=await supabase.from("physical_products")
      .select("id,internal_ref,qr_code,name,brand,model,category,description,condition_notes,official_price,price_status,status,location_id,publication_approved_at,publication_approval_note")
      .eq("id",params.id).single();
    if(pe){setError(pe.message);setLoading(false);return;}
    setProduct(p as Product);
    setNote((p as Product).publication_approval_note||"");
    const {data:ph}=await supabase.from("product_photos")
      .select("id,storage_path,photo_type,is_main").eq("product_id",params.id).order("sort_order");
    const mapped:Photo[]=[];
    for(const x of (ph||[]) as Photo[]){
      const {data:s}=await supabase.storage.from("banpum-products").createSignedUrl(x.storage_path,600);
      mapped.push({...x,url:s?.signedUrl});
    }
    setPhotos(mapped);
    setLoading(false);
  }
  useEffect(()=>{load()},[params.id]);

  const ready=!!product && product.status==="ready_for_publication" && product.official_price!=null &&
    product.price_status==="confirmed" && !!product.name && !!product.category && !!product.description && !!product.location_id;

  async function publishToShopify(){
    if(!product || !product.publication_approved_at || !ready || !["owner","main_admin"].includes(role)) return;
    setShopifyPublishing(true); setError(""); setMessage("");
    try {
      const res=await fetch(`/api/admin/products/${product.id}/shopify/publish`,{method:"POST"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Erreur de synchronisation Shopify.");
      setMessage(`✓ Produit publié sur Shopify. ID: ${data.shopifyProductId}`);
      await load();
    } catch(e){ setError(e instanceof Error?e.message:"Erreur Shopify."); }
    finally { setShopifyPublishing(false); }
  }

  async function approve(){
    if(!product || !["owner","main_admin"].includes(role) || !ready)return;
    setSaving(true);setError("");setMessage("");
    const {data:u}=await supabase.auth.getUser();
    if(!u.user){setError("Session expirée.");setSaving(false);return;}
    const {error:e}=await supabase.from("physical_products").update({
      publication_approved_by:u.user.id,
      publication_approved_at:new Date().toISOString(),
      publication_approval_note:note.trim()||null
    }).eq("id",product.id);
    if(e){setError(e.message);setSaving(false);return;}
    await supabase.from("audit_logs").insert({
      actor_user_id:u.user.id, action:"publication_approved", object_type:"physical_product",
      object_id:product.id, old_data:{publication_approved_at:product.publication_approved_at},
      new_data:{publication_approved_at:new Date().toISOString(),note:note.trim()||null},
      result:"success", context:{source:"publication_preview"}
    });
    setMessage("Publication validée. Le produit est maintenant prêt pour la synchronisation Shopify.");
    await load();setSaving(false);
  }

  if(loading)return <main className="min-h-screen bg-[#f7f7f5] p-8"><p>Chargement...</p></main>;

  return <main className="min-h-screen bg-[#f7f7f5]">
    <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
      <div><Link href="/admin/products/publication" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Aperçu avant publication</h1></div>
      <Link href="/admin/products/publication" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Retour</Link>
    </div></header>
    <div className="mx-auto max-w-5xl px-4 py-8">
      {error&&<div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message&&<div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</div>}
      {!product?<div className="rounded-3xl bg-white p-8">Produit introuvable.</div>:
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.length?photos.map(p=><div key={p.id} className="overflow-hidden rounded-2xl bg-neutral-100">{p.url?<img src={p.url} alt="" className="aspect-square w-full object-cover"/>:<div className="aspect-square p-4 text-xs">Image indisponible</div>}<p className="px-3 py-2 text-xs text-neutral-500">{p.photo_type}{p.is_main?" · principale":""}</p></div>):<div className="col-span-full rounded-2xl bg-neutral-100 p-8 text-center text-sm text-neutral-500">Aucune photo</div>}</div>
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold tracking-[0.18em] text-[#ff5722]">{product.internal_ref}</p>
          <h2 className="mt-2 text-2xl font-bold">{product.name||"Sans nom"}</h2>
          <p className="mt-2 text-sm text-neutral-500">{[product.brand,product.model,product.category].filter(Boolean).join(" · ")}</p>
          <div className="mt-5 rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Prix</p><p className="text-2xl font-bold">{product.official_price?.toLocaleString("ko-KR")} ₩</p></div>
          <div className="mt-5 space-y-4"><div><p className="text-xs font-semibold text-neutral-500">Description</p><p className="mt-1 whitespace-pre-wrap text-sm">{product.description||"—"}</p></div><div><p className="text-xs font-semibold text-neutral-500">État / anomalies</p><p className="mt-1 whitespace-pre-wrap text-sm">{product.condition_notes||"Aucune note"}</p></div></div>
          <div className="mt-6 rounded-2xl border border-neutral-200 p-4"><p className="font-semibold">Statut publication</p><p className="mt-1 text-sm text-neutral-500">{product.publication_approved_at?"✓ Validation finale enregistrée":"En attente de validation finale"}</p></div>
          {["owner","main_admin"].includes(role)&&<><label className="mt-5 block text-sm font-medium">Note interne (optionnel)<textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-3 py-3"/></label><button onClick={approve} disabled={!ready||saving} className="mt-3 w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white disabled:opacity-40">{saving?"Validation...":product.publication_approved_at?"Revalider":"Valider pour Shopify"}</button>{product.publication_approved_at&&<button onClick={publishToShopify} disabled={!ready||shopifyPublishing||product.status==="published"} className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-40">{shopifyPublishing?"Synchronisation...":product.status==="published"?"✓ Publié sur Shopify":"🚀 Publier sur Shopify"}</button>}<p className="mt-2 text-xs text-neutral-400">{ready?"Validation et synchronisation Shopify sont séparées.":"Le produit doit être complet, en statut ready_for_publication et avoir un prix confirmé."}</p></>}
        </section>
      </div>}
    </div>
  </main>;
}
