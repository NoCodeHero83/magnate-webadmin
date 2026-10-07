import { useState } from "react";
import { toast } from "sonner";
import { Coins, Landmark, Handshake, Wallet, Plus, Pencil, Trash2, Loader2, Info } from "lucide-react";
import { Header } from "@/presentation/components/admin/Header";
import { StatsCard } from "@/presentation/components/admin/StatsCard";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { CommissionDetailTable } from "@/presentation/components/admin/CommissionDetailTable";
import { FeeRuleDialog } from "@/presentation/components/admin/FeeRuleDialog";
import { Button } from "@/presentation/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/presentation/components/ui/alert-dialog";
import {
  useCommissionDetail,
  useCommissionSummary,
  useFeeRuleMutations,
  useFeeRules,
} from "@/presentation/hooks/useDistributors";
import { FeeRule, FEE_OPERATION_LABELS, FEE_OPERATION_SHORT, OUTGOING_OPERATIONS } from "@/core/entities/Distributor";
import { formatARS, formatPercent, getPeriod, PeriodKey } from "@/lib/format";

/** "1 % + $ 5,00 (mín. $ 2,00, máx. $ 500,00)" */
function describeFee(rule: FeeRule) {
  if (rule.ratePercent === 0 && rule.fixedAmount === 0) return "Sin comisión";
  const parts = [];
  if (rule.ratePercent > 0) parts.push(formatPercent(rule.ratePercent));
  if (rule.fixedAmount > 0) parts.push(formatARS(rule.fixedAmount));
  const limits = [];
  if (rule.minAmount > 0) limits.push(`mín. ${formatARS(rule.minAmount)}`);
  if (rule.maxAmount !== null) limits.push(`máx. ${formatARS(rule.maxAmount)}`);
  return parts.join(" + ") + (limits.length ? ` (${limits.join(", ")})` : "");
}

const chargeModeLabel = (rule: FeeRule) =>
  !OUTGOING_OPERATIONS.includes(rule.operation)
    ? "Se descuenta de lo recibido"
    : rule.chargeMode === "on_top"
      ? "Se cobra aparte"
      : "Se descuenta del monto";

const Comisiones = () => {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const period = getPeriod(periodKey);
  const { data: summary, isLoading: summaryLoading } = useCommissionSummary(period);
  const { data: detail = [], isLoading: detailLoading } = useCommissionDetail(period, null);
  const { data: rules = [], isLoading: rulesLoading } = useFeeRules();
  const { remove } = useFeeRuleMutations();

  const [editing, setEditing] = useState<FeeRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<FeeRule | null>(null);

  const defaultRules = rules.filter((r) => r.accountId === null);
  const accountRules = rules.filter((r) => r.accountId !== null);

  const openDialog = (rule: FeeRule | null) => {
    setEditing(rule);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success("Regla eliminada. El CVU vuelve a usar la regla por defecto.");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar la regla");
    } finally {
      setToDelete(null);
    }
  };

  const ruleColumns = (withAccount: boolean) => [
    ...(withAccount
      ? [{
        key: "account",
        header: "CVU",
        render: (r: FeeRule) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{r.holderName ?? "—"}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{r.accountAlias}</p>
          </div>
        ),
      }]
      : []),
    {
      key: "operation",
      header: "Operación",
      render: (r: FeeRule) => (withAccount ? FEE_OPERATION_SHORT[r.operation] : FEE_OPERATION_LABELS[r.operation]),
    },
    { key: "fee", header: "Comisión", className: "tabular-nums", render: (r: FeeRule) => describeFee(r) },
    { key: "mode", header: "Cobro", className: "hidden lg:table-cell", render: (r: FeeRule) => chargeModeLabel(r) },
    {
      key: "share",
      header: "Magnate / Distribuidor",
      className: "hidden md:table-cell tabular-nums",
      render: (r: FeeRule) => `${formatPercent(r.magnateSharePercent)} / ${formatPercent(100 - r.magnateSharePercent)}`,
    },
    ...(withAccount
      ? [{
        key: "active",
        header: "Estado",
        className: "hidden sm:table-cell",
        render: (r: FeeRule) => (
          <span className={r.isActive ? "text-success text-sm" : "text-muted-foreground text-sm"}>
            {r.isActive ? "Activa" : "Inactiva"}
          </span>
        ),
      }]
      : []),
    {
      key: "actions",
      header: "",
      render: (r: FeeRule) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(r)} aria-label="Editar regla">
            <Pencil className="h-4 w-4" />
          </Button>
          {withAccount && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setToDelete(r)}
              aria-label="Eliminar regla"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header title="Comisiones" subtitle="Tarifas por operación y reparto con los distribuidores" />

      <div className="p-4 md:p-6 space-y-8">
        {/* Resumen */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">Resumen</h2>
            <PeriodSelect value={periodKey} onChange={setPeriodKey} />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Comisiones cobradas"
              value={summaryLoading ? "…" : formatARS(summary?.feeTotal)}
              change={`${summary?.count ?? 0} operaciones`}
              icon={Coins}
              iconColor="from-primary to-accent"
            />
            <StatsCard
              title="Parte de Magnate"
              value={summaryLoading ? "…" : formatARS(summary?.magnateTotal)}
              icon={Landmark}
              iconColor="from-info to-info"
            />
            <StatsCard
              title="Parte de distribuidores"
              value={summaryLoading ? "…" : formatARS(summary?.distributorTotal)}
              icon={Handshake}
              iconColor="from-success/80 to-success"
            />
            <StatsCard
              title="Saldo cuenta de comisiones"
              value={summaryLoading ? "…" : formatARS(summary?.magnateBalance)}
              change="Acumulado de Magnate"
              icon={Wallet}
              iconColor="from-warning/80 to-warning"
            />
          </div>
        </section>

        {/* Reglas por defecto */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Reglas por defecto</h2>
            <p className="text-sm text-muted-foreground">
              Se aplican a todos los CVUs que no tienen una regla propia. Los cambios valen para las operaciones nuevas.
            </p>
          </div>
          {rulesLoading ? (
            <div className="premium-card p-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable columns={ruleColumns(false)} data={defaultRules} />
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            En una transferencia entre dos CVUs de la billetera se aplican las dos reglas internas: "envía" a quien
            transfiere y "recibe" a quien recibe. Para no cobrarle a uno de los dos, deja su tasa en 0. Pay-in se
            aplicará cuando esté integrado el banco.
          </p>
        </section>

        {/* Reglas por CVU */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Reglas por CVU</h2>
              <p className="text-sm text-muted-foreground">Reemplazan la regla por defecto para un CVU y una operación.</p>
            </div>
            <Button className="gap-2 shrink-0" onClick={() => openDialog(null)}>
              <Plus className="h-4 w-4" />
              Regla para un CVU
            </Button>
          </div>
          {!rulesLoading && accountRules.length === 0 ? (
            <div className="premium-card p-8 text-center text-sm text-muted-foreground">
              Ningún CVU tiene reglas propias: todos usan las reglas por defecto.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable columns={ruleColumns(true)} data={accountRules} />
            </div>
          )}
        </section>

        {/* Detalle */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Detalle de comisiones</h2>
          <CommissionDetailTable rows={detail} isLoading={detailLoading} adminView exportName="comisiones" />
        </section>
      </div>

      <FeeRuleDialog open={dialogOpen} onOpenChange={setDialogOpen} rule={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar regla</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.holderName ?? toDelete?.accountAlias} vuelve a usar la regla por defecto para{" "}
              {toDelete ? FEE_OPERATION_LABELS[toDelete.operation].toLowerCase() : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Comisiones;
