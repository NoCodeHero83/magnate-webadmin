import { ArrowDownLeft, ArrowUpRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { StatusBadge } from "@/presentation/components/admin/StatusBadge";
import { Button } from "@/presentation/components/ui/button";
import { Movement } from "@/core/entities/Withdrawal";
import { downloadCSV, formatARS, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  pending: "Pendiente",
  processing: "Procesando",
  failed: "Fallido",
  cancelled: "Cancelado",
};

const KNOWN_STATUSES = ["completed", "pending", "processing", "failed", "cancelled"] as const;
type KnownStatus = (typeof KNOWN_STATUSES)[number];

interface MovementsTableProps {
  rows: Movement[];
  isLoading?: boolean;
  /** Vista del admin: muestra el distribuidor */
  adminView?: boolean;
  exportName: string;
}

/** Depósitos, retiros y transferencias de los CVUs de un distribuidor */
export function MovementsTable({ rows, isLoading, adminView, exportName }: MovementsTableProps) {
  const handleExport = () => {
    const headers = [
      "Fecha", ...(adminView ? ["Distribuidor"] : []), "Titular", "Alias", "CVU", "Sentido", "Tipo",
      "Monto", "Comisión", "Estado", "Referencia",
    ];
    const data = rows.map((m) => [
      new Date(m.createdAt).toLocaleString("es-AR"),
      ...(adminView ? [m.distributorName] : []),
      m.holderName,
      m.alias,
      m.cvu,
      m.direction === "in" ? "Entrada" : "Salida",
      m.typeName,
      m.amount.toFixed(2),
      m.commission.toFixed(2),
      STATUS_LABELS[m.status] ?? m.status,
      m.referenceNumber,
    ]);
    downloadCSV(`${exportName}_${new Date().toISOString().split("T")[0]}.csv`, headers, data);
    toast.success("CSV exportado");
  };

  const columns = [
    {
      key: "createdAt",
      header: "Fecha",
      className: "whitespace-nowrap tabular-nums",
      render: (m: Movement) => formatDateTime(m.createdAt),
    },
    {
      key: "holder",
      header: "CVU",
      render: (m: Movement) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{m.holderName}</p>
          <p className="text-xs text-muted-foreground truncate font-mono">{m.alias}</p>
        </div>
      ),
    },
    ...(adminView
      ? [{ key: "distributorName", header: "Distribuidor", className: "hidden lg:table-cell" }]
      : []),
    {
      key: "type",
      header: "Tipo",
      render: (m: Movement) => (
        <span className="inline-flex items-center gap-1.5">
          {m.direction === "in"
            ? <ArrowDownLeft className="h-4 w-4 text-success" />
            : <ArrowUpRight className="h-4 w-4 text-info" />}
          {m.typeName}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Monto",
      className: "text-right tabular-nums",
      render: (m: Movement) => (
        <span className={cn("font-semibold", m.direction === "in" ? "text-success" : "text-foreground")}>
          {m.direction === "in" ? "+" : "−"}{formatARS(m.amount)}
        </span>
      ),
    },
    {
      key: "commission",
      header: "Comisión",
      className: "hidden sm:table-cell text-right tabular-nums",
      render: (m: Movement) => (m.commission > 0 ? formatARS(m.commission) : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "status",
      header: "Estado",
      className: "hidden md:table-cell",
      render: (m: Movement) => (
        <StatusBadge
          status={(KNOWN_STATUSES as readonly string[]).includes(m.status) ? (m.status as KnownStatus) : "pending"}
          label={STATUS_LABELS[m.status] ?? m.status}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "movimiento" : "movimientos"}
        </p>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      {isLoading ? (
        <div className="premium-card p-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="premium-card p-10 text-center text-muted-foreground">No hay movimientos en este período.</div>
      ) : (
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={rows} />
        </div>
      )}
    </div>
  );
}
