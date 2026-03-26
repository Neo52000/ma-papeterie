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
    <section className="py-10 bg-gradient-to-r from-[#fd761a]/10 via-[#fd761a]/5 to-[#e6eeff]/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#fd761a]/10 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#9d4300]" />
            </div>
            <div className="text-left">
              <p className="text-[0.75rem] text-[#121c2a]/50 font-medium uppercase tracking-[0.05em] font-inter">
                Offre de bienvenue
              </p>
              <h3 className="text-xl font-semibold text-[#121c2a] font-poppins">
                -10% sur votre 1ère commande
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Code badge — surface-container-high style */}
            <div className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-[0.75rem] font-mono text-lg font-bold text-[#121c2a] tracking-widest"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
            >
              {promoCode}
            </div>

            <Button
              size="sm"
              onClick={handleCopyCode}
              className="gap-1.5 bg-[#121c2a] text-white hover:bg-[#121c2a]/80 font-medium rounded-[0.75rem]"
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
            className="bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300]"
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
