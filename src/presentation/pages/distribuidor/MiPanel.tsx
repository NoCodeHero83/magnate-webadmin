import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, ArrowDownLeft, ArrowUpRight, Coins, Wallet, Loader2 } from "lucide-react";
import { Header } from "@/presentation/components/admin/Header";
import { StatsCard } from "@/presentation/components/admin/StatsCard";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { useAccountVolume, useDistributorMe } from "@/presentation/hooks/useDistributors";
import { useDistributorBalance } from "@/presentation/hooks/useWithdrawals";
import { AccountVolume, SETTLEMENT_LABELS } from "@/core/entities/Distributor";
import { formatARS, getPeriod, PeriodKey, PERIOD_LABELS } from "@/lib/format";

const TOP_ROWS = 5;

/** Inicio del distribuidor: sus CVUs, el volumen y sus comisiones */
const MiPanel = () => {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const period = getPeriod(periodKey);
  const { data: me, isLoading: meLoading } = useDistributorMe();
  const { data: volume = [], isLoading: volumeLoading } = useAccountVolume(period);
  const { data: balance } = useDistributorBalance();

  const totals = volume.reduce(
    (acc, r) => ({
      volumeIn: acc.volumeIn + r.volumeIn,
      volumeOut: acc.volumeOut + r.volumeOut,
      distributorAmount: acc.distributorAmount + r.distributorAmount,
      active: acc.active + (r.operations > 0 ? 1 : 0),
    }),
    { volumeIn: 0, volumeOut: 0, distributorAmount: 0, active: 0 }
  );
  const top = [...volume]
    .sort((a, b) => b.volumeIn + b.volumeOut - (a.volumeIn + a.volumeOut))
    .slice(0, TOP_ROWS)
    .filter((r) => r.volumeIn + r.volumeOut > 0);

  if (meLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="animate-fade-in">
        <Header title="Mi panel" />
        <div className="p-6">
          <div className="premium-card p-10 text-center text-muted-foreground">
            Tu usuario no está vinculado a ningún distribuidor. Contacta a Magnate.
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "holder",
      header: "Titular",
      render: (r: AccountVolume) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{r.holderName}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">{r.alias}</p>
        </div>
      ),
    },
    {
      key: "volume",
      header: "Volumen",
      className: "text-right tabular-nums",
      render: (r: AccountVolume) => formatARS(r.volumeIn + r.volumeOut),
    },
    { key: "operations", header: "Ops.", className: "hidden sm:table-cell text-right tabular-nums" },
    {
      key: "distributorAmount",
      header: "Tu comisión",
      className: "text-right tabular-nums font-semibold",
      render: (r: AccountVolume) => formatARS(r.distributorAmount),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header title={me.name} subtitle="Panel del distribuidor" />

      <div className="p-4 md:p-6 space-y-6">
        {me.status !== "active" && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Tu cuenta de distribuidor está inactiva: no recibes comisiones de las operaciones nuevas. Contacta a Magnate.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Movimientos de tus CVUs · {PERIOD_LABELS[periodKey].toLowerCase()}</p>
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="CVUs asignados"
            value={String(me.accountsCount)}
            change={volumeLoading ? undefined : `${totals.active} con movimientos`}
            icon={CreditCard}
            iconColor="from-primary to-accent"
          />
          <StatsCard
            title="Entradas"
            value={volumeLoading ? "…" : formatARS(totals.volumeIn)}
            icon={ArrowDownLeft}
            iconColor="from-success/80 to-success"
          />
          <StatsCard
            title="Salidas"
            value={volumeLoading ? "…" : formatARS(totals.volumeOut)}
            icon={ArrowUpRight}
            iconColor="from-info to-info"
          />
          <StatsCard
            title="Tus comisiones"
            value={volumeLoading ? "…" : formatARS(totals.distributorAmount)}
            change={`Disponible para retirar: ${formatARS(balance?.available ?? me.commissionBalance)}${
              balance && balance.inProgress > 0 ? ` · En curso: ${formatARS(balance.inProgress)}` : ""
            }`}
            icon={Coins}
            iconColor="from-warning/80 to-warning"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {me.parentName ? `Te trajo ${me.parentName}. ` : ""}
            {me.networkCount > 0 ? `Trajiste ${me.networkCount} distribuidor${me.networkCount === 1 ? "" : "es"}. ` : ""}
            Liquidación: {SETTLEMENT_LABELS[me.settlementPeriod].toLowerCase()}.
          </p>
          <Link to="/mis-retiros" className="text-sm text-primary hover:underline shrink-0">Retirar comisiones</Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">CVUs con más movimiento</h2>
            <Link to="/mis-cvus" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>
          {volumeLoading ? (
            <div className="premium-card p-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : top.length === 0 ? (
            <div className="premium-card p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Wallet className="h-8 w-8" />
              {me.accountsCount === 0
                ? "Todavía no tienes CVUs asignados."
                : "Tus CVUs no tuvieron movimientos en este período."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable columns={columns} data={top} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiPanel;
