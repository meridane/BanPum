"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Product = {
  id: string; internal_ref: string; qr_code: string; name: string | null; brand: string | null;
  model: string | null; category: string | null; description: string | null;
  condition_notes: string | null; status: string; official_price: number | null; proposed_price: number | null; location_id: string | null; price_status: "not_set" | "pending" | "confirmed" | "rejected"; price_rejection_reason: string | null; ai_data?: AIData | null;
};
type Check = { id: string; general_condition: string | null; functional: boolean | null; packaging: string | null; accessories: string | null; anomalies: string | null; observations: string | null; completed_at: string | null };
type Location = { id: string; location_code: string; name: string; level_type: string; status: string };
type AIData = {
  confidence?: number; brand?: string; model?: string; reference?: string; category?: string;
  title_ko?: string; description_ko?: string; description_fr?: string;
  characteristics?: { label: string; value: string }[];
  candidates?: { brand: string; model: string; reference: string; reason: string; confidence: number }[];
  price_research?: { source_name: string; url: string; price_krw: number | null; date_note: string }[];
  price_suggestions?: { low_krw: number | null; medium_krw: number | null; high_krw: number | null };
  warnings?: string[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [product, setProduct] = useState<Product | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [condition, setCondition] = useState("Bon état");
  const [functional, setFunctional] = useState("yes");
  const [packaging, setPackaging] = useState("");
  const [accessories, setAccessories] = useState("");
  const [anomalies, setAnomalies] = useState("");
  const [observations, setObservations] = useState("");
  const [photos, setPhotos] = useState<{ id: string; storage_path: string; photo_type: string; is_main: boolean }[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [photoType, setPhotoType] = useState("label");
  const [ai, setAi] = useState<AIData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  async function load() {
    const { data: p } = await supabase.from("physical_products")
      .select("id,internal_ref,qr_code,name,brand,model,category,description,condition_notes,status,official_price,proposed_price,price_status,price_rejection_reason,location_id,ai_data")
      .eq("id", params.id).single();
    setProduct(p as Product);
    if ((p as Product | null)?.ai_data) setAi((p as Product).ai_data as AIData);
    if ((p as Product | null)?.proposed_price != null) setProposedPrice(String((p as Product).proposed_price));

    const { data: c } = await supabase.from("product_checks")
      .select("id,general_condition,functional,packaging,accessories,anomalies,observations,completed_at")
      .eq("product_id", params.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (c) {
      const x = c as Check;
      setCheck(x); setCondition(x.general_condition || "Bon état");
      setFunctional(x.functional === false ? "no" : x.functional === true ? "yes" : "na");
      setPackaging(x.packaging || ""); setAccessories(x.accessories || "");
      setAnomalies(x.anomalies || ""); setObservations(x.observations || "");
    }

    const { data: locs } = await supabase.from("locations")
      .select("id,location_code,name,level_type,status").neq("status", "disabled").order("location_code");
    setLocations((locs ?? []) as Location[]);

    const { data: ph } = await supabase.from("product_photos")
      .select("id,storage_path,photo_type,is_main").eq("product_id", params.id).order("sort_order");
    setPhotos((ph ?? []) as typeof photos);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
      setRole(profile?.role || "");
    })();
    load();
  }, [params.id]);

  async function saveCheck() {
    setSaving(true); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setSaving(false); return; }
    const payload = {
      product_id: params.id, checked_by: u.user.id, general_condition: condition,
      functional: functional === "yes" ? true : functional === "no" ? false : null,
      packaging, accessories, anomalies, observations,
      checklist: { general_condition: true, functionality: functional !== "na", packaging: !!packaging, accessories: !!accessories, anomalies: !!anomalies },
      completed_at: new Date().toISOString(),
    };
    const q = check ? supabase.from("product_checks").update(payload).eq("id", check.id) : supabase.from("product_checks").insert(payload);
    const { error: e } = await q;
    if (e) { setError(e.message); setSaving(false); return; }
    const nextStatus = functional === "no" ? "non_functional" : "controlled";
    await supabase.from("physical_products").update({ status: nextStatus, condition_notes: anomalies || observations || product?.condition_notes || null }).eq("id", params.id);
    setMessage(nextStatus === "controlled" ? "Produit contrôlé." : "Produit marqué non fonctionnel.");
    setSaving(false); load();
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setError(""); setMessage("");
    if (!file.type.startsWith("image/")) { setError("Choisis une image."); return; }
    const path = params.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const { error: e } = await supabase.storage.from("banpum-products").upload(path, file, { upsert: false });
    if (e) { setError(e.message); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("product_photos").insert({
      product_id: params.id, storage_path: path, photo_type: photoType,
      sort_order: photos.length, is_main: photos.length === 0, uploaded_by: u.user?.id,
    });
    if (dbError) { setError(dbError.message); return; }
    setMessage(photoType === "label" ? "Photo étiquette enregistrée." : "Photo enregistrée.");
    load();
  }

  async function analyzeWithAI() {
    setAiLoading(true); setError(""); setMessage("");
    const hasLabel = photos.some(p => p.photo_type === "label");
    if (!hasLabel) { setError("Ajoute d'abord une photo de l'étiquette/référence."); setAiLoading(false); return; }
    const res = await fetch("/api/admin/products/" + params.id + "/ai", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Analyse IA impossible. Vérifie les logs serveur et la configuration OpenAI.");
      setAiLoading(false);
      return;
    }
    setAi(data.aiData as AIData);
    setMessage("Analyse IA terminée. Vérifie les propositions avant de les appliquer.");
    setAiLoading(false);
    load();
  }

  async function savePriceProposal() {
    const value = Number(proposedPrice.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) { setError("Entre un prix supérieur à 0 ₩."); return; }
    setSaving(true); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setSaving(false); return; }
    const old = product;
    const { error: e } = await supabase.from("physical_products").update({
      proposed_price: value,
      price_status: "pending",
      price_proposed_by: u.user.id,
      price_proposed_at: new Date().toISOString(),
      price_rejection_reason: null,
      price_rejected_by: null,
      price_rejected_at: null,
    }).eq("id", params.id);
    if (e) { setError(e.message); setSaving(false); return; }
    await supabase.from("audit_logs").insert({
      actor_user_id: u.user.id,
      action: "price_proposed",
      object_type: "physical_product",
      object_id: params.id,
      old_data: { official_price: old?.official_price, proposed_price: old?.proposed_price, price_status: old?.price_status },
      new_data: { proposed_price: value, price_status: "pending" },
      result: "success",
      context: { source: "product_detail" },
    });
    setMessage("Prix proposé. Il doit maintenant être confirmé par le propriétaire ou le Main Admin.");
    await load();
    setSaving(false);
  }

  async function setOfficialPriceDirect() {
    const value = Number(proposedPrice.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) { setError("Entre un prix supérieur à 0 ₩."); return; }
    if (!["owner", "main_admin"].includes(role)) return;
    setSaving(true); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setSaving(false); return; }
    const old = product;
    const nextStatus = product?.location_id && product?.name && product?.category && product?.description ? "in_stock" : "controlled";
    const { error: e } = await supabase.from("physical_products").update({
      official_price: value,
      proposed_price: value,
      price_status: "confirmed",
      price_confirmed_by: u.user.id,
      price_confirmed_at: new Date().toISOString(),
      price_rejection_reason: null,
      price_rejected_by: null,
      price_rejected_at: null,
      status: nextStatus,
    }).eq("id", params.id);
    if (e) { setError(e.message); setSaving(false); return; }
    await supabase.from("audit_logs").insert({
      actor_user_id: u.user.id,
      action: "price_changed_direct",
      object_type: "physical_product",
      object_id: params.id,
      old_data: { official_price: old?.official_price, price_status: old?.price_status },
      new_data: { official_price: value, price_status: "confirmed", status: nextStatus },
      result: "success",
      context: { source: "product_detail", direct_owner_change: true },
    });
    setMessage("Prix officiel enregistré directement et historisé.");
    await load();
    setSaving(false);
  }

  async function confirmPrice() {
    if (!product?.proposed_price || !["owner", "main_admin"].includes(role)) return;
    setSaving(true); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setSaving(false); return; }
    const nextStatus = product.location_id && product.name && product.category && product.description ? "in_stock" : "controlled";
    const { error: e } = await supabase.from("physical_products").update({
      official_price: product.proposed_price,
      price_status: "confirmed",
      price_confirmed_by: u.user.id,
      price_confirmed_at: new Date().toISOString(),
      price_rejection_reason: null,
      status: nextStatus,
    }).eq("id", params.id);
    if (e) { setError(e.message); setSaving(false); return; }
    await supabase.from("audit_logs").insert({
      actor_user_id: u.user.id,
      action: "price_confirmed",
      object_type: "physical_product",
      object_id: params.id,
      old_data: { official_price: product.official_price, proposed_price: product.proposed_price, price_status: product.price_status },
      new_data: { official_price: product.proposed_price, price_status: "confirmed", status: nextStatus },
      result: "success",
      context: { source: "product_detail" },
    });
    setMessage(nextStatus === "in_stock" ? "Prix confirmé. Produit prêt en stock." : "Prix confirmé. Il reste des informations/emplacement à compléter.");
    await load();
    setSaving(false);
  }

  async function rejectPrice() {
    if (!product?.proposed_price || !["owner", "main_admin"].includes(role)) return;
    if (!rejectionReason.trim()) { setError("Indique la raison du refus."); return; }
    setSaving(true); setError(""); setMessage("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Session expirée."); setSaving(false); return; }
    const { error: e } = await supabase.from("physical_products").update({
      price_status: "rejected",
      price_rejection_reason: rejectionReason.trim(),
      price_rejected_by: u.user.id,
      price_rejected_at: new Date().toISOString(),
    }).eq("id", params.id);
    if (e) { setError(e.message); setSaving(false); return; }
    await supabase.from("audit_logs").insert({
      actor_user_id: u.user.id,
      action: "price_rejected",
      object_type: "physical_product",
      object_id: params.id,
      old_data: { proposed_price: product.proposed_price, price_status: product.price_status },
      new_data: { price_status: "rejected", reason: rejectionReason.trim() },
      result: "success",
      context: { source: "product_detail" },
    });
    setMessage("Prix refusé. L'employé peut proposer un nouveau montant.");
    await load();
    setSaving(false);
  }

  async function applyAI() {
    if (!ai) return;
    setSaving(true); setError(""); setMessage("");
    const update = {
      brand: ai.brand || product?.brand,
      model: ai.model || product?.model,
      category: ai.category || product?.category,
      name: ai.title_ko || product?.name,
      description: ai.description_ko || product?.description,
      ai_data: ai,
    };
    const { error: e } = await supabase.from("physical_products").update(update).eq("id", params.id);
    if (e) setError(e.message);
    else { setMessage("Proposition IA appliquée. Les données restent modifiables avant publication."); await load(); }
    setSaving(false);
  }

  if (!product) return <main className="min-h-screen bg-[#f7f7f5] p-8"><p>Chargement...</p></main>;

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div><Link href="/admin/products" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">{product.internal_ref}</h1></div>
          <Link href="/admin/products" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Produits</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-bold tracking-wide text-[#ff5722]">IDENTIFICATION IA</p>
              <h2 className="mt-1 text-2xl font-bold">{product.name || "Produit à identifier"}</h2>
              <p className="mt-2 text-sm text-neutral-500">{[product.brand, product.model, product.category].filter(Boolean).join(" · ") || "Informations à compléter"}</p>
              <button onClick={analyzeWithAI} disabled={aiLoading} className="mt-5 w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white disabled:opacity-60">
                {aiLoading ? "Analyse photo + recherche web..." : "✨ Identifier avec l'IA + rechercher les prix"}
              </button>
              <p className="mt-2 text-xs text-neutral-400">L'IA propose. Elle ne publie ni ne fixe automatiquement le prix officiel.</p>
              {ai && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-neutral-900 p-5 text-white">
                    <div className="flex justify-between gap-4"><div><p className="text-xs text-neutral-400">CONFIANCE</p><p className="text-2xl font-bold">{ai.confidence ?? 0}%</p></div><button onClick={applyAI} disabled={saving} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900">Appliquer</button></div>
                    <p className="mt-4 font-semibold">{ai.brand || "?"} {ai.model || ""}</p>
                    <p className="mt-1 text-sm text-neutral-300">{ai.reference || "Référence non confirmée"} · {ai.category || "Catégorie à confirmer"}</p>
                  </div>
                  {ai.candidates?.length ? <div><h3 className="font-bold">Candidats</h3><div className="mt-2 space-y-2">{ai.candidates.map((c,i)=><div key={i} className="rounded-xl border p-3 text-sm"><b>{c.brand} {c.model}</b><span className="ml-2 text-neutral-500">{c.confidence}%</span><p className="mt-1 text-neutral-500">{c.reason}</p></div>)}</div></div> : null}
                  {ai.characteristics?.length ? <div><h3 className="font-bold">Caractéristiques</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{ai.characteristics.map((c,i)=><div key={i} className="rounded-xl bg-neutral-50 p-3 text-sm"><b>{c.label}</b><p className="text-neutral-600">{c.value}</p></div>)}</div></div> : null}
                  {ai.price_research?.length ? <div><h3 className="font-bold">Recherche de prix</h3><div className="mt-2 space-y-2">{ai.price_research.map((p,i)=><div key={i} className="rounded-xl border p-3 text-sm"><b>{p.source_name}</b><p className="mt-1">{p.price_krw != null ? p.price_krw.toLocaleString("ko-KR") + " ₩" : "Prix non trouvé"}</p><a href={p.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-[#ff5722]">{p.url}</a></div>)}</div></div> : null}
                  {ai.price_suggestions && <div className="rounded-2xl border p-4"><h3 className="font-bold">Prix indicatifs IA</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm"><div><p className="text-neutral-500">Bas</p><b>{ai.price_suggestions.low_krw?.toLocaleString("ko-KR") || "-"}</b></div><div><p className="text-neutral-500">Moyen</p><b>{ai.price_suggestions.medium_krw?.toLocaleString("ko-KR") || "-"}</b></div><div><p className="text-neutral-500">Haut</p><b>{ai.price_suggestions.high_krw?.toLocaleString("ko-KR") || "-"}</b></div></div></div>}
                  {ai.warnings?.length ? <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><b>À vérifier :</b> {ai.warnings.join(" · ")}</div> : null}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-bold tracking-wide text-[#ff5722]">PRIX OFFICIEL</p>
              <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs text-neutral-500">Prix officiel</p><p className="text-2xl font-bold">{product.official_price != null ? product.official_price.toLocaleString("ko-KR") + " ₩" : "Non défini"}</p></div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-black/5">{product.price_status}</span>
                </div>
                {product.proposed_price != null && <p className="mt-3 text-sm">Proposition : <b>{product.proposed_price.toLocaleString("ko-KR")} ₩</b></p>}
                {product.price_rejection_reason && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">Refus : {product.price_rejection_reason}</p>}
              </div>
              <label className="mt-4 block text-sm font-medium">Montant proposé (₩)
                <input inputMode="numeric" value={proposedPrice} onChange={e=>setProposedPrice(e.target.value)} placeholder="ex. 59000" className="mt-2 w-full rounded-xl border px-4 py-3"/>
              </label>
              <button onClick={savePriceProposal} disabled={saving} className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-3 font-semibold disabled:opacity-60">Proposer ce prix</button>
              {["owner","main_admin"].includes(role) && (
                <button onClick={setOfficialPriceDirect} disabled={saving} className="mt-2 w-full rounded-xl bg-neutral-900 px-4 py-3 font-semibold text-white disabled:opacity-60">Définir directement comme prix officiel</button>
              )}
              {["owner","main_admin"].includes(role) && product.price_status === "pending" && product.proposed_price != null && (
                <div className="mt-4 space-y-3 rounded-2xl border border-[#ff5722]/20 bg-[#fff7f3] p-4">
                  <p className="text-sm font-bold">Validation requise</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={confirmPrice} disabled={saving} className="rounded-xl bg-[#ff5722] px-3 py-3 text-sm font-semibold text-white disabled:opacity-60">✓ Confirmer</button>
                    <button onClick={rejectPrice} disabled={saving} className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm font-semibold disabled:opacity-60">Refuser</button>
                  </div>
                  <input value={rejectionReason} onChange={e=>setRejectionReason(e.target.value)} placeholder="Raison si refus" className="w-full rounded-xl border bg-white px-3 py-3 text-sm"/>
                </div>
              )}
              <p className="mt-2 text-xs text-neutral-400">Un employé propose. Owner/Main Admin confirme. Aucun prix officiel n'est publié automatiquement.</p>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-bold tracking-wide text-[#ff5722]">CONTRÔLE</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">État général<input value={condition} onChange={e=>setCondition(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3"/></label>
                <label className="text-sm font-medium">Fonctionnel<select value={functional} onChange={e=>setFunctional(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 bg-white"><option value="yes">Oui</option><option value="no">Non</option><option value="na">Non testé / N/A</option></select></label>
                <label className="text-sm font-medium">Emballage<textarea value={packaging} onChange={e=>setPackaging(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
                <label className="text-sm font-medium">Accessoires<textarea value={accessories} onChange={e=>setAccessories(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
                <label className="text-sm font-medium sm:col-span-2">Anomalies<textarea value={anomalies} onChange={e=>setAnomalies(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Rayures, choc, pièce manquante..."/></label>
                <label className="text-sm font-medium sm:col-span-2">Observations<textarea value={observations} onChange={e=>setObservations(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>
              </div>
              {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {message&&<div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
              <button onClick={saveCheck} disabled={saving} className="mt-5 w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white disabled:opacity-60">{saving?"Enregistrement...":"Valider le contrôle"}</button>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-neutral-900 p-6 text-white">
              <p className="text-sm font-medium text-neutral-400">PHOTO ÉTIQUETTE / PRODUIT</p>
              <select value={photoType} onChange={e=>setPhotoType(e.target.value)} className="mt-3 w-full rounded-xl bg-white px-3 py-3 text-sm text-neutral-900"><option value="label">Étiquette / référence (IA)</option><option value="internal">Photo interne</option><option value="anomaly">Photo anomalie</option><option value="public">Photo publique</option></select>
              <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-neutral-700 p-5 text-center hover:bg-neutral-800"><span className="text-sm font-semibold">📷 Ajouter / prendre une photo</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto}/></label>
              <div className="mt-5 space-y-2">{photos.map(ph=><div key={ph.id} className="rounded-xl bg-white/5 p-3 text-xs"><span className="font-semibold">{ph.photo_type}</span><span className="ml-2 text-neutral-500">{ph.is_main?"principale":""}</span></div>)}</div>
              <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs text-neutral-500">QR produit</p><p className="mt-1 break-all text-xs">{product.qr_code}</p><p className="mt-5 text-xs text-neutral-500">Statut</p><p className="mt-1 font-semibold">{product.status}</p></div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-bold tracking-wide text-[#ff5722]">EMPLACEMENT</p>
              <select value={locationId} onChange={e=>setLocationId(e.target.value)} className="mt-3 w-full rounded-xl border px-3 py-3 text-sm bg-white"><option value="">Choisir un emplacement</option>{locations.map(l=><option key={l.id} value={l.id}>{l.location_code} — {l.name}</option>)}</select>
              <p className="mt-2 text-xs text-neutral-400">Pour le rangement mobile, utilise le scanner double QR du module Stock.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
