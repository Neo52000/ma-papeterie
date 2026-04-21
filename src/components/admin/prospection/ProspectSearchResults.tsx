import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { DataGouvEntity, DataGouvImportResult } from "@/hooks/useDataGouvSearch";
import { useDataGouvImport, guessSegmentFromNaf } from "@/hooks/useDataGouvSearch";

interface ProspectSearchResultsProps {
  results: DataGouvEntity[];
  total: number;
}

export function ProspectSearchResults({ results, total }: ProspectSearchResultsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const importMutation = useDataGouvImport();

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.siren)));
    }
  }

  function toggle(siren: string) {
    const next = new Set(selected);
    if (next.has(siren)) next.delete(siren);
    else next.add(siren);
    setSelected(next);
  }

  async function handleImport() {
    const toImport = results.filter((r) => selected.has(r.siren));
    if (toImport.length === 0) {
      toast.error("Aucun prospect sélectionné");
      return;
    }
    try {
      const result = (await importMutation.mutateAsync({ entities: toImport })) as DataGouvImportResult;
      toast.success(
        `${result.imported} prospect${result.imported > 1 ? "s" : ""} importé${result.imported > 1 ? "s" : ""}`,
        {
          description: [
            result.updated > 0 ? `${result.updated} mis à jour` : null,
            result.skipped_existing_client > 0 ? `${result.skipped_existing_client} déjà clients` : null,
            result.errors > 0 ? `${result.errors} erreurs` : null,
          ].filter(Boolean).join(" · "),
        },
      );
      setSelected(new Set());
    } catch (err) {
      toast.error("Import impossible", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun résultat. Affinez vos filtres et relancez une recherche.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Résultats data.gouv</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {results.length} affiché{results.length > 1 ? "s" : ""} sur {total.toLocaleString("fr-FR")} résultats totaux
          </p>
        </div>
        <Button
          onClick={handleImport}
          disabled={selected.size === 0 || importMutation.isPending}
        >
          {importMutation.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Download className="h-4 w-4 mr-2" />}
          Importer ({selected.size})
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === results.length && results.length > 0}
                  onCheckedChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>NAF</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => {
              const segment = guessSegmentFromNaf(r.nafCode);
              const isCeased = r.administrativeStatus === "C";
              return (
                <TableRow
                  key={r.siren}
                  className={selected.has(r.siren) ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(r.siren)}
                      onCheckedChange={() => toggle(r.siren)}
                      disabled={isCeased}
                      aria-label={`Sélectionner ${r.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.siren}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{r.nafCode ?? "—"}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {r.nafLabel ?? ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.employeeRange ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.address.city} ({r.address.dept ?? "?"})
                  </TableCell>
                  <TableCell>
                    {isCeased ? (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertCircle className="h-3 w-3" /> Cessée
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
