import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/presentation/components/admin/Header";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { StatusBadge } from "@/presentation/components/admin/StatusBadge";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { useTransactions } from "@/presentation/hooks/useTransactions";
import { PaginatedResult } from "@/core/types/pagination";
import { Transaction } from "@/core/entities/Transaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/presentation/components/ui/pagination";
import { Search, Download, ArrowUpRight, Coins, ArrowDownLeft } from "lucide-react";
import * as XLSX from "xlsx";

const Transacciones = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: result, isLoading, isFetching } = useTransactions({
    search: debouncedSearch,
    status: statusFilter,
    page,
    pageSize,
    filterDoubleEntry: true
  });

  const paginatedData = result as PaginatedResult<Transaction>;
  const transactions = paginatedData?.data || [];
  const totalItems = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 0;

  // Para exportar usamos la página actual ya filtrada
  const handleExportToExcel = (data: Transaction[], fileNameSuffix: string) => {
    if (!data || data.length === 0) {
      alert("No hay transacciones para exportar");
      return;
    }

    const excelData = data.map((tx) => ({
      ID: tx.referenceNumber || tx.id.substring(0, 8),
      Usuario: tx.fromUserName || "Externo",
      Tipo: tx.isCommission ? (tx.metadata?.split ? "Reparto comisión" : "Comisión") : tx.isIncoming ? "Ingreso" : "Egreso",
      Origen: tx.fromUserName || "Externo",
      Destino: tx.toUserName || "Externo",
      Monto: parseFloat(tx.amount),
      Comisión: tx.commissionAmount ? parseFloat(tx.commissionAmount) : 0,
      "Monto Neto": tx.netAmount ? parseFloat(tx.netAmount) : parseFloat(tx.amount),
      Método: tx.paymentMethod || "-",
      Estado: tx.status,
      Fecha: new Date(tx.createdAt).toLocaleString("es-AR"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");

    const columnWidths = [
      { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 25 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
    ];
    worksheet["!cols"] = columnWidths;

    const fileName = `transacciones_${fileNameSuffix}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const [isExportingAll, setIsExportingAll] = useState(false);

  // Para exportar necesitamos todos los datos.
  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      const { SupabaseTransactionRepository } = await import("@/infrastructure/supabase/SupabaseTransactionRepository");
      const repo = new SupabaseTransactionRepository();
      const allData = await repo.getAll({
        search: debouncedSearch,
        status: statusFilter,
        filterDoubleEntry: true
      });

      const dataToExport = Array.isArray(allData) ? allData : allData.data;
      handleExportToExcel(dataToExport, "todas");
    } catch (error) {
      console.error("Error exporting all transactions:", error);
      alert("Error al exportar todas las transacciones");
    } finally {
      setIsExportingAll(false);
    }
  };
  // ... rest of the component (already correct from lines 93+)


  const columns = [
    {
      key: "id",
      header: "ID",
      className: "font-mono text-xs",
      render: (item: Transaction) => item.referenceNumber || item.id.substring(0, 8)
    },
    {
      key: "user",
      header: "Usuario",
      render: (item: Transaction) => {
        const userName = item.fromUserName || "Externo";
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
          </div>
        );
      }
    },
    {
      key: "type",
      header: "Tipo",
      render: (item: Transaction) => {
        const Icon = item.isCommission ? Coins : item.isIncoming ? ArrowDownLeft : ArrowUpRight;
        const color = item.isCommission ? "text-warning" : item.isIncoming ? "text-success" : "text-destructive";
        const bg = item.isCommission ? "bg-warning/10" : item.isIncoming ? "bg-success/10" : "bg-destructive/10";
        const label = item.isCommission
          ? item.metadata?.split ? "Reparto comisión" : "Comisión"
          : item.isIncoming ? "Ingreso" : "Egreso";

        return (
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${bg} ${color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {item.isIncoming
                  ? `De: ${item.fromUserName || "Externo"}`
                  : `A: ${item.toUserName || "Externo"}`
                }
              </p>
            </div>
          </div>
        );
      }
    },
    {
      key: "amount",
      header: "Monto",
      className: "font-semibold",
      render: (item: Transaction) => `$${parseFloat(item.amount).toFixed(2)}`
    },
    {
      key: "commission",
      header: "Comisión",
      className: "hidden md:table-cell",
      render: (item: Transaction) => {
        const commission = item.commissionAmount ? parseFloat(item.commissionAmount) : 0;
        return `$${commission.toFixed(2)}`;
      }
    },
    {
      key: "method",
      header: "Método",
      className: "hidden lg:table-cell",
      render: (item: Transaction) => item.paymentMethod || "-"
    },
    {
      key: "status",
      header: "Estado",
      render: (item: Transaction) => <StatusBadge status={item.status as any} />
    },
    {
      key: "date",
      header: "Fecha",
      render: (item: Transaction) => new Date(item.createdAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    },
  ];


  return (
    <div className="animate-fade-in relative">
      {/* Subtle top loading bar if fetching in background */}
      {(isFetching && !isLoading) && (
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-progress-bar w-1/3" />
        </div>
      )}
      <Header
        title="Transacciones"
        subtitle="Historial completo de transacciones"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por referencia, ID de usuario, email, etc."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(0); }}>
              <SelectTrigger className="w-40 bg-card border-border/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="processing">Procesando</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 border-border/50"
              onClick={() => handleExportToExcel(transactions, "pagina")}
              disabled={isLoading || transactions.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar página
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-border/50"
              onClick={handleExportAll}
              disabled={isLoading || isExportingAll}
            >
              <Download className="h-4 w-4" />
              {isExportingAll ? "Exportando..." : "Exportar todo"}
            </Button>
          </div>
        </div>

        {/* Table and Pagination */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>Mostrando {transactions.length} de {totalItems} transacciones</span>
            {totalPages > 0 && <span>Página {page + 1} de {totalPages}</span>}
          </div>
          <div className="overflow-x-auto relative">
            {isLoading ? (
              <div className="premium-card p-12 text-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground animate-pulse">Buscando transacciones...</p>
              </div>
            ) : (
              <>
                <div className={cn("transition-opacity duration-200", isFetching ? "opacity-50 pointer-events-none" : "opacity-100")}>
                  <DataTable columns={columns} data={transactions} />
                </div>
                {isFetching && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/5 rounded-lg">
                    <div className="bg-background/80 px-4 py-2 rounded-full border border-border/50 shadow-lg flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      <span className="text-xs font-medium">Actualizando...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (page > 0) setPage(page - 1); }}
                    className={page === 0 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={page === i}
                          onClick={(e) => { e.preventDefault(); setPage(i); }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  if (i === 1 && page > 2) return <PaginationItem key="ellipsis-1"><PaginationEllipsis /></PaginationItem>;
                  if (i === totalPages - 2 && page < totalPages - 3) return <PaginationItem key="ellipsis-2"><PaginationEllipsis /></PaginationItem>;
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (page < totalPages - 1) setPage(page + 1); }}
                    className={page === totalPages - 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transacciones;
