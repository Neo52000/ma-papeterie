import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  FileText,
  RefreshCcw,
  TrendingDown,
  Armchair,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const benefits = [
  {
    icon: FileText,
    text: "Devis personnalisé sous 24h",
  },
  {
    icon: RefreshCcw,
    text: "Commandes récurrentes automatisées",
  },
  {
    icon: TrendingDown,
    text: "Tarifs dégressifs dès la 1ère commande",
  },
  {
    icon: Armchair,
    text: "Leasing mobilier de bureau",
    href: "/leasing-mobilier-bureau",
  },
];

const HomeB2BSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 bg-[#DBEAFE]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left — Text */}
          <div className="space-y-6">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Espace Professionnel
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-[#111827] font-poppins mt-2">
                Professionnels : gagnez du temps et réduisez vos coûts
              </h2>
              <p className="text-[#374151] mt-3">
                Simplifiez vos achats de fournitures avec nos solutions dédiées
                aux entreprises, écoles et collectivités.
              </p>
            </div>

            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b.text} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#22C55E] mt-0.5 shrink-0" />
                  <span className="text-[#111827] font-medium">
                    {b.href ? (
                      <button
                        onClick={() => navigate(b.href!)}
                        className="hover:text-primary underline-offset-2 hover:underline transition-colors"
                      >
                        {b.text}
                      </button>
                    ) : (
                      b.text
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="cta-orange"
                size="lg"
                className="group"
                onClick={() => navigate("/contact")}
              >
                Obtenir un devis
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="default"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => navigate("/leasing-mobilier-bureau")}
              >
                <Armchair className="mr-2 w-4 h-4" />
                Découvrir le leasing mobilier
              </Button>
            </div>
          </div>

          {/* Right — Visual icons composition */}
          <div className="hidden md:flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              {benefits.map((b) => (
                <div
                  key={b.text}
                  className="bg-white/80 backdrop-blur rounded-xl p-5 flex flex-col items-center text-center gap-2 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-[#111827] leading-snug">
                    {b.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeB2BSection;
