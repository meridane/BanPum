"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { createClient } from "@/lib/supabase/browser";

type Product = { id:string; internal_ref:string; name:string|null; qr_code:string; status:string; location_id:string|null };
type Location = { id:string; location_code:string; name:string; qr_code:string; status:string };

export default function ScannerPage() {
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [cameraOn,setCameraOn]=useState(false);
  const [mode,setMode]=useState<"product"|"location">("product");
  const [manual,setManual]=useState("");
  const [product,setProduct]=useState<Product|null>(null);
  const [location,setLocation]=useState<Location|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);

  function stopCamera(){
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current=null;
    readerRef.current=null;
    setCameraOn(false);
  }

  async function handleCode(raw:string){
    const code=raw.trim();
    if(!code)return;
    setError(""); setMessage("");

    if(mode==="product"){
      let id=code.startsWith("BANPUM|P|") ? code.slice(9) : "";
      if(!id) id=code;
      const {data,error:e}=await supabase.from("physical_products")
        .select("id,internal_ref,name,qr_code,status,location_id")
        .or(`id.eq.${id},qr_code.eq.${code}`).maybeSingle();
      if(e||!data){setError("Produit introuvable. Vérifie le QR.");return;}
      setProduct(data as Product);
      setMessage("Produit identifié. Maintenant scanne l'emplacement.");
      setMode("location");
    } else {
      const {data,error:e}=await supabase.from("locations")
        .select("id,location_code,name,qr_code,status")
        .eq("qr_code",code).maybeSingle();
      if(e||!data){setError("Emplacement introuvable.");return;}
      if(data.status==="disabled"||data.status==="blocked"){setError("Cet emplacement est bloqué.");return;}
      setLocation(data as Location);
      setMessage("Emplacement identifié. Vérifie puis confirme le rangement.");
    }
  }

  async function startCamera(){
    setError("");
    try{
      const reader=new BrowserMultiFormatReader();
      readerRef.current=reader;
      setCameraOn(true);
      await new Promise(r=>setTimeout(r,100));
      if(!videoRef.current) throw new Error("Caméra indisponible");
      const controls = await reader.decodeFromConstraints(
        {video:{facingMode:{ideal:"environment"}}},
        videoRef.current,
        (result)=>{ if(result) { stopCamera(); void handleCode(result.getText()); } }
      );
      controlsRef.current = controls;
    }catch(e){ setCameraOn(false); setError("Impossible d'accéder à la caméra. Autorise la caméra dans le navigateur ou utilise la saisie manuelle."); }
  }

  async function confirm(){
    if(!product||!location)return;
    setSaving(true);setError("");setMessage("");
    const {error:e}=await supabase.rpc("assign_product_location",{p_product_id:product.id,p_location_id:location.id});
    if(e){setError(e.message);setSaving(false);return;}
    setMessage(`✓ ${product.internal_ref} rangé dans ${location.location_code}`);
    setProduct(null);setLocation(null);setMode("product");setManual("");setSaving(false);
  }

  function resetFlow(){stopCamera();setProduct(null);setLocation(null);setMode("product");setManual("");setError("");setMessage("");}

  useEffect(()=>()=>stopCamera(),[]);

  return <main className="min-h-screen bg-[#f7f7f5]">
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div><Link href="/admin" className="text-xs font-bold tracking-[.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Scanner QR</h1></div>
        <Link href="/admin" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Dashboard</Link>
      </div>
    </header>

    <div className="mx-auto max-w-3xl px-4 py-8">
      <section className="rounded-3xl bg-neutral-900 p-6 text-white sm:p-8">
        <p className="text-xs font-bold tracking-[.2em] text-[#ff7043]">RANGEMENT</p>
        <h2 className="mt-2 text-2xl font-bold">Produit → Emplacement</h2>
        <p className="mt-2 text-sm text-neutral-400">Scanne d'abord le QR du produit, puis le QR de l'emplacement.</p>

        <div className="mt-6 flex gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product?"bg-green-500/20 text-green-300":"bg-white/10 text-white"}`}>1. Produit {product?"✓":""}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${location?"bg-green-500/20 text-green-300":"bg-white/10 text-white"}`}>2. Emplacement {location?"✓":""}</span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className={`aspect-video w-full object-cover ${cameraOn?"":"hidden"}`} muted playsInline />
          {!cameraOn && <div className="flex aspect-video items-center justify-center p-8 text-center text-sm text-neutral-500">Caméra inactive</div>}
        </div>

        <button onClick={startCamera} disabled={cameraOn} className="mt-4 w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white disabled:opacity-50">
          {cameraOn?"Scan en cours...":"📷 Ouvrir la caméra et scanner"}
        </button>

        <div className="mt-4">
          <p className="mb-2 text-xs text-neutral-400">Ou saisir le code manuellement</p>
          <div className="flex gap-2">
            <input value={manual} onChange={e=>setManual(e.target.value)} placeholder="BANPUM|P|... ou BANPUM|L|..." className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-sm text-neutral-900"/>
            <button onClick={()=>handleCode(manual)} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-900">Valider</button>
          </div>
        </div>

        {(product||location)&&<div className="mt-6 grid gap-3 sm:grid-cols-2">
          {product&&<div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-neutral-400">PRODUIT</p><p className="mt-1 font-bold">{product.internal_ref}</p><p className="text-sm text-neutral-300">{product.name||"Produit à identifier"}</p><p className="mt-2 text-xs text-neutral-500">Statut: {product.status}</p></div>}
          {location&&<div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-neutral-400">EMPLACEMENT</p><p className="mt-1 font-bold">{location.location_code}</p><p className="text-sm text-neutral-300">{location.name}</p><p className="mt-2 text-xs text-neutral-500">Statut: {location.status}</p></div>}
        </div>}

        {error&&<div className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {message&&<div className="mt-5 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</div>}

        {product&&location&&<button onClick={confirm} disabled={saving} className="mt-5 w-full rounded-xl bg-green-500 px-4 py-3 font-bold text-white disabled:opacity-50">{saving?"Enregistrement...":"✓ Confirmer le rangement"}</button>}
        <button onClick={resetFlow} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-neutral-300">Réinitialiser</button>
      </section>
    </div>
  </main>;
}
