import { Truck, Shield, Package, Headphones } from "lucide-react";

const trustItems = [
  { icon: Truck, title: "Livraison rapide", sub: "Expédition 24/48h" },
  { icon: Shield, title: "Paiement sécurisé", sub: "CB, PayPal, Virement" },
  { icon: Package, title: "Stock réel", sub: "40 000+ références" },
  { icon: Headphones, title: "Service client", sub: "03 10 96 02 24" },
];

const HomeTrustStrip = () => {
  return (
    <section className="py-12 bg-[#e6eeff]/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#d9e3f7] flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-[#1e3a8a]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#121c2a] font-poppins">
                  {item.title}
                </p>
                <p className="text-[0.75rem] text-[#121c2a]/50 font-inter">
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
