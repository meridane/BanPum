"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/browser";

type Batch = { id: string; batch_ref: string; received_count: number; expected_count: number };
type CreatedProduct = { product_id: string; internal_ref: string; qr_code: string };

export default function NewProductPage() {
  const supabase = createClient();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [created, setCreated] = useState<CreatedProduct | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadBatches() {
    const { data } = await supabase
      .from("receiving_batches")
      .select("id,batch_ref,received_count,expected_count")
      .order("received_at", { ascending: false });
    const list = (data ?? []) as Batch[];
    setBatches(list);
    if (!batchId && list[0]) setBatchId(list[0].id);
    setLoading(false);
  }

  useEffect(() => { loadBatches(); }, []);

  async function createProduct() {
    setError("");
    setCreated(null);
    setQrDataUrl("");

    if (!batchId) {
      setError("Sélectionne un lot d'arrivage.");
      return;
    }

    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc("receive_product", {
      p_batch_id: batchId,
      p_name: name.trim() || null,
      p_brand: brand.trim() || null,
      p_model: model.trim() || null,
      p_category: category.trim() || null,
      p_condition_notes: condition.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    const product = (data?.[0] ?? null) as CreatedProduct | null;
    if (!product) {
      setError("Le produit n'a pas pu être créé.");
      setSaving(false);
      return;
    }

    const url = await QRCode.toDataURL(product.qr_code, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    setCreated(product);
    setQrDataUrl(url);
    setName("");
    setBrand("");
    setModel("");
    setCategory("");
    setCondition("");
    setSaving(false);
    await loadBatches();
  }

  function printQr() {
    if (!qrDataUrl || !created) return;
    const win = window.open("", "_blank", "width=500,height=600");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${created.internal_ref}</title><style>body{font-family:Arial;text-align:center;padding:40px}img{width:280px;height:280px}.ref{font-size:22px;font-weight:700;margin-top:20px}.code{font-size:12px;color:#666;margin-top:8px;word-break:break-all}</style></head><body><h2>BANPUM</h2><img src="${qrDataUrl}" /><div class="ref">${created.internal_ref}</div><div class="code">${created.qr_code}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div><Link href="/admin" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link><h1 className="text-lg font-bold">Nouveau produit</h1></div>
          <Link href="/admin/reception" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">Réception</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-bold tracking-wide text-[#ff5722]">IDENTIFICATION</p>
            <h2 className="mt-1 text-2xl font-bold">Ajouter un produit reçu</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">Chaque produit reçoit immédiatement une référence interne et un QR unique.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Lot d'arrivage</label>
                <select value={batchId} onChange={e => setBatchId(e.target.value)} disabled={loading} className="w-full rounded-xl border border-neutral-200 px-4 py-3 bg-white">
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_ref} — {b.received_count}/{b.expected_count}</option>)}
                </select>
              </div>
              {[
                ["Nom du produit", name, setName, "Ex. Aspirateur sans fil"],
                ["Marque", brand, setBrand, "Ex. Samsung"],
                ["Modèle / référence", model, setModel, "Référence fabricant"],
                ["Catégorie", category, setCategory, "Ex. Électroménager"],
              ].map(([label, value, setter, placeholder]) => (
                <div key={label as string}>
                  <label className="mb-2 block text-sm font-medium">{label as string}</label>
                  <input value={value as string} onChange={e => (setter as (v:string)=>void)(e.target.value)} placeholder={placeholder as string} className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722]" />
                </div>
              ))}
              <div>
                <label className="mb-2 block text-sm font-medium">Anomalies / état</label>
                <textarea value={condition} onChange={e => setCondition(e.target.value)} rows={4} placeholder="Rayures, emballage ouvert, accessoire manquant..." className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722]" />
              </div>
              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <button onClick={createProduct} disabled={saving || loading || batches.length === 0} className="w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white hover:bg-[#e64a19] disabled:opacity-60">
                {saving ? "Création + QR..." : "Créer le produit + générer le QR"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-neutral-900 p-6 text-white">
            <p className="text-sm font-medium text-neutral-400">QR PRODUIT</p>
            {created && qrDataUrl ? (
              <div className="mt-4 text-center">
                <div className="mx-auto w-fit rounded-2xl bg-white p-4"><img src={qrDataUrl} alt="QR produit" className="h-64 w-64" /></div>
                <p className="mt-5 text-xl font-bold">{created.internal_ref}</p>
                <p className="mt-2 break-all text-xs text-neutral-400">{created.qr_code}</p>
                <button onClick={printQr} className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-neutral-900">Imprimer le QR</button>
              </div>
            ) : (
              <div className="py-16 text-center"><div className="mx-auto h-20 w-20 rounded-2xl border border-dashed border-neutral-700" /><p className="mt-5 text-sm text-neutral-400">Le QR unique apparaîtra ici après création.</p></div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
