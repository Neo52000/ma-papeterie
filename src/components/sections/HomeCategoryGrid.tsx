import {
  Briefcase,
  GraduationCap,
  Stamp,
  FolderOpen,
  PenTool,
  Armchair,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const categories = [
  {
    name: "Bureau",
    icon: Briefcase,
    description: "Fournitures de bureau",
    href: "/catalogue?category=bureau",
  },
  {
    name: "Scolaire",
    icon: GraduationCap,
    description: "Rentrée & école",
    href: "/catalogue?category=scolaire",
  },
  {
    name: "Tampons",
    icon: Stamp,
    description: "Tampons personnalisés",
    href: "/tampon-professionnel-chaumont",
  },
  {
    name: "Classement",
    icon: FolderOpen,
    description: "Classeurs & chemises",
    href: "/catalogue?category=classement",
  },
  {
    name: "Écriture",
    icon: PenTool,
    description: "Stylos & crayons",
    href: "/catalogue?category=ecrire-et-corriger",
  },
  {
    name: "Mobilier",
    icon: Armchair,
    description: "Mobilier de bureau",
    href: "/catalogue?category=mobilier",
  },
  {
    name: "Emballage",
    icon: Package,
    description: "Solutions d'emballage",
    href: "/solutions-emballage",
  },
  {
    name: "Maroquinerie",
    icon: ShoppingBag,
    description: "Sacs & accessoires",
    href: "/maroquinerie-bagagerie-accessoires",
  },
];

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-[#eff3ff]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
            Nos univers
          </h2>
          <p className="text-[0.875rem] text-[#121c2a]/60 mt-3 font-inter">
            Tout ce qu'il vous faut, en quelques clics
          </p>
        </div>

        {/* No-Line Rule: no borders, tonal layering only */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => navigate(cat.href)}
              className="group flex flex-col items-center gap-4 p-8 bg-white rounded-[1rem] transition-all duration-200 hover:-translate-y-1 cursor-pointer text-center"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
            >
              <div className="w-14 h-14 rounded-full bg-[#e6eeff] flex items-center justify-center group-hover:bg-[#1e3a8a] transition-colors duration-200">
                <cat.icon className="w-6 h-6 text-[#1e3a8a] group-hover:text-white transition-colors duration-200" />
              </div>
              <div>
                <h3 className="font-semibold text-[#121c2a] text-sm font-poppins">
                  {cat.name}
                </h3>
                <p className="text-[0.75rem] text-[#121c2a]/50 mt-1 font-inter uppercase tracking-[0.05em]">
                  {cat.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCategoryGrid;
