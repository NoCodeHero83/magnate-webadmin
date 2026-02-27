import { Header } from "@/presentation/components/admin/Header";
import { StatsCard } from "@/presentation/components/admin/StatsCard";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { StatusBadge } from "@/presentation/components/admin/StatusBadge";
import { useDashboardStats, useTransactions } from "@/presentation/hooks/useTransactions";
import { useUserStats } from "@/presentation/hooks/useUsers";
import {
  Users,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  UserX,
} from "lucide-react";

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: userStats, isLoading: userStatsLoading } = useUserStats();
  const { data: result, isLoading: transactionsLoading } = useTransactions({
    page: 0,
    pageSize: 5,
    filterDoubleEntry: true,
  });

  const transactions = Array.isArray(result) ? result : result?.data || [];

  const recentTransactions = transactions.map((tx) => ({
    id: tx.referenceNumber || tx.id.substring(0, 8),
    user: tx.isIncoming
      ? tx.fromUserName || "Externo"
      : tx.toUserName || "Externo",
    type: tx.isIncoming ? "Ingreso" : "Egreso",
    amount: `$${parseFloat(tx.amount).toFixed(2)}`,
    status: tx.status,
    date: new Date(tx.createdAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const transactionColumns = [
    { key: "id", header: "Referencia" },
    { key: "user", header: "Usuario" },
    { key: "type", header: "Tipo" },
    { key: "amount", header: "Monto", className: "font-semibold" },
    {
      key: "status",
      header: "Estado",
      render: (item: (typeof recentTransactions)[0]) => (
        <StatusBadge status={item.status as any} />
      ),
    },
    { key: "date", header: "Fecha" },
  ];

  if (statsLoading || transactionsLoading || userStatsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Bienvenido al panel de administración de Magnate"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Fila 1 — Cards financieras */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Saldo Cuenta Recaudadora"
            value="$0"
            change="Transacciones completadas"
            changeType="positive"
            icon={DollarSign}
            iconColor="from-info to-info"
          />
          <StatsCard
            title="Volumen Total HOY"
            value="$0"
            change="Transacciones completadas"
            changeType="positive"
            icon={DollarSign}
            iconColor="from-info to-info"
          />
          <StatsCard
            title="Cantidad Transacciones HOY"
            value={stats?.pendingTransactions.toString() || "0"}
            change="Requieren atención"
            changeType="negative"
            icon={ArrowRightLeft}
            iconColor="from-info to-info"
          />
        </div>

        {/* Fila 2 — Cards de usuarios */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Usuarios Totales"
            value={(userStats?.total || 0).toString()}
            change={`${userStats?.active || 0} activos`}
            changeType="positive"
            icon={Users}
            iconColor="from-primary to-primary-light"
          />
          <StatsCard
            title="Usuarios Activos"
            value={(userStats?.active || 0).toString()}
            change="Activos"
            changeType="neutral"
            icon={TrendingUp}
            iconColor="from-success/80 to-success"
          />
          <StatsCard
            title="Usuarios Suspendidos"
            value={(userStats?.suspended || 0).toString()}
            change="En la plataforma"
            changeType="neutral"
            icon={UserX}
            iconColor="from-warning/80 to-warning"
          />
        </div>

        {/* Transacciones Recientes */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Transacciones Recientes
            </h2>
            <a
              href="/transacciones"
              className="text-sm font-medium text-accent hover:underline"
            >
              Ver todas
            </a>
          </div>
          <DataTable columns={transactionColumns} data={recentTransactions} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
