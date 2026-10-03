import Link from "next/link";

type Props = {
  fullName: string;
  role: string;
  counts: { reception: number; products: number; orders: number; returns: number };
};

const stats = [
  { key: "reception", label: "Réceptions", note: "Lots à traiter", href: "/admin/reception", icon: "↓" },
  { key: "products", label: "Produits en stock", note: "Disponibles / publiés", href: "/admin/products", icon: "□" },
  { key: "orders", label: "Commandes", note: "À préparer", href: "/admin/orders", icon: "≡" },
  { key: "returns", label: "Retours", note: "À traiter", href: "/admin/returns", icon: "↩" },
] as const;

const actions = [
  { title: "Nouvel arrivage", text: "Créer un lot et commencer la réception.", href: "/admin/reception", accent: true, icon: "↓" },
  { title: "Scanner un produit", text: "Identifier un produit ou une position.", href: "/admin/stock/scanner", accent: false, icon: "⌗" },
  { title: "Ajouter un produit", text: "Créer une fiche produit complète.", href: "/admin/products/new", accent: false, icon: "+" },
  { title: "Publier sur Shopify", text: "Vérifier et publier les produits prêts.", href: "/admin/products/publication", accent: false, icon: "↗" },
];

export default function AdminDashboard({ fullName, role, counts }: Props) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#ff5722]/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff8a65]">Operations overview</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Bonjour, {fullName}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Voici l’état opérationnel de BanPum. Accédez rapidement aux tâches qui nécessitent votre attention.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Rôle</div>
              <div className="mt-1 text-sm font-bold capitalize text-white">{role.replace("_"," ")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(card => (
          <Link key={card.key} href={card.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-lg font-bold text-[#ff5722]">{card.icon}</span>
              <span className="text-slate-300 transition group-hover:text-[#ff5722]">↗</span>
            </div>
            <div className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{counts[card.key]}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{card.label}</div>
            <div className="mt-1 text-xs text-slate-400">{card.note}</div>
          </Link>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="text-lg font-bold text-slate-950">Actions rapides</h2><p className="mt-1 text-sm text-slate-400">Les opérations les plus utilisées.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(action => (
            <Link key={action.href} href={action.href} className={"rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md " + (action.accent ? "border-[#ff5722] bg-[#ff5722] text-white" : "border-slate-200 bg-white text-slate-900")}>
              <span className={"grid h-10 w-10 place-items-center rounded-xl text-lg font-bold " + (action.accent ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700")}>{action.icon}</span>
              <h3 className="mt-5 font-bold">{action.title}</h3>
              <p className={"mt-2 text-sm leading-5 " + (action.accent ? "text-white/75" : "text-slate-400")}>{action.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-950">Flux opérationnel</h2><p className="mt-1 text-xs text-slate-400">Cycle produit BanPum</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">Système actif</span></div>
          <div className="mt-6 grid gap-2 sm:grid-cols-4">
            {["Réception","Contrôle","Stock","Publication"].map((step,i)=><div key={step} className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-400">0{i+1}</div><div className="mt-2 text-sm font-bold text-slate-800">{step}</div><div className="mt-3 h-1.5 rounded-full bg-slate-200"><div className={"h-1.5 rounded-full bg-[#ff5722] " + (i===0 ? "w-1/2" : i===1 ? "w-1/3" : "w-1/5")} /></div></div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">Intégrations</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm font-semibold text-slate-700">Supabase</span><span className="text-xs font-bold text-emerald-600">● Connecté</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm font-semibold text-slate-700">Shopify</span><span className="text-xs font-bold text-emerald-600">● Connecté</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm font-semibold text-slate-700">QR / Stock</span><span className="text-xs font-bold text-emerald-600">● Actif</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
