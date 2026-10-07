import { useState } from "react";
import { Header } from "@/presentation/components/admin/Header";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { AccountVolumeTable } from "@/presentation/components/admin/AccountVolumeTable";
import { useAccountVolume } from "@/presentation/hooks/useDistributors";
import { getPeriod, PeriodKey } from "@/lib/format";

const MisCvus = () => {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const { data: rows = [], isLoading } = useAccountVolume(getPeriod(periodKey));

  return (
    <div className="animate-fade-in">
      <Header title="Mis CVUs" subtitle="Volumen y comisiones de cada CVU asignado" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-end">
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        </div>
        <AccountVolumeTable rows={rows} isLoading={isLoading} exportName="mis_cvus" />
      </div>
    </div>
  );
};

export default MisCvus;
