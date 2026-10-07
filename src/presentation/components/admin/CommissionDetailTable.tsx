import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { Button } from "@/presentation/components/ui/button";
import { CommissionEntry, FEE_OPERATION_SHORT } from "@/core/entities/Distributor";
import { downloadCSV, formatARS, formatDateTime, formatPercent } from "@/lib/format";

interface CommissionDetailTableProps {
  rows: CommissionEntry[];
  isLoading?: boolean;
  /** Vista del admin: muestra la parte de Magnate y el distribuidor */
  adminView?: boolean;
  exportName: string;
}

/** Detalle de cada comisión cobrada */
export function CommissionDetailTable({ rows, isLoading, adminView, exportName }: CommissionDetailTableProps) {
  const handleExport = () => {
    const headers = [
      "Fecha", "Operación", "Titular", "Alias", "CVU", "Monto de la operación", "Tasa",
      "Comisión total", ...(adminView ? ["Parte Magnate", "Distribuidor"] : []), "Parte distribuidor",
    ];
    const data = rows.map((r) => [
      new Date(r.createdAt).toLocaleString("es-AR"),
      FEE_OPERATION_SHORT[r.operation] ?? r.operation,
      r.holderName,
      r.alias,
      r.cvu,
      r.baseAmount.toFixed(2),
      r.ratePercent,
      r.feeTotal.toFixed(2),
      ...(adminView ? [r.magnateAmount.toFixed(2), r.distributorName ?? ""] : []),
      r.distributorAmount.toFixed(2),
    ]);
    downloadCSV(`${exportName}_${new Date().toISOString().split("T")[0]}.csv`, headers, data);
    toast.success("CSV exportado");
  };

  const columns = [
    {
      key: "createdAt",
      header: "Fecha",
      className: "whitespace-nowrap tabular-nums",
      render: (r: CommissionEntry) => formatDateTime(r.createdAt),
    },
    {
      key: "operation",
      header: "Operación",
      render: (r: CommissionEntry) => FEE_OPERATION_SHORT[r.operation] ?? r.operation,
    },
    {
      key: "holder",
      header: "Titular",
      render: (r: CommissionEntry) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{r.holderName}</p>
          <p className="text-xs text-muted-foreground truncate font-mono">{r.alias}</p>
        </div>
      ),
    },
    ...(adminView
      ? [{
        key: "distributorName",
        header: "Distribuidor",
        className: "hidden lg:table-cell",
        render: (r: CommissionEntry) => r.distributorName ?? <span className="text-muted-foreground">—</span>,
      }]
      : []),
    {
      key: "baseAmount",
      header: "Monto",
      className: "hidden md:table-cell text-right tabular-nums",
      render: (r: CommissionEntry) => formatARS(r.baseAmount),
    },
    {
      key: "ratePercent",
      header: "Tasa",
      className: "hidden md:table-cell text-right tabular-nums",
      render: (r: CommissionEntry) => formatPercent(r.ratePercent),
    },
    {
      key: "feeTotal",
      header: "Comisión",
      className: "text-right tabular-nums",
      render: (r: CommissionEntry) => formatARS(r.feeTotal),
    },
    ...(adminView
      ? [{
        key: "magnateAmount",
        header: "Magnate",
        className: "hidden sm:table-cell text-right tabular-nums",
        render: (r: CommissionEntry) => formatARS(r.magnateAmount),
      }]
      : []),
    {
      key: "distributorAmount",
      header: adminView ? "Distribuidor" : "Tu parte",
      className: "text-right tabular-nums font-semibold",
      render: (r: CommissionEntry) => formatARS(r.distributorAmount),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "comisión" : "comisiones"}
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
        <div className="premium-card p-10 text-center text-muted-foreground">
          No hay comisiones en este período.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={rows} />
        </div>
      )}
    </div>
  );
}
