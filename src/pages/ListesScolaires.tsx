import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { School } from '@/hooks/useSchools';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SchoolFinder from '@/components/school-lists/SchoolFinder';
import SchoolListViewer from '@/components/school-lists/SchoolListViewer';
import SchoolCopilot from '@/components/school-lists/SchoolCopilot';
import { ListesScolairesSeoContent } from '@/components/sections/SeoContent';
import { BookOpen, GraduationCap, Wand2, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ListesScolaires = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'search' ? 'search' : 'copilot';
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Listes scolaires – Fournitures école à Chaumont | Ma Papeterie</title>
        <meta name="description" content="Trouvez la liste scolaire de votre école à Chaumont et commandez vos fournitures en quelques clics. OCR intelligent, 3 paniers au choix. Papeterie Reine & Fils, Haute-Marne." />
        <link rel="canonical" href="https://ma-papeterie.fr/listes-scolaires" />
        <meta property="og:title" content="Listes scolaires – Fournitures école à Chaumont" />
        <meta property="og:description" content="Commandez les fournitures scolaires de votre école à Chaumont en quelques clics. OCR intelligent, 3 paniers au choix." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ma-papeterie.fr/listes-scolaires" />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="w-12 h-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-poppins">
              Listes Scolaires
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Importez la liste de votre école et obtenez 3 paniers prêts en 2 minutes
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              <span>OCR intelligent</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>3 paniers au choix</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Commande rapide</span>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        {selectedSchool ? (
          <SchoolListViewer
            school={selectedSchool}
            onBack={() => setSelectedSchool(null)}
          />
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="copilot" className="gap-2">
                <Wand2 className="w-4 h-4" />
                Copilote IA
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="w-4 h-4" />
                Chercher une liste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="copilot">
              <div className="max-w-3xl mx-auto">
                <SchoolCopilot />
              </div>
            </TabsContent>

            <TabsContent value="search">
              <SchoolFinder onSchoolSelect={setSelectedSchool} />
            </TabsContent>
          </Tabs>
        )}
        
        {!selectedSchool && <ListesScolairesSeoContent />}
      </main>

      <Footer />
    </div>
  );
};

export default ListesScolaires;
