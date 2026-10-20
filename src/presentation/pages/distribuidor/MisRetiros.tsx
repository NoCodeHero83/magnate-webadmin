import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Lock, CheckCircle2, Plus, Loader2, Info, Hourglass } from "lucide-react";
import { Header } from "@/presentation/components/admin/Header";
import { StatsCard } from "@/presentation/components/admin/StatsCard";
import { WithdrawalsTable } from "@/presentation/components/admin/WithdrawalsTable";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/presentation/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import {
  useDistributorBalance,
  useWithdrawalMutations,
  useWithdrawals,
  useWithdrawalSettings,
} from "@/presentation/hooks/useWithdrawals";
import { UsdtNetwork, USDT_NETWORKS, Withdrawal, WithdrawalCurrency } from "@/core/entities/Withdrawal";
import { SETTLEMENT_LABELS } from "@/core/entities/Distributor";
import { formatARS, formatDateTime } from "@/lib/format";

const ALIAS_OR_CBU = /^(\d{22}|[a-z0-9.-]{6,20})$/;
const WALLET = /^[A-Za-z0-9]{26,64}$/;

function RequestWithdrawalDialog({ open, onOpenChange, available }: { open: boolean; onOpenChange: (open: boolean) => void; available: number }) {
  const { data: settings } = useWithdrawalSettings();
  const { request } = useWithdrawalMutations();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<WithdrawalCurrency>("ARS");
  const [destination, setDestination] = useState("");
  const [holderName, setHolderName] = useState("");
  const [wallet, setWallet] = useState("");
  const enabledNetworks = USDT_NETWORKS.filter((n) => (settings?.usdtNetworks ?? ["TRC20", "BEP20"]).includes(n.value));
  const [network, setNetwork] = useState<UsdtNetwork>("TRC20");

  useEffect(() => {
    if (open) {
      setAmount(available > 0 ? available.toFixed(2) : "");
      setCurrency("ARS");
      setDestination("");
      setHolderName("");
      setWallet("");
      setNetwork(enabledNetworks[0]?.value ?? "TRC20");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, available]);

  const minAmount = settings?.minAmount ?? 0;
  const usdtRate = settings?.usdtRate ?? 0;
  const value = Number(amount);
  const amountError =
    !amount || !(value > 0) ? "Ingresa un monto"
      : value > available ? `El máximo disponible es ${formatARS(available)}`
        : value < minAmount ? `El monto mínimo es ${formatARS(minAmount)}`
          : null;
  const destinationError =
    currency === "ARS"
      ? (ALIAS_OR_CBU.test(destination.trim().toLowerCase()) ? null : "CBU/CVU de 22 dígitos o alias de 6 a 20 caracteres")
      : (WALLET.test(wallet.trim()) ? null : "Dirección de wallet inválida");
  const valid = !amountError && !destinationError;

  const handleSubmit = async () => {
    try {
      await request.mutateAsync({
        amount: Math.round(value * 100) / 100,
        currency,
        destination: currency === "ARS" ? { destination, holderName } : { wallet, network },
      });
      toast.success("Solicitud enviada. Magnate la revisará; el estado lo ves en esta página.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo enviar la solicitud");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar retiro</DialogTitle>
          <DialogDescription>Disponible: {formatARS(available)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-amount">Monto en pesos</Label>
            <Input id="w-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {amount && amountError && <p className="text-xs text-destructive">{amountError}</p>}
            {minAmount > 0 && <p className="text-xs text-muted-foreground">Mínimo: {formatARS(minAmount)}</p>}
          </div>

          <div className="space-y-2">
            <Label>Recibir en</Label>
            <RadioGroup value={currency} onValueChange={(v) => setCurrency(v as WithdrawalCurrency)} className="grid grid-cols-2 gap-2">
              <Label htmlFor="cur-ars" className="flex items-center gap-2 rounded-lg border border-border/50 p-3 cursor-pointer">
                <RadioGroupItem value="ARS" id="cur-ars" /> Pesos
              </Label>
              <Label
                htmlFor="cur-usdt"
                className={`flex items-center gap-2 rounded-lg border border-border/50 p-3 ${usdtRate > 0 ? "cursor-pointer" : "opacity-50"}`}
              >
                <RadioGroupItem value="USDT" id="cur-usdt" disabled={usdtRate <= 0} /> USDT
              </Label>
            </RadioGroup>
            {usdtRate <= 0 && <p className="text-xs text-muted-foreground">Los retiros en USDT no están habilitados por el momento.</p>}
          </div>

          {currency === "ARS" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="w-dest">CBU, CVU o alias</Label>
                <Input id="w-dest" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={22} />
                {destination && destinationError && <p className="text-xs text-destructive">{destinationError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-holder">Titular de la cuenta (opcional)</Label>
                <Input id="w-holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} maxLength={120} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Red</Label>
                <Select value={network} onValueChange={(v) => setNetwork(v as UsdtNetwork)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {enabledNetworks.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-wallet">Dirección de la wallet</Label>
                <Input id="w-wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} maxLength={64} className="font-mono" />
                {wallet && destinationError && <p className="text-xs text-destructive">{destinationError}</p>}
              </div>
              {value > 0 && usdtRate > 0 && (
                <p className="text-sm rounded-lg bg-muted/40 p-3">
                  Recibirías aprox. <span className="font-semibold">{(value / usdtRate).toLocaleString("es-AR", { maximumFractionDigits: 2 })} USDT</span>
                  <span className="block text-xs text-muted-foreground">
                    Cotización de referencia: {formatARS(usdtRate)} por USDT. El monto final depende de la cotización al momento del pago.
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || request.isPending} className="gap-2">
            {request.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MisRetiros = () => {
  const { data: balance, isLoading: balanceLoading } = useDistributorBalance();
  const { data: settings } = useWithdrawalSettings();
  const { data: rows = [], isLoading } = useWithdrawals();
  const { cancel } = useWithdrawalMutations();
  const [requestOpen, setRequestOpen] = useState(false);
  const [toCancel, setToCancel] = useState<Withdrawal | null>(null);

  const available = balance?.available ?? 0;
  const minAmount = settings?.minAmount ?? 0;
  const canRequest = available > 0 && available >= minAmount;

  const handleCancel = async () => {
    if (!toCancel) return;
    try {
      await cancel.mutateAsync(toCancel.id);
      toast.success("Solicitud cancelada");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cancelar");
    } finally {
      setToCancel(null);
    }
  };

  const money = (value?: number) => (balanceLoading ? "…" : formatARS(value));

  return (
    <div className="animate-fade-in">
      <Header title="Mis retiros" subtitle="Retira tus comisiones en pesos o USDT" />
      <div className="p-4 md:p-6 space-y-6">
        {balance && balance.settlementPeriod !== "instant" && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm flex items-start gap-3">
            <Hourglass className="h-5 w-5 shrink-0 text-warning" />
            <p>
              Liquidación {SETTLEMENT_LABELS[balance.settlementPeriod].toLowerCase()}. Lo ganado en el período en curso (
              <span className="font-semibold tabular-nums">{formatARS(balance.inProgress)}</span>) se puede retirar cuando cierre
              {balance.releaseAt ? `, el ${formatDateTime(balance.releaseAt)}` : ""}.
            </p>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatsCard title="Saldo de comisiones" value={money(balance?.balance)} icon={Wallet} iconColor="from-primary to-accent" />
          <StatsCard
            title="En retiros pendientes"
            value={money(balance?.reserved)}
            icon={Lock}
            iconColor="from-warning/80 to-warning"
          />
          <StatsCard
            title="Disponible para retirar"
            value={money(balance?.available)}
            change={balance ? `Retirado en total: ${formatARS(balance.paidTotal)}` : undefined}
            icon={CheckCircle2}
            iconColor="from-success/80 to-success"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            {canRequest || balanceLoading
              ? "Magnate revisa cada solicitud y te paga por fuera de la plataforma."
              : minAmount > 0 && available > 0
                ? `El monto mínimo de retiro es ${formatARS(minAmount)}.`
                : "No tienes saldo disponible para retirar."}
          </p>
          <Button className="gap-2" onClick={() => setRequestOpen(true)} disabled={!canRequest}>
            <Plus className="h-4 w-4" />
            Solicitar retiro
          </Button>
        </div>

        <WithdrawalsTable
          rows={rows}
          isLoading={isLoading}
          exportName="mis_retiros"
          renderActions={(w) =>
            w.status === "pending" ? (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToCancel(w)}>
                Cancelar
              </Button>
            ) : null
          }
        />
      </div>

      <RequestWithdrawalDialog open={requestOpen} onOpenChange={setRequestOpen} available={available} />

      <AlertDialog open={!!toCancel} onOpenChange={(open) => !open && setToCancel(null)}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              {toCancel && `${formatARS(toCancel.amount)} vuelven a estar disponibles para retirar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar solicitud</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MisRetiros;
