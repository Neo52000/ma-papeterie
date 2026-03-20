import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ConsumablesFinderFull } from "@/components/consumables/ConsumablesFinderFull";

const Consommables = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Consommables informatiques | Toner, encre & cartouches — Ma Papeterie</title>
        <meta
          name="description"
          content="Trouvez vos consommables d'imprimante en 3 clics : toner, cartouches d'encre, tambours. HP, Canon, Epson, Brother et plus. Originaux et compatibles."
        />
        <meta
          name="keywords"
          content="toner, cartouche encre, consommable imprimante, HP, Canon, Epson, Brother, compatible, original"
        />
        <link rel="canonical" href="https://ma-papeterie.fr/consommables" />
      </Helmet>
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Consommables informatiques
          </h1>
          <p className="text-muted-foreground mt-2">
            Trouvez les toners, cartouches d'encre et tambours compatibles avec votre
            imprimante en 3 clics.
          </p>
        </div>
        <ConsumablesFinderFull />
      </main>
      <Footer />
    </div>
  );
};

export default Consommables;
