import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, School as SchoolIcon } from 'lucide-react';
import { useSchools, School } from '@/hooks/useSchools';
import { Skeleton } from '@/components/ui/skeleton';

interface SchoolFinderProps {
  onSchoolSelect: (school: School) => void;
}

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

  return (
    <div className="space-y-6">
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
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun établissement trouvé. Essayez d'autres critères de recherche.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchoolFinder;
