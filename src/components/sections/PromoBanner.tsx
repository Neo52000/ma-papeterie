import { Percent, Copy, CheckCircle, Clock, Zap } from "lucide-react";
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
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-secondary via-secondary to-accent py-5">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)' }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-foreground/10 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-left">
                <p className="text-foreground/60 text-xs font-medium uppercase tracking-wider">
                  Offre de bienvenue
                </p>
                <h3 className="text-xl font-bold text-foreground">
                  -10% sur votre 1ère commande
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-foreground/10 backdrop-blur-sm px-5 py-2.5 rounded-lg border border-foreground/10 font-mono text-lg font-bold text-foreground tracking-widest">
                {promoCode}
              </div>
              
              <Button
                size="sm"
                onClick={handleCopyCode}
                className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium"
              >
                {copied ? (
                  <><CheckCircle className="w-4 h-4" /> Copié !</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copier</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
