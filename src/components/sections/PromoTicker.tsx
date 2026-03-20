import { Truck, Gift, Phone, RotateCcw } from "lucide-react";

const promos = [
  { icon: Truck, text: "Livraison gratuite dès 89€" },
  { icon: Gift, text: "Code BIENVENUE10 : -10% sur votre 1ère commande" },
  { icon: Phone, text: "SAV local à Chaumont — 07 45 062 162" },
  { icon: RotateCcw, text: "Retour gratuit sous 30 jours" },
];

export default function PromoTicker() {
  return (
    <div className="bg-secondary text-foreground overflow-hidden hover:[&>div]:pause">
      <div className="flex animate-marquee whitespace-nowrap py-1.5">
        {[...promos, ...promos].map((promo, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium mx-8">
            <promo.icon className="h-3.5 w-3.5 shrink-0" />
            {promo.text}
          </span>
        ))}
      </div>
    </div>
  );
}
