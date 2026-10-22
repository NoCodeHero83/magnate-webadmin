import { Loader2 } from "lucide-react";
import { DataTable } from "@/presentation/components/admin/DataTable";
import {
  Adjustment,
  FEE_OPERATION_SHORT,
  NetworkEarning,
  NetworkMember,
  PeriodSummary,
} from "@/core/entities/Distributor";
import { formatARS, formatDateTime, formatPercent } from "@/lib/format";

const Loading = () => (
  <div className="premium-card p-10 flex justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="premium-card p-8 text-center text-sm text-muted-foreground">{text}</div>
);

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/** "16/10 al 31/10": el fin del período es exclusivo, se muestra el día anterior */
export const periodLabel = (start: string, end: string) =>
  `${shortDate(start)} al ${shortDate(new Date(new Date(end).getTime() - 1000).toISOString())}`;

/** Lo ganado en cada período de liquidación */
export function PeriodSummaryTable({ rows, isLoading }: { rows: PeriodSummary[]; isLoading?: boolean }) {
  if (isLoading) return <Loading />;
  if (rows.length === 0) return <Empty text="Sin períodos para mostrar." />;
  const columns = [
    {
      key: "period",
      header: "Período",
      className: "whitespace-nowrap tabular-nums",
      render: (r: PeriodSummary) => periodLabel(r.periodStart, r.periodEnd),
    },
    { key: "commissions", header: "Comisiones", className: "text-right tabular-nums", render: (r: PeriodSummary) => formatARS(r.commissions) },
    { key: "network", header: "Red", className: "text-right tabular-nums", render: (r: PeriodSummary) => formatARS(r.network) },
    {
      key: "adjustments",
      header: "Ajustes",
      className: "hidden sm:table-cell text-right tabular-nums",
      render: (r: PeriodSummary) => formatARS(r.adjustments),
    },
    {
      key: "withdrawals",
      header: "Retirado",
      className: "hidden sm:table-cell text-right tabular-nums",
      render: (r: PeriodSummary) => formatARS(r.withdrawals),
    },
    {
      key: "status",
      header: "Estado",
      render: (r: PeriodSummary) =>
        r.isOpen ? (
          <span className="text-sm text-warning">En curso</span>
        ) : (
          <span className="text-sm text-success">Cerrado</span>
        ),
    },
  ];
  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={rows} />
    </div>
  );
}

/** Distribuidores que trajo (todos los niveles) */
export function NetworkMembersTable({ rows, isLoading }: { rows: NetworkMember[]; isLoading?: boolean }) {
  if (isLoading) return <Loading />;
  if (rows.length === 0) return <Empty text="Todavía no trajo a ningún distribuidor." />;
  const columns = [
    {
      key: "name",
      header: "Distribuidor",
      render: (r: NetworkMember) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{r.name}</p>
          {r.level > 1 && <p className="text-xs text-muted-foreground truncate">Lo trajo {r.parentName}</p>}
        </div>
      ),
    },
    { key: "level", header: "Nivel", className: "text-right tabular-nums" },
    { key: "accountsCount", header: "CVUs", className: "text-right tabular-nums" },
    {
      key: "status",
      header: "Estado",
      render: (r: NetworkMember) => (
        <span className={r.status === "active" ? "text-sm text-success" : "text-sm text-muted-foreground"}>
          {r.status === "active" ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];
  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={rows} />
    </div>
  );
}

/** Comisiones de red cobradas */
export function NetworkEarningsTable({
  rows,
  isLoading,
  showDistributor,
}: {
  rows: NetworkEarning[];
  isLoading?: boolean;
  showDistributor?: boolean;
}) {
  if (isLoading) return <Loading />;
  if (rows.length === 0) return <Empty text="Sin comisiones de red en este período." />;
  const columns = [
    {
      key: "createdAt",
      header: "Fecha",
      className: "whitespace-nowrap tabular-nums",
      render: (r: NetworkEarning) => formatDateTime(r.createdAt),
    },
    ...(showDistributor
      ? [{ key: "distributorName", header: "Cobra", render: (r: NetworkEarning) => r.distributorName }]
      : []),
    {
      key: "source",
      header: "Generada por",
      render: (r: NetworkEarning) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{r.sourceName}</p>
          <p className="text-xs text-muted-foreground">
            Nivel {r.level} · {FEE_OPERATION_SHORT[r.operation] ?? r.operation}
          </p>
        </div>
      ),
    },
    {
      key: "feeTotal",
      header: "Comisión",
      className: "hidden sm:table-cell text-right tabular-nums",
      render: (r: NetworkEarning) => formatARS(r.feeTotal),
    },
    {
      key: "ratePercent",
      header: "%",
      className: "hidden sm:table-cell text-right tabular-nums",
      render: (r: NetworkEarning) => formatPercent(r.ratePercent),
    },
    {
      key: "amount",
      header: "Cobrado",
      className: "text-right tabular-nums font-semibold",
      render: (r: NetworkEarning) => formatARS(r.amount),
    },
  ];
  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={rows} />
    </div>
  );
}

/** Ajustes manuales del saldo */
export function AdjustmentsTable({ rows, isLoading }: { rows: Adjustment[]; isLoading?: boolean }) {
  if (isLoading) return <Loading />;
  if (rows.length === 0) return <Empty text="No hay ajustes." />;
  const columns = [
    {
      key: "createdAt",
      header: "Fecha",
      className: "whitespace-nowrap tabular-nums",
      render: (r: Adjustment) => formatDateTime(r.createdAt),
    },
    { key: "reason", header: "Motivo", render: (r: Adjustment) => <span className="text-sm">{r.reason}</span> },
    {
      key: "amount",
      header: "Monto",
      className: "text-right tabular-nums font-semibold",
      render: (r: Adjustment) => (
        <span className={r.amount > 0 ? "text-success" : "text-destructive"}>
          {r.amount > 0 ? "+" : "−"}
          {formatARS(Math.abs(r.amount))}
        </span>
      ),
    },
  ];
  return (
    <div className="overflow-x-auto">
      <DataTable columns={columns} data={rows} />
    </div>
  );
}
