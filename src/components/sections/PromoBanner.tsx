import { Percent, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const PromoBanner = () => {
  const [copied, setCopied] = useState(false);
  const promoCode = "BIENVENUE10";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    toast.success("Code promo copié !");
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-8 bg-gradient-to-r from-primary to-primary/80">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Percent className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-primary-foreground/80 text-sm font-medium">
                Offre de bienvenue
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-primary-foreground">
                -10% sur votre première commande
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/30">
              <span className="font-mono text-lg font-bold text-primary-foreground tracking-wider">
                {promoCode}
              </span>
            </div>
            
            <Button
              variant="secondary"
              size="lg"
              onClick={handleCopyCode}
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
