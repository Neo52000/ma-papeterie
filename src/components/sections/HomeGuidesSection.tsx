import { ArrowRight } from "lucide-react";

const articles = [
  {
    title: "Comment bien organiser son poste de travail ?",
    href: "/blog",
    tag: "Organisation",
    illustration: (
      <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="guide-bg-1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary-light))" stopOpacity="0.2" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill="url(#guide-bg-1)" />
        {/* Desk */}
        <rect x="30" y="130" width="260" height="14" rx="2" fill="hsl(var(--vintage-brown))" opacity="0.7" />
        {/* Monitor */}
        <rect x="110" y="60" width="110" height="68" rx="4" fill="hsl(var(--primary))" />
        <rect x="118" y="68" width="94" height="52" fill="hsl(var(--primary-foreground))" />
        <rect x="150" y="128" width="30" height="4" fill="hsl(var(--primary))" />
        {/* Cup */}
        <rect x="52" y="108" width="26" height="22" rx="3" fill="hsl(var(--cta))" />
        <path d="M78 114 q 10 0 10 8 t -10 8" fill="none" stroke="hsl(var(--cta))" strokeWidth="3" />
        {/* Notepad */}
        <rect x="230" y="100" width="50" height="34" rx="2" fill="hsl(var(--secondary))" />
        <line x1="240" y1="112" x2="272" y2="112" stroke="hsl(var(--vintage-brown))" strokeWidth="1.5" opacity="0.5" />
        <line x1="240" y1="120" x2="272" y2="120" stroke="hsl(var(--vintage-brown))" strokeWidth="1.5" opacity="0.5" />
        {/* Pencil */}
        <rect x="160" y="154" width="80" height="6" rx="1.5" fill="hsl(var(--accent))" transform="rotate(-8 200 157)" />
      </svg>
    ),
  },
  {
    title: "Les indispensables pour une rentrée réussie",
    href: "/blog",
    tag: "Rentrée",
    illustration: (
      <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="guide-bg-2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--secondary))" stopOpacity="0.3" />
            <stop offset="1" stopColor="hsl(var(--cta))" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill="url(#guide-bg-2)" />
        {/* Backpack */}
        <rect x="110" y="60" width="100" height="110" rx="18" fill="hsl(var(--primary))" />
        <rect x="128" y="88" width="64" height="44" rx="6" fill="hsl(var(--primary-foreground))" opacity="0.3" />
        <path d="M130 60 q 30 -30 60 0" fill="none" stroke="hsl(var(--primary-dark))" strokeWidth="6" />
        {/* Pencils in pocket */}
        <rect x="136" y="100" width="6" height="22" rx="1" fill="hsl(var(--cta))" />
        <rect x="146" y="96" width="6" height="26" rx="1" fill="hsl(var(--destructive))" />
        <rect x="156" y="102" width="6" height="20" rx="1" fill="hsl(var(--accent))" />
        {/* Apple */}
        <circle cx="240" cy="130" r="22" fill="hsl(var(--destructive))" />
        <path d="M240 110 q 2 -8 10 -8" stroke="hsl(var(--vintage-brown))" strokeWidth="3" fill="none" />
        {/* Notebook behind */}
        <rect x="40" y="80" width="60" height="86" rx="4" fill="hsl(var(--accent))" />
        <line x1="40" y1="100" x2="100" y2="100" stroke="hsl(var(--accent-dark))" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Le guide complet du mobilier ergonomique",
    href: "/blog",
    tag: "Ergonomie",
    illustration: (
      <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="guide-bg-3" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
            <stop offset="1" stopColor="hsl(var(--primary-light))" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill="url(#guide-bg-3)" />
        {/* Chair */}
        <g transform="translate(120 30)">
          <rect x="10" y="0" width="60" height="70" rx="12" fill="hsl(var(--primary))" />
          <rect x="18" y="70" width="44" height="10" rx="3" fill="hsl(var(--primary-dark))" />
          <line x1="40" y1="80" x2="40" y2="120" stroke="hsl(var(--vintage-brown))" strokeWidth="5" />
          <circle cx="40" cy="130" r="8" fill="hsl(var(--vintage-brown))" />
          <line x1="40" y1="125" x2="20" y2="140" stroke="hsl(var(--vintage-brown))" strokeWidth="4" />
          <line x1="40" y1="125" x2="60" y2="140" stroke="hsl(var(--vintage-brown))" strokeWidth="4" />
          <circle cx="20" cy="142" r="4" fill="hsl(var(--vintage-brown))" />
          <circle cx="60" cy="142" r="4" fill="hsl(var(--vintage-brown))" />
        </g>
        {/* Lamp */}
        <g transform="translate(240 40)">
          <circle cx="18" cy="12" r="18" fill="hsl(var(--cta))" />
          <line x1="18" y1="28" x2="18" y2="80" stroke="hsl(var(--vintage-brown))" strokeWidth="3" />
          <ellipse cx="18" cy="86" rx="20" ry="4" fill="hsl(var(--vintage-brown))" />
          {/* Light rays */}
          <path d="M0 20 L -15 40 M36 20 L 51 40 M18 -5 L 18 -20" stroke="hsl(var(--cta))" strokeWidth="2" opacity="0.6" />
        </g>
      </svg>
    ),
  },
];

const HomeGuidesSection = () => {
  const navigate = (url: string) => {
    window.location.href = url;
  };

  return (
    <section className="py-24 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#fd761a] mb-2">
              Ressources
            </span>
            <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
              Conseils & guides
            </h2>
          </div>
          <a
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#121c2a]/70 hover:text-[#fd761a] transition-colors"
          >
            Voir tous les articles
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((article) => (
            <button
              key={article.title}
              onClick={() => navigate(article.href)}
              className="group text-left rounded-[1rem] overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
            >
              {/* Illustration */}
              <div className="aspect-[16/10] overflow-hidden">
                <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
                  {article.illustration}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <span className="inline-block text-[0.7rem] font-semibold uppercase tracking-widest text-[#1e3a8a] mb-2">
                  {article.tag}
                </span>
                <h3 className="font-semibold text-[#121c2a] text-sm font-poppins leading-snug line-clamp-2">
                  {article.title}
                </h3>
                <span className="inline-flex items-center gap-1 mt-3 text-[0.875rem] font-medium text-[#fd761a] font-inter group-hover:gap-2 transition-all">
                  Lire l'article
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeGuidesSection;
