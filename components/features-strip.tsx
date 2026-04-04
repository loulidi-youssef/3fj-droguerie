const trustItems = [
  {
    title: "Livraison a Fes",
    subtitle: "Rapide et fiable",
    icon: (
      <path d="M3.5 6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V9h2.4a1 1 0 0 1 .77.36l2.9 3.45a1 1 0 0 1 .23.64v3.05a1 1 0 0 1-1 1h-.96a2.75 2.75 0 0 1-5.34 0H9.84a2.75 2.75 0 0 1-5.34 0H4.5a1 1 0 0 1-1-1V6.5Z" />
    ),
  },
  {
    title: "Prix competitifs",
    subtitle: "Meilleurs tarifs",
    icon: (
      <path d="M11 2.5a1 1 0 0 1 1 1v1.45a6.9 6.9 0 0 1 2.4.96l1.03-1.03a1 1 0 1 1 1.41 1.41l-1.03 1.03a6.9 6.9 0 0 1 .96 2.4H18.2a1 1 0 1 1 0 2h-1.45a6.9 6.9 0 0 1-.96 2.4l1.03 1.03a1 1 0 0 1-1.41 1.41l-1.03-1.03a6.9 6.9 0 0 1-2.4.96V20.5a1 1 0 1 1-2 0v-1.45a6.9 6.9 0 0 1-2.4-.96l-1.03 1.03a1 1 0 1 1-1.41-1.41l1.03-1.03a6.9 6.9 0 0 1-.96-2.4H2.8a1 1 0 1 1 0-2h1.45a6.9 6.9 0 0 1 .96-2.4L4.18 6.85a1 1 0 1 1 1.41-1.41L6.62 6.47a6.9 6.9 0 0 1 2.4-.96V3.5a1 1 0 0 1 1-1Zm0 5.1a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z" />
    ),
  },
  {
    title: "+500 clients satisfaits",
    subtitle: "Qualite garantie",
    icon: (
      <path d="m12 2.8 2.3 4.66 5.14.74-3.72 3.62.88 5.12L12 14.53 7.4 16.94l.88-5.12L4.56 8.2l5.14-.74L12 2.8Z" />
    ),
  },
  {
    title: "Service rapide",
    subtitle: "Disponible 7j/7",
    icon: (
      <path d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.51 9.51 0 0 0 12 2.5Zm0 2a7.5 7.5 0 1 1-5.3 2.2A7.46 7.46 0 0 1 12 4.5Zm-.8 2.2v5.2a1 1 0 0 0 .29.71l3.3 3.3 1.42-1.41-3-3V6.7Z" />
    ),
  },
];

export const FeaturesStrip = () => {
  return (
    <section className="bg-[#f1f3f5] pb-7">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4 lg:px-6">
        {trustItems.map((feature) => (
          <article
            key={feature.title}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,42,77,0.08)]"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-brand-orange">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                {feature.icon}
              </svg>
            </span>
            <div>
              <p className="text-[1.03rem] font-extrabold leading-tight text-brand-blue">{feature.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{feature.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
