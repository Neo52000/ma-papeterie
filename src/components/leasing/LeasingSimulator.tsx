import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { calculateLeasing } from "@/hooks/useLeasingCalculator";
import { LEASING_DURATIONS, LEASING_DISCLAIMER } from "@/lib/leasingConstants";

const profileOptions = [
  { value: "tpe", label: "TPE / Artisan (1–5 salariés)" },
  { value: "pme", label: "PME (5–20 salariés)" },
  { value: "liberal", label: "Profession libérale (cabinet)" },
  { value: "cowork", label: "Espace coworking / télétravail" },
];

const LeasingSimulator = () => {
  const [simAmount, setSimAmount] = useState(3000);
  const [simDuration, setSimDuration] = useState(36);
  const [simProfile, setSimProfile] = useState("tpe");
  const estimate = calculateLeasing(simAmount, simDuration);

  return (
    <div className="bg-foreground text-background rounded-2xl p-6 lg:p-8">
      <h2 className="text-xl font-bold mb-1">Estimez votre mensualité</h2>
      <p className="text-xs tracking-widest uppercase text-background/40 mb-6">
        Simulateur indicatif
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs tracking-wider uppercase text-background/45 mb-2">
            Mon profil
          </label>
          <Select value={simProfile} onValueChange={setSimProfile}>
            <SelectTrigger className="bg-background/10 border-background/15 text-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profileOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs tracking-wider uppercase text-background/45 mb-2">
            Budget mobilier estimé (€ HT)
          </label>
          <Slider
            value={[simAmount]}
            onValueChange={(v) => setSimAmount(v[0])}
            min={500}
            max={20000}
            step={250}
            className="mb-2"
          />
          <div className="text-lg font-bold text-background">
            {simAmount.toLocaleString("fr-FR")} €
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-wider uppercase text-background/45 mb-2">
            Durée souhaitée
          </label>
          <Select
            value={String(simDuration)}
            onValueChange={(v) => setSimDuration(Number(v))}
          >
            <SelectTrigger className="bg-background/10 border-background/15 text-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEASING_DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} mois ({d / 12} ans)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="bg-background/5 border border-background/10 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-baseline border-b border-background/10 pb-3">
            <span className="text-xs text-background/45 tracking-wide">Mensualité estimée HT</span>
            <span className="text-2xl font-bold text-secondary">
              ≈ {Math.round(estimate.monthlyHT).toLocaleString("fr-FR")} €
            </span>
          </div>
          <div className="flex justify-between items-baseline border-b border-background/10 pb-3">
            <span className="text-xs text-background/45 tracking-wide">Total loyers</span>
            <span className="text-base font-semibold text-background">
              {Math.round(estimate.totalCost).toLocaleString("fr-FR")} €
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-background/45 tracking-wide">Trésorerie préservée (3 mois)</span>
            <span className="text-base font-semibold text-green-400">
              +{Math.round(simAmount - estimate.monthlyHT * 3).toLocaleString("fr-FR")} €
            </span>
          </div>
        </div>

        <p className="text-[11px] text-background/30">
          {LEASING_DISCLAIMER} · Financement Leasecom
        </p>

        <Button className="w-full" size="lg" asChild>
          <a href="#demande-devis">
            Valider mon devis <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
};

export default LeasingSimulator;
