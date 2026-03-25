import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  is_active: boolean;
  sort_order: number;
}

export interface ShippingMethod {
  id: string;
  zone_id: string;
  name: string;
  carrier: string;
  method_type: string;
  min_weight: number;
  max_weight: number;
  base_cost: number;
  cost_per_kg: number;
  free_above: number | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  is_active: boolean;
  sort_order: number;
}

export function useAdminShipping() {
  const qc = useQueryClient();

  const zonesQuery = useQuery<ShippingZone[]>({
    queryKey: ["admin-shipping-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((z: Record<string, unknown>) => ({
        id: z.id as string,
        name: z.name as string,
        countries: z.countries as string[],
        is_active: z.is_active as boolean,
        sort_order: z.sort_order as number,
      }));
    },
  });

  const methodsQuery = useQuery<ShippingMethod[]>({
    queryKey: ["admin-shipping-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        zone_id: m.zone_id as string,
        name: m.name as string,
        carrier: m.carrier as string,
        method_type: m.method_type as string,
        min_weight: Number(m.min_weight ?? 0),
        max_weight: Number(m.max_weight ?? 30),
        base_cost: Number(m.base_cost ?? 0),
        cost_per_kg: Number(m.cost_per_kg ?? 0),
        free_above: m.free_above != null ? Number(m.free_above) : null,
        delivery_days_min: m.delivery_days_min as number | null,
        delivery_days_max: m.delivery_days_max as number | null,
        is_active: m.is_active as boolean,
        sort_order: m.sort_order as number,
      }));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-shipping-zones"] });
    qc.invalidateQueries({ queryKey: ["admin-shipping-methods"] });
    qc.invalidateQueries({ queryKey: ["shipping-methods"] });
  };

  // ── Zone mutations ──

  const createZone = useMutation({
    mutationFn: async (zone: Omit<ShippingZone, "id">) => {
      const { error } = await supabase.from("shipping_zones").insert(zone);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Zone créée"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, ...rest }: ShippingZone) => {
      const { error } = await supabase.from("shipping_zones").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Zone modifiée"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Zone supprimée"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Method mutations ──

  const createMethod = useMutation({
    mutationFn: async (method: Omit<ShippingMethod, "id">) => {
      const { error } = await supabase.from("shipping_methods").insert(method);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mode de livraison créé"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMethod = useMutation({
    mutationFn: async ({ id, ...rest }: ShippingMethod) => {
      const { error } = await supabase.from("shipping_methods").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mode de livraison modifié"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mode de livraison supprimé"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMethodActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("shipping_methods").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Statut modifié"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    zones: zonesQuery.data ?? [],
    methods: methodsQuery.data ?? [],
    isLoading: zonesQuery.isLoading || methodsQuery.isLoading,
    createZone, updateZone, deleteZone,
    createMethod, updateMethod, deleteMethod, toggleMethodActive,
  };
}
