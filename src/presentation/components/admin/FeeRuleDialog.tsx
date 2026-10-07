import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
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
import {
  ChargeMode,
  FeeOperation,
  FeeRule,
  FeeRuleInput,
  FEE_OPERATION_LABELS,
  OUTGOING_OPERATIONS,
} from "@/core/entities/Distributor";
import { getUserDisplayName, User } from "@/core/entities/User";
import { useFeeRuleMutations } from "@/presentation/hooks/useDistributors";
import { useUsers } from "@/presentation/hooks/useUsers";
import { PaginatedResult } from "@/core/types/pagination";
import { formatARS } from "@/lib/format";

const EXAMPLE_AMOUNT = 10000;

interface FeeRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Regla a editar; null = nueva regla para un CVU */
  rule: FeeRule | null;
}

/** Misma fórmula que la BD (_fee_amount) para el ejemplo */
function exampleFee(rate: number, fixed: number, min: number, max: number | null, amount: number) {
  if (rate === 0 && fixed === 0) return 0;
  let fee = Math.round((amount * rate / 100 + fixed) * 100) / 100;
  fee = Math.max(fee, min);
  if (max !== null) fee = Math.min(fee, max);
  return fee;
}

const parse = (value: string) => (value.trim() === "" ? NaN : Number(value.replace(",", ".")));

export function FeeRuleDialog({ open, onOpenChange, rule }: FeeRuleDialogProps) {
  const { create, update } = useFeeRuleMutations();
  const isNew = !rule;

  const [operation, setOperation] = useState<FeeOperation>("internal_out");
  const [rate, setRate] = useState("0");
  const [fixed, setFixed] = useState("0");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("");
  const [chargeMode, setChargeMode] = useState<ChargeMode>("on_top");
  const [magnateShare, setMagnateShare] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [account, setAccount] = useState<{ id: string; label: string } | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [error, setError] = useState("");

  // Cargar los valores al abrir
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? rule?.id ?? "new" : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setOperation(rule?.operation ?? "internal_out");
    setRate(String(rule?.ratePercent ?? 0));
    setFixed(String(rule?.fixedAmount ?? 0));
    setMin(String(rule?.minAmount ?? 0));
    setMax(rule?.maxAmount === null || rule?.maxAmount === undefined ? "" : String(rule.maxAmount));
    setChargeMode(rule?.chargeMode ?? "on_top");
    setMagnateShare(String(rule?.magnateSharePercent ?? 100));
    setIsActive(rule?.isActive ?? true);
    setAccount(null);
    setAccountSearch("");
    setError("");
  }

  const searching = isNew && open && accountSearch.trim().length >= 2;
  const { data: searchResult, isFetching: searchLoading } = useUsers(
    { search: accountSearch.trim(), page: 0, pageSize: 6 },
    searching
  );
  const candidates = searching ? ((searchResult as PaginatedResult<User>)?.data ?? []).filter((u) => u.accountId) : [];

  const isOutgoing = OUTGOING_OPERATIONS.includes(operation);
  const effectiveMode: ChargeMode = isOutgoing ? chargeMode : "deduct";

  const nums = {
    rate: parse(rate),
    fixed: parse(fixed),
    min: parse(min),
    max: max.trim() === "" ? null : parse(max),
    share: parse(magnateShare),
  };
  const valid =
    nums.rate >= 0 && nums.rate <= 100 &&
    nums.fixed >= 0 && nums.min >= 0 &&
    (nums.max === null || nums.max >= nums.min) &&
    nums.share >= 0 && nums.share <= 100;
  const fee = valid ? exampleFee(nums.rate, nums.fixed, nums.min, nums.max, EXAMPLE_AMOUNT) : 0;
  const distributorPart = valid ? Math.round(fee * (100 - nums.share)) / 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew && !account) return setError("Elige el CVU al que aplica la regla.");
    if (Number.isNaN(nums.rate) || nums.rate < 0 || nums.rate > 100) return setError("La tasa debe estar entre 0 y 100 %.");
    if (Number.isNaN(nums.fixed) || nums.fixed < 0) return setError("El monto fijo no puede ser negativo.");
    if (Number.isNaN(nums.min) || nums.min < 0) return setError("El mínimo no puede ser negativo.");
    if (nums.max !== null && (Number.isNaN(nums.max) || nums.max < nums.min)) return setError("El máximo no puede ser menor que el mínimo.");
    if (Number.isNaN(nums.share) || nums.share < 0 || nums.share > 100) return setError("La parte de Magnate debe estar entre 0 y 100 %.");
    setError("");

    const input: FeeRuleInput = {
      accountId: rule ? rule.accountId : account!.id,
      operation,
      ratePercent: nums.rate,
      fixedAmount: nums.fixed,
      minAmount: nums.min,
      maxAmount: nums.max,
      chargeMode: effectiveMode,
      magnateSharePercent: nums.share,
      isActive: rule?.accountId === null ? true : isActive,
    };
    try {
      if (rule) await update.mutateAsync({ id: rule.id, input });
      else await create.mutateAsync(input);
      toast.success("Regla guardada. Aplica a las operaciones nuevas.");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar la regla");
    }
  };

  const saving = create.isPending || update.isPending;
  const title = rule
    ? rule.accountId
      ? `Regla de ${rule.holderName ?? rule.accountAlias}`
      : `Regla por defecto: ${FEE_OPERATION_LABELS[rule.operation]}`
    : "Nueva regla para un CVU";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {rule?.accountId === null
              ? "Se aplica a todos los CVUs que no tienen una regla propia para esta operación."
              : "Reemplaza la regla por defecto solo para este CVU."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isNew && (
            <div className="space-y-2">
              <Label htmlFor="rule-account">CVU</Label>
              {account ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2">
                  <span className="text-sm truncate">{account.label}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAccount(null)}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="rule-account"
                      className="pl-10"
                      placeholder="Buscar por nombre, alias, CVU, DNI o CUIT..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                    />
                  </div>
                  {searching && (
                    <div className="rounded-lg border border-border/50 divide-y divide-border/50">
                      {searchLoading ? (
                        <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
                      ) : candidates.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">Sin resultados.</p>
                      ) : (
                        candidates.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                            onClick={() => setAccount({ id: u.accountId!, label: `${getUserDisplayName(u)} · ${u.accountAlias}` })}
                          >
                            <p className="text-sm font-medium">{getUserDisplayName(u)}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {u.accountAlias} · {u.accountCvu}
                              {u.distributorName ? ` · ${u.distributorName}` : ""}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Operación</Label>
            {isNew ? (
              <Select value={operation} onValueChange={(v) => setOperation(v as FeeOperation)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {(Object.keys(FEE_OPERATION_LABELS) as FeeOperation[]).map((op) => (
                    <SelectItem key={op} value={op}>
                      {FEE_OPERATION_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{FEE_OPERATION_LABELS[operation]}</p>
            )}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rule-rate">Tasa (%)</Label>
              <Input id="rule-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-fixed">Monto fijo ($)</Label>
              <Input id="rule-fixed" inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-min">Mínimo ($)</Label>
              <Input id="rule-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-max">Máximo ($, opcional)</Label>
              <Input id="rule-max" inputMode="decimal" placeholder="Sin tope" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cómo se cobra</Label>
            {isOutgoing ? (
              <RadioGroup value={chargeMode} onValueChange={(v) => setChargeMode(v as ChargeMode)} className="space-y-2">
                <label htmlFor="mode-on-top" className="flex items-start gap-3 rounded-lg border border-border/50 p-3 cursor-pointer">
                  <RadioGroupItem value="on_top" id="mode-on-top" className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-medium">Se cobra aparte.</span>{" "}
                    <span className="text-muted-foreground">El destino recibe el monto completo y al cliente se le debita el monto más la comisión.</span>
                  </span>
                </label>
                <label htmlFor="mode-deduct" className="flex items-start gap-3 rounded-lg border border-border/50 p-3 cursor-pointer">
                  <RadioGroupItem value="deduct" id="mode-deduct" className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-medium">Se descuenta del monto.</span>{" "}
                    <span className="text-muted-foreground">Al cliente se le debita el monto y el destino recibe el monto menos la comisión.</span>
                  </span>
                </label>
              </RadioGroup>
            ) : (
              <p className="text-sm text-muted-foreground">
                En el dinero que entra, la comisión siempre se descuenta de lo recibido.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-share">Parte de Magnate (%)</Label>
            <Input id="rule-share" inputMode="decimal" value={magnateShare} onChange={(e) => setMagnateShare(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              El resto va al distribuidor del CVU. Si el CVU no tiene distribuidor, todo va a Magnate.
            </p>
          </div>

          {rule?.accountId !== null && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3">
              <Label htmlFor="rule-active" className="cursor-pointer">
                Regla activa
                <span className="block text-xs font-normal text-muted-foreground">Si la desactivas, el CVU usa la regla por defecto.</span>
              </Label>
              <Switch id="rule-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          {valid && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">Ejemplo con {formatARS(EXAMPLE_AMOUNT)}</p>
              {fee === 0 ? (
                <p className="text-muted-foreground">Sin comisión.</p>
              ) : (
                <>
                  <p>
                    Comisión: <span className="tabular-nums">{formatARS(fee)}</span>
                    {isOutgoing && (
                      <span className="text-muted-foreground">
                        {effectiveMode === "on_top"
                          ? ` · se debitan ${formatARS(EXAMPLE_AMOUNT + fee)} y el destino recibe ${formatARS(EXAMPLE_AMOUNT)}`
                          : ` · se debitan ${formatARS(EXAMPLE_AMOUNT)} y el destino recibe ${formatARS(EXAMPLE_AMOUNT - fee)}`}
                      </span>
                    )}
                    {!isOutgoing && <span className="text-muted-foreground"> · el cliente recibe {formatARS(EXAMPLE_AMOUNT - fee)}</span>}
                  </p>
                  <p className="text-muted-foreground">
                    Magnate {formatARS(fee - distributorPart)} · Distribuidor {formatARS(distributorPart)}
                  </p>
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar regla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
