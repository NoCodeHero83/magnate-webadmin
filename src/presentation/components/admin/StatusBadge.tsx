import { cn } from "@/lib/utils";

type StatusType = "active" | "pending" | "suspended" | "completed" | "rejected" | "processing" | "verified" | "failed" | "cancelled";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: {
    label: "Activo",
    className: "bg-success/10 text-success border-success/20",
  },
  pending: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  suspended: {
    label: "Suspendido",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  completed: {
    label: "Completado",
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  processing: {
    label: "Procesando",
    className: "bg-info/10 text-info border-info/20",
  },
  verified: {
    label: "Verificado",
    className: "bg-success/10 text-success border-success/20",
  },
  failed: {
    label: "Fallido",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-muted/10 text-muted-foreground border-muted/20",
  },
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
      config.className
    )}>
      <span className={cn(
        "mr-1.5 h-1.5 w-1.5 rounded-full",
        status === "active" || status === "completed" || status === "verified" ? "bg-success" : "",
        status === "pending" || status === "suspended" ? "bg-warning" : "",
        status === "rejected" || status === "failed" ? "bg-destructive" : "",
        status === "processing" ? "bg-info" : "",
        status === "cancelled" ? "bg-muted-foreground" : ""
      )} />
      {label || config.label}
    </span>
  );
};
