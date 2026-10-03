"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const groups = [
  {
    title: "Opérations",
    items: [
      { label: "Réception", href: "/admin/reception" },
      { label: "Scanner", href: "/admin/stock/scanner" },
      { label: "Emplacements", href: "/admin/stock/locations" },
      { label: "Ranger", href: "/admin/stock/move" },
    ],
  },
  {
    title: "Produits",
    items: [
      { label: "Catalogue", href: "/admin/products" },
      { label: "Nouveau produit", href: "/admin/products/new" },
      { label: "Prix à confirmer", href: "/admin/products/price" },
      { label: "Publication Shopify", href: "/admin/products/publication" },
    ],
  },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");

  if (pathname === "/admin/login" || pathname === "/admin/change-password") return null;

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setName(profile?.full_name || user.email || "");
    };
    load();
  }, []);

  useEffect(() => setOpen(null), [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const isGroupActive = (items: { href: string }[]) =>
    items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5">
        <div className="flex h-16 items-center gap-2">
          <Link href="/admin" className="mr-2 flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff5722] text-sm font-black text-white">B</span>
            <span className="hidden sm:block">
              <span className="block text-[10px] font-bold tracking-[0.2em] text-[#ff5722]">BANPUM</span>
              <span className="block text-sm font-bold text-neutral-900">Admin</span>
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            <Link
              href="/admin"
              className={"whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold " + (pathname === "/admin" ? "bg-[#fff3ee] text-[#e64a19]" : "text-neutral-600 hover:bg-neutral-100")}
            >
              Dashboard
            </Link>

            {groups.map(group => (
              <div key={group.title} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(open === group.title ? null : group.title)}
                  className={"flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold " + (isGroupActive(group.items) ? "bg-[#fff3ee] text-[#e64a19]" : "text-neutral-600 hover:bg-neutral-100")}
                >
                  {group.title}<span className="text-xs">⌄</span>
                </button>
                {open === group.title && (
                  <div className="absolute left-0 top-12 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-[#fff3ee] hover:text-[#e64a19]">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <span className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 lg:block">Commandes</span>
            <span className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 lg:block">Retours</span>
            <span className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 lg:block">Finance</span>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {name && <span className="max-w-36 truncate text-xs text-neutral-500">{name}</span>}
            <button onClick={signOut} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
