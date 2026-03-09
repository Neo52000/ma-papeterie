import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ICON_MAP, ICON_NAMES } from "@/lib/lucide-icon-map";
import { Package, Search } from "lucide-react";

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : ICON_NAMES;

  const SelectedIcon = value ? ICON_MAP[value] ?? Package : Package;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-start">
          <SelectedIcon className="h-4 w-4" />
          <span className="truncate">{value || "Choisir une icône"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
        <ScrollArea className="h-48">
          <div className="grid grid-cols-6 gap-1">
            {filtered.map((name) => {
              const Icon = ICON_MAP[name];
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={`p-2 rounded hover:bg-muted transition-colors ${value === name ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                >
                  <Icon className="h-4 w-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
