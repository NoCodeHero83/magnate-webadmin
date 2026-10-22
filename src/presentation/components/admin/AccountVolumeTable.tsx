import { useMemo, useState } from "react";
import { Download, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { AccountTypeBadge } from "@/presentation/components/admin/AccountTypeBadge";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { AccountVolume } from "@/core/entities/Distributor";
import { AccountType } from "@/core/entities/User";
import { downloadCSV, formatARS } from "@/lib/format";

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  blocked: "Bloqueada",
  suspended: "Suspendida",
  closed: "Cerrada",
};

interface AccountVolumeTableProps {
  rows: AccountVolume[];
  isLoading?: boolean;
  /** Columna "Distribuidor" (vista del admin con todos los distribuidores) */
  showDistributor?: boolean;
  /** Nombre del archivo CSV, sin extensión */
  exportName: string;
}

/** Volumen y comisiones por CVU, con búsqueda, totales y exportación a CSV */
export function AccountVolumeTable({ rows, isLoading, showDistributor, exportName }: AccountVolumeTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.holderName, r.alias, r.cvu, r.distributorName].some((v) => v?.toLowerCase().includes(term))
    );
  }, [rows, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          volumeIn: acc.volumeIn + r.volumeIn,
          volumeOut: acc.volumeOut + r.volumeOut,
          operations: acc.operations + r.operations,
          feeTotal: acc.feeTotal + r.feeTotal,
          distributorAmount: acc.distributorAmount + r.distributorAmount,
        }),
        { volumeIn: 0, volumeOut: 0, operations: 0, feeTotal: 0, distributorAmount: 0 }
      ),
    [filtered]
  );

  const handleExport = () => {
    const headers = [
      ...(showDistributor ? ["Distribuidor"] : []),
      "Titular", "Tipo", "Alias", "CVU", "Estado de la cuenta",
      "Entradas", "Salidas", "Volumen total", "Operaciones", "Comisiones cobradas", "Comisión del distribuidor",
    ];
    const data = filtered.map((r) => [
      ...(showDistributor ? [r.distributorName] : []),
      r.holderName,
      r.accountType === "business" ? "Persona Jurídica" : "Persona Física",
      r.alias,
      r.cvu,
      ACCOUNT_STATUS_LABELS[r.accountStatus] ?? r.accountStatus,
      r.volumeIn.toFixed(2),
      r.volumeOut.toFixed(2),
      (r.volumeIn + r.volumeOut).toFixed(2),
      r.operations,
      r.feeTotal.toFixed(2),
      r.distributorAmount.toFixed(2),
    ]);
    downloadCSV(`${exportName}_${new Date().toISOString().split("T")[0]}.csv`, headers, data);
    toast.success("CSV exportado");
  };

  const columns = [
    ...(showDistributor
      ? [{ key: "distributorName", header: "Distribuidor", className: "hidden md:table-cell" }]
      : []),
    {
      key: "holder",
      header: "Titular",
      render: (r: AccountVolume) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{r.holderName}</p>
          <p className="text-xs text-muted-foreground truncate font-mono">{r.alias}</p>
        </div>
      ),
    },
    {
      key: "accountType",
      header: "Tipo",
      className: "hidden lg:table-cell",
      render: (r: AccountVolume) => <AccountTypeBadge type={r.accountType as AccountType} />,
    },
    { key: "cvu", header: "CVU", className: "hidden xl:table-cell font-mono text-xs" },
    {
      key: "volumeIn",
      header: "Entradas",
      className: "text-right tabular-nums",
      render: (r: AccountVolume) => formatARS(r.volumeIn),
    },
    {
      key: "volumeOut",
      header: "Salidas",
      className: "text-right tabular-nums",
      render: (r: AccountVolume) => formatARS(r.volumeOut),
    },
    {
      key: "operations",
      header: "Ops.",
      className: "hidden sm:table-cell text-right tabular-nums",
    },
    {
      key: "distributorAmount",
      header: "Comisión distribuidor",
      className: "text-right tabular-nums font-semibold",
      render: (r: AccountVolume) => formatARS(r.distributorAmount),
    },
    {
      key: "status",
      header: "Cuenta",
      className: "hidden md:table-cell",
      render: (r: AccountVolume) => (
        <span className={r.accountStatus === "active" ? "text-success text-sm" : "text-warning text-sm"}>
          {ACCOUNT_STATUS_LABELS[r.accountStatus] ?? r.accountStatus}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por titular, alias o CVU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="premium-card p-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="premium-card p-10 text-center text-muted-foreground">
          {rows.length === 0 ? "Todavía no hay CVUs asignados." : "Ningún CVU coincide con la búsqueda."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filtered} />
          </div>
          <div className="premium-card p-4 grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">CVUs</p>
              <p className="font-semibold tabular-nums">{filtered.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Volumen total</p>
              <p className="font-semibold tabular-nums">{formatARS(totals.volumeIn + totals.volumeOut)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Comisiones cobradas</p>
              <p className="font-semibold tabular-nums">{formatARS(totals.feeTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Parte del distribuidor</p>
              <p className="font-semibold tabular-nums text-success">{formatARS(totals.distributorAmount)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
