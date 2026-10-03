"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/browser";

function Scanner({ onScan, label }: { onScan: (value: string) => void; label: string }) {
  const idRef = useRef("qr-" + Math.random().toString(36).slice(2));
  const [running, setRunning] = useState(false);

  async function start() {
    try {
      const scanner = new Html5Qrcode(idRef.current);
      (window as any).__banpumScanner = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          onScan(text);
          scanner.stop().catch(() => {});
          setRunning(false);
        },
        () => {}
      );
      setRunning(true);
    } catch {}
  }

  async function stop() {
    const scanner = (window as any).__banpumScanner;
    if (scanner) {
      try { await scanner.stop(); } catch {}
      try { scanner.clear(); } catch {}
    }
    setRunning(false);
  }

  useEffect(() => () => { stop(); }, []);

  return (
    <div className="mt-3">
      <div id={idRef.current} className="overflow-hidden rounded-xl bg-neutral-100" />
      <button onClick={running ? stop : start} className="mt-2 w-full rounded-xl border px-4 py-2 text-sm font-semibold">
        {running ? "Arrêter le scanner" : "📷 Scanner " + label}
      </button>
    </div>
  );
}

export default function MoveStockPage() {
  const supabase = createClient();
  const [productQr, setProductQr] = useState("");
  const [locationQr, setLocationQr] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function move() {
    setError("");
    setMessage("");
    if (!productQr || !locationQr) {
      setError("Scanne le produit et l'emplacement.");
      return;
    }
    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc("move_product_to_location", {
      p_product_qr: productQr.trim(),
      p_location_qr: locationQr.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }
    const item = data?.[0];
    setMessage(item ? item.internal_ref + " → " + item.location_code : "Déplacement enregistré.");
    setSaving(false);
    setProductQr("");
    setLocationQr("");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/admin" className="text-xs font-bold tracking-[.2em] text-[#ff5722]">BANPUM</Link>
            <h1 className="text-lg font-bold">Rangement / déplacement</h1>
          </div>
          <Link href="/admin/stock/locations" className="rounded-xl border px-4 py-2 text-sm">Emplacements</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-bold text-[#ff5722]">SCAN DOUBLE</p>
          <h2 className="mt-1 text-2xl font-bold">Produit → Emplacement</h2>
          <p className="mt-2 text-sm text-neutral-500">Scanne d'abord le QR du produit, puis le QR de la place. Le déplacement et l'historique sont enregistrés ensemble.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border p-5">
              <p className="font-bold">1. Produit</p>
              <input value={productQr} onChange={e => setProductQr(e.target.value)} placeholder="BANPUM|P|..." className="mt-3 w-full rounded-xl border px-4 py-3" />
              <Scanner label="produit" onScan={setProductQr} />
            </div>
            <div className="rounded-2xl border p-5">
              <p className="font-bold">2. Emplacement</p>
              <input value={locationQr} onChange={e => setLocationQr(e.target.value)} placeholder="BANPUM|L|..." className="mt-3 w-full rounded-xl border px-4 py-3" />
              <Scanner label="emplacement" onScan={setLocationQr} />
            </div>
          </div>
          {error && <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {message && <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">{message}</div>}
          <button onClick={move} disabled={saving} className="mt-6 w-full rounded-xl bg-[#ff5722] px-4 py-4 font-bold text-white disabled:opacity-60">
            {saving ? "Enregistrement..." : "Valider le rangement"}
          </button>
        </section>
      </div>
    </main>
  );
}
