"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const groups = [
  { title: "Workspace", items: [{ label: "Dashboard", href: "/admin", icon: "⌂" }] },
  { title: "Opérations", items: [
    { label: "Réception", href: "/admin/reception", icon: "↓" },
    { label: "Scanner QR", href: "/admin/stock/scanner", icon: "⌗" },
    { label: "Emplacements", href: "/admin/stock/locations", icon: "▦" },
    { label: "Ranger", href: "/admin/stock/move", icon: "⇄" },
  ]},
  { title: "Catalogue", items: [
    { label: "Produits", href: "/admin/products", icon: "□" },
    { label: "Nouveau produit", href: "/admin/products/new", icon: "+" },
    { label: "Prix à confirmer", href: "/admin/products/price", icon: "₩" },
    { label: "Publication Shopify", href: "/admin/products/publication", icon: "↗" },
  ]},
  { title: "Commerce", items: [
    { label: "Commandes", href: "/admin/orders", icon: "≡" },
    { label: "Retours", href: "/admin/returns", icon: "↩" },
    { label: "Finance", href: "/admin/finance", icon: "₩" },
  ]},
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
      setName(data?.full_name || user.email || "");
      setRole(data?.role || "");
    };
    load();
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  if (pathname === "/admin/login" || pathname === "/admin/change-password") return <>{children}</>;

  const sidebar = (
    <aside className="flex h-full w-[270px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-[72px] items-center border-b border-slate-100 px-5">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff5722] text-lg font-black text-white shadow-sm">B</span>
          <div>
            <div className="text-sm font-extrabold tracking-wide text-slate-950">BANPUM</div>
            <div className="text-[11px] font-medium text-slate-400">Operations Platform</div>
          </div>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map(group => (
          <div key={group.title} className="mb-6">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{group.title}</div>
            <div className="space-y-1">
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                return (
                  <Link key={item.href} href={item.href} className={"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition " + (active ? "bg-[#fff1eb] text-[#e64a19]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")}>
                    <span className={"grid h-7 w-7 place-items-center rounded-lg text-sm " + (active ? "bg-white text-[#ff5722] shadow-sm" : "text-slate-400")}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 rounded-xl bg-slate-50 px-3 py-3">
          <div className="truncate text-sm font-semibold text-slate-800">{name || "Admin"}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{role || "staff"}</div>
        </div>
        <button onClick={signOut} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900">↪ Déconnexion</button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">{sidebar}</div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button aria-label="Fermer" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/40" />
            <div className="relative h-full w-[285px]">{sidebar}</div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg lg:hidden">☰</button>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-slate-400">BanPum / Administration</div>
                <div className="text-sm font-bold text-slate-900">{pathname === "/admin" ? "Dashboard" : "Operations"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/stock/scanner" className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:block">⌗ Scanner</Link>
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Notifications">♧</button>
              <div className="hidden h-9 w-px bg-slate-200 md:block" />
              <div className="hidden text-right md:block"><div className="text-xs font-bold text-slate-800">{name || "Admin"}</div><div className="text-[10px] text-slate-400">{role || "staff"}</div></div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ff5722] text-sm font-bold text-white">{(name || "B").charAt(0).toUpperCase()}</span>
            </div>
          </header>
          <main className="min-h-[calc(100vh-72px)]">{children}</main>
        </div>
      </div>
    </div>
  );
}
