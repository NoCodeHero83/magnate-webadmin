import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Header } from "@/presentation/components/admin/Header";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { MovementsTable } from "@/presentation/components/admin/MovementsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { useAccountVolume } from "@/presentation/hooks/useDistributors";
import { useMovements } from "@/presentation/hooks/useWithdrawals";
import { formatARS, getPeriod, PeriodKey } from "@/lib/format";

type DirectionFilter = "all" | "in" | "out";

/** Depósitos, retiros y transferencias de los CVUs del distribuidor */
const MisMovimientos = () => {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const [accountId, setAccountId] = useState("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const period = getPeriod(periodKey);
  // Los CVUs para el filtro (la lista de volumen trae todos los asignados)
  const { data: accounts = [] } = useAccountVolume(period);
  const { data: movements = [], isLoading } = useMovements(period, null, accountId === "all" ? null : accountId);

  const rows = direction === "all" ? movements : movements.filter((m) => m.direction === direction);
  const completed = movements.filter((m) => m.status === "completed");
  const totalIn = completed.filter((m) => m.direction === "in").reduce((s, m) => s + m.amount, 0);
  const totalOut = completed.filter((m) => m.direction === "out").reduce((s, m) => s + m.amount, 0);

  return (
    <div className="animate-fade-in">
      <Header title="Movimientos" subtitle="Depósitos, retiros y transferencias de tus CVUs" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4 text-success" />
              Entradas: <span className="font-semibold tabular-nums">{formatARS(totalIn)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-info" />
              Salidas: <span className="font-semibold tabular-nums">{formatARS(totalOut)}</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full sm:w-56 bg-card border-border/50">
                <SelectValue placeholder="CVU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los CVUs</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.accountId} value={a.accountId}>
                    {a.holderName} · {a.alias}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={direction} onValueChange={(v) => setDirection(v as DirectionFilter)}>
              <SelectTrigger className="w-full sm:w-40 bg-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entradas y salidas</SelectItem>
                <SelectItem value="in">Solo entradas</SelectItem>
                <SelectItem value="out">Solo salidas</SelectItem>
              </SelectContent>
            </Select>
            <PeriodSelect value={periodKey} onChange={setPeriodKey} />
          </div>
        </div>

        <MovementsTable rows={rows} isLoading={isLoading} exportName="mis_movimientos" />
      </div>
    </div>
  );
};

export default MisMovimientos;
