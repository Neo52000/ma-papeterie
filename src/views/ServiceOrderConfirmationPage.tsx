import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ServiceOrderConfirmation from '@/components/service-tunnel/ServiceOrderConfirmation';
import { Helmet } from 'react-helmet-async';

export default function ServiceOrderConfirmationPage() {
  return (
    <>
      <Helmet>
        <title>Confirmation de commande | Ma Papeterie</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <ServiceOrderConfirmation />
        </main>
        <Footer />
      </div>
    </>
  );
}
