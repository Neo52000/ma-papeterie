import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  School, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Search,
  Building,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchools } from '@/hooks/useSchools';
import { useSchoolLists } from '@/hooks/useSchoolLists';
import { SchoolCsvImport } from '@/components/admin/SchoolCsvImport';
import { SchoolListCsvImport } from '@/components/admin/SchoolListCsvImport';

const AdminSchoolLists = () => {
  const navigate = useNavigate();
  const { schools, refetch: refetchSchools } = useSchools();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const { lists, refetch: refetchLists } = useSchoolLists(selectedSchoolId);

  // School form state
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    postal_code: '',
    city: '',
    school_type: 'primaire' as 'primaire' | 'collège' | 'lycée',
    official_code: ''
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    school_type: 'primaire' as 'primaire' | 'collège' | 'lycée',
    class_level: '',
    is_public: true
  });

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('schools')
        .insert([schoolForm]);

      if (error) throw error;

      toast.success('Établissement créé avec succès');
      setSchoolForm({
        name: '',
        address: '',
        postal_code: '',
        city: '',
        school_type: 'primaire',
        official_code: ''
      });
      refetchSchools();
    } catch (error) {
      console.error('Error creating school:', error);
      toast.error('Erreur lors de la création de l\'établissement');
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement ?')) return;

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId);

      if (error) throw error;

      toast.success('Établissement supprimé');
      refetchSchools();
    } catch (error) {
      console.error('Error deleting school:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('school_list_templates')
        .insert([{
          ...templateForm,
          created_by: user.id
        }]);

      if (error) throw error;

      toast.success('Template créé avec succès');
      setTemplateForm({
        name: '',
        description: '',
        school_type: 'primaire',
        class_level: '',
        is_public: true
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la création du template');
    }
  };

  const handleArchiveList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('school_lists')
        .update({ status: 'archived' })
        .eq('id', listId);

      if (error) throw error;

      toast.success('Liste archivée');
      refetchLists();
    } catch (error) {
      console.error('Error archiving list:', error);
      toast.error('Erreur lors de l\'archivage');
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.postal_code.includes(searchTerm)
  );

  return (
    <AdminLayout title="Administration des Listes Scolaires" description="Gérez les établissements et listes scolaires">
      <Tabs defaultValue="schools" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schools">
            <Building className="w-4 h-4 mr-2" />
            Établissements
          </TabsTrigger>
          <TabsTrigger value="lists">
            <FileText className="w-4 h-4 mr-2" />
            Listes Scolaires
          </TabsTrigger>
          <TabsTrigger value="templates">
            <School className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          <SchoolCsvImport onComplete={refetchSchools} />
          
          <Card>
            <CardHeader>
              <CardTitle>Créer un établissement</CardTitle>
              <CardDescription>
                Ajouter un nouvel établissement scolaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="school-name">Nom de l'établissement *</Label>
                    <Input
                      id="school-name"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="school-type">Type *</Label>
                    <Select
                      value={schoolForm.school_type}
                      onValueChange={(value: any) => setSchoolForm({ ...schoolForm, school_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primaire">Primaire</SelectItem>
                        <SelectItem value="collège">Collège</SelectItem>
                        <SelectItem value="lycée">Lycée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="postal-code">Code postal *</Label>
                    <Input
                      id="postal-code"
                      value={schoolForm.postal_code}
                      onChange={(e) => setSchoolForm({ ...schoolForm, postal_code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ville *</Label>
                    <Input
                      id="city"
                      value={schoolForm.city}
                      onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={schoolForm.address}
                      onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="official-code">Code officiel</Label>
                    <Input
                      id="official-code"
                      value={schoolForm.official_code}
                      onChange={(e) => setSchoolForm({ ...schoolForm, official_code: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer l'établissement
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Établissements existants ({filteredSchools.length})</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un établissement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                  >
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" />
                        {school.name}
                      </h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {school.school_type}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {school.postal_code} {school.city}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteSchool(school.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="space-y-6">
          <SchoolListCsvImport onComplete={refetchLists} />
          
          <Card>
            <CardHeader>
              <CardTitle>Gestion des listes scolaires</CardTitle>
              <CardDescription>
                Sélectionnez un établissement pour voir ses listes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="select-school">Établissement</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name} - {school.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSchoolId && (
                <div className="space-y-2 mt-6">
                  <h4 className="font-semibold">Listes actives ({lists.length})</h4>
                  {lists.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune liste pour cet établissement</p>
                  ) : (
                    lists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium">{list.list_name}</h5>
                          <p className="text-sm text-muted-foreground">
                            {list.class_level} • {list.school_year}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleArchiveList(list.id)}
                          >
                            Archiver
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Créer un template</CardTitle>
              <CardDescription>
                Les templates permettent de créer rapidement des listes standard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Nom du template *</Label>
                  <Input
                    id="template-name"
                    placeholder="Ex: Liste CP standard"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="template-desc">Description</Label>
                  <Textarea
                    id="template-desc"
                    placeholder="Description du template..."
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-type">Type d'établissement *</Label>
                    <Select
                      value={templateForm.school_type}
                      onValueChange={(value: any) => setTemplateForm({ ...templateForm, school_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primaire">Primaire</SelectItem>
                        <SelectItem value="collège">Collège</SelectItem>
                        <SelectItem value="lycée">Lycée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="template-class">Niveau de classe *</Label>
                    <Input
                      id="template-class"
                      placeholder="Ex: CP, CE1, 6ème..."
                      value={templateForm.class_level}
                      onChange={(e) => setTemplateForm({ ...templateForm, class_level: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le template
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSchoolLists;
