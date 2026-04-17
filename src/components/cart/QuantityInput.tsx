import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuantityInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
  size?: "sm" | "md";
}

/**
 * Accessible quantity stepper: typed input + keyboard arrows + min/max clamping.
 * Commits to parent on blur or explicit +/- click (avoids rapid-fire updates).
 */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 999,
  ariaLabel = "Quantité",
  size = "sm",
}: QuantityInputProps) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setLocal(String(value));
      return;
    }
    const next = clamp(parsed);
    setLocal(String(next));
    if (next !== value) onChange(next);
  };

  const btnSize = size === "md" ? "h-8 w-8" : "h-6 w-6";
  const inputSize =
    size === "md" ? "w-12 h-8 text-sm" : "w-10 h-6 text-xs";

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-background"
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={`${btnSize} rounded-r-none`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Diminuer"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={local}
        onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(clamp(value + 1));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(clamp(value - 1));
          }
        }}
        aria-label={ariaLabel}
        className={`${inputSize} text-center font-medium bg-transparent border-x border-border focus:outline-none focus:ring-0 focus-visible:ring-0`}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={`${btnSize} rounded-l-none`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Augmenter"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
