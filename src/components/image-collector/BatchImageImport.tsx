import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, Loader2, CheckCircle, XCircle, Info } from "lucide-react";

interface BatchResult {
  index: number;
  status: "success" | "error";
  product_name?: string;
  product_id?: string;
  image_url?: string;
  error?: string;
}

interface Props {
  onEnrichBatch: (
    items: Array<{ product_name?: string; ean?: string; image_url: string }>
  ) => Promise<{ results: BatchResult[]; successCount: number; errorCount: number }>;
}

export const BatchImageImport = ({ onEnrichBatch }: Props) => {
  const [csvData, setCsvData] = useState<
    Array<{ product_name?: string; ean?: string; image_url: string }>
  >([]);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvData([]);
        return;
      }

      const headers = lines[0].split(";").map((h) => h.trim().toLowerCase());
      // Also support comma-separated
      const separator = lines[0].includes(";") ? ";" : ",";
      const realHeaders = lines[0].split(separator).map((h) => h.trim().toLowerCase());

      const items: Array<{ product_name?: string; ean?: string; image_url: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map((c) => c.trim());
        const row: Record<string, string> = {};
        realHeaders.forEach((h, idx) => {
          row[h] = cols[idx] || "";
        });

        const image_url = row["image_url"] || row["url"] || row["image"] || "";
        if (!image_url) continue;

        items.push({
          product_name: row["nom_produit"] || row["product_name"] || row["nom"] || undefined,
          ean: row["ean"] || row["code_ean"] || row["barcode"] || undefined,
          image_url,
        });
      }

      setCsvData(items);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;
    setImporting(true);
    try {
      const result = await onEnrichBatch(csvData);
      setResults(result.results);
    } catch {
      // Error handled in hook
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Format CSV attendu :</strong>
          <p className="mt-1 text-sm">
            Colonnes séparées par <code>;</code> ou <code>,</code> avec en-têtes :
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">
            nom_produit;ean;image_url
          </code>
          <p className="mt-1 text-sm text-muted-foreground">
            Au moins <code>nom_produit</code> ou <code>ean</code> est requis pour
            le matching. <code>image_url</code> est obligatoire.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              ref={fileRef}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner un fichier CSV
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground">{fileName}</span>
            )}
          </div>

          {csvData.length > 0 && (
            <>
              <p className="text-sm">
                <Badge variant="secondary">{csvData.length} lignes</Badge> détectées dans le CSV.
              </p>

              <div className="border rounded-lg overflow-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Nom produit</TableHead>
                      <TableHead>EAN</TableHead>
                      <TableHead>URL image</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 20).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="text-sm">{item.product_name || "—"}</TableCell>
                        <TableCell className="text-xs">{item.ean || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">
                          {item.image_url}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {csvData.length > 20 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    ... et {csvData.length - 20} autres lignes
                  </p>
                )}
              </div>

              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Lancer l'import ({csvData.length} images)
                  </>
                )}
              </Button>
            </>
          )}

          {results && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {results.filter((r) => r.status === "success").length} succès
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {results.filter((r) => r.status === "error").length} erreurs
                </Badge>
              </div>

              <div className="border rounded-lg overflow-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Détail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.index}>
                        <TableCell>{r.index + 1}</TableCell>
                        <TableCell>
                          {r.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.product_name || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.status === "success"
                            ? "Image associée"
                            : r.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
