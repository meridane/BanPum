"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/browser";

type Location={id:string;parent_id:string|null;location_code:string;name:string;level_type:string;qr_code:string;status:string;capacity:number|null};

const levels=[["store","Magasin"],["zone","Zone"],["rack","Rack"],["shelf","Étagère"],["place","Place"]];

export default function LocationsPage(){
  const supabase=createClient();
  const [locations,setLocations]=useState<Location[]>([]);
  const [name,setName]=useState(""); const [level,setLevel]=useState("zone"); const [parent,setParent]=useState(""); const [capacity,setCapacity]=useState("");
  const [selected,setSelected]=useState<Location|null>(null); const [qr,setQr]=useState(""); const [error,setError]=useState(""); const [saving,setSaving]=useState(false);

  async function load(){const {data}=await supabase.from("locations").select("id,parent_id,location_code,name,level_type,qr_code,status,capacity").order("location_code");setLocations((data??[]) as Location[]);}
  useEffect(()=>{load()},[]);

  async function createLocation(){
    setSaving(true);setError("");
    if(!name.trim()){setError("Nom obligatoire.");setSaving(false);return;}
    const prefix={store:"MAG",zone:"ZON",rack:"RCK",shelf:"SHF",place:"PLC"}[level]||"LOC";
    const code=`${prefix}-${Date.now().toString(36).toUpperCase()}`;
    const qrCode=`BANPUM|L|${code}`;
    const {error:e}=await supabase.from("locations").insert({location_code:code,name:name.trim(),level_type:level,parent_id:parent||null,qr_code:qrCode,capacity:capacity?Number(capacity):null,status:"available"});
    if(e){setError(e.message);setSaving(false);return;}
    setName("");setParent("");setCapacity("");setSaving(false);load();
  }
  async function selectLocation(l:Location){setSelected(l);setQr(await QRCode.toDataURL(l.qr_code,{width:320,margin:2}));}
  function printQr(){if(!selected||!qr)return;const w=window.open("","_blank","width=500,height=600");if(!w)return;w.document.write(`<html><body style="font-family:Arial;text-align:center;padding:40px"><h2>BANPUM</h2><img src="${qr}" style="width:280px"><h2>${selected.location_code}</h2><p>${selected.name}</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

  return <main className="min-h-screen bg-[#f7f7f5]">
    <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><Link href="/admin" className="text-xs font-bold tracking-[.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Emplacements</h1></div><Link href="/admin" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Dashboard</Link></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8"><div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5"><p className="text-xs font-bold tracking-wide text-[#ff5722]">STRUCTURE STOCK</p><h2 className="mt-1 text-2xl font-bold">Nouvel emplacement</h2>
        <div className="mt-6 space-y-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nom ex. Rack A" className="w-full rounded-xl border border-neutral-200 px-4 py-3"/>
          <select value={level} onChange={e=>setLevel(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 bg-white">{levels.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          <select value={parent} onChange={e=>setParent(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 bg-white"><option value="">Sans parent</option>{locations.map(l=><option key={l.id} value={l.id}>{l.location_code} — {l.name}</option>)}</select>
          <input type="number" min="0" value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="Capacité (optionnel)" className="w-full rounded-xl border border-neutral-200 px-4 py-3"/>
          {error&&<div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button onClick={createLocation} disabled={saving} className="w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white disabled:opacity-60">{saving?"Création...":"Créer + QR emplacement"}</button>
        </div>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5"><div className="flex justify-between"><div><p className="text-sm text-neutral-500">Stock physique</p><h2 className="text-2xl font-bold">Emplacements</h2></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs">{locations.length}</span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{locations.map(l=><button key={l.id} onClick={()=>selectLocation(l)} className="rounded-2xl border border-neutral-100 p-4 text-left hover:border-[#ff5722]"><div className="flex justify-between"><span className="font-bold">{l.location_code}</span><span className="text-xs text-neutral-500">{l.status}</span></div><p className="mt-1 text-sm">{l.name}</p><p className="mt-2 text-xs text-neutral-400">{l.level_type}{l.capacity!==null?` · capacité ${l.capacity}`:""}</p></button>)}</div>
      </section>
    </div>
    {selected&&<div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={()=>setSelected(null)}><div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center" onClick={e=>e.stopPropagation()}><p className="text-xs font-bold text-[#ff5722]">{selected.location_code}</p><h3 className="mt-1 text-xl font-bold">{selected.name}</h3><img src={qr} className="mx-auto mt-5 h-64 w-64" alt="QR emplacement"/><button onClick={printQr} className="mt-5 w-full rounded-xl bg-neutral-900 px-4 py-3 font-semibold text-white">Imprimer</button></div></div>}
    </div>
  </main>
}
