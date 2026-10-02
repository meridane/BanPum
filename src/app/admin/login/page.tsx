"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/admin");
    });
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
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
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Admin</h1>
          <p className="mt-2 text-sm text-neutral-500">Connectez-vous à l’espace opérations.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Mot de passe</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#ff5722] px-4 py-3 font-semibold text-white hover:bg-[#e64a19] disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}