import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Header } from "@/presentation/components/admin/Header";
import { WithdrawalsTable } from "@/presentation/components/admin/WithdrawalsTable";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { useWithdrawalMutations, useWithdrawals } from "@/presentation/hooks/useWithdrawals";
import { describeDestination, Withdrawal } from "@/core/entities/Withdrawal";
import { formatARS } from "@/lib/format";

type Mode = "pay" | "reject";

/** Pagar (registrar el pago hecho por fuera) o rechazar una solicitud de retiro */
function ResolveWithdrawalDialog({ withdrawal, mode, onClose }: { withdrawal: Withdrawal | null; mode: Mode; onClose: () => void }) {
  const { resolve } = useWithdrawalMutations();
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [rate, setRate] = useState("");
  const [usdt, setUsdt] = useState("");

  useEffect(() => {
    setReference("");
    setReason("");
    const r = withdrawal?.usdtRateEstimate ?? 0;
    setRate(r ? String(r) : "");
    setUsdt(r && withdrawal ? (withdrawal.amount / r).toFixed(2) : "");
  }, [withdrawal, mode]);

  if (!withdrawal) return null;
  const isUsdt = withdrawal.currency === "USDT";
  const insufficient = withdrawal.accountBalance < withdrawal.amount;

  const handleRateChange = (value: string) => {
    setRate(value);
    const r = Number(value);
    if (r > 0) setUsdt((withdrawal.amount / r).toFixed(2));
  };

  const valid =
    mode === "reject"
      ? reason.trim().length >= 3
      : reference.trim().length > 0 && !insufficient && (!isUsdt || (Number(rate) > 0 && Number(usdt) > 0));

  const handleSubmit = async () => {
    try {
      await resolve.mutateAsync(
        mode === "reject"
          ? { id: withdrawal.id, action: "reject", reason: reason.trim() }
          : {
            id: withdrawal.id,
            action: "pay",
            reference: reference.trim(),
            usdtRate: isUsdt ? Number(rate) : undefined,
            usdtAmount: isUsdt ? Number(usdt) : undefined,
          }
      );
      toast.success(mode === "reject" ? "Solicitud rechazada" : "Retiro marcado como pagado");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo completar la operación");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "reject" ? "Rechazar retiro" : "Marcar como pagado"}</DialogTitle>
          <DialogDescription>
            {withdrawal.distributorName} · {formatARS(withdrawal.amount)} en {isUsdt ? "USDT" : "pesos"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm space-y-1">
            <p className="text-xs text-muted-foreground">{isUsdt ? `Wallet (${withdrawal.destination.network})` : "CBU / CVU / alias"}</p>
            <p className="font-mono break-all select-all">
              {isUsdt ? withdrawal.destination.wallet : withdrawal.destination.destination}
            </p>
            {withdrawal.destination.holderName && <p className="text-muted-foreground">{withdrawal.destination.holderName}</p>}
          </div>

          {mode === "reject" ? (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo (lo ve el distribuidor)</Label>
              <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            </div>
          ) : (
            <>
              {insufficient && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  La cuenta de comisiones tiene {formatARS(withdrawal.accountBalance)}: no alcanza para este retiro.
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Haz el pago por fuera de la plataforma y registra aquí el comprobante. Se descuenta {formatARS(withdrawal.amount)} del saldo del distribuidor.
              </p>
              {isUsdt && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="pay-rate">Cotización usada</Label>
                    <Input id="pay-rate" type="number" min={0} step="0.01" value={rate} onChange={(e) => handleRateChange(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay-usdt">USDT enviados</Label>
                    <Input id="pay-usdt" type="number" min={0} step="0.01" value={usdt} onChange={(e) => setUsdt(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="pay-reference">{isUsdt ? "Hash de la transacción" : "Número de comprobante"}</Label>
                <Input id="pay-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant={mode === "reject" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={!valid || resolve.isPending}
            className="gap-2"
          >
            {resolve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "reject" ? "Rechazar" : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Retiros = () => {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const { data: rows = [], isLoading } = useWithdrawals(tab === "pending" ? "pending" : null);
  const [selected, setSelected] = useState<{ withdrawal: Withdrawal; mode: Mode } | null>(null);
  const pendingTotal = tab === "pending" ? rows.reduce((sum, w) => sum + w.amount, 0) : 0;

  return (
    <div className="animate-fade-in">
      <Header title="Retiros" subtitle="Solicitudes de retiro de comisiones de los distribuidores" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "all")}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "pending" && rows.length > 0 && (
            <p className="text-sm">
              Total pendiente: <span className="font-semibold tabular-nums">{formatARS(pendingTotal)}</span>
            </p>
          )}
        </div>

        <WithdrawalsTable
          rows={rows}
          isLoading={isLoading}
          adminView
          exportName="retiros"
          renderActions={(w) =>
            w.status === "pending" ? (
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-success"
                  title={`Pagar a ${describeDestination(w.currency, w.destination)}`}
                  onClick={() => setSelected({ withdrawal: w, mode: "pay" })}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden xl:inline">Pagado</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-destructive"
                  onClick={() => setSelected({ withdrawal: w, mode: "reject" })}
                >
                  <XCircle className="h-4 w-4" />
                  <span className="hidden xl:inline">Rechazar</span>
                </Button>
              </div>
            ) : null
          }
        />
      </div>

      {selected && (
        <ResolveWithdrawalDialog withdrawal={selected.withdrawal} mode={selected.mode} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default Retiros;
