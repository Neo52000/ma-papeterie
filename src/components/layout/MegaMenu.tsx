import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";

// Category images
import imgConsommables from "@/assets/categories/consommables.jpg";
import imgEcrireCorreger from "@/assets/categories/ecrire-corriger.jpg";
import imgJeux from "@/assets/categories/jeux.jpg";
import imgConsommablesInfo from "@/assets/categories/consommables-info.jpg";
import imgClassement from "@/assets/categories/classement.jpg";
import imgPeinture from "@/assets/categories/peinture.jpg";
import imgCahiers from "@/assets/categories/cahiers.jpg";
import imgPetitMateriel from "@/assets/categories/petit-materiel.jpg";
import imgTravauxManuels from "@/assets/categories/travaux-manuels.jpg";
import imgServicesGeneraux from "@/assets/categories/services-generaux.jpg";
import imgMobilier from "@/assets/categories/mobilier.jpg";
import imgChemises from "@/assets/categories/chemises.jpg";
import imgMarqueurs from "@/assets/categories/marqueurs.jpg";
import imgDessin from "@/assets/categories/dessin.jpg";
import imgEquipementClasse from "@/assets/categories/equipement-classe.jpg";
import imgCourrier from "@/assets/categories/courrier.jpg";
import imgHygiene from "@/assets/categories/hygiene.jpg";
import imgPetiteEnfance from "@/assets/categories/petite-enfance.jpg";
import imgBureautique from "@/assets/categories/bureautique.jpg";
import imgPapiers from "@/assets/categories/papiers.jpg";

interface MegaCategory {
  name: string;
  slug: string;
  image: string;
  subcategories: { name: string; slug: string }[];
}

const megaCategories: MegaCategory[] = [
  {
    name: "Écrire & Corriger",
    slug: "ECRIRE ET CORRIGER",
    image: imgEcrireCorreger,
    subcategories: [
      { name: "Stylos bille", slug: "ECRITURE BILLE" },
      { name: "Feutres & Marqueurs", slug: "ECRITURE FEUTRE" },
      { name: "Rollers", slug: "ECRITURE LARGE" },
      { name: "Crayons graphite", slug: "ECRITURE GRAPHITE" },
      { name: "Surligneurs", slug: "SURLIGNEURS" },
      { name: "Correction", slug: "CORRECTION" },
      { name: "Stylos plume", slug: "ECRITURE PLUME" },
    ],
  },
  {
    name: "Cahiers & Papier",
    slug: "CAHIERS ET DERIVES DE PAPIER",
    image: imgCahiers,
    subcategories: [
      { name: "Cahiers", slug: "CAHIERS" },
      { name: "Agendas", slug: "AGENDAS" },
      { name: "Blocs-notes", slug: "NOTES EN BLOC" },
      { name: "Carnets & Répertoires", slug: "CARNETS ET REPERTOIRES" },
      { name: "Calendriers", slug: "CALENDRIERS" },
      { name: "Manifolds", slug: "MANIFOLDS, CARNETS ET BLOCS" },
    ],
  },
  {
    name: "Classement",
    slug: "CLASSEMENT",
    image: imgClassement,
    subcategories: [
      { name: "Chemises", slug: "CHEMISE DE CLASSEMENT" },
      { name: "Classeurs", slug: "CLASSEURS" },
      { name: "Protège-documents", slug: "PROTEGES DOCUMENTS" },
      { name: "Boîtes de classement", slug: "BOITES DE CLASSEMENT" },
      { name: "Archivage", slug: "ARCHIVAGE" },
      { name: "Intercalaires", slug: "INTERCALAIRE" },
    ],
  },
  {
    name: "Petit matériel",
    slug: "PETIT MATERIEL BUREAU ET ECOLE",
    image: imgPetitMateriel,
    subcategories: [
      { name: "Tampons & Dateurs", slug: "DATER - NUMEROTER" },
      { name: "Ciseaux & Cutters", slug: "DECOUPER, COUPER, TAILLER" },
      { name: "Agrafeuses", slug: "AGRAFER" },
      { name: "Colles", slug: "COLLER" },
      { name: "Adhésifs", slug: "ADHESIF ET DEVIDOIR" },
      { name: "Règles & Compas", slug: "TRACER / MESURER" },
    ],
  },
  {
    name: "Bureautique",
    slug: "BUREAUTIQUE",
    image: imgBureautique,
    subcategories: [
      { name: "Étiquetage", slug: "ETIQUETAGE" },
      { name: "Reliure & Présentation", slug: "RELIURE ET PRESENTATION DE DOCUMENT" },
      { name: "Plastification", slug: "PLASTIFICATION" },
      { name: "Destructeurs", slug: "DESTRUCTION DE DOCUMENTS" },
      { name: "Calculatrices", slug: "CALCULATRICES" },
    ],
  },
  {
    name: "Équipement bureau",
    slug: "EQUIPEMENT CLASSE ET BUREAU",
    image: imgEquipementClasse,
    subcategories: [
      { name: "Équipement du bureau", slug: "EQUIPEMENT DU BUREAU" },
      { name: "Corbeilles & Modules", slug: "MODULE,TRIEUR &CORBEILLE A COURRIER" },
      { name: "Affichage", slug: "AFFICHAGE" },
      { name: "Tableaux", slug: "TABLEAUX ET CHEVALETS" },
    ],
  },
  {
    name: "Courrier & Expédition",
    slug: "COURRIER ET EXPEDITION",
    image: imgCourrier,
    subcategories: [
      { name: "Emballage", slug: "EMBALLAGE EXPEDITION" },
      { name: "Étiquettes", slug: "ETIQUETTES" },
      { name: "Pochettes", slug: "POCHETTES" },
      { name: "Enveloppes", slug: "ENVELOPPES" },
    ],
  },
  {
    name: "Informatique",
    slug: "CONSOMMABLES INFORMATIQUES",
    image: imgConsommablesInfo,
    subcategories: [
      { name: "Consommables informatiques", slug: "CONSOMMABLES INFORMATIQUES" },
    ],
  },
  {
    name: "Scolaire & Créatif",
    slug: "DESSIN SCOLAIRE ET PROFESSIONNEL",
    image: imgDessin,
    subcategories: [
      { name: "Feutres de coloriage", slug: "FEUTRES DE COLORIAGE" },
      { name: "Peintures", slug: "PEINTURES" },
      { name: "Crayons de couleur", slug: "CRAYONS ET CRAIES DE COLORIAGE" },
      { name: "Pinceaux", slug: "PINCEAUX,BROSSES,EPONGES A PEINDRE" },
    ],
  },
  {
    name: "Travaux manuels",
    slug: "TRAVAUX MANUELS",
    image: imgTravauxManuels,
    subcategories: [
      { name: "Kits créatifs", slug: "ACCESSOIRES ET KITS POUR TM" },
      { name: "Objets à décorer", slug: "OBJETS A DECORER" },
      { name: "Papiers créatifs", slug: "PAPIERS, CARTONS & ACC POUR TM" },
      { name: "Modelage", slug: "MODELAGE MOULAGE" },
    ],
  },
  {
    name: "Jeux éducatifs",
    slug: "JEUX",
    image: imgJeux,
    subcategories: [
      { name: "Matériel éducatif", slug: "MATERIEL EDUCATIF" },
      { name: "Premiers apprentissages", slug: "APPRENTISSAGES PREMIERS" },
      { name: "Sport", slug: "SPORT" },
      { name: "Jeux d'éveil", slug: "JEUX D'EVEIL" },
    ],
  },
  {
    name: "Mobilier",
    slug: "MOBILIER",
    image: imgMobilier,
    subcategories: [
      { name: "Armoires & Bureaux", slug: "ARMOIRES, BUREAUX, MEUBLES DIVERS" },
      { name: "Sièges", slug: "SIEGES" },
      { name: "Ergonomie", slug: "ERGONOMIE" },
    ],
  },
  {
    name: "Services généraux",
    slug: "SERVICES GENERAUX",
    image: imgServicesGeneraux,
    subcategories: [
      { name: "Hygiène & Entretien", slug: "HYGIENE ET ENTRETIEN" },
      { name: "Protection individuelle", slug: "EQUIPEMENT DE PROTECTION INDIVIDUEL" },
      { name: "Sécurité", slug: "SECURITE" },
      { name: "Restauration", slug: "RESTAURATION" },
    ],
  },
  {
    name: "Papiers",
    slug: "PAPIERS",
    image: imgPapiers,
    subcategories: [
      { name: "Papiers couleur", slug: "PAPIERS REPROGRAPHIQUES COULEUR" },
      { name: "Papiers blancs", slug: "PAPIERS  REPROGRAPHIQUES BLANC" },
      { name: "Papiers jet d'encre", slug: "PAPIERS SPECIFIQUES JET D'ENCRE" },
      { name: "Papiers laser", slug: "PAPIERS  SPECIFIQUES LASER" },
    ],
  },
];

const MegaMenu = () => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const active = megaCategories[activeIndex];

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <button
        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:bg-primary/90 transition-all duration-200"
        onClick={() => setOpen(!open)}
      >
        <LayoutGrid className="w-4 h-4" />
        Catégories
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute left-0 top-full pt-1 z-50 animate-fade-in" style={{ width: "min(900px, 90vw)" }}>
          <div className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden flex" style={{ minHeight: 420 }}>
            {/* Left: category list */}
            <div className="w-64 shrink-0 bg-muted/40 border-r border-border py-2 overflow-y-auto max-h-[480px]">
              {megaCategories.map((cat, i) => (
                <button
                  key={cat.slug}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => { setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-100 ${
                    activeIndex === i
                      ? "bg-background text-primary font-semibold border-l-2 border-primary"
                      : "text-foreground hover:bg-background/60 border-l-2 border-transparent"
                  }`}
                >
                  <Link
                    to={`/catalogue?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    {cat.name}
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
              <div className="border-t border-border mt-2 pt-2 px-4 pb-2">
                <Link
                  to="/catalogue"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Voir toutes les catégories →
                </Link>
              </div>
            </div>

            {/* Right: subcategories + image */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex items-start gap-5">
                <div className="flex-1">
                  <Link
                    to={`/catalogue?category=${encodeURIComponent(active.slug)}`}
                    onClick={() => setOpen(false)}
                    className="text-lg font-bold text-foreground hover:text-primary transition-colors"
                  >
                    {active.name}
                  </Link>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                    {active.subcategories.map((sub) => (
                      <Link
                        key={sub.slug}
                        to={`/catalogue?category=${encodeURIComponent(active.slug)}&subcategory=${encodeURIComponent(sub.slug)}`}
                        onClick={() => setOpen(false)}
                        className="text-sm text-muted-foreground hover:text-primary hover:translate-x-0.5 transition-all py-1.5"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    to={`/catalogue?category=${encodeURIComponent(active.slug)}`}
                    onClick={() => setOpen(false)}
                    className="inline-block mt-5 text-xs font-semibold text-primary hover:underline"
                  >
                    Tout voir dans {active.name} →
                  </Link>
                </div>
                {/* Category image */}
                <div className="hidden lg:block w-44 h-44 rounded-xl overflow-hidden shrink-0 shadow-md">
                  <img
                    src={active.image}
                    alt={active.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MegaMenu;
