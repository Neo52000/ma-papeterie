import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";

interface B2BPriceTagProps {
  productId: string;
  priceTtc: number;
  className?: string;
}

export function B2BPriceTag({ productId, priceTtc, className = "" }: B2BPriceTagProps) {
  const { isPro, user } = useAuth();

  const { data: b2bPrice } = useQuery({
    queryKey: ["b2b-price", productId, user?.id],
    enabled: isPro && !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => ReturnType<typeof supabase.rpc> }).rpc("get_b2b_price", {
        p_product_id: productId,
        p_user_id: user!.id,
      });
      if (error) return null;
      return typeof data === "number" ? data : null;
    },
  });

  if (!isPro || b2bPrice == null || b2bPrice >= priceTtc) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100">
        Prix Pro : {b2bPrice.toFixed(2)} € TTC
      </Badge>
      <span className="text-xs text-muted-foreground">
        -{((1 - b2bPrice / priceTtc) * 100).toFixed(0)}%
      </span>
    </div>
  );
}
