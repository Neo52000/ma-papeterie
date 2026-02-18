import { Truck, Shield, Headphones, Clock } from "lucide-react";

const advantages = [
  { icon: Clock, title: "Expédition 24/48h", sub: "Commande traitée rapidement" },
  { icon: Truck, title: "Livraison offerte", sub: "Dès 49€ d'achat" },
  { icon: Shield, title: "Paiement sécurisé", sub: "CB, PayPal, Virement" },
  { icon: Headphones, title: "Service client", sub: "07 45 062 162" },
];

const TrustBanner = () => {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {advantages.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBanner;
