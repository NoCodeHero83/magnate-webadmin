import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Info, Loader2, Save } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { UsdtNetwork, USDT_NETWORKS } from "@/core/entities/Withdrawal";
import { useSaveWithdrawalSettings, useWithdrawalSettings } from "@/presentation/hooks/useWithdrawals";

/** Monto mínimo de retiro y cotización del USDT para los retiros de los distribuidores */
export function WithdrawalSettingsCard() {
  const { data: settings, isLoading, isError } = useWithdrawalSettings();
  const save = useSaveWithdrawalSettings();
  const [minAmount, setMinAmount] = useState("");
  const [usdtRate, setUsdtRate] = useState("");
  const [networks, setNetworks] = useState<UsdtNetwork[]>([]);

  useEffect(() => {
    if (settings) {
      setMinAmount(String(settings.minAmount));
      setUsdtRate(String(settings.usdtRate));
      setNetworks(settings.usdtNetworks);
    }
  }, [settings]);

  const toggleNetwork = (network: UsdtNetwork, checked: boolean) =>
    setNetworks(checked ? [...networks, network] : networks.filter((n) => n !== network));

  const min = Number(minAmount);
  const rate = Number(usdtRate);
  const valid = minAmount !== "" && usdtRate !== "" && min >= 0 && rate >= 0 && networks.length > 0;
  const sameNetworks = (a: UsdtNetwork[], b: UsdtNetwork[]) => a.length === b.length && a.every((n) => b.includes(n));
  const changed =
    !!settings && (min !== settings.minAmount || rate !== settings.usdtRate || !sameNetworks(networks, settings.usdtNetworks));

  const handleSave = async () => {
    try {
      await save.mutateAsync({ minAmount: min, usdtRate: rate, usdtNetworks: networks });
      toast.success("Configuración de retiros guardada");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar");
    }
  };

  return (
    <div className="premium-card p-4 md:p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Retiros de distribuidores
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Los distribuidores piden retiros de sus comisiones en pesos o en USDT desde su panel.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !settings ? (
        <p className="text-sm text-destructive">No se pudo cargar la configuración de retiros.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="withdrawal-min">Monto mínimo de retiro (ARS)</Label>
              <Input
                id="withdrawal-min"
                type="number"
                min={0}
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usdt-rate">Cotización del USDT (ARS por 1 USDT)</Label>
              <Input
                id="usdt-rate"
                type="number"
                min={0}
                step="0.01"
                value={usdtRate}
                onChange={(e) => setUsdtRate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Redes de USDT habilitadas</Label>
            <div className="flex flex-wrap gap-2">
              {USDT_NETWORKS.map((n) => (
                <label
                  key={n.value}
                  htmlFor={`net-${n.value}`}
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    id={`net-${n.value}`}
                    checked={networks.includes(n.value)}
                    onCheckedChange={(v) => toggleNetwork(n.value, v === true)}
                  />
                  {n.label}
                </label>
              ))}
            </div>
            {networks.length === 0 && <p className="text-xs text-destructive">Elige al menos una red.</p>}
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            La cotización se usa como estimado cuando el distribuidor pide el retiro; al pagarlo registras la cotización real.
            Con cotización en 0 los retiros en USDT quedan deshabilitados.
          </p>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!valid || !changed || save.isPending} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
