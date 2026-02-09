import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  Info,
  ImageOff,
} from "lucide-react";
import { Product } from "@/hooks/useProducts";

interface Props {
  products: Product[];
  productsWithoutImage: Product[];
  productsWithImage: Product[];
  enriching: Record<string, boolean>;
  uploading: Record<string, boolean>;
  onEnrichFromUrl: (productId: string, imageUrl: string) => Promise<void>;
  onUploadDirect: (productId: string, file: File) => Promise<void>;
}

export const ProductImageEnricher = ({
  products,
  productsWithoutImage,
  productsWithImage,
  enriching,
  uploading,
  onEnrichFromUrl,
  onUploadDirect,
}: Props) => {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const displayProducts = showAll ? products : productsWithoutImage;

  const handleUrlChange = (productId: string, url: string) => {
    setImageUrls((prev) => ({ ...prev, [productId]: url }));
  };

  const handleEnrich = async (productId: string) => {
    const url = imageUrls[productId];
    if (!url) return;
    await onEnrichFromUrl(productId, url);
    setImageUrls((prev) => ({ ...prev, [productId]: "" }));
  };

  const handleFileSelect = async (productId: string, file: File | undefined) => {
    if (!file) return;
    await onUploadDirect(productId, file);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Comment récupérer les images des fournisseurs :</strong>
          <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
            <li>Ouvrir le site fournisseur dans votre navigateur</li>
            <li>Naviguer vers la fiche du produit souhaité</li>
            <li>Faire un clic droit sur l'image &gt; "Copier l'adresse de l'image"</li>
            <li>Coller l'URL dans le champ ci-dessous</li>
            <li>Cliquer sur "Télécharger"</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <ImageOff className="h-3 w-3" />
            {productsWithoutImage.length} sans image
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {productsWithImage.length} avec image
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Afficher sans image uniquement" : "Afficher tous les produits"}
        </Button>
      </div>

      {displayProducts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Tous les produits ont une image !</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead className="min-w-[300px]">URL image / Upload</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayProducts.map((product) => {
                const isEnriching = enriching[product.id];
                const isUploading = uploading[product.id];
                const isBusy = isEnriching || isUploading;
                const hasImage = product.image_url && product.image_url !== "/placeholder.svg" && product.image_url.trim() !== "";

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
                        {hasImage ? (
                          <img
                            src={product.image_url!}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.ean || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://... (URL de l'image)"
                          value={imageUrls[product.id] || ""}
                          onChange={(e) => handleUrlChange(product.id, e.target.value)}
                          disabled={isBusy}
                          className="text-xs"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[product.id] = el; }}
                          onChange={(e) => handleFileSelect(product.id, e.target.files?.[0])}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={isBusy || !imageUrls[product.id]}
                          onClick={() => handleEnrich(product.id)}
                          title="Télécharger depuis l'URL"
                        >
                          {isEnriching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => fileInputRefs.current[product.id]?.click()}
                          title="Upload fichier local"
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
