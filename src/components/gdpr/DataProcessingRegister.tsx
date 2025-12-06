import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FileText, Download, Edit, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useDataProcessingRegister, useCreateProcessingRecord, useUpdateProcessingRecord, useDeleteProcessingRecord, DataProcessingRecord } from "@/hooks/useDataProcessingRegister";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const LEGAL_BASES = [
  "Consentement (Art. 6.1.a)",
  "Exécution du contrat (Art. 6.1.b)",
  "Obligation légale (Art. 6.1.c)",
  "Intérêts vitaux (Art. 6.1.d)",
  "Mission d'intérêt public (Art. 6.1.e)",
  "Intérêts légitimes (Art. 6.1.f)",
];

const DATA_CATEGORIES = [
  "Identité",
  "Coordonnées",
  "Données de paiement",
  "Historique des commandes",
  "Données de navigation",
  "Préférences",
  "Mot de passe hashé",
  "Adresse IP",
  "Email",
];

const DATA_SUBJECTS = [
  "Clients",
  "Prospects",
  "Utilisateurs inscrits",
  "Visiteurs du site",
  "Abonnés newsletter",
  "Fournisseurs",
  "Employés",
];

interface FormData {
  processing_name: string;
  processing_purpose: string;
  legal_basis: string;
  data_categories: string[];
  data_subjects: string[];
  recipients: string[];
  third_country_transfers: string;
  retention_period: string;
  security_measures: string;
  data_source: string;
  is_automated_decision: boolean;
  dpia_required: boolean;
  status: string;
}

const initialFormData: FormData = {
  processing_name: "",
  processing_purpose: "",
  legal_basis: "",
  data_categories: [],
  data_subjects: [],
  recipients: [],
  third_country_transfers: "",
  retention_period: "",
  security_measures: "",
  data_source: "",
  is_automated_decision: false,
  dpia_required: false,
  status: "active",
};

export default function DataProcessingRegister() {
  const { user } = useAuth();
  const { data: records, isLoading } = useDataProcessingRegister();
  const createRecord = useCreateProcessingRecord();
  const updateRecord = useUpdateProcessingRecord();
  const deleteRecord = useDeleteProcessingRecord();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataProcessingRecord | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [recipientInput, setRecipientInput] = useState("");

  const handleOpenDialog = (record?: DataProcessingRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        processing_name: record.processing_name,
        processing_purpose: record.processing_purpose,
        legal_basis: record.legal_basis,
        data_categories: record.data_categories,
        data_subjects: record.data_subjects,
        recipients: record.recipients,
        third_country_transfers: record.third_country_transfers || "",
        retention_period: record.retention_period,
        security_measures: record.security_measures || "",
        data_source: record.data_source || "",
        is_automated_decision: record.is_automated_decision,
        dpia_required: record.dpia_required,
        status: record.status,
      });
    } else {
      setEditingRecord(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    const payload = {
      ...formData,
      created_by: user.id,
    };

    if (editingRecord) {
      await updateRecord.mutateAsync({ id: editingRecord.id, ...payload });
    } else {
      await createRecord.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce traitement du registre ?")) {
      await deleteRecord.mutateAsync(id);
    }
  };

  const handleAddRecipient = () => {
    if (recipientInput.trim()) {
      setFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipientInput.trim()]
      }));
      setRecipientInput("");
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const toggleArrayItem = (field: "data_categories" | "data_subjects", item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const exportToJSON = () => {
    if (!records) return;
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registre-traitements-rgpd-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Registre des Traitements (Article 30 RGPD)
              </CardTitle>
              <CardDescription>
                Documentation de toutes les activités de traitement de données personnelles
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToJSON}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau traitement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecord ? "Modifier le traitement" : "Ajouter un traitement"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Nom du traitement *</label>
                        <Input
                          value={formData.processing_name}
                          onChange={e => setFormData(prev => ({ ...prev, processing_name: e.target.value }))}
                          placeholder="Ex: Gestion des commandes"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Base légale *</label>
                        <Select
                          value={formData.legal_basis}
                          onValueChange={value => setFormData(prev => ({ ...prev, legal_basis: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {LEGAL_BASES.map(basis => (
                              <SelectItem key={basis} value={basis}>{basis}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Finalité du traitement *</label>
                      <Textarea
                        value={formData.processing_purpose}
                        onChange={e => setFormData(prev => ({ ...prev, processing_purpose: e.target.value }))}
                        placeholder="Décrivez la finalité du traitement..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Catégories de données *</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {DATA_CATEGORIES.map(cat => (
                          <Badge
                            key={cat}
                            variant={formData.data_categories.includes(cat) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleArrayItem("data_categories", cat)}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Personnes concernées *</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {DATA_SUBJECTS.map(subject => (
                          <Badge
                            key={subject}
                            variant={formData.data_subjects.includes(subject) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleArrayItem("data_subjects", subject)}
                          >
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Destinataires</label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={recipientInput}
                          onChange={e => setRecipientInput(e.target.value)}
                          placeholder="Ajouter un destinataire..."
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddRecipient())}
                        />
                        <Button type="button" onClick={handleAddRecipient}>Ajouter</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.recipients.map((r, i) => (
                          <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveRecipient(i)}>
                            {r} ×
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Durée de conservation *</label>
                        <Input
                          value={formData.retention_period}
                          onChange={e => setFormData(prev => ({ ...prev, retention_period: e.target.value }))}
                          placeholder="Ex: 3 ans après la fin de la relation"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Source des données</label>
                        <Input
                          value={formData.data_source}
                          onChange={e => setFormData(prev => ({ ...prev, data_source: e.target.value }))}
                          placeholder="Ex: Formulaire d'inscription"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Transferts hors UE</label>
                      <Input
                        value={formData.third_country_transfers}
                        onChange={e => setFormData(prev => ({ ...prev, third_country_transfers: e.target.value }))}
                        placeholder="Ex: USA (clauses contractuelles types)"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Mesures de sécurité</label>
                      <Textarea
                        value={formData.security_measures}
                        onChange={e => setFormData(prev => ({ ...prev, security_measures: e.target.value }))}
                        placeholder="Décrivez les mesures techniques et organisationnelles..."
                      />
                    </div>

                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="automated"
                          checked={formData.is_automated_decision}
                          onCheckedChange={checked => setFormData(prev => ({ ...prev, is_automated_decision: !!checked }))}
                        />
                        <label htmlFor="automated" className="text-sm">Décision automatisée</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="dpia"
                          checked={formData.dpia_required}
                          onCheckedChange={checked => setFormData(prev => ({ ...prev, dpia_required: !!checked }))}
                        />
                        <label htmlFor="dpia" className="text-sm">AIPD requise</label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={!formData.processing_name || !formData.processing_purpose || !formData.legal_basis || !formData.retention_period}
                      >
                        {editingRecord ? "Mettre à jour" : "Créer"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <strong>Article 30 du RGPD</strong>
              <p className="text-muted-foreground">
                Chaque responsable du traitement tient un registre des activités de traitement effectuées sous sa responsabilité.
                Ce registre contient les informations relatives aux finalités, catégories de données, destinataires, durées de conservation et mesures de sécurité.
              </p>
            </div>
          </div>

          {records && records.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {records.map(record => (
                <AccordionItem key={record.id} value={record.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{record.processing_name}</span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{record.legal_basis}</Badge>
                          {record.dpia_required && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              AIPD requise
                            </Badge>
                          )}
                          <Badge variant={record.status === "active" ? "default" : "secondary"} className="text-xs">
                            {record.status === "active" ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Finalité</h4>
                        <p className="text-sm text-muted-foreground">{record.processing_purpose}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Durée de conservation</h4>
                        <p className="text-sm text-muted-foreground">{record.retention_period}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Catégories de données</h4>
                        <div className="flex flex-wrap gap-1">
                          {record.data_categories.map(cat => (
                            <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Personnes concernées</h4>
                        <div className="flex flex-wrap gap-1">
                          {record.data_subjects.map(subject => (
                            <Badge key={subject} variant="secondary" className="text-xs">{subject}</Badge>
                          ))}
                        </div>
                      </div>
                      {record.recipients.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Destinataires</h4>
                          <p className="text-sm text-muted-foreground">{record.recipients.join(", ")}</p>
                        </div>
                      )}
                      {record.third_country_transfers && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Transferts hors UE</h4>
                          <p className="text-sm text-muted-foreground">{record.third_country_transfers}</p>
                        </div>
                      )}
                      {record.security_measures && (
                        <div className="col-span-2">
                          <h4 className="font-medium text-sm mb-1">Mesures de sécurité</h4>
                          <p className="text-sm text-muted-foreground">{record.security_measures}</p>
                        </div>
                      )}
                      <div className="col-span-2 text-xs text-muted-foreground">
                        Créé le {format(new Date(record.created_at), "dd MMMM yyyy", { locale: fr })} • 
                        Mis à jour le {format(new Date(record.updated_at), "dd MMMM yyyy", { locale: fr })}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t pt-4">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(record)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun traitement enregistré. Ajoutez votre premier traitement pour commencer.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
