import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  label: string;
  url: string;
  icon: string | null;
  image_url: string | null;
  is_external: boolean;
  open_in_new_tab: boolean;
  is_visible: boolean;
  sort_order: number;
  css_class: string | null;
  children?: MenuItem[];
}

/** Raw row shape for the navigation_menus table (before nesting items). */
interface NavigationMenuRow {
  id: string;
  slug: string;
  label: string;
  location: "header" | "footer" | "mega";
  is_active: boolean;
}

export interface NavigationMenu extends NavigationMenuRow {
  items: MenuItem[];
}

/**
 * The navigation_menus / menu_items tables are not (yet) in the auto-generated
 * Supabase types. This untyped accessor centralises the single `as never` cast
 * so the rest of the module stays fully typed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseUntyped = supabase as { from: (table: string) => any };

// ── Query keys ─────────────────────────────────────────────────────────────

const QK = {
  all: ["navigation-menus"] as const,
  admin: () => [...QK.all, "admin"] as const,
};

// ── Helper: build nested tree from flat parent_id list ─────────────────────

function buildTree(flatItems: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];

  for (const item of flatItems) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of flatItems) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Public hook: fetch all active menus with their items ───────────────────

export function useNavigationMenus() {
  return useQuery({
    queryKey: QK.all,
    staleTime: 10 * 60_000, // 10 minutes — menus rarely change
    queryFn: async (): Promise<NavigationMenu[]> => {
      const { data: menus, error: menusErr } = await supabaseUntyped
        .from("navigation_menus")
        .select("*")
        .eq("is_active", true);
      if (menusErr) throw menusErr;

      const { data: items, error: itemsErr } = await supabaseUntyped
        .from("menu_items")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (itemsErr) throw itemsErr;

      return (menus ?? []).map((menu: NavigationMenuRow) => ({
        ...menu,
        items: buildTree(
          (items ?? []).filter((i: MenuItem) => i.menu_id === menu.id)
        ),
      }));
    },
  });
}

// ── Convenience: get a specific menu by slug ───────────────────────────────

export function useMenuBySlug(slug: string) {
  const { data: menus, ...rest } = useNavigationMenus();
  const menu = menus?.find((m) => m.slug === slug) ?? null;
  return { data: menu, ...rest };
}

// ── Admin: fetch all menus (including inactive) ────────────────────────────

export function useAdminMenus() {
  return useQuery({
    queryKey: QK.admin(),
    staleTime: 30_000,
    queryFn: async (): Promise<NavigationMenu[]> => {
      const { data: menus, error: menusErr } = await supabaseUntyped
        .from("navigation_menus")
        .select("*")
        .order("location")
        .order("label");
      if (menusErr) throw menusErr;

      const { data: items, error: itemsErr } = await supabaseUntyped
        .from("menu_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (itemsErr) throw itemsErr;

      return (menus ?? []).map((menu: NavigationMenuRow) => ({
        ...menu,
        items: buildTree(
          (items ?? []).filter((i: MenuItem) => i.menu_id === menu.id)
        ),
      }));
    },
  });
}

// ── Admin: create menu ─────────────────────────────────────────────────────

export function useCreateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slug: string; label: string; location: string }): Promise<NavigationMenuRow> => {
      const { data, error } = await supabaseUntyped
        .from("navigation_menus")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as NavigationMenuRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}

// ── Admin: update menu ─────────────────────────────────────────────────────

export function useUpdateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<NavigationMenu>) => {
      const { error } = await supabaseUntyped
        .from("navigation_menus")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}

// ── Admin: delete menu ─────────────────────────────────────────────────────

export function useDeleteMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped
        .from("navigation_menus")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}

// ── Admin: create menu item ────────────────────────────────────────────────

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MenuItem> & { menu_id: string }): Promise<MenuItem> => {
      const { data, error } = await supabaseUntyped
        .from("menu_items")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as MenuItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}

// ── Admin: update menu item ────────────────────────────────────────────────

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<MenuItem>) => {
      const { error } = await supabaseUntyped
        .from("menu_items")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}

// ── Admin: delete menu item ────────────────────────────────────────────────

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped
        .from("menu_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}

// ── Admin: reorder items ───────────────────────────────────────────────────

export function useReorderMenuItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      for (const item of items) {
        const { error } = await supabaseUntyped
          .from("menu_items")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  });
}
