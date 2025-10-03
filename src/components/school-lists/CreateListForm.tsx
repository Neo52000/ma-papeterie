import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { School } from '@/hooks/useSchools';
import { useTemplates } from '@/hooks/useTemplates';
import ListUploader from './ListUploader';

interface ExtractedItem {
  item_name: string;
  quantity: number;
  is_mandatory: boolean;
  description: string | null;
}

interface CreateListFormProps {
  school: School;
  onSuccess: () => void;
}

const CreateListForm = ({ school, onSuccess }: CreateListFormProps) => {
  const [listName, setListName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [schoolYear, setSchoolYear] = useState('2024-2025');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { templates } = useTemplates(school.school_type);

  const handleSave = async () => {
    if (!listName || !classLevel) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    if (extractedItems.length === 0) {
      toast({
        title: "Liste vide",
        description: "Veuillez importer une liste avec au moins un article",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Vous devez être connecté pour créer une liste");
      }

      // Create the school list
      const { data: listData, error: listError } = await supabase
        .from('school_lists')
        .insert({
          school_id: school.id,
          list_name: listName,
          class_level: classLevel,
          school_year: schoolYear,
          status: 'active',
          created_by: user.id
        })
        .select()
        .single();

      if (listError) throw listError;

      // Insert all items
      const itemsToInsert = extractedItems.map(item => ({
        list_id: listData.id,
        item_name: item.item_name,
        quantity: item.quantity,
        is_mandatory: item.is_mandatory,
        description: item.description
      }));

      const { error: itemsError } = await supabase
        .from('school_list_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Liste créée avec succès",
        description: `${extractedItems.length} article(s) ajouté(s)`,
      });

      onSuccess();

    } catch (error: any) {
      console.error('Error creating list:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la liste",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Créer une nouvelle liste
          </CardTitle>
          <CardDescription>
            Pour {school.name} - {school.city}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template">Template (optionnel)</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Partir d'un template existant" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.name} - {template.class_level}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Nom de la liste *</Label>
              <Input
                id="list-name"
                placeholder="Ex: Liste CP - Rentrée 2024"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-level">Niveau / Classe *</Label>
              <Input
                id="class-level"
                placeholder="Ex: CP, CM2, 6ème..."
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-year">Année scolaire</Label>
              <Select value={schoolYear} onValueChange={setSchoolYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                  <SelectItem value="2026-2027">2026-2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ListUploader
        schoolId={school.id}
        onItemsExtracted={setExtractedItems}
      />

      <Button
        onClick={handleSave}
        disabled={saving || extractedItems.length === 0}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Save className="w-5 h-5 mr-2 animate-pulse" />
            Enregistrement...
          </>
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            Enregistrer la liste ({extractedItems.length} article{extractedItems.length > 1 ? 's' : ''})
          </>
        )}
      </Button>
    </div>
  );
};

export default CreateListForm;
