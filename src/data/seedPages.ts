/**
 * Pages existantes du site, converties en format ContentBlock
 * pour être importées dans le CMS (table static_pages).
 *
 * Chaque entrée correspond à une page actuellement codée en dur
 * dans src/pages/*.tsx.
 */

import type { ContentBlock, PageStatus, SchemaType } from "@/hooks/useStaticPages";

function uid() {
  return crypto.randomUUID();
}

export interface SeedPage {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  schema_type: SchemaType;
  status: PageStatus;
  content: ContentBlock[];
  json_ld: Record<string, unknown> | null;
}

export const SEED_PAGES: SeedPage[] = [
  // ── Mentions Légales ────────────────────────────────────────────────────
  {
    slug: "mentions-legales",
    title: "Mentions Légales",
    meta_title: "Mentions Légales | Papeterie Reine & Fils — Chaumont",
    meta_description: "Informations légales obligatoires concernant Papeterie Reine & Fils, SAS au capital de 50 000 €, 10 rue Toupot de Beveaux, 52000 Chaumont.",
    h1: "Mentions Légales",
    schema_type: "WebPage",
    status: "draft",
    json_ld: null,
    content: [
      { id: uid(), type: "paragraph", content: "Informations légales obligatoires concernant Papeterie Reine & Fils." },
      { id: uid(), type: "heading", level: 2, content: "Éditeur du site" },
      { id: uid(), type: "paragraph", content: "Papeterie Reine & Fils — Société par Actions Simplifiée (SAS)\n10 rue Toupot de Beveaux, 52000 Chaumont, France\nSIRET : 123 456 789 00012 — TVA : FR12 123456789\nCapital social : 50 000 € entièrement libéré\nDirecteur de publication : M. Jean Reine, Président" },
      { id: uid(), type: "heading", level: 2, content: "Contact" },
      { id: uid(), type: "paragraph", content: "Téléphone : 03 10 96 02 24\nEmail : contact@ma-papeterie.fr" },
      { id: uid(), type: "heading", level: 2, content: "Hébergement" },
      { id: uid(), type: "paragraph", content: "Ce site est hébergé par Netlify (États-Unis)." },
      { id: uid(), type: "heading", level: 2, content: "Propriété intellectuelle" },
      { id: uid(), type: "paragraph", content: "Le contenu de ce site web (textes, images, graphismes, logo, icônes, sons, logiciels) est la propriété exclusive de Papeterie Reine & Fils, à l'exception des marques, logos ou contenus appartenant à d'autres sociétés partenaires ou auteurs. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable." },
      { id: uid(), type: "heading", level: 2, content: "Protection des données personnelles" },
      { id: uid(), type: "paragraph", content: "Les informations recueillies sur ce site sont enregistrées dans un fichier informatisé par Papeterie Reine & Fils pour la gestion des commandes et la relation client. Conformément au RGPD, vous pouvez exercer votre droit d'accès aux données vous concernant en contactant : contact@ma-papeterie.fr" },
      { id: uid(), type: "heading", level: 2, content: "Cookies" },
      { id: uid(), type: "paragraph", content: "Ce site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des statistiques de visites. Vous pouvez configurer votre navigateur pour refuser les cookies." },
      { id: uid(), type: "heading", level: 2, content: "Droit applicable" },
      { id: uid(), type: "paragraph", content: "Les présentes mentions légales sont soumises au droit français. Tout litige relatif à l'utilisation de ce site sera de la compétence exclusive des tribunaux de Chaumont." },
    ],
  },

  // ── CGV ──────────────────────────────────────────────────────────────────
  {
    slug: "cgv",
    title: "Conditions Générales de Vente",
    meta_title: "CGV | Papeterie Reine & Fils — Chaumont",
    meta_description: "Conditions générales de vente de Ma Papeterie — Reine & Fils. Commandes, livraison, retours, paiement, garanties.",
    h1: "Conditions Générales de Vente",
    schema_type: "WebPage",
    status: "draft",
    json_ld: null,
    content: [
      { id: uid(), type: "heading", level: 2, content: "Article 1 — Objet" },
      { id: uid(), type: "paragraph", content: "Les présentes conditions générales de vente régissent les relations contractuelles entre Ma Papeterie — Reine & Fils (ci-après \"le Vendeur\") et toute personne effectuant un achat via le site ma-papeterie.fr (ci-après \"l'Acheteur\"). Toute commande implique l'acceptation sans réserve des présentes CGV." },
      { id: uid(), type: "heading", level: 2, content: "Article 2 — Produits et prix" },
      { id: uid(), type: "paragraph", content: "Les produits proposés sont ceux décrits sur le site au moment de la commande. Les prix sont indiqués en euros TTC. Le Vendeur se réserve le droit de modifier ses prix à tout moment, les produits étant facturés au tarif en vigueur lors de la validation de la commande." },
      { id: uid(), type: "heading", level: 2, content: "Article 3 — Commandes" },
      { id: uid(), type: "paragraph", content: "L'Acheteur valide sa commande après avoir pris connaissance des présentes CGV. La validation de la commande vaut acceptation des prix et descriptions des produits commandés. Le Vendeur confirmera la commande par email." },
      { id: uid(), type: "heading", level: 2, content: "Article 4 — Paiement" },
      { id: uid(), type: "paragraph", content: "Le paiement s'effectue par carte bancaire, virement ou tout autre moyen proposé sur le site. La commande est validée après confirmation du paiement." },
      { id: uid(), type: "heading", level: 2, content: "Article 5 — Livraison" },
      { id: uid(), type: "paragraph", content: "Les délais de livraison sont donnés à titre indicatif. Les produits sont livrés à l'adresse indiquée par l'Acheteur lors de la commande. Le retrait en magasin est possible gratuitement." },
      { id: uid(), type: "heading", level: 2, content: "Article 6 — Droit de rétractation" },
      { id: uid(), type: "paragraph", content: "Conformément au Code de la consommation, l'Acheteur dispose d'un délai de 14 jours à compter de la réception des produits pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités." },
      { id: uid(), type: "heading", level: 2, content: "Article 7 — Garanties" },
      { id: uid(), type: "paragraph", content: "Les produits bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés prévues par le Code civil." },
      { id: uid(), type: "heading", level: 2, content: "Article 8 — Litiges" },
      { id: uid(), type: "paragraph", content: "Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant de soumettre le différend aux tribunaux compétents de Chaumont." },
    ],
  },

  // ── Politique de confidentialité ────────────────────────────────────────
  {
    slug: "politique-confidentialite",
    title: "Politique de Confidentialité",
    meta_title: "Politique de confidentialité | Papeterie Reine & Fils",
    meta_description: "Notre politique de protection des données personnelles, conformément au RGPD. Collecte, utilisation, conservation et droits des utilisateurs.",
    h1: "Politique de Confidentialité",
    schema_type: "WebPage",
    status: "draft",
    json_ld: null,
    content: [
      { id: uid(), type: "paragraph", content: "Papeterie Reine & Fils s'engage à protéger vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD)." },
      { id: uid(), type: "heading", level: 2, content: "Données collectées" },
      { id: uid(), type: "paragraph", content: "Nous collectons les données nécessaires au traitement de vos commandes : nom, prénom, adresse email, adresse postale, téléphone. Ces données sont collectées lors de la création de compte ou de la passation de commande." },
      { id: uid(), type: "heading", level: 2, content: "Utilisation des données" },
      { id: uid(), type: "paragraph", content: "Vos données sont utilisées pour : le traitement et le suivi de vos commandes, la gestion de votre compte client, l'envoi de communications commerciales (avec votre consentement), le service après-vente." },
      { id: uid(), type: "heading", level: 2, content: "Conservation" },
      { id: uid(), type: "paragraph", content: "Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, et au maximum 3 ans après le dernier contact." },
      { id: uid(), type: "heading", level: 2, content: "Vos droits" },
      { id: uid(), type: "list", ordered: false, items: [
        "Droit d'accès à vos données personnelles",
        "Droit de rectification des données inexactes",
        "Droit à l'effacement (droit à l'oubli)",
        "Droit à la portabilité de vos données",
        "Droit d'opposition au traitement",
      ] },
      { id: uid(), type: "paragraph", content: "Pour exercer ces droits, contactez-nous à : contact@ma-papeterie.fr" },
    ],
  },

  // ── À propos ────────────────────────────────────────────────────────────
  {
    slug: "a-propos",
    title: "À Propos",
    meta_title: "À propos de Ma Papeterie | Chaumont, Haute-Marne",
    meta_description: "Découvrez Ma Papeterie, votre expert en fournitures à Chaumont. Sélection rigoureuse, conseil personnalisé et expertise.",
    h1: "À Propos de Ma Papeterie",
    schema_type: "LocalBusiness",
    status: "draft",
    json_ld: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Papeterie Reine & Fils",
      address: { "@type": "PostalAddress", streetAddress: "10 rue Toupot de Beveaux", addressLocality: "Chaumont", postalCode: "52000", addressCountry: "FR" },
    },
    content: [
      {
        id: uid(), type: "image_text", imagePosition: "right" as const,
        title: "Notre Histoire",
        text: "Nous accompagnons les professionnels et les particuliers avec une sélection rigoureuse de fournitures de qualité. Fondée par une équipe de passionnés, notre boutique s'est imposée comme une référence en papeterie professionnelle à Chaumont.",
      },
      {
        id: uid(), type: "icon_features", columns: 4,
        features: [
          { icon: "Award", title: "40 000+", description: "Références" },
          { icon: "Users", title: "5000+", description: "Clients satisfaits" },
          { icon: "Package", title: "10000+", description: "Références en stock" },
          { icon: "MapPin", title: "Chaumont", description: "Centre-ville" },
        ],
      },
      {
        id: uid(), type: "icon_features", columns: 4,
        features: [
          { icon: "Award", title: "Qualité", description: "Sélection rigoureuse de produits premium" },
          { icon: "Heart", title: "Passion", description: "Amour du bel objet d'écriture" },
          { icon: "Users", title: "Service", description: "Conseil personnalisé en magasin" },
          { icon: "Leaf", title: "Éco-responsable", description: "Gamme de produits éco-certifiés" },
        ],
      },
      {
        id: uid(), type: "cta",
        title: "Venez nous rendre visite !",
        description: "Notre équipe vous accueille du lundi au samedi au centre-ville de Chaumont.",
        button: "Nous contacter",
        link: "/contact",
      },
    ],
  },

  // ── FAQ ──────────────────────────────────────────────────────────────────
  {
    slug: "faq",
    title: "Foire aux Questions",
    meta_title: "FAQ | Papeterie Reine & Fils — Chaumont",
    meta_description: "Retrouvez les réponses aux questions les plus fréquentes sur nos produits, commandes, livraisons et services.",
    h1: "Foire aux Questions",
    schema_type: "FAQPage",
    status: "draft",
    json_ld: null,
    content: [
      { id: uid(), type: "paragraph", content: "Retrouvez ci-dessous les réponses aux questions les plus fréquemment posées par nos clients." },
      {
        id: uid(), type: "faq",
        questions: [
          { q: "Quels moyens de paiement acceptez-vous ?", a: "Nous acceptons les cartes bancaires (Visa, Mastercard), les virements bancaires et le paiement en magasin (espèces, CB, chèques)." },
          { q: "Puis-je payer en plusieurs fois ?", a: "Le paiement en plusieurs fois est disponible pour les commandes professionnelles supérieures à 200€. Contactez-nous pour plus d'informations." },
          { q: "Comment suivre ma commande ?", a: "Un email de confirmation avec un numéro de suivi vous est envoyé dès l'expédition de votre commande." },
          { q: "Puis-je modifier ou annuler ma commande ?", a: "Vous pouvez modifier ou annuler votre commande tant qu'elle n'a pas été expédiée. Contactez-nous rapidement par téléphone ou email." },
        ],
      },
      { id: uid(), type: "heading", level: 2, content: "Livraison" },
      {
        id: uid(), type: "faq",
        questions: [
          { q: "Quels sont les délais de livraison ?", a: "Les commandes sont généralement expédiées sous 24-48h. La livraison standard prend 2-4 jours ouvrés. Le retrait en magasin est immédiat pour les produits en stock." },
          { q: "Le retrait en magasin est-il gratuit ?", a: "Oui, le retrait en magasin est entièrement gratuit. Vous recevrez un email dès que votre commande sera prête." },
          { q: "Livrez-vous en dehors de la France ?", a: "Actuellement, nous livrons uniquement en France métropolitaine. Pour les DOM-TOM, contactez-nous." },
        ],
      },
      { id: uid(), type: "heading", level: 2, content: "Retours & SAV" },
      {
        id: uid(), type: "faq",
        questions: [
          { q: "Quel est le délai de retour ?", a: "Vous disposez de 14 jours après réception pour retourner un article. Les produits doivent être dans leur emballage d'origine, non utilisés." },
          { q: "Comment effectuer un retour ?", a: "Contactez notre service client par email à contact@ma-papeterie.fr avec votre numéro de commande. Nous vous enverrons une étiquette de retour." },
        ],
      },
      {
        id: uid(), type: "cta",
        title: "Une question non résolue ?",
        description: "Notre équipe est à votre disposition pour répondre à toutes vos questions.",
        button: "Nous contacter",
        link: "/contact",
      },
    ],
  },

  // ── Livraison ───────────────────────────────────────────────────────────
  {
    slug: "livraison",
    title: "Livraison & Retours",
    meta_title: "Livraison et retours | Papeterie Reine & Fils — Chaumont",
    meta_description: "Informations sur nos options de livraison, délais, tarifs et politique de retours. Retrait gratuit en magasin à Chaumont.",
    h1: "Livraison & Retours",
    schema_type: "WebPage",
    status: "draft",
    json_ld: null,
    content: [
      {
        id: uid(), type: "icon_features", columns: 4,
        features: [
          { icon: "Truck", title: "Livraison rapide", description: "Expédition sous 24-48h ouvrés" },
          { icon: "RotateCcw", title: "Retours faciles", description: "14 jours pour changer d'avis" },
          { icon: "Clock", title: "Retrait express", description: "Gratuit en magasin, prêt en 1h" },
          { icon: "HelpCircle", title: "Support client", description: "À votre écoute 6j/7" },
        ],
      },
      { id: uid(), type: "heading", level: 2, content: "Options de livraison" },
      {
        id: uid(), type: "list", ordered: false,
        items: [
          "Retrait en magasin — Gratuit, prêt en 1h pour les produits en stock",
          "Colissimo domicile — 4,90€, livraison en 2-4 jours ouvrés",
          "Chronopost express — 9,90€, livraison en 24h",
          "Livraison gratuite — Dès 89€ d'achat en Colissimo",
        ],
      },
      { id: uid(), type: "heading", level: 2, content: "Politique de retours" },
      { id: uid(), type: "paragraph", content: "Vous disposez de 14 jours à compter de la réception pour retourner un article. Les produits doivent être dans leur état d'origine, non utilisés et dans leur emballage. Les frais de retour sont à la charge du client sauf en cas de produit défectueux." },
      {
        id: uid(), type: "cta",
        title: "Besoin d'aide ?",
        description: "Notre service client est disponible du lundi au samedi.",
        button: "Contactez-nous",
        link: "/contact",
      },
    ],
  },

  // ── Contact ────────────────────────────────────────────────────────────
  {
    slug: "contact",
    title: "Contact",
    meta_title: "Contactez-nous | Papeterie Reine & Fils — Chaumont",
    meta_description: "Contactez Papeterie Reine & Fils à Chaumont. Téléphone, email, formulaire de contact et horaires d'ouverture. 10 rue Toupot de Beveaux, 52000 Chaumont.",
    h1: "Contactez-nous",
    schema_type: "LocalBusiness",
    status: "draft",
    json_ld: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Papeterie Reine & Fils",
      telephone: "+33745062162",
      email: "contact@ma-papeterie.fr",
      address: { "@type": "PostalAddress", streetAddress: "10 rue Toupot de Beveaux", addressLocality: "Chaumont", postalCode: "52000", addressCountry: "FR" },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:30" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "17:00" },
      ],
    },
    content: [
      {
        id: uid(), type: "hero",
        slides: [{ title: "Contactez-nous", subtitle: "Notre équipe est à votre disposition pour répondre à toutes vos questions" }],
        autoplay: false,
      },
      {
        id: uid(), type: "icon_features", columns: 3,
        features: [
          { icon: "MapPin", title: "Notre magasin", description: "10 rue Toupot de Beveaux, 52000 Chaumont" },
          { icon: "Phone", title: "Téléphone", description: "03 10 96 02 24" },
          { icon: "Mail", title: "Email", description: "contact@ma-papeterie.fr" },
        ],
      },
      {
        id: uid(), type: "icon_features", columns: 2,
        features: [
          { icon: "Clock", title: "Lun-Ven : 9h00-18h30", description: "Sam : 9h00-17h00 — Dim : Fermé" },
          { icon: "MessageCircle", title: "Service client", description: "Email 24/48h • Tél 9h-18h • Chat en ligne • WhatsApp" },
        ],
      },
      {
        id: uid(), type: "faq",
        questions: [
          { q: "Comment vous contacter rapidement ?", a: "Appelez-nous au 03 10 96 02 24 pendant nos horaires d'ouverture, ou envoyez un email à contact@ma-papeterie.fr pour une réponse sous 24-48h." },
          { q: "Où êtes-vous situés ?", a: "Nous sommes au 10 rue Toupot de Beveaux, 52000 Chaumont, en plein centre-ville avec parking à proximité." },
          { q: "Quels sont vos horaires ?", a: "Du lundi au vendredi de 9h à 18h30, le samedi de 9h à 17h. Fermé le dimanche." },
          { q: "Proposez-vous un service de devis ?", a: "Oui, contactez-nous par email ou par téléphone avec votre demande détaillée. Nous vous enverrons un devis gratuit sous 24h." },
        ],
      },
      {
        id: uid(), type: "cta",
        title: "Venez nous rendre visite !",
        description: "Notre équipe vous accueille du lundi au samedi au centre-ville de Chaumont.",
        button: "Itinéraire Google Maps",
        link: "https://maps.google.com/?q=10+rue+Toupot+de+Beveaux+52000+Chaumont",
      },
    ],
  },

  // ── Impression urgente ──────────────────────────────────────────────────
  {
    slug: "impression-urgente-chaumont",
    title: "Impression urgente à Chaumont",
    meta_title: "Impression urgente à Chaumont | Service express sans rendez-vous",
    meta_description: "Service d'impression de documents express sans rendez-vous à Chaumont, Haute-Marne. Impression A4, A3, noir et blanc et couleur. Résultat immédiat.",
    h1: "Impression urgente à Chaumont — Service express",
    schema_type: "Service",
    status: "draft",
    json_ld: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Impression urgente à Chaumont",
      description: "Service d'impression de documents express sans rendez-vous à Chaumont.",
      provider: {
        "@type": "LocalBusiness",
        name: "Ma Papeterie",
        address: { "@type": "PostalAddress", streetAddress: "10 rue Toupot de Beveaux", addressLocality: "Chaumont", postalCode: "52000" },
      },
    },
    content: [
      {
        id: uid(), type: "hero",
        slides: [{
          title: "Impression Express à Chaumont",
          subtitle: "Documents imprimés pendant votre attente, sans rendez-vous",
          buttonText: "Nous contacter",
          buttonLink: "/contact",
        }],
      },
      {
        id: uid(), type: "icon_features", columns: 3,
        features: [
          { icon: "Printer", title: "Impression immédiate", description: "Vos documents imprimés pendant votre attente" },
          { icon: "Clock", title: "Sans rendez-vous", description: "Venez directement en magasin aux heures d'ouverture" },
          { icon: "CheckCircle", title: "Tous formats", description: "A4, A3, noir & blanc ou couleur" },
        ],
      },
      { id: uid(), type: "heading", level: 2, content: "Nos services d'impression" },
      {
        id: uid(), type: "list", ordered: false,
        items: [
          "Impression de documents A4 et A3",
          "Noir et blanc et couleur haute définition",
          "Recto-verso automatique",
          "Impression depuis clé USB ou email",
          "Photocopies et agrandissements",
          "Reliure et finition sur place",
        ],
      },
      {
        id: uid(), type: "faq",
        questions: [
          { q: "Peut-on imprimer des documents en urgence à Chaumont ?", a: "Oui, Ma Papeterie à Chaumont propose un service d'impression express sans rendez-vous. Apportez votre fichier sur clé USB ou envoyez-le par email." },
          { q: "Quels formats d'impression sont disponibles en urgence ?", a: "Les formats A4 et A3 sont disponibles en impression urgente, en noir et blanc ou en couleur." },
          { q: "Quel est le délai pour une impression urgente ?", a: "Pour les documents standards, l'impression peut être réalisée pendant votre attente. Pour les volumes importants, un délai de quelques heures peut être nécessaire." },
          { q: "Peut-on imprimer des documents professionnels en urgence ?", a: "Oui, nous imprimons tous types de documents professionnels : devis, factures, présentations, rapports, supports de communication." },
        ],
      },
      {
        id: uid(), type: "cta",
        title: "Besoin d'une impression urgente ?",
        description: "Venez directement en magasin ou envoyez vos fichiers par email.",
        button: "Nous contacter",
        link: "/contact",
      },
    ],
  },

  // ── Photocopie express ──────────────────────────────────────────────────
  {
    slug: "photocopie-express-chaumont",
    title: "Photocopie express à Chaumont",
    meta_title: "Photocopie express à Chaumont | Copies rapides sans rendez-vous",
    meta_description: "Service de photocopie rapide à Chaumont. Copies A4, A3, noir et blanc et couleur. Retrait immédiat, tarifs compétitifs.",
    h1: "Photocopie express à Chaumont",
    schema_type: "Service",
    status: "draft",
    json_ld: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Photocopie express à Chaumont",
      provider: {
        "@type": "LocalBusiness",
        name: "Ma Papeterie",
        address: { "@type": "PostalAddress", streetAddress: "10 rue Toupot de Beveaux", addressLocality: "Chaumont", postalCode: "52000" },
      },
    },
    content: [
      {
        id: uid(), type: "hero",
        slides: [{
          title: "Photocopies Express à Chaumont",
          subtitle: "Copies rapides, qualité professionnelle, sans rendez-vous",
          buttonText: "Nos tarifs",
          buttonLink: "/contact",
        }],
      },
      {
        id: uid(), type: "icon_features", columns: 3,
        features: [
          { icon: "FileText", title: "Copies A4/A3", description: "Noir & blanc dès 0.05€, couleur dès 0.15€" },
          { icon: "Clock", title: "Immédiat", description: "Vos copies prêtes pendant votre attente" },
          { icon: "Users", title: "Pro & Particulier", description: "Tarifs dégressifs pour les volumes" },
        ],
      },
      { id: uid(), type: "heading", level: 2, content: "Nos tarifs photocopie" },
      {
        id: uid(), type: "list", ordered: false,
        items: [
          "Copie A4 N&B : à partir de 0.05€",
          "Copie A4 couleur : à partir de 0.15€",
          "Copie A3 N&B : à partir de 0.10€",
          "Copie A3 couleur : à partir de 0.30€",
          "Tarifs dégressifs à partir de 100 copies",
        ],
      },
      {
        id: uid(), type: "faq",
        questions: [
          { q: "Où faire des photocopies à Chaumont ?", a: "Ma Papeterie, située au centre-ville de Chaumont, propose un service de photocopie rapide sans rendez-vous." },
          { q: "Quel est le prix d'une photocopie ?", a: "À partir de 0.05€ la copie A4 en noir et blanc. Tarifs dégressifs pour les volumes importants." },
        ],
      },
      {
        id: uid(), type: "cta",
        title: "Besoin de photocopies ?",
        description: "Venez directement en magasin, sans rendez-vous.",
        button: "Nous contacter",
        link: "/contact",
      },
    ],
  },
];
