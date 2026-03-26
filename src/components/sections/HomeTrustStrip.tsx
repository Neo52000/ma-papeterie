import { Truck, Shield, Headphones, Leaf } from "lucide-react";

const trustItems = [
  { icon: Truck, title: "Livraison 24/48h", sub: "Gratuite dès 89€ HT" },
  { icon: Shield, title: "Paiement Sécurisé", sub: "CB, Virement, Mandat" },
  { icon: Headphones, title: "Service Client", sub: "Basé en France (03 10 96 02 24)" },
  { icon: Leaf, title: "Éco-responsable", sub: "Large gamme recyclée" },
];

const HomeTrustStrip = () => {
  return (
    <section className="py-6 bg-white border-b border-[#c5c5d3]/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-[#121c2a] shrink-0" />
              <div>
                <p className="font-semibold text-[0.8rem] text-[#121c2a] font-poppins">
                  {item.title}
                </p>
                <p className="text-[0.7rem] text-[#121c2a]/40 font-inter">
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
