import { useState } from "react";
import { Header } from "@/presentation/components/admin/Header";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { CommissionDetailTable } from "@/presentation/components/admin/CommissionDetailTable";
import {
  AdjustmentsTable,
  NetworkEarningsTable,
  NetworkMembersTable,
  PeriodSummaryTable,
} from "@/presentation/components/admin/DistributorEarnings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import {
  useAdjustments,
  useCommissionDetail,
  useDistributorNetwork,
  useNetworkDetail,
  usePeriodSummary,
} from "@/presentation/hooks/useDistributors";
import { formatARS, getPeriod, PeriodKey } from "@/lib/format";

const MisComisiones = () => {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const period = getPeriod(periodKey);
  const { data: rows = [], isLoading } = useCommissionDetail(period);
  const { data: networkRows = [], isLoading: networkLoading } = useNetworkDetail(period);
  const { data: members = [], isLoading: membersLoading } = useDistributorNetwork();
  const { data: periods = [], isLoading: periodsLoading } = usePeriodSummary();
  const { data: adjustments = [], isLoading: adjustmentsLoading } = useAdjustments();
  const total = rows.reduce((sum, r) => sum + r.distributorAmount, 0);
  const networkTotal = networkRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="animate-fade-in">
      <Header title="Mis comisiones" subtitle="Lo que ganás por tus CVUs y por tu red" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm">
            Tu parte en el período: <span className="font-semibold tabular-nums">{formatARS(total)}</span>
            {networkTotal > 0 && (
              <>
                {" "}· De tu red: <span className="font-semibold tabular-nums">{formatARS(networkTotal)}</span>
              </>
            )}
          </p>
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        </div>
        <Tabs defaultValue="cvus" className="min-w-0">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="cvus">De tus CVUs</TabsTrigger>
            <TabsTrigger value="network">De tu red</TabsTrigger>
            <TabsTrigger value="periods">Por período</TabsTrigger>
            <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
          </TabsList>
          <TabsContent value="cvus" className="pt-4">
            <CommissionDetailTable rows={rows} isLoading={isLoading} exportName="mis_comisiones" />
          </TabsContent>
          <TabsContent value="network" className="pt-4 space-y-4">
            <NetworkEarningsTable rows={networkRows} isLoading={networkLoading} />
            <h3 className="font-display font-semibold text-foreground">Distribuidores que trajiste</h3>
            <NetworkMembersTable rows={members} isLoading={membersLoading} />
          </TabsContent>
          <TabsContent value="periods" className="pt-4">
            <PeriodSummaryTable rows={periods} isLoading={periodsLoading} />
          </TabsContent>
          <TabsContent value="adjustments" className="pt-4">
            <AdjustmentsTable rows={adjustments} isLoading={adjustmentsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MisComisiones;
