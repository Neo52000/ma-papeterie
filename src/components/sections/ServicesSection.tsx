import { Link } from "react-router-dom";
import { Printer, Copy, Car, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Printer,
    title: "Impression Urgente",
    description: "Documents, affiches, supports professionnels. Service express sans rendez-vous à Chaumont.",
    href: "/impression-urgente-chaumont",
    cta: "Imprimer maintenant"
  },
  {
    icon: Copy,
    title: "Photocopie Express",
    description: "Copies N&B ou couleur, reliure, plastification. Service rapide sur place à Chaumont.",
    href: "/photocopie-express-chaumont",
    cta: "Copier maintenant"
  },
  {
    icon: Car,
    title: "Plaque d'Immatriculation",
    description: "Plaques homologuées fabriquées en 5 minutes. Apportez votre carte grise, repartez équipé.",
    href: "/plaque-immatriculation-chaumont",
    cta: "Commander ma plaque"
  },
  {
    icon: Stamp,
    title: "Tampon Professionnel",
    description: "Tampons personnalisés pour entreprises, artisans et professions libérales. Fabrication rapide.",
    href: "/tampon-professionnel-chaumont",
    cta: "Créer mon tampon"
  }
];

const ServicesSection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-poppins">
            Nos Services Express à Chaumont
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Des services rapides et professionnels, sans rendez-vous. 
            Votre papeterie multiservices au cœur de Chaumont, Haute-Marne.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div 
              key={service.title}
              className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-smooth border border-border group"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-smooth">
                <service.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 font-poppins">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {service.description}
              </p>
              <Link to={service.href}>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-smooth">
                  {service.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Lien vers offres B2B */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Vous êtes une entreprise, école ou collectivité ?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/solutions-institutions-chaumont">
              <Button variant="secondary">
                Solutions Institutions
              </Button>
            </Link>
            <Link to="/pack-pro-local-chaumont">
              <Button variant="outline">
                Pack Pro Local
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
