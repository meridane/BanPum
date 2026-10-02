"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Product = { id:string; internal_ref:string; qr_code:string; name:string|null; brand:string|null; model:string|null; category:string|null; description:string|null; condition_notes:string|null; status:string; official_price:number|null; };
type Check = { id:string; general_condition:string|null; functional:boolean|null; packaging:string|null; accessories:string|null; anomalies:string|null; observations:string|null; completed_at:string|null; };

export default function ProductDetailPage() {
  const params=useParams<{id:string}>();
  const supabase=createClient();
  const [product,setProduct]=useState<Product|null>(null);
  const [check,setCheck]=useState<Check|null>(null);
  const [condition,setCondition]=useState("Bon état");
  const [functional,setFunctional]=useState("yes");
  const [packaging,setPackaging]=useState("");
  const [accessories,setAccessories]=useState("");
  const [anomalies,setAnomalies]=useState("");
  const [observations,setObservations]=useState("");
  const [photos,setPhotos]=useState<{id:string;storage_path:string;photo_type:string;is_main:boolean}[]>([]);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function load() {
    const {data:p}=await supabase.from("physical_products").select("id,internal_ref,qr_code,name,brand,model,category,description,condition_notes,status,official_price").eq("id",params.id).single();
    setProduct(p as Product);
    const {data:c}=await supabase.from("product_checks").select("id,general_condition,functional,packaging,accessories,anomalies,observations,completed_at").eq("product_id",params.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(c){const x=c as Check;setCheck(x);setCondition(x.general_condition||"Bon état");setFunctional(x.functional===false?"no":x.functional===true?"yes":"na");setPackaging(x.packaging||"");setAccessories(x.accessories||"");setAnomalies(x.anomalies||"");setObservations(x.observations||"");}
    const {data:ph}=await supabase.from("product_photos").select("id,storage_path,photo_type,is_main").eq("product_id",params.id).order("sort_order");
    setPhotos((ph??[]) as typeof photos);
  }

  useEffect(()=>{load()},[params.id]);

  async function saveCheck() {
    setSaving(true);setError("");setMessage("");
    const {data:u}=await supabase.auth.getUser(); if(!u.user){setError("Session expirée.");setSaving(false);return;}
    const payload={product_id:params.id,checked_by:u.user.id,general_condition:condition,functional:functional==="yes"?true:functional==="no"?false:null,packaging,accessories,anomalies,observations,checklist:{general_condition:true,functionality:functional!=="na",packaging:!!packaging,accessories:!!accessories,anomalies:!!anomalies},completed_at:new Date().toISOString()};
    const q=check ? supabase.from("product_checks").update(payload).eq("id",check.id) : supabase.from("product_checks").insert(payload);
    const {error:e}=await q;
    if(e){setError(e.message);setSaving(false);return;}
    const nextStatus=functional==="no"?"non_functional":"controlled";
    await supabase.from("physical_products").update({status:nextStatus,condition_notes:anomalies||observations||product?.condition_notes||null}).eq("id",params.id);
    setMessage(nextStatus==="controlled"?"Produit contrôlé.":"Produit marqué non fonctionnel.");
    setSaving(false);load();
  }

  async function uploadPhoto(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; if(!file)return;
    setError("");setMessage("");
    if(!file.type.startsWith("image/")){setError("Choisis une image.");return;}
    const path=`${params.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const {error:e}=await supabase.storage.from("banpum-products").upload(path,file,{upsert:false});
    if(e){setError(e.message);return;}
    const {data:u}=await supabase.auth.getUser();
    const {error:dbError}=await supabase.from("product_photos").insert({product_id:params.id,storage_path:path,photo_type:"internal",sort_order:photos.length,is_main:photos.length===0,uploaded_by:u.user?.id});
    if(dbError){setError(dbError.message);return;}
    setMessage("Photo enregistrée.");load();
  }

  if(!product) return <main className="min-h-screen bg-[#f7f7f5] p-8"><p>Chargement...</p></main>;

  return <main className="min-h-screen bg-[#f7f7f5]">
    <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><Link href="/admin/products" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">{product.internal_ref}</h1></div><Link href="/admin/products" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Produits</Link></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold tracking-wide text-[#ff5722]">CONTRÔLE PRODUIT</p>
          <h2 className="mt-1 text-2xl font-bold">{product.name||"Produit à identifier"}</h2>
          <p className="mt-2 text-sm text-neutral-500">{[product.brand,product.model,product.category].filter(Boolean).join(" · ")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">État général<input value={condition} onChange={e=>setCondition(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3"/></label>
            <label className="text-sm font-medium">Fonctionnel<select value={functional} onChange={e=>setFunctional(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 bg-white"><option value="yes">Oui</option><option value="no">Non</option><option value="na">Non testé / N/A</option></select></label>
            <label className="text-sm font-medium">Emballage<textarea value={packaging} onChange={e=>setPackaging(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3"/></label>
            <label className="text-sm font-medium">Accessoires<textarea value={accessories} onChange={e=>setAccessories(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3"/></label>
            <label className="text-sm font-medium sm:col-span-2">Anomalies<textarea value={anomalies} onChange={e=>setAnomalies(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3" placeholder="Rayures, choc, pièce manquante..."/></label>
            <label className="text-sm font-medium sm:col-span-2">Observations<textarea value={observations} onChange={e=>setObservations(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3"/></label>
          </div>
          {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message&&<div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
          <button onClick={saveCheck} disabled={saving} className="mt-5 w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white disabled:opacity-60">{saving?"Enregistrement...":"Valider le contrôle"}</button>
        </section>
        <aside className="rounded-3xl bg-neutral-900 p-6 text-white">
          <p className="text-sm font-medium text-neutral-400">PHOTOS</p>
          <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-neutral-700 p-5 text-center hover:bg-neutral-800"><span className="text-sm font-semibold">+ Ajouter une photo</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto}/></label>
          <div className="mt-5 space-y-3">{photos.length===0?<p className="text-sm text-neutral-500">Aucune photo.</p>:photos.map(ph=><div key={ph.id} className="rounded-xl bg-white/5 p-3"><p className="text-xs text-neutral-300">{ph.photo_type}{ph.is_main?" · principale":""}</p><p className="mt-1 break-all text-[11px] text-neutral-500">{ph.storage_path}</p></div>)}</div>
          <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs text-neutral-500">QR</p><p className="mt-1 break-all text-xs">{product.qr_code}</p><p className="mt-5 text-xs text-neutral-500">Statut</p><p className="mt-1 font-semibold">{product.status}</p></div>
        </aside>
      </div>
    </div>
  </main>;
}
