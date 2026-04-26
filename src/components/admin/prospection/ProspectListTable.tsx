import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProspectRow, ProspectFilters } from "@/hooks/useProspects";

interface ProspectListTableProps {
  prospects: ProspectRow[];
  totalCount: number;
  totalPages: number;
  filters: ProspectFilters;
  onFiltersChange: (patch: Partial<ProspectFilters>) => void;
  onOpen: (prospect: ProspectRow) => void;
  loading: boolean;
}

const STATUS_VARIANT: Record<ProspectRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  new: "secondary",
  qualified: "default",
  contacted: "default",
  engaged: "default",
  converted: "outline",
  rejected: "destructive",
  unreachable: "destructive",
};

const STATUS_LABEL: Record<ProspectRow["status"], string> = {
  new: "Nouveau",
  qualified: "Qualifié",
  contacted: "Contacté",
  engaged: "Engagé",
  converted: "Converti",
  rejected: "Rejeté",
  unreachable: "Injoignable",
};

export function ProspectListTable({
  prospects, totalCount, totalPages, filters, onFiltersChange, onOpen, loading,
}: ProspectListTableProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom ou SIREN..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value, page: 0 })}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) => onFiltersChange({ status: v as ProspectFilters["status"], page: 0 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="qualified">Qualifié</SelectItem>
                <SelectItem value="contacted">Contacté</SelectItem>
                <SelectItem value="engaged">Engagé</SelectItem>
                <SelectItem value="converted">Converti</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="unreachable">Injoignable</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.segment}
              onValueChange={(v) => onFiltersChange({ segment: v as ProspectFilters["segment"], page: 0 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous segments</SelectItem>
                <SelectItem value="educational">Éducation</SelectItem>
                <SelectItem value="public">Secteur public</SelectItem>
                <SelectItem value="liberal">Libérales</SelectItem>
                <SelectItem value="pme">PME</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Effectif</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && prospects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : prospects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun prospect. Importez-en depuis l'onglet Recherche.
                  </TableCell>
                </TableRow>
              ) : (
                prospects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onOpen(p)}
                  >
                    <TableCell className="font-medium">
                      <div>{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.siren}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {p.client_segment ?? "pme"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {p.score ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{p.employee_range ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {p.address?.city} {p.address?.dept ? `(${p.address.dept})` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status]} className="text-xs">
                        {STATUS_LABEL[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onOpen(p); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {totalCount} prospect{totalCount > 1 ? "s" : ""} · Page {filters.page + 1} sur {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 0}
            onClick={() => onFiltersChange({ page: filters.page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= totalPages - 1}
            onClick={() => onFiltersChange({ page: filters.page + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
