import { useState } from "react";
import { Header } from "@/presentation/components/admin/Header";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { CommissionDetailTable } from "@/presentation/components/admin/CommissionDetailTable";
import { useCommissionDetail } from "@/presentation/hooks/useDistributors";
import { formatARS, getPeriod, PeriodKey } from "@/lib/format";

const MisComisiones = () => {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const { data: rows = [], isLoading } = useCommissionDetail(getPeriod(periodKey));
  const total = rows.reduce((sum, r) => sum + r.distributorAmount, 0);

  return (
    <div className="animate-fade-in">
      <Header title="Mis comisiones" subtitle="Cada comisión cobrada en tus CVUs y tu parte" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm">
            Tu parte en el período: <span className="font-semibold tabular-nums">{formatARS(total)}</span>
          </p>
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        </div>
        <CommissionDetailTable rows={rows} isLoading={isLoading} exportName="mis_comisiones" />
      </div>
    </div>
  );
};

export default MisComisiones;
