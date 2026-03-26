import { Truck, Shield, Package, Headphones } from "lucide-react";

const trustItems = [
  {
    icon: Truck,
    title: "Livraison rapide",
    sub: "Expédition 24/48h",
  },
  {
    icon: Shield,
    title: "Paiement sécurisé",
    sub: "CB, PayPal, Virement",
  },
  {
    icon: Package,
    title: "Stock réel",
    sub: "40 000+ références",
  },
  {
    icon: Headphones,
    title: "Service client",
    sub: "03 10 96 02 24",
  },
];

const HomeTrustStrip = () => {
  return (
    <section className="py-8 bg-[#F9FAFB] border-y border-[#D1D5DB]/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#111827]">
                  {item.title}
                </p>
                <p className="text-xs text-[#374151]">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeTrustStrip;
