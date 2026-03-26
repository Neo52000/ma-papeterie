import { ArrowRight, BookOpen, GraduationCap, Armchair } from "lucide-react";
import { useNavigate } from "react-router-dom";

const articles = [
  {
    icon: BookOpen,
    title: "Comment bien organiser son poste de travail ?",
    href: "/blog",
  },
  {
    icon: GraduationCap,
    title: "Les indispensables pour une rentrée réussie",
    href: "/blog",
  },
  {
    icon: Armchair,
    title: "Le guide complet du mobilier ergonomique",
    href: "/blog",
  },
];

const HomeGuidesSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins mb-12">
          Conseils & guides
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((article) => (
            <button
              key={article.title}
              onClick={() => navigate(article.href)}
              className="group text-left rounded-[1rem] overflow-hidden bg-white transition-all duration-200 hover:-translate-y-1 cursor-pointer"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
            >
              {/* Image placeholder */}
              <div className="aspect-[16/10] bg-[#e6eeff] flex items-center justify-center">
                <article.icon className="w-12 h-12 text-[#1e3a8a]/30" />
              </div>

              {/* Content */}
              <div className="p-5">
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
