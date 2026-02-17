import { Link } from "react-router-dom";
import { Printer, Copy, Car, Stamp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Printer,
    title: "Impression Urgente",
    description: "Documents, affiches, supports professionnels. Service express sans rendez-vous à Chaumont.",
    href: "/impression-urgente-chaumont",
    cta: "Imprimer maintenant",
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    icon: Copy,
    title: "Photocopie Express",
    description: "Copies N&B ou couleur, reliure, plastification. Service rapide sur place à Chaumont.",
    href: "/photocopie-express-chaumont",
    cta: "Copier maintenant",
    gradient: "from-secondary/10 to-secondary/5",
    iconBg: "bg-secondary/15 text-secondary-dark",
  },
  {
    icon: Car,
    title: "Plaque d'Immatriculation",
    description: "Plaques homologuées fabriquées en 5 minutes. Apportez votre carte grise, repartez équipé.",
    href: "/plaque-immatriculation-chaumont",
    cta: "Commander ma plaque",
    gradient: "from-accent/10 to-accent/5",
    iconBg: "bg-accent/15 text-accent-dark",
  },
  {
    icon: Stamp,
    title: "Tampon Professionnel",
    description: "Tampons personnalisés pour entreprises, artisans et professions libérales. Fabrication rapide.",
    href: "/tampon-professionnel-chaumont",
    cta: "Créer mon tampon",
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
  }
];

const ServicesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Services</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4 font-poppins">
            Nos Services Express à Chaumont
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Des services rapides et professionnels, sans rendez-vous. 
            Votre papeterie multiservices au cœur de Chaumont, Haute-Marne.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <Link 
              key={service.title}
              to={service.href}
              className="group"
            >
              <div className={`bg-gradient-to-br ${service.gradient} rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col`}>
                <div className={`w-14 h-14 ${service.iconBg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-poppins">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed flex-1">
                  {service.description}
                </p>
                <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all duration-300">
                  {service.cta}
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* B2B CTA */}
        <div className="mt-14 bg-card rounded-2xl border border-border p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-1">Vous êtes une entreprise, école ou collectivité ?</h3>
            <p className="text-muted-foreground">Découvrez nos offres professionnelles et nos tarifs dégressifs.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/solutions-institutions-chaumont">
              <Button className="bg-primary hover:bg-primary-dark">Solutions Institutions</Button>
            </Link>
            <Link to="/pack-pro-local-chaumont">
              <Button variant="outline">Pack Pro Local</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
