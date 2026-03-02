import type { ContentBlock, PageLayout } from "@/hooks/useStaticPages";

export interface PageTemplate {
  key: string;
  labelFr: string;
  description: string;
  layout: PageLayout;
  blocks: () => ContentBlock[];
}

function uid() {
  return crypto.randomUUID();
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    key: "blank",
    labelFr: "Page vierge",
    description: "Commencez avec une page vide",
    layout: "article",
    blocks: () => [],
  },
  {
    key: "landing",
    labelFr: "Landing page",
    description: "Hero + avantages + CTA",
    layout: "full-width",
    blocks: () => [
      {
        id: uid(), type: "hero",
        slides: [{ title: "Votre titre accrocheur", subtitle: "Sous-titre descriptif", buttonText: "En savoir plus", buttonLink: "#" }],
        autoplay: false,
      },
      {
        id: uid(), type: "icon_features", columns: 3,
        features: [
          { icon: "Zap", title: "Rapide", description: "Service express en moins de 24h" },
          { icon: "Shield", title: "Fiable", description: "Qualité professionnelle garantie" },
          { icon: "Heart", title: "Local", description: "Votre papeterie de proximité" },
        ],
      },
      {
        id: uid(), type: "cta",
        title: "Prêt à commencer ?",
        description: "Contactez-nous dès aujourd'hui",
        button: "Nous contacter",
        link: "/contact",
      },
    ],
  },
  {
    key: "about",
    labelFr: "Page À propos",
    description: "Image + texte, histoire, équipe",
    layout: "full-width",
    blocks: () => [
      {
        id: uid(), type: "image_text",
        imagePosition: "right" as const,
        title: "Notre histoire",
        text: "Depuis plus de 30 ans, nous accompagnons les particuliers et professionnels dans tous leurs besoins en papeterie et services d'impression.",
      },
      {
        id: uid(), type: "icon_features", columns: 4,
        features: [
          { icon: "Award", title: "30+ ans", description: "D'expérience" },
          { icon: "Users", title: "5000+", description: "Clients satisfaits" },
          { icon: "Package", title: "10000+", description: "Références en stock" },
          { icon: "MapPin", title: "Chaumont", description: "Centre-ville" },
        ],
      },
      {
        id: uid(), type: "testimonials",
        testimonials: [
          { name: "Marie D.", role: "Cliente", quote: "Un service impeccable, toujours à l'écoute !", rating: 5 },
          { name: "Jean-Pierre L.", role: "Artisan", quote: "Je fais imprimer tous mes supports ici depuis 10 ans.", rating: 5 },
        ],
      },
    ],
  },
  {
    key: "services-bv",
    labelFr: "Services Bureau Vallée",
    description: "Hero carrousel, grille 8 services, avantages, FAQ",
    layout: "full-width",
    blocks: () => [
      // 1. Hero carrousel
      {
        id: uid(), type: "hero",
        slides: [
          {
            title: "Espace Services Express",
            subtitle: "Impression, copie, finition — tout pour vos documents au même endroit",
            buttonText: "Découvrir nos services",
            buttonLink: "#services",
          },
          {
            title: "Impression Express",
            subtitle: "Documents, affiches, flyers — qualité pro en quelques minutes",
            buttonText: "Voir les tarifs",
            buttonLink: "#tarifs",
          },
          {
            title: "Tampons & Gravure",
            subtitle: "Tampons sur mesure, plaques gravées — fabrication rapide sur place",
            buttonText: "Commander",
            buttonLink: "#tampons",
          },
        ],
        autoplay: true,
        interval: 5000,
      },
      // 2. Grille 8 catégories de services
      {
        id: uid(), type: "service_grid", columns: 4,
        settings: { anchor: "services", padding: "lg" },
        services: [
          {
            icon: "Printer",
            title: "Impression & Copies",
            description: "Noir & blanc, couleur, recto-verso. À partir de 0.05€ la copie.",
            features: ["Copies A4/A3", "Impression couleur HD", "Recto-verso auto", "Papiers spéciaux"],
          },
          {
            icon: "FileText",
            title: "Imprimerie & Supports",
            description: "Cartes de visite, flyers, affiches, brochures professionnelles.",
            features: ["Cartes de visite", "Flyers / Dépliants", "Affiches tous formats", "Brochures reliées"],
          },
          {
            icon: "Maximize",
            title: "Grand Format",
            description: "Impression grand format pour vos affiches, bâches et kakémonos.",
            features: ["Posters A2/A1/A0", "Bâches", "Roll-up / Kakémono", "Plans & cartes"],
          },
          {
            icon: "Scissors",
            title: "Finition Documents",
            description: "Reliure, plastification, massicotage, pliage et mise sous pli.",
            features: ["Reliure spirale/thermique", "Plastification A4/A3", "Découpe & massicotage", "Pliage & agrafage"],
          },
          {
            icon: "Stamp",
            title: "Tampons & Gravure",
            description: "Tampons encreurs personnalisés, plaques de bureau gravées.",
            features: ["Tampons Trodat/Colop", "Plaques gravées", "Texte & logo", "Fabrication express"],
          },
          {
            icon: "Camera",
            title: "Tirage Photos",
            description: "Tirage photo instantané, agrandissements, albums personnalisés.",
            features: ["Photos d'identité", "Tirages 10x15 → 30x45", "Albums photo", "Cadres & supports"],
          },
          {
            icon: "Car",
            title: "Plaques & Clés",
            description: "Plaques d'immatriculation homologuées, duplication de clés.",
            features: ["Plaques minéralogiques", "Auto & moto", "Duplication clés", "Service rapide"],
          },
          {
            icon: "Building2",
            title: "Solutions Pro & B2B",
            description: "Services dédiés aux entreprises, devis personnalisés, livraison.",
            features: ["Devis sur mesure", "Compte professionnel", "Livraison bureau", "Abonnements mensuels"],
          },
        ],
      },
      // 3. Comment ça marche
      {
        id: uid(), type: "icon_features", columns: 3,
        settings: { backgroundColor: "#f8f9fa", padding: "lg" },
        features: [
          { icon: "Upload", title: "1. Envoyez vos fichiers", description: "Par email, clé USB ou directement en magasin. Nous acceptons tous les formats." },
          { icon: "Settings", title: "2. On s'en occupe", description: "Notre équipe traite votre commande avec soin et dans les meilleurs délais." },
          { icon: "CheckCircle", title: "3. C'est prêt !", description: "Récupérez vos documents en magasin ou recevez-les par livraison." },
        ],
      },
      // 4. Vidéo magasin
      {
        id: uid(), type: "video_embed",
        url: "",
        title: "Découvrez notre espace services",
        caption: "Visite virtuelle de notre espace services en magasin",
        aspectRatio: "16:9" as const,
      },
      // 5. Nos atouts
      {
        id: uid(), type: "icon_features", columns: 4,
        settings: { padding: "lg" },
        features: [
          { icon: "Zap", title: "Express", description: "La plupart des services sont disponibles en moins d'une heure." },
          { icon: "MapPin", title: "Local", description: "En plein centre de Chaumont, facile d'accès avec parking." },
          { icon: "Shield", title: "Fiable", description: "Matériel professionnel, résultats garantis." },
          { icon: "Euro", title: "Accessible", description: "Tarifs transparents et compétitifs, devis gratuit." },
        ],
      },
      // 6. FAQ
      {
        id: uid(), type: "faq",
        settings: { padding: "lg" },
        questions: [
          { q: "Quels formats de fichiers acceptez-vous ?", a: "Nous acceptons PDF, Word, PowerPoint, JPEG, PNG, AI et bien d'autres. En cas de doute, envoyez-nous votre fichier par email et nous vous confirmerons." },
          { q: "Quels sont vos délais de réalisation ?", a: "La plupart des impressions sont prêtes en moins d'une heure. Pour les travaux d'imprimerie complexes (brochures, grands tirages), comptez 24 à 48h." },
          { q: "Puis-je envoyer mes fichiers par email ?", a: "Oui ! Envoyez vos fichiers à contact@ma-papeterie.fr avec vos instructions. Nous vous confirmerons le devis par retour d'email." },
          { q: "Proposez-vous des tarifs pour les professionnels ?", a: "Absolument. Nous proposons des tarifs dégressifs et des comptes professionnels avec facturation mensuelle. Contactez-nous pour un devis personnalisé." },
          { q: "Où êtes-vous situés ?", a: "Nous sommes en plein centre-ville de Chaumont (52000), avec un parking à proximité. Retrouvez notre adresse exacte sur la page Contact." },
        ],
      },
      // 7. CTA final
      {
        id: uid(), type: "cta",
        settings: { backgroundColor: "#1a365d", padding: "lg" },
        title: "Un projet ? Contactez-nous !",
        description: "Notre équipe est à votre disposition pour tout renseignement ou devis gratuit.",
        button: "Nous contacter",
        link: "/contact",
      },
    ],
  },
];
