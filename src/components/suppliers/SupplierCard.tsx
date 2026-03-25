import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, MapPin, Edit, Trash2 } from "lucide-react";
import type { Supplier } from "@/types/supplier";

interface SupplierCardProps {
  supplier: Supplier;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

export function SupplierCard({ supplier, isSelected, onSelect, onEdit, onDelete }: SupplierCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onSelect(supplier.id)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{supplier.name}</CardTitle>
          </div>
          <Badge variant={supplier.is_active ? "default" : "secondary"}>
            {supplier.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {supplier.company_name && (
          <p className="text-sm text-muted-foreground">{supplier.company_name}</p>
        )}

        {supplier.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{supplier.email}</span>
          </div>
        )}

        {supplier.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{supplier.phone}</span>
          </div>
        )}

        {supplier.city && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{supplier.postal_code} {supplier.city}</span>
          </div>
        )}

        {supplier.minimum_order_amount > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Commande min: </span>
            <span className="font-semibold">{supplier.minimum_order_amount}€</span>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(supplier);
            }}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(supplier.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
