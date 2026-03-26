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
  { icon: FileText, text: "Devis personnalisé sous 24h" },
  { icon: RefreshCcw, text: "Commandes récurrentes automatisées" },
  { icon: TrendingDown, text: "Tarifs dégressifs dès la 1ère commande" },
  { icon: Armchair, text: "Leasing mobilier de bureau", href: "/leasing-mobilier-bureau" },
];

const HomeB2BSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-[#d9e3f7]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="space-y-8">
            <div>
              <span className="text-[0.75rem] font-medium uppercase tracking-[0.05em] text-[#1e3a8a] font-inter">
                Espace Professionnel
              </span>
              <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins mt-3 leading-tight">
                Professionnels : gagnez du temps et réduisez vos coûts
              </h2>
              <p className="text-[0.875rem] text-[#121c2a]/60 mt-4 font-inter leading-relaxed">
                Simplifiez vos achats de fournitures avec nos solutions dédiées
                aux entreprises, écoles et collectivités.
              </p>
            </div>

            {/* Benefits — spacing separation, no lines */}
            <ul className="space-y-4">
              {benefits.map((b) => (
                <li key={b.text} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-[#121c2a] font-medium text-[0.875rem] font-inter">
                    {b.href ? (
                      <button
                        onClick={() => navigate(b.href!)}
                        className="text-[#2563EB] underline decoration-[#fd761a] underline-offset-4 decoration-2 hover:decoration-[3px] transition-all"
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

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="cta-orange"
                size="lg"
                className="group bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300] px-8"
                onClick={() => navigate("/contact")}
              >
                Obtenir un devis
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="atelier-secondary"
                size="default"
                className="border-[#c5c5d3]/25 text-[#00236f] hover:bg-white/50"
                onClick={() => navigate("/leasing-mobilier-bureau")}
              >
                <Armchair className="mr-2 w-4 h-4" />
                Découvrir le leasing mobilier
              </Button>
            </div>
          </div>

          {/* Right — Tonal cards composition */}
          <div className="hidden md:flex items-center justify-center">
            <div className="grid grid-cols-2 gap-5 max-w-sm">
              {benefits.map((b) => (
                <div
                  key={b.text}
                  className="bg-white/70 backdrop-blur-sm rounded-[1rem] p-6 flex flex-col items-center text-center gap-3"
                  style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
                >
                  <div className="w-12 h-12 rounded-full bg-[#e6eeff] flex items-center justify-center">
                    <b.icon className="w-5 h-5 text-[#1e3a8a]" />
                  </div>
                  <p className="text-[0.75rem] font-medium text-[#121c2a] leading-snug font-inter">
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
