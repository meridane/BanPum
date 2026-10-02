"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type Batch = {
  id: string;
  batch_ref: string;
  received_at: string;
  source_name: string | null;
  expected_count: number;
  received_count: number;
  notes: string | null;
};

export default function ReceptionPage() {
  const supabase = createClient();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [source, setSource] = useState("");
  const [expected, setExpected] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadBatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from("receiving_batches")
      .select("id,batch_ref,received_at,source_name,expected_count,received_count,notes")
      .order("received_at", { ascending: false });

    if (error) setError("Impossible de charger les arrivages.");
    setBatches((data ?? []) as Batch[]);
    setLoading(false);
  }

  useEffect(() => {
    loadBatches();
  }, []);

  async function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setError("Session expirée. Reconnectez-vous.");
      setSaving(false);
      return;
    }

    const now = new Date();
    const ref = `LOT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

    const { error: insertError } = await supabase.from("receiving_batches").insert({
      batch_ref: ref,
      received_at: now.toISOString(),
      source_name: source.trim() || null,
      responsible_user_id: user.id,
      expected_count: Math.max(0, Number(expected) || 0),
      received_count: 0,
      notes: notes.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSource("");
    setExpected("0");
    setNotes("");
    setSaving(false);
    await loadBatches();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/admin" className="text-xs font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</Link>
            <h1 className="text-lg font-bold text-neutral-900">Réception</h1>
          </div>
          <Link href="/admin" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-bold tracking-wide text-[#ff5722]">NOUVEL ARRIVAGE</p>
            <h2 className="mt-1 text-2xl font-bold text-neutral-900">Créer un lot</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Enregistre d’abord le lot physique. Ensuite nous ajouterons les produits un par un avec QR unique.
            </p>

            <form onSubmit={createBatch} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Source / fournisseur</label>
                <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10" placeholder="Ex. Coupang / fournisseur" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Nombre prévu de produits</label>
                <input type="number" min="0" value={expected} onChange={(e) => setExpected(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10" placeholder="Informations sur l’arrivage..." />
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <button disabled={saving} className="w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white hover:bg-[#e64a19] disabled:opacity-60">
                {saving ? "Création..." : "Créer le lot"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Historique</p>
                <h2 className="mt-1 text-2xl font-bold text-neutral-900">Arrivages</h2>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">{batches.length} lot(s)</span>
            </div>

            {loading ? (
              <p className="mt-8 text-sm text-neutral-500">Chargement...</p>
            ) : batches.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
                <p className="font-medium text-neutral-700">Aucun arrivage</p>
                <p className="mt-1 text-sm text-neutral-400">Crée ton premier lot à gauche.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {batches.map((batch) => {
                  const progress = batch.expected_count > 0 ? Math.min(100, Math.round((batch.received_count / batch.expected_count) * 100)) : 0;
                  return (
                    <div key={batch.id} className="rounded-2xl border border-neutral-100 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-900">{batch.batch_ref}</p>
                          <p className="mt-1 text-xs text-neutral-500">{batch.source_name || "Source non renseignée"} · {new Date(batch.received_at).toLocaleString("fr-FR")}</p>
                        </div>
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">{batch.received_count}/{batch.expected_count}</span>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full bg-[#ff5722]" style={{ width: `${progress}%` }} />
                      </div>
                      {batch.notes && <p className="mt-3 text-sm text-neutral-500">{batch.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
