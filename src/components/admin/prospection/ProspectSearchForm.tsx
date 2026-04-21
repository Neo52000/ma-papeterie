import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, RotateCcw } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SEGMENT_NAF_PRESETS, segmentLabel, type ProspectSegment } from "@/lib/nafToSegment";
import type { DataGouvSearchFilters } from "@/hooks/useDataGouvSearch";

interface ProspectSearchFormProps {
  onSearch: (filters: DataGouvSearchFilters) => void;
  loading: boolean;
}

const EFFECTIF_OPTIONS = [
  { code: "NN", label: "Non renseigné" },
  { code: "00", label: "0 salarié" },
  { code: "01", label: "1-2" },
  { code: "02", label: "3-5" },
  { code: "03", label: "6-9" },
  { code: "11", label: "10-19" },
  { code: "12", label: "20-49" },
  { code: "21", label: "50-99" },
  { code: "22", label: "100-199" },
  { code: "31", label: "200-249" },
  { code: "32", label: "250-499" },
  { code: "41", label: "500+" },
];

const DEFAULT_DEPTS = ["52", "10", "51", "55", "88", "70"];

export function ProspectSearchForm({ onSearch, loading }: ProspectSearchFormProps) {
  const [segment, setSegment] = useState<ProspectSegment | "custom">("educational");
  const [nafCodes, setNafCodes] = useState<string[]>(SEGMENT_NAF_PRESETS.educational);
  const [depts, setDepts] = useState<string[]>(["52"]);
  const [minEffectif, setMinEffectif] = useState<string>("");
  const [createdAfter, setCreatedAfter] = useState<string>("");

  function handleSegmentChange(value: ProspectSegment | "custom") {
    setSegment(value);
    if (value !== "custom") {
      setNafCodes(SEGMENT_NAF_PRESETS[value]);
    }
  }

  function toggleDept(dept: string) {
    setDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
  }

  function toggleNaf(code: string) {
    setNafCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    setSegment("custom");
  }

  function handleReset() {
    setSegment("educational");
    setNafCodes(SEGMENT_NAF_PRESETS.educational);
    setDepts(["52"]);
    setMinEffectif("");
    setCreatedAfter("");
  }

  function handleSearch() {
    const filters: DataGouvSearchFilters = {
      nafCodes: nafCodes.length > 0 ? nafCodes : undefined,
      depts: depts.length > 0 ? depts : undefined,
      minEffectif: minEffectif || undefined,
      createdAfter: createdAfter || undefined,
      page: 1,
      perPage: 25,
    };
    onSearch(filters);
  }

  const allNafPresets = Array.from(
    new Set(
      Object.values(SEGMENT_NAF_PRESETS).flat(),
    ),
  );

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Segment cible</Label>
            <Select
              value={segment}
              onValueChange={(v) => handleSegmentChange(v as ProspectSegment | "custom")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="educational">{segmentLabel("educational")}</SelectItem>
                <SelectItem value="public">{segmentLabel("public")}</SelectItem>
                <SelectItem value="liberal">{segmentLabel("liberal")}</SelectItem>
                <SelectItem value="pme">{segmentLabel("pme")}</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Effectif minimum</Label>
            <Select value={minEffectif} onValueChange={setMinEffectif}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Tous</SelectItem>
                {EFFECTIF_OPTIONS.map((o) => (
                  <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Départements</Label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_DEPTS.map((dept) => (
              <Badge
                key={dept}
                variant={depts.includes(dept) ? "default" : "outline"}
                onClick={() => toggleDept(dept)}
                className="cursor-pointer"
              >
                {dept}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Codes NAF ({nafCodes.length} sélectionnés)</Label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
            {allNafPresets.map((code) => (
              <Badge
                key={code}
                variant={nafCodes.includes(code) ? "default" : "outline"}
                onClick={() => toggleNaf(code)}
                className="cursor-pointer"
              >
                {code}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="createdAfter">Créées après le</Label>
            <Input
              id="createdAfter"
              type="date"
              value={createdAfter}
              onChange={(e) => setCreatedAfter(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={handleSearch} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Rechercher
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
