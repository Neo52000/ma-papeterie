import { Copy, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const HomePromoBanner = () => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const promoCode = "BIENVENUE10";

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    toast.success("Code promo copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-8 bg-[#FFEDD5]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cta/10 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-cta" />
            </div>
            <div className="text-left">
              <p className="text-[#374151] text-xs font-medium uppercase tracking-wider">
                Offre de bienvenue
              </p>
              <h3 className="text-xl font-bold text-[#111827]">
                -10% sur votre 1ère commande
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-lg border border-[#D1D5DB] font-mono text-lg font-bold text-[#111827] tracking-widest">
              {promoCode}
            </div>

            <Button
              size="sm"
              onClick={handleCopyCode}
              className="gap-1.5 bg-[#111827] text-white hover:bg-[#374151] font-medium"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copier
                </>
              )}
            </Button>
          </div>

          <Button
            variant="cta-orange"
            size="default"
            onClick={() => navigate("/catalogue")}
          >
            En profiter
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HomePromoBanner;
