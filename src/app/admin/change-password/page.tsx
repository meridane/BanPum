"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      setError("Impossible de modifier le mot de passe. Réessayez.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.rpc("complete_password_change");

    if (profileError) {
      setError("Mot de passe modifié, mais la validation du compte a échoué. Contactez l'administrateur.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-xl shadow-black/5 ring-1 ring-black/5">
          <p className="text-sm font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Pour votre première connexion, vous devez remplacer le mot de passe temporaire.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Nouveau mot de passe</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Confirmer le mot de passe</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10"
              />
            </div>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white hover:bg-[#e64a19] disabled:opacity-60"
            >
              {loading ? "Modification..." : "Modifier le mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
