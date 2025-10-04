import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, School as SchoolIcon, Sparkles } from 'lucide-react';
import { useSchools, School } from '@/hooks/useSchools';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SchoolFinderProps {
  onSchoolSelect: (school: School) => void;
}

const DEMO_SCHOOL_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SUGGESTED_POSTAL_CODES = ['75001', '69001', '13001', '75015', '69003'];

const SchoolFinder = ({ onSchoolSelect }: SchoolFinderProps) => {
  const [postalCode, setPostalCode] = useState('');
  const [schoolType, setSchoolType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const { schools, loading, searchSchools } = useSchools(postalCode, schoolType);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchSchools(searchQuery);
    }
  };

  const loadDemoSchool = () => {
    const demoSchool: School = {
      id: DEMO_SCHOOL_ID,
      name: 'École Élémentaire Jean Moulin',
      address: '12 rue de la République',
      postal_code: '75001',
      city: 'Paris',
      school_type: 'primaire',
      official_code: 'P75001',
      latitude: null,
      longitude: null
    };
    onSchoolSelect(demoSchool);
  };

  return (
    <div className="space-y-6">
      {/* Quick Demo Access */}
      <Alert className="border-primary/50 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">
            Découvrez un exemple de liste scolaire avec nos données de démonstration
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadDemoSchool}
            className="ml-4 shrink-0"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Voir un exemple
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Rechercher un établissement
          </CardTitle>
          <CardDescription>
            Trouvez votre école, collège ou lycée pour accéder aux listes scolaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested Postal Codes */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Codes postaux disponibles :</span>
            {SUGGESTED_POSTAL_CODES.map((code) => (
              <Button
                key={code}
                variant="outline"
                size="sm"
                onClick={() => setPostalCode(code)}
                className="h-7 text-xs"
              >
                {code}
              </Button>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Code postal</label>
              <Input
                placeholder="Ex: 75001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Niveau</label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaire">Primaire</SelectItem>
                  <SelectItem value="collège">Collège</SelectItem>
                  <SelectItem value="lycée">Lycée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recherche libre</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de l'établissement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!loading && schools.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">
            {schools.length} établissement{schools.length > 1 ? 's' : ''} trouvé{schools.length > 1 ? 's' : ''}
          </h3>
          {schools.map((school) => (
            <Card
              key={school.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSchoolSelect(school)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <SchoolIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{school.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {school.address && `${school.address}, `}
                          {school.postal_code} {school.city}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm capitalize">
                    {school.school_type}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && schools.length === 0 && (postalCode || searchQuery) && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground">
              Aucun établissement trouvé pour ces critères.
            </p>
            <p className="text-sm text-muted-foreground">
              Essayez l'un de ces codes postaux : {SUGGESTED_POSTAL_CODES.join(', ')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDemoSchool}
              className="mt-2"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Voir un exemple
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchoolFinder;
