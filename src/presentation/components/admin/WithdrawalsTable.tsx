import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { StatusBadge } from "@/presentation/components/admin/StatusBadge";
import { Button } from "@/presentation/components/ui/button";
import {
  describeDestination,
  Withdrawal,
  WITHDRAWAL_STATUS_LABELS,
  WithdrawalStatus,
} from "@/core/entities/Withdrawal";
import { downloadCSV, formatARS, formatDateTime } from "@/lib/format";

const BADGE_STATUS: Record<WithdrawalStatus, "pending" | "completed" | "rejected" | "cancelled"> = {
  pending: "pending",
  paid: "completed",
  rejected: "rejected",
  cancelled: "cancelled",
};

export const WithdrawalStatusBadge = ({ status }: { status: WithdrawalStatus }) => (
  <StatusBadge status={BADGE_STATUS[status]} label={WITHDRAWAL_STATUS_LABELS[status]} />
);

const formatUsdt = (value: number) =>
  `${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;

/** USDT pagados o, si está pendiente, el estimado con la cotización del pedido */
function usdtText(w: Withdrawal): string | null {
  if (w.currency !== "USDT") return null;
  if (w.usdtAmount !== null) return formatUsdt(w.usdtAmount);
  if (w.usdtRateEstimate) return `≈ ${formatUsdt(w.amount / w.usdtRateEstimate)}`;
  return null;
}

interface WithdrawalsTableProps {
  rows: Withdrawal[];
  isLoading?: boolean;
  /** Vista del admin: muestra el distribuidor */
  adminView?: boolean;
  exportName: string;
  /** Botones de cada fila (pagar, rechazar, cancelar) */
  renderActions?: (w: Withdrawal) => React.ReactNode;
}

export function WithdrawalsTable({ rows, isLoading, adminView, exportName, renderActions }: WithdrawalsTableProps) {
  const handleExport = () => {
    const headers = [
      "Fecha", ...(adminView ? ["Distribuidor"] : []), "Monto (ARS)", "Moneda", "Destino", "Estado",
      "Cotización", "USDT", "Comprobante / hash", "Motivo de rechazo", "Resuelto",
    ];
    const data = rows.map((w) => [
      new Date(w.createdAt).toLocaleString("es-AR"),
      ...(adminView ? [w.distributorName] : []),
      w.amount.toFixed(2),
      w.currency,
      describeDestination(w.currency, w.destination),
      WITHDRAWAL_STATUS_LABELS[w.status],
      w.usdtRate ?? w.usdtRateEstimate ?? "",
      w.usdtAmount ?? "",
      w.paymentReference ?? "",
      w.rejectReason ?? "",
      w.resolvedAt ? new Date(w.resolvedAt).toLocaleString("es-AR") : "",
    ]);
    downloadCSV(`${exportName}_${new Date().toISOString().split("T")[0]}.csv`, headers, data);
    toast.success("CSV exportado");
  };

  const columns = [
    {
      key: "createdAt",
      header: "Fecha",
      className: "whitespace-nowrap tabular-nums",
      render: (w: Withdrawal) => formatDateTime(w.createdAt),
    },
    ...(adminView
      ? [{
        key: "distributorName",
        header: "Distribuidor",
        render: (w: Withdrawal) => <span className="font-medium text-foreground">{w.distributorName}</span>,
      }]
      : []),
    {
      key: "amount",
      header: "Monto",
      className: "text-right tabular-nums",
      render: (w: Withdrawal) => (
        <div>
          <p className="font-semibold">{formatARS(w.amount)}</p>
          {usdtText(w) && <p className="text-xs text-muted-foreground">{usdtText(w)}</p>}
        </div>
      ),
    },
    {
      key: "destination",
      header: "Destino",
      className: "hidden md:table-cell max-w-[260px]",
      render: (w: Withdrawal) => (
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{w.currency === "USDT" ? `USDT · ${w.destination.network}` : "Pesos"}</p>
          <p className="font-mono text-xs break-all">{w.currency === "USDT" ? w.destination.wallet : w.destination.destination}</p>
          {w.destination.holderName && <p className="text-xs text-muted-foreground truncate">{w.destination.holderName}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (w: Withdrawal) => (
        <div className="space-y-1">
          <WithdrawalStatusBadge status={w.status} />
          {w.status === "rejected" && w.rejectReason && (
            <p className="text-xs text-muted-foreground max-w-[200px]">{w.rejectReason}</p>
          )}
          {w.status === "paid" && w.paymentReference && (
            <p className="text-xs text-muted-foreground font-mono break-all max-w-[200px]">{w.paymentReference}</p>
          )}
        </div>
      ),
    },
    ...(renderActions
      ? [{ key: "actions", header: "", className: "text-right", render: (w: Withdrawal) => renderActions(w) }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "solicitud" : "solicitudes"}
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
        <div className="premium-card p-10 text-center text-muted-foreground">No hay solicitudes de retiro.</div>
      ) : (
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={rows} />
        </div>
      )}
    </div>
  );
}
