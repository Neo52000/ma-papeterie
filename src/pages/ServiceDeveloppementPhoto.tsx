import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ServiceOrderTunnel from '@/components/service-order/ServiceOrderTunnel';
import { photoConfig } from '@/lib/serviceConfig';

export default function ServiceDeveloppementPhoto() {
  return (
    <>
      <Helmet>
        <title>Développement photo en ligne — Ma Papeterie</title>
        <meta
          name="description"
          content="Service de développement photo en ligne : tirage photo professionnel du 10x15 au 30x45, finition brillante ou mat. Payez en ligne, retrait en boutique ou livraison."
        />
        <link rel="canonical" href="https://ma-papeterie.fr/services/developpement-photo" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Développement photo</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Uploadez vos photos, choisissez le format et la finition, payez en ligne.
              Retrait en boutique ou livraison à domicile.
            </p>
          </div>

          <ServiceOrderTunnel config={photoConfig} />
        </div>
      </main>

      <Footer />
    </>
  );
}
