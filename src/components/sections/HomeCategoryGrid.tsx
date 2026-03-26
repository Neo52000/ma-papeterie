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
    <section className="py-14 bg-[#F9FAFB]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[#111827] font-poppins">
            Nos univers
          </h2>
          <p className="text-[#374151] mt-2">
            Tout ce qu'il vous faut, en quelques clics
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => navigate(cat.href)}
              className="group flex flex-col items-center gap-3 p-6 bg-white rounded-lg border border-[#D1D5DB] hover:border-primary hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#DBEAFE] flex items-center justify-center group-hover:bg-primary transition-colors duration-200">
                <cat.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-200" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111827] text-sm">
                  {cat.name}
                </h3>
                <p className="text-xs text-[#374151] mt-0.5">
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
