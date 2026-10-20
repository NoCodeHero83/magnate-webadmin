import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Network, Info, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Switch } from "@/presentation/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/presentation/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { useCommissionSettings, useSaveCommissionSettings } from "@/presentation/hooks/useDistributors";
import { InactiveShare, SettlementPeriod, SETTLEMENT_LABELS } from "@/core/entities/Distributor";
import { formatARS } from "@/lib/format";

const MAX_LEVELS = 10;
const EXAMPLE_FEE = 1000;

/** Red, liquidación y distribuidores inactivos (configuración general) */
export function CommissionSettingsCard() {
  const { data: settings, isLoading, isError } = useCommissionSettings();
  const save = useSaveCommissionSettings();
  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [levels, setLevels] = useState<string[]>([]);
  const [settlement, setSettlement] = useState<SettlementPeriod>("instant");
  const [inactive, setInactive] = useState<InactiveShare>("magnate");

  useEffect(() => {
    if (settings) {
      setNetworkEnabled(settings.networkEnabled);
      setLevels(settings.networkLevelPercents.map(String));
      setSettlement(settings.settlementPeriod);
      setInactive(settings.inactiveDistributorShare);
    }
  }, [settings]);

  const values = levels.map((l) => Number(l.replace(",", ".")));
  const levelsValid = values.every((v) => levelOk(v));
  const total = values.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
  const valid = levelsValid && total <= 100 && (!networkEnabled || levels.length > 0);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        networkEnabled,
        networkLevelPercents: values,
        settlementPeriod: settlement,
        inactiveDistributorShare: inactive,
      });
      toast.success("Configuración de comisiones guardada. Aplica a las comisiones nuevas.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar");
    }
  };

  return (
    <div className="premium-card p-4 md:p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          Comisiones de distribuidores
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Valores generales. Cada distribuidor puede tener los suyos desde Distribuidores → Comisiones y red.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !settings ? (
        <p className="text-sm text-destructive">No se pudo cargar la configuración de comisiones.</p>
      ) : (
        <div className="space-y-6">
          {/* Red */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3">
              <Label htmlFor="network-enabled" className="cursor-pointer">
                Los distribuidores cobran de su red
                <span className="block text-xs font-normal text-muted-foreground">
                  Quien trajo a un distribuidor (y los niveles de arriba) cobra un % de las comisiones de sus CVUs.
                  Sale de la parte de Magnate.
                </span>
              </Label>
              <Switch id="network-enabled" checked={networkEnabled} onCheckedChange={setNetworkEnabled} />
            </div>

            {networkEnabled && (
              <div className="space-y-3 pl-1">
                <p className="text-sm font-medium">% de la comisión para cada nivel</p>
                {levels.map((level, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Label htmlFor={`level-${i}`} className="w-40 shrink-0 text-sm font-normal">
                      Nivel {i + 1} {i === 0 ? "(quien lo trajo)" : ""}
                    </Label>
                    <Input
                      id={`level-${i}`}
                      inputMode="decimal"
                      className="w-28"
                      value={level}
                      onChange={(e) => setLevels(levels.map((l, j) => (j === i ? e.target.value : l)))}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label={`Quitar nivel ${i + 1}`}
                      onClick={() => setLevels(levels.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {levels.length < MAX_LEVELS && (
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setLevels([...levels, "0"])}>
                    <Plus className="h-4 w-4" /> Agregar nivel
                  </Button>
                )}
                {!levelsValid && <p className="text-xs text-destructive">Cada nivel debe estar entre 0 y 100 %.</p>}
                {levelsValid && total > 100 && <p className="text-xs text-destructive">La suma no puede superar el 100 %.</p>}
                {levels.length === 0 && <p className="text-xs text-destructive">Agrega al menos un nivel.</p>}
                {levelsValid && levels.length > 0 && total <= 100 && (
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: de una comisión de {formatARS(EXAMPLE_FEE)},{" "}
                    {values.map((v, i) => `nivel ${i + 1} cobra ${formatARS((EXAMPLE_FEE * v) / 100)}`).join(", ")}. Si la parte de
                    Magnate no alcanza, la red cobra hasta lo que queda.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Liquidación */}
          <div className="space-y-2">
            <Label>Liquidación</Label>
            <Select value={settlement} onValueChange={(v) => setSettlement(v as SettlementPeriod)}>
              <SelectTrigger className="sm:max-w-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SETTLEMENT_LABELS) as SettlementPeriod[]).map((p) => (
                  <SelectItem key={p} value={p}>{SETTLEMENT_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              Lo ganado en el período en curso se ve en el panel del distribuidor pero se puede retirar recién cuando el período
              cierra (hora argentina). Los ajustes manuales quedan disponibles en el momento.
            </p>
          </div>

          {/* Inactivos */}
          <div className="space-y-2">
            <Label>Si un distribuidor está inactivo, su parte de las comisiones nuevas</Label>
            <RadioGroup value={inactive} onValueChange={(v) => setInactive(v as InactiveShare)} className="space-y-2">
              <label htmlFor="inactive-magnate" className="flex items-start gap-3 rounded-lg border border-border/50 p-3 cursor-pointer">
                <RadioGroupItem value="magnate" id="inactive-magnate" className="mt-0.5" />
                <span className="text-sm">
                  <span className="font-medium">Va a Magnate.</span>{" "}
                  <span className="text-muted-foreground">No se le devuelve cuando se lo vuelve a activar.</span>
                </span>
              </label>
              <label htmlFor="inactive-keep" className="flex items-start gap-3 rounded-lg border border-border/50 p-3 cursor-pointer">
                <RadioGroupItem value="distributor" id="inactive-keep" className="mt-0.5" />
                <span className="text-sm">
                  <span className="font-medium">Se le sigue acreditando.</span>{" "}
                  <span className="text-muted-foreground">Inactivo solo marca el estado; sigue cobrando igual.</span>
                </span>
              </label>
            </RadioGroup>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!valid || save.isPending} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Un % de nivel válido */
function levelOk(v: number) {
  return Number.isFinite(v) && v >= 0 && v <= 100;
}
