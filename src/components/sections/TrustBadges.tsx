import { Shield, LockKeyhole, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrustBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
}

const TrustBadge = ({ icon, title, description, link, linkText = "En savoir plus" }: TrustBadgeProps) => (
  <div className="flex flex-col items-center text-center space-y-2">
    <div className="text-3xl text-primary">{icon}</div>
    <h4 className="font-semibold text-foreground">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
    {link && (
      <Button variant="link" size="sm" asChild>
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs">
          {linkText} →
        </a>
      </Button>
    )}
  </div>
);

export function TrustBadges() {
  return (
    <section className="py-8 border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          <TrustBadge
            icon={<LockKeyhole className="w-8 h-8" />}
            title="SSL Sécurisé"
            description="Vos données sont protégées par encryptage SSL 256-bit"
            link="https://www.globalsign.com"
            linkText="Voir certificat"
          />
          <TrustBadge
            icon={<Shield className="w-8 h-8" />}
            title="Paiement Sécurisé"
            description="Transactions protégées par Stripe & Shopify Payments"
            link="/politique-paiement"
            linkText="Détails"
          />
          <TrustBadge
            icon={<FileCheck className="w-8 h-8" />}
            title="RGPD Compliant"
            description="Vos données personnelles sont protégées selon la loi"
            link="/politiqueprivacy"
            linkText="Politique RGPD"
          />
        </div>
      </div>
    </section>
  );
}

export function TrustBadgesInline() {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <div className="flex items-center gap-2">
        <LockKeyhole className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium">SSL Sécurisé</span>
      </div>
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium">Paiement Sécurisé</span>
      </div>
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium">RGPD Compliant</span>
      </div>
    </div>
  );
}
