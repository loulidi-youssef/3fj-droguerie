const trustItems = [
  {
    title: "Paiement a la livraison",
    subtitle: "Commandez maintenant, payez a la reception",
    icon: (
      <path d="M3 7.2a2.2 2.2 0 0 1 2.2-2.2h13.6A2.2 2.2 0 0 1 21 7.2v9.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 16.8V7.2Zm2.2-.2a.2.2 0 0 0-.2.2v2h14V7.2a.2.2 0 0 0-.2-.2H5.2Zm13.6 10a.2.2 0 0 0 .2-.2v-5.6H5v5.6c0 .11.09.2.2.2h13.6ZM7.2 13h3.8a1 1 0 1 1 0 2H7.2a1 1 0 1 1 0-2Z" />
    ),
  },
  {
    title: "Livraison rapide",
    subtitle: "Expedition rapide sur Fes et environs",
    icon: (
      <path d="M3.5 6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V9h2.4a1 1 0 0 1 .77.36l2.9 3.45a1 1 0 0 1 .23.64v3.05a1 1 0 0 1-1 1h-.96a2.75 2.75 0 0 1-5.34 0H9.84a2.75 2.75 0 0 1-5.34 0H4.5a1 1 0 0 1-1-1V6.5Z" />
    ),
  },
  {
    title: "Retrait en magasin",
    subtitle: "Recuperez votre commande en point de vente",
    icon: (
      <path d="M4 8.2 12 3l8 5.2v9.3a1 1 0 0 1-1 1h-4.8v-5.3a1.2 1.2 0 0 0-2.4 0v5.3H5a1 1 0 0 1-1-1V8.2Zm2 1.1v7.2h3.8v-3.3a3.2 3.2 0 1 1 6.4 0v3.3H18V9.3l-6-3.9-6 3.9Z" />
    ),
  },
  {
    title: "Produit garanti",
    subtitle: "Selection fiable pour vos travaux",
    icon: (
      <path d="M12 2.4 4.6 5.2v5.7c0 4.7 3 8.97 7.4 10.6 4.4-1.63 7.4-5.9 7.4-10.6V5.2L12 2.4Zm0 2.13 5.4 2.06v4.31c0 3.71-2.24 7.14-5.4 8.65-3.16-1.51-5.4-4.94-5.4-8.65V6.59L12 4.53Zm-1.15 9.17 4.37-4.37 1.41 1.41-5.08 5.08a1 1 0 0 1-1.41 0l-2.38-2.38 1.41-1.41 1.68 1.67Z" />
    ),
  },
];

export const FeaturesStrip = () => {
  return (
    <section className="bg-[#f1f3f5] pb-5 sm:pb-7">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-1.5 sm:mb-3 sm:gap-2">
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-brand-blue sm:text-2xl">
            Achats en toute confiance
          </h2>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
            Service rapide, clair et fiable
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {trustItems.map((feature) => (
            <article
              key={feature.title}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_7px_16px_rgba(15,42,77,0.08)] sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:shadow-[0_8px_20px_rgba(15,42,77,0.08)]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-brand-orange sm:h-11 sm:w-11 sm:rounded-xl">
                <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" aria-hidden>
                  {feature.icon}
                </svg>
              </span>
              <div>
                <p className="text-sm font-extrabold leading-tight text-brand-blue sm:text-[1.01rem]">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{feature.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
