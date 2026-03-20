import { htToTtc } from '@/lib/serviceConfig';

interface PriceDisplayProps {
  priceHt: number;
  className?: string;
  /** Show both HT and TTC inline */
  inline?: boolean;
}

/**
 * Always shows both HT and TTC prices side by side.
 */
export default function PriceDisplay({ priceHt, className, inline = true }: PriceDisplayProps) {
  const priceTtc = htToTtc(priceHt);

  if (inline) {
    return (
      <span className={className}>
        {priceHt.toFixed(2)}&nbsp;&euro;&nbsp;HT{' '}
        <span className="text-muted-foreground">/</span>{' '}
        <span className="font-semibold">{priceTtc.toFixed(2)}&nbsp;&euro;&nbsp;TTC</span>
      </span>
    );
  }

  return (
    <div className={className}>
      <div className="text-sm text-muted-foreground">{priceHt.toFixed(2)} &euro; HT</div>
      <div className="text-lg font-bold text-primary">{priceTtc.toFixed(2)} &euro; TTC</div>
    </div>
  );
}
