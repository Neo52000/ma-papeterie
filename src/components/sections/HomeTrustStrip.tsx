import { Truck, ShieldCheck, Headphones, Leaf } from "lucide-react";

const trustItems = [
  {
    icon: Truck,
    title: "Livraison 24/48h",
    sub: "Gratuite dès 89€ HT",
    color: "bg-primary/8 text-primary",
  },
  {
    icon: ShieldCheck,
    title: "Paiement Sécurisé",
    sub: "CB, Virement, Mandat",
    color: "bg-emerald-500/8 text-emerald-600",
  },
  {
    icon: Headphones,
    title: "Service Client",
    sub: "03 10 96 02 24",
    color: "bg-[hsl(var(--cta))]/8 text-[hsl(var(--cta))]",
  },
  {
    icon: Leaf,
    title: "Éco-responsable",
    sub: "Large gamme recyclée",
    color: "bg-green-500/8 text-green-600",
  },
];

const HomeTrustStrip = () => {
  return (
    <section className="py-5 bg-[hsl(var(--surface))] border-b border-[hsl(var(--outline-variant))]/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="group flex items-center gap-3 rounded-xl px-4 py-3 bg-white/60 border border-[hsl(var(--outline-variant))]/15 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
            >
              <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-[0.8rem] font-semibold text-[hsl(var(--on-surface))] font-poppins leading-tight">
                  {item.title}
                </p>
                <p className="text-[0.7rem] text-[hsl(var(--on-surface))]/45 font-poppins leading-tight mt-0.5 truncate">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeTrustStrip;
