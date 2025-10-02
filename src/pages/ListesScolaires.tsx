import { useState } from 'react';
import { School } from '@/hooks/useSchools';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SchoolFinder from '@/components/school-lists/SchoolFinder';
import SchoolListViewer from '@/components/school-lists/SchoolListViewer';
import { BookOpen, GraduationCap } from 'lucide-react';

const ListesScolaires = () => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  return (
    <div className="min-h-screen bg-background">
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
            Trouvez la liste de fournitures de votre établissement et commandez en un clic
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Recherche simplifiée</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Listes officielles</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Commande rapide</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {selectedSchool ? (
          <SchoolListViewer
            school={selectedSchool}
            onBack={() => setSelectedSchool(null)}
          />
        ) : (
          <SchoolFinder onSchoolSelect={setSelectedSchool} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ListesScolaires;
