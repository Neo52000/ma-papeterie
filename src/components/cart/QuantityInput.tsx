import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuantityInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
  size?: "sm" | "md";
  /** Debounce window (ms) for rapid +/- clicks before calling onChange. Default 150ms. */
  debounceMs?: number;
}

/**
 * Accessible quantity stepper: typed input + keyboard arrows + min/max clamping.
 * Rapid +/- clicks are debounced to a single onChange call to avoid store spam.
 */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 999,
  ariaLabel = "Quantité",
  size = "sm",
  debounceMs = 150,
}: QuantityInputProps) {
  const [local, setLocal] = useState(String(value));
  // Intermediate numeric state for +/- rapid clicks — debounced before propagation.
  const [pending, setPending] = useState<number | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Only sync back when no local edit is in flight.
    if (pending === null) setLocal(String(value));
  }, [value, pending]);

  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const scheduleCommit = (next: number) => {
    setPending(next);
    setLocal(String(next));
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      if (next !== value) onChange(next);
      setPending(null);
    }, debounceMs);
  };

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setLocal(String(value));
      return;
    }
    const next = clamp(parsed);
    setLocal(String(next));
    if (flushTimer.current) clearTimeout(flushTimer.current);
    setPending(null);
    if (next !== value) onChange(next);
  };

  const displayValue = pending ?? value;

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
        onClick={() => scheduleCommit(clamp(displayValue - 1))}
        disabled={displayValue <= min}
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
            scheduleCommit(clamp(displayValue + 1));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            scheduleCommit(clamp(displayValue - 1));
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
        onClick={() => scheduleCommit(clamp(displayValue + 1))}
        disabled={displayValue >= max}
        aria-label="Augmenter"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
