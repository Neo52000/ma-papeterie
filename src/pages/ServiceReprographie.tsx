import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ServiceOrderTunnel from '@/components/service-order/ServiceOrderTunnel';
import { reproConfig } from '@/lib/serviceConfig';

export default function ServiceReprographie() {
  return (
    <>
      <Helmet>
        <title>Reprographie en ligne — Ma Papeterie</title>
        <meta
          name="description"
          content="Service de reprographie en ligne : impression de documents A4/A3, noir & blanc ou couleur. Upload, payez en ligne et récupérez en boutique ou faites-vous livrer."
        />
        <link rel="canonical" href="https://ma-papeterie.fr/services/reprographie" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Reprographie en ligne",
          "description": "Service de reprographie : impression de documents A4/A3, noir & blanc ou couleur. Upload en ligne, retrait en boutique ou livraison.",
          "provider": {
            "@type": "LocalBusiness",
            "name": "Ma Papeterie",
            "address": { "@type": "PostalAddress", "addressLocality": "Chaumont", "postalCode": "52000", "addressCountry": "FR" }
          },
          "areaServed": { "@type": "City", "name": "Chaumont" },
          "serviceType": "Reprographie"
        })}</script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Reprographie</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Envoyez votre document, choisissez vos options d'impression et payez en ligne.
              Retrait en boutique ou livraison à domicile.
            </p>
          </div>

          <ServiceOrderTunnel config={reproConfig} />
        </div>
      </main>

      <Footer />
    </>
  );
}
