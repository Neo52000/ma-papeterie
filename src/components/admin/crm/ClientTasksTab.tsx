import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { useUpdateTaskStatus, type CrmTask } from "@/hooks/admin/useClientTasks";
import { toast } from "sonner";

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  low: { label: "Basse", className: "bg-slate-100 text-slate-600" },
  normal: { label: "Normale", className: "bg-blue-100 text-blue-700" },
  high: { label: "Haute", className: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  overdue: AlertCircle,
  done: CheckCircle,
  cancelled: XCircle,
};

const TYPE_LABELS: Record<string, string> = {
  call: "Appel",
  email: "Email",
  follow_up: "Relance",
  quote_relance: "Relance devis",
  visit: "Visite",
};

interface Props {
  tasks: CrmTask[];
  isLoading: boolean;
  profileId?: string;
}

export function ClientTasksTab({ tasks, isLoading, profileId }: Props) {
  const updateStatus = useUpdateTaskStatus();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Aucune tache
      </div>
    );
  }

  const handleStatusChange = (taskId: string, status: string) => {
    updateStatus.mutate(
      { taskId, status, profileId },
      {
        onSuccess: () => toast.success(status === "done" ? "Tache terminee" : "Tache annulee"),
        onError: () => toast.error("Erreur lors de la mise a jour"),
      },
    );
  };

  return (
    <div className="space-y-2 p-4">
      {tasks.map((task) => {
        const StatusIcon = STATUS_ICON[task.status] ?? Clock;
        const priority = PRIORITY_BADGES[task.priority] ?? PRIORITY_BADGES.normal;
        const isOverdue = task.status === "overdue";
        const isDone = task.status === "done" || task.status === "cancelled";

        return (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              isOverdue ? "border-red-200 bg-red-50" : isDone ? "opacity-60" : "bg-card"
            }`}
          >
            <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              isOverdue ? "text-red-500" : isDone ? "text-green-500" : "text-muted-foreground"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${isDone ? "line-through" : ""}`}>
                  {task.title}
                </span>
                <Badge variant="outline" className="text-[10px] h-4">
                  {TYPE_LABELS[task.type] ?? task.type}
                </Badge>
                <Badge variant="outline" className={`text-[10px] h-4 ${priority.className}`}>
                  {priority.label}
                </Badge>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
              )}
              <p className={`text-xs mt-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                Echeance : {new Date(task.due_date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {!isDone && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-green-600 hover:text-green-700"
                  onClick={() => handleStatusChange(task.id, "done")}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-slate-400 hover:text-slate-600"
                  onClick={() => handleStatusChange(task.id, "cancelled")}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
