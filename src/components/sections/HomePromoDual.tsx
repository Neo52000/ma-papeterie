import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HomePromoDual = () => {
  const navigate = (url: string) => { window.location.href = url; };

  return (
    <section className="py-12 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Carte 1 — Destockage Mobilier */}
          <div
            className="relative overflow-hidden rounded-[1rem] p-8 md:p-10 bg-[#1e3a8a] text-white min-h-[220px] flex flex-col justify-center"
            style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
          >
            <span className="text-[0.75rem] font-medium uppercase tracking-[0.05em] text-white/60 font-inter">
              Destockage annuel
            </span>
            <h3 className="text-2xl md:text-3xl font-bold font-poppins mt-2 leading-tight">
              Jusqu'à -60% sur le mobilier
            </h3>
            <div className="mt-6">
              <Button
                variant="atelier-secondary"
                size="default"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate("/catalogue?category=mobilier")}
              >
                Profiter des offres
              </Button>
            </div>
          </div>

          {/* Carte 2 — Pack Rentrée Pro */}
          <div
            className="relative overflow-hidden rounded-[1rem] p-8 md:p-10 bg-[#fd761a] text-white min-h-[220px] flex flex-col justify-center"
            style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
          >
            <span className="text-[0.75rem] font-medium uppercase tracking-[0.05em] text-white/60 font-inter">
              Pack Rentrée Pro
            </span>
            <h3 className="text-2xl md:text-3xl font-bold font-poppins mt-2 leading-tight">
              Équipez vos bureaux au meilleur prix
            </h3>
            <div className="mt-6">
              <Button
                variant="atelier-secondary"
                size="default"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate("/catalogue")}
              >
                Voir le catalogue
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePromoDual;
