import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Users,
  UserCheck,
  ArrowRight,
  Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { getLucideIcon } from "@/lib/lucide-icon-map";

const defaultBenefits = [
  {
    icon: CreditCard,
    text: "Conditions de paiement personnalisées et facturation à 30 jours fin de mois.",
  },
  {
    icon: Users,
    text: "Gestion multi-comptes et centres de coûts pour les grandes structures.",
  },
  {
    icon: UserCheck,
    text: "Interlocuteur unique dédié pour vos besoins spécifiques et volume.",
  },
];

interface HomeB2BSectionProps {
  label?: string;
  title?: string;
  benefits?: { icon: string; text: string }[];
  ctaText?: string;
  ctaLink?: string;
  formTitle?: string;
}

const HomeB2BSection = ({
  label: labelProp,
  title: titleProp,
  benefits: benefitsProp,
  ctaText,
  ctaLink,
  formTitle,
}: HomeB2BSectionProps = {}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    societe: "",
    siret: "",
    email: "",
    projet: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      toast.success("Demande envoyée ! Nous vous répondons sous 1h.");
      setFormData({ societe: "", siret: "", email: "", projet: "" });
      setSubmitting(false);
    }, 600);
  };

  return (
    <section className="py-24 bg-[#eff3ff]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left — Text & Benefits */}
          <div className="space-y-8">
            <div>
              <span className="text-[0.75rem] font-medium uppercase tracking-[0.05em] text-[#1e3a8a] font-inter">
                {labelProp ?? "Professionnels"}
              </span>
              <h2 className="text-2xl md:text-[2rem] font-bold text-[#121c2a] font-poppins mt-3 leading-tight whitespace-pre-line">
                {titleProp ?? "Simplifiez vos achats,\nmultipliez vos avantages."}
              </h2>
            </div>

            {/* Benefits — spacing separation, no lines */}
            <ul className="space-y-5">
              {(benefitsProp ?? defaultBenefits).map((b, i) => {
                const Icon = typeof b.icon === "string" ? (getLucideIcon(b.icon) ?? CreditCard) : b.icon;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e6eeff] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#1e3a8a]" />
                    </div>
                    <span className="text-[0.875rem] text-[#121c2a]/70 font-inter leading-relaxed">
                      {b.text}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="cta-orange"
                size="lg"
                className="group bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300] px-8"
                onClick={() => navigate(ctaLink ?? "/inscription-pro")}
              >
                {ctaText ?? "Créer mon compte Pro"}
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="atelier-tertiary"
                size="default"
                onClick={() => navigate("/contact")}
              >
                Demander un devis
              </Button>
            </div>
          </div>

          {/* Right — Inline Quote Form */}
          <div
            className="bg-white rounded-[1rem] p-6 md:p-8"
            style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
          >
            <h3 className="text-lg font-semibold text-[#121c2a] font-poppins mb-6">
              {formTitle ?? "Devis gratuit en 1 heure"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.75rem] font-medium text-[#121c2a]/50 uppercase tracking-[0.05em] font-inter mb-1.5 block">
                    Société
                  </label>
                  <input
                    type="text"
                    placeholder="Nom de l'entreprise"
                    value={formData.societe}
                    onChange={(e) => setFormData({ ...formData, societe: e.target.value })}
                    required
                    className="w-full bg-[#dee9fd] text-[#121c2a] text-[0.875rem] font-inter px-4 py-3 rounded-[0.5rem] border-b border-[#c5c5d3]/15 focus:bg-white focus:border-[#1e3a8a]/40 focus:outline-none transition-all placeholder:text-[#121c2a]/30"
                  />
                </div>
                <div>
                  <label className="text-[0.75rem] font-medium text-[#121c2a]/50 uppercase tracking-[0.05em] font-inter mb-1.5 block">
                    SIRET
                  </label>
                  <input
                    type="text"
                    placeholder="14 chiffres"
                    value={formData.siret}
                    onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                    className="w-full bg-[#dee9fd] text-[#121c2a] text-[0.875rem] font-inter px-4 py-3 rounded-[0.5rem] border-b border-[#c5c5d3]/15 focus:bg-white focus:border-[#1e3a8a]/40 focus:outline-none transition-all placeholder:text-[#121c2a]/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[0.75rem] font-medium text-[#121c2a]/50 uppercase tracking-[0.05em] font-inter mb-1.5 block">
                  Email professionnel
                </label>
                <input
                  type="email"
                  placeholder="contact@entreprise.fr"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-[#dee9fd] text-[#121c2a] text-[0.875rem] font-inter px-4 py-3 rounded-[0.5rem] border-b border-[#c5c5d3]/15 focus:bg-white focus:border-[#1e3a8a]/40 focus:outline-none transition-all placeholder:text-[#121c2a]/30"
                />
              </div>

              <div>
                <label className="text-[0.75rem] font-medium text-[#121c2a]/50 uppercase tracking-[0.05em] font-inter mb-1.5 block">
                  Votre projet
                </label>
                <textarea
                  placeholder="Décrivez brièvement vos besoins..."
                  value={formData.projet}
                  onChange={(e) => setFormData({ ...formData, projet: e.target.value })}
                  rows={3}
                  className="w-full bg-[#dee9fd] text-[#121c2a] text-[0.875rem] font-inter px-4 py-3 rounded-[0.5rem] border-b border-[#c5c5d3]/15 focus:bg-white focus:border-[#1e3a8a]/40 focus:outline-none transition-all resize-none placeholder:text-[#121c2a]/30"
                />
              </div>

              <Button
                type="submit"
                variant="cta-orange"
                size="lg"
                className="w-full bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300]"
                disabled={submitting}
              >
                <Send className="mr-2 w-4 h-4" />
                {submitting ? "Envoi en cours..." : "Envoyer la demande"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeB2BSection;
