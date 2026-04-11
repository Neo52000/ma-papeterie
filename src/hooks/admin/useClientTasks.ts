import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmTask {
  id: string;
  profile_id: string | null;
  pipeline_id: string | null;
  quote_id: string | null;
  type: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export interface AddTaskInput {
  profileId?: string;
  pipelineId?: string;
  quoteId?: string;
  type: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: string;
}

export function useClientTasks(profileId: string | null) {
  return useQuery({
    queryKey: ["client-tasks", profileId],
    queryFn: async (): Promise<CrmTask[]> => {
      if (!profileId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("crm_tasks")
        .select("*")
        .eq("profile_id", profileId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CrmTask[];
    },
    enabled: !!profileId,
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAllPendingTasks() {
  return useQuery({
    queryKey: ["crm-tasks-pending"],
    queryFn: async (): Promise<CrmTask[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("crm_tasks")
        .select("*")
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as CrmTask[];
    },
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTaskInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error } = await client.from("crm_tasks").insert({
        profile_id: input.profileId ?? null,
        pipeline_id: input.pipelineId ?? null,
        quote_id: input.quoteId ?? null,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        due_date: input.dueDate,
        priority: input.priority,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks-pending"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string; profileId?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const updateData: Record<string, unknown> = { status };
      if (status === "done") updateData.completed_at = new Date().toISOString();

      const { error } = await client
        .from("crm_tasks")
        .update(updateData)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks-pending"] });
    },
  });
}
