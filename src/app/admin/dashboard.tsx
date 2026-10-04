import Link from "next/link";

type Props = {
  fullName: string;
  role: string;
  counts: { reception: number; products: number; orders: number; returns: number };
};

const steps = [
  ["Réception", "/admin/reception", "Les nouveaux produits arrivent ici."],
  ["Contrôle", "/admin/products", "Vérifier état, fonctionnement et anomalies."],
  ["Produits", "/admin/products", "Compléter identité, photos et informations."],
  ["Stock", "/admin/stock/scanner", "Ranger avec Produit QR → Emplacement QR."],
  ["Publication", "/admin/products/publication", "Valider puis publier sur Shopify."],
];

const tasks = [
  { title: "Produits à contrôler", count: 0, href: "/admin/products", color: "orange", text: "Vérifier les nouveaux produits" },
  { title: "Prix à confirmer", count: 0, href: "/admin/products/price", color: "amber", text: "Validation avant publication" },
  { title: "À publier", count: 0, href: "/admin/products/publication", color: "blue", text: "Produits prêts pour Shopify" },
  { title: "Commandes à préparer", count: 0, href: "/admin/orders", color: "violet", text: "Préparation et emballage" },
];

export default function AdminDashboard({ fullName, role, counts }: Props) {
  const liveTasks = tasks.map((t, i) => ({ ...t, count: i === 0 ? counts.reception : i === 1 ? 0 : i === 2 ? 0 : counts.orders }));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5722]">Centre de contrôle</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Bonjour, {fullName}</h1>
          <p className="mt-2 text-sm text-slate-500">Voici ce qui nécessite votre attention aujourd’hui.</p>
        </div>
        <Link href="/admin/reception" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#ff5722] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#e64a19]">+ Nouvel arrivage</Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveTasks.map(task => (
          <Link key={task.title} href={task.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">{task.title}</span>
              <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-slate-50 px-2 text-sm font-bold text-slate-900">{task.count}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{task.text}</p>
            <div className="mt-4 text-xs font-bold text-[#ff5722]">Ouvrir →</div>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h2 className="font-bold text-slate-950">Cycle produit</h2><p className="mt-1 text-xs text-slate-400">Un seul parcours du produit physique jusqu’à Shopify.</p></div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Workflow actif</span>
        </div>
        <div className="mt-6 grid gap-2 md:grid-cols-5">
          {steps.map((step, i) => (
            <Link key={step[0]} href={step[1]} className="group relative rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-orange-200 hover:bg-orange-50">
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-widest text-slate-400">0{i + 1}</span><span className="text-slate-300 group-hover:text-[#ff5722]">→</span></div>
              <div className="mt-3 text-sm font-bold text-slate-800">{step[0]}</div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{step[2]}</p>
              {i < steps.length - 1 && <div className="hidden md:block absolute -right-2 top-1/2 z-10 text-slate-300">›</div>}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-950">Vue magasin</h2><p className="mt-1 text-xs text-slate-400">Situation actuelle</p></div><span className="text-xs font-semibold text-slate-400">Mis à jour en direct</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Produits en stock", counts.products, "/admin/products"],["Arrivages", counts.reception, "/admin/reception"],["Commandes", counts.orders, "/admin/orders"],["Retours", counts.returns, "/admin/returns"]].map(([label,count,href]) => (
              <Link key={String(label)} href={String(href)} className="rounded-xl bg-slate-50 p-4 hover:bg-orange-50"><div className="text-2xl font-bold text-slate-950">{String(count)}</div><div className="mt-1 text-xs font-semibold text-slate-500">{String(label)}</div></Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">Raccourcis</h2>
          <div className="mt-4 space-y-2">
            <Link href="/admin/stock/scanner" className="block rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50">⌗ Scanner un QR</Link>
            <Link href="/admin/products/new" className="block rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50">+ Nouveau produit</Link>
            <Link href="/admin/stock/locations" className="block rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50">▦ Emplacements</Link>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-sm font-bold text-slate-900">Règle BanPum</div><div className="mt-1 text-xs leading-5 text-slate-600">Un produit ne passe à l’étape suivante que lorsque les informations nécessaires sont complètes.</div></div>
          <div className="text-xs font-bold text-[#e64a19]">Réception → Contrôle → Stock → Publication → Vente</div>
        </div>
      </section>
    </div>
  );
}
