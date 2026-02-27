import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/presentation/components/admin/Header";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { StatusBadge } from "@/presentation/components/admin/StatusBadge";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { useUsers, useUserStats, useAccountLimits, useUpdateAccountLimits } from "@/presentation/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@/core/entities/User";
import { PaginatedResult } from "@/core/types/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/presentation/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/presentation/components/ui/pagination";
import { Label } from "@/presentation/components/ui/label";
import { Search, Filter, MoreHorizontal, Eye, SlidersHorizontal, Download } from "lucide-react";
import { toast } from "sonner";

const Usuarios = () => {
  const queryClient = useQueryClient();
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

  const { data: result, isLoading, isFetching } = useUsers({
    search: debouncedSearch,
    status: statusFilter,
    page,
    pageSize,
  });

  const { data: stats } = useUserStats();

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Limit form state
  const [limitMonthly, setLimitMonthly] = useState("");

  const { data: accountLimits, isLoading: limitsLoading } = useAccountLimits(
    limitsDialogOpen ? selectedUser?.id ?? null : null
  );
  const updateLimitsMutation = useUpdateAccountLimits();

  useEffect(() => {
    if (accountLimits) {
      setLimitMonthly(accountLimits.monthlyLimit?.toString() ?? "");
    }
  }, [accountLimits]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleOpenLimits = (user: User) => {
    setSelectedUser(user);
    setLimitMonthly("");
    setLimitsDialogOpen(true);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const { SupabaseUserRepository } = await import(
        "@/infrastructure/supabase/SupabaseUserRepository"
      );
      const userRepo = new SupabaseUserRepository();
      const newStatus =
        selectedUser.verificationStatus === "suspended"
          ? "verified"
          : "suspended";
      await userRepo.updateStatus(selectedUser.id, newStatus);
      // Invalidate queries instead of reloading page (fix white screen bug)
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuspendDialogOpen(false);
      toast.success(
        newStatus === "suspended"
          ? "Usuario suspendido correctamente"
          : "Suspensión eliminada correctamente"
      );
    } catch (error) {
      console.error("Error toggling user suspension:", error);
      toast.error("Error al procesar la solicitud");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!accountLimits?.accountId) return;
    try {
      await updateLimitsMutation.mutateAsync({
        accountId: accountLimits.accountId,
        limits: {
          monthlyLimit: limitMonthly ? parseFloat(limitMonthly) : undefined,
        },
      });
      setLimitsDialogOpen(false);
      toast.success("Límites operacionales actualizados");
    } catch (e) {
      toast.error("Error al guardar los límites");
    }
  };

  // ── CSV export ─────────────────────────────────────────────────────────────

  const handleExportCSV = async () => {
    try {
      const { SupabaseUserRepository } = await import(
        "@/infrastructure/supabase/SupabaseUserRepository"
      );
      const userRepo = new SupabaseUserRepository();
      const allData = await userRepo.getAll({
        search: debouncedSearch,
        status: statusFilter,
      });
      const allUsers = Array.isArray(allData) ? allData : (allData as any).data || [];

      const headers = [
        "ID",
        "Nombre",
        "Apellido",
        "Email",
        "Teléfono",
        "DNI",
        "Estado",
        "Fecha Registro",
      ];
      const rows = allUsers.map((u: User) => [
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.dni,
        u.verificationStatus,
        new Date(u.createdAt).toLocaleDateString("es-AR"),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `usuarios_${statusFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado correctamente");
    } catch {
      toast.error("Error al exportar CSV");
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = [
    { key: "id", header: "ID", className: "font-mono text-xs" },
    {
      key: "name",
      header: "Usuario",
      render: (item: User) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{`${item.firstName} ${item.lastName}`}</p>
          <p className="text-xs text-muted-foreground truncate">{item.email}</p>
        </div>
      ),
    },
    { key: "phone", header: "Teléfono", className: "hidden md:table-cell" },
    { key: "dni", header: "DNI", className: "hidden lg:table-cell" },
    {
      key: "verified",
      header: "Verificado",
      className: "hidden sm:table-cell",
      render: (_item: User) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="h-2 w-2 rounded-full bg-success" />
          Sí
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (item: User) => (
        <StatusBadge status={item.verificationStatus as any} />
      ),
    },
    {
      key: "createdAt",
      header: "Registro",
      className: "hidden lg:table-cell",
      render: (item: User) =>
        new Date(item.createdAt).toLocaleDateString("es-AR"),
    },
    {
      key: "actions",
      header: "",
      render: (item: User) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card">
            <DropdownMenuItem
              className="gap-2"
              onClick={() => handleViewDetails(item)}
            >
              <Eye className="h-4 w-4" /> Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => handleOpenLimits(item)}
            >
              <SlidersHorizontal className="h-4 w-4" /> Límite operacional
            </DropdownMenuItem>
            <DropdownMenuItem
              className={`gap-2 ${item.verificationStatus === "suspended"
                  ? "text-success"
                  : "text-warning"
                }`}
              onClick={() => {
                setSelectedUser(item);
                setSuspendDialogOpen(true);
              }}
            >
              {item.verificationStatus === "suspended" ? (
                <>
                  <span className="h-4 w-4">▶</span> Quitar suspensión
                </>
              ) : (
                <>
                  <span className="h-4 w-4">⏸</span> Suspender
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const paginatedData = result as PaginatedResult<User>;
  const users = paginatedData?.data || [];
  const totalItems = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in relative">
      {isFetching && !isLoading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-progress-bar w-1/3" />
        </div>
      )}
      <Header
        title="Usuarios"
        subtitle="Gestiona todos los usuarios de la plataforma"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, dni, id, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border/50"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-40 bg-card border-border/50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="suspended">Suspendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="premium-card p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-foreground">
              {stats?.total || 0}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Total Usuarios
            </p>
          </div>
          <div className="premium-card p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-success">
              {stats?.active || 0}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Usuarios activos
            </p>
          </div>
          <div className="premium-card p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-warning">
              {stats?.suspended || 0}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Usuarios Suspendidos
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              Mostrando {users.length} de {totalItems} usuarios
            </span>
            {totalPages > 0 && (
              <span>
                Página {page + 1} de {totalPages}
              </span>
            )}
          </div>
          <div className="overflow-x-auto relative">
            {isLoading ? (
              <div className="premium-card p-12 text-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground animate-pulse">
                  Buscando usuarios...
                </p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "transition-opacity duration-200",
                    isFetching
                      ? "opacity-50 pointer-events-none"
                      : "opacity-100"
                  )}
                >
                  <DataTable columns={columns} data={users} />
                </div>
                {isFetching && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/5 rounded-lg">
                    <div className="bg-background/80 px-4 py-2 rounded-full border border-border/50 shadow-lg flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      <span className="text-xs font-medium">
                        Actualizando...
                      </span>
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
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 0) setPage(page - 1);
                    }}
                    className={
                      page === 0 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  if (
                    i === 0 ||
                    i === totalPages - 1 ||
                    (i >= page - 1 && i <= page + 1)
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={page === i}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(i);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  if (i === 1 && page > 2)
                    return (
                      <PaginationItem key="ellipsis-1">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  if (i === totalPages - 2 && page < totalPages - 3)
                    return (
                      <PaginationItem key="ellipsis-2">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages - 1) setPage(page + 1);
                    }}
                    className={
                      page === totalPages - 1
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* ── View Details Dialog ─────────────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
            <DialogDescription>Información completa del usuario</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">ID</Label>
                  <p className="font-mono text-sm">
                    {selectedUser.id.substring(0, 8)}...
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Estado
                  </Label>
                  <StatusBadge status={selectedUser.verificationStatus as any} />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Nombre</Label>
                <p className="font-medium">{`${selectedUser.firstName} ${selectedUser.lastName}`}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Teléfono
                </Label>
                <p>{selectedUser.phone}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">DNI</Label>
                <p>{selectedUser.dni}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Rol</Label>
                  <p className="font-semibold text-lg capitalize">
                    {selectedUser.role}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Verificado
                  </Label>
                  <p className="text-success">Sí</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Fecha de Registro
                </Label>
                <p>{new Date(selectedUser.createdAt).toLocaleString("es-AR")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Suspend Dialog ─────────────────────────────────────────────── */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.verificationStatus === "suspended"
                ? "Quitar Suspensión"
                : "Suspender Usuario"}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p>
                {selectedUser.verificationStatus === "suspended"
                  ? `¿Estás seguro de que deseas quitar la suspensión al usuario ${selectedUser.firstName} ${selectedUser.lastName}?`
                  : `¿Estás seguro de que deseas suspender al usuario ${selectedUser.firstName} ${selectedUser.lastName}?`}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedUser.verificationStatus === "suspended"
                  ? "El usuario podrá acceder nuevamente al sistema."
                  : "El usuario no podrá acceder al sistema mientras esté suspendido."}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSuspendDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                <Button
                  variant={
                    selectedUser.verificationStatus === "suspended"
                      ? "default"
                      : "destructive"
                  }
                  onClick={handleSuspendUser}
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? "Procesando..."
                    : selectedUser.verificationStatus === "suspended"
                      ? "Quitar suspensión"
                      : "Suspender"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Límite Operacional Dialog ───────────────────────────────────── */}
      <Dialog open={limitsDialogOpen} onOpenChange={setLimitsDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Límite Operacional</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? `Configura los límites de ${selectedUser.firstName} ${selectedUser.lastName}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {limitsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !accountLimits ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontró cuenta principal para este usuario.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                <p className="text-muted-foreground">
                  Gastado este mes:{" "}
                  <span className="font-semibold text-foreground">
                    ${accountLimits.monthlySpent.toLocaleString("es-AR")}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Disponible:{" "}
                  <span className="font-semibold text-success">
                    ${accountLimits.monthlyAvailable.toLocaleString("es-AR")}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly-limit">Límite mensual ($)</Label>
                <Input
                  id="monthly-limit"
                  type="number"
                  placeholder="Ej: 800000"
                  value={limitMonthly}
                  onChange={(e) => setLimitMonthly(e.target.value)}
                  className="bg-card border-border/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setLimitsDialogOpen(false)}
                  disabled={updateLimitsMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveLimits}
                  disabled={updateLimitsMutation.isPending}
                >
                  {updateLimitsMutation.isPending
                    ? "Guardando..."
                    : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
