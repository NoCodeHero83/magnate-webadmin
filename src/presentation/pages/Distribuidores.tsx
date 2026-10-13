import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserPlus,
  BarChart3,
  Power,
  Loader2,
  Handshake,
} from "lucide-react";
import { Header } from "@/presentation/components/admin/Header";
import { DataTable } from "@/presentation/components/admin/DataTable";
import { PeriodSelect } from "@/presentation/components/admin/PeriodSelect";
import { AccountVolumeTable } from "@/presentation/components/admin/AccountVolumeTable";
import { CommissionDetailTable } from "@/presentation/components/admin/CommissionDetailTable";
import { MovementsTable } from "@/presentation/components/admin/MovementsTable";
import { WithdrawalsTable } from "@/presentation/components/admin/WithdrawalsTable";
import { useMovements, useWithdrawals } from "@/presentation/hooks/useWithdrawals";
import { PasswordRevealDialog } from "@/presentation/components/admin/PasswordRevealDialog";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/presentation/components/ui/dropdown-menu";
import {
  useDistributors,
  useSaveDistributor,
  useDistributorAccess,
  useAccountVolume,
  useCommissionDetail,
} from "@/presentation/hooks/useDistributors";
import { Distributor } from "@/core/entities/Distributor";
import { formatARS, getPeriod, PeriodKey } from "@/lib/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatCuit = (cuit?: string) =>
  cuit && cuit.length === 11 ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit || "—";

// ── Alta / edición ──────────────────────────────────────────────────────────

function DistributorFormDialog({
  distributor,
  open,
  onOpenChange,
}: {
  distributor: Distributor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveDistributor();
  const [name, setName] = useState("");
  const [cuit, setCuit] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  // Cargar los datos al abrir
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? distributor?.id ?? "new" : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setName(distributor?.name ?? "");
    setCuit(distributor?.cuit ?? "");
    setEmail(distributor?.contactEmail ?? "");
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cuitDigits = cuit.replace(/\D/g, "");
    if (name.trim().length < 2) return setError("Ingresa el nombre del distribuidor.");
    if (cuitDigits && cuitDigits.length !== 11) return setError("El CUIT debe tener 11 dígitos.");
    if (email.trim() && !EMAIL_RE.test(email.trim())) return setError("El email de contacto no es válido.");
    setError("");
    try {
      await save.mutateAsync({
        id: distributor?.id,
        name: name.trim(),
        cuit: cuitDigits,
        contactEmail: email.trim(),
        status: distributor?.status ?? "active",
      });
      toast.success(distributor ? "Distribuidor actualizado" : "Distribuidor creado");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{distributor ? "Editar distribuidor" : "Nuevo distribuidor"}</DialogTitle>
          <DialogDescription>
            {distributor
              ? "Los cambios no afectan las comisiones ya cobradas."
              : "Al crearlo se abre su cuenta de comisiones. Después puedes darle acceso al panel y asignarle CVUs desde Usuarios."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dist-name">Nombre o razón social</Label>
            <Input id="dist-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dist-cuit">CUIT (opcional)</Label>
            <Input
              id="dist-cuit"
              inputMode="numeric"
              placeholder="30-12345678-9"
              value={cuit}
              onChange={(e) => setCuit(e.target.value.replace(/[^\d-]/g, "").slice(0, 13))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dist-email">Email de contacto (opcional)</Label>
            <Input id="dist-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {distributor ? "Guardar" : "Crear distribuidor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Acceso al panel ─────────────────────────────────────────────────────────

function AccessDialog({
  distributor,
  open,
  onOpenChange,
  onCreated,
}: {
  distributor: Distributor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (email: string, password: string) => void;
}) {
  const { create } = useDistributorAccess();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? distributor?.id ?? null : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setEmail(distributor?.contactEmail ?? "");
    setFirstName("");
    setLastName("");
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributor) return;
    if (!EMAIL_RE.test(email.trim())) return setError("Ingresa un email válido.");
    if (!firstName.trim()) return setError("Ingresa el nombre de la persona que va a entrar.");
    setError("");
    try {
      const password = await create.mutateAsync({
        distributorId: distributor.id,
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      onOpenChange(false);
      onCreated(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el acceso");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dar acceso al panel</DialogTitle>
          <DialogDescription>
            {distributor?.name} va a entrar a este panel con este email y verá solo sus CVUs, el volumen y sus comisiones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-email">Email de acceso</Label>
            <Input id="access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground">No puede ser el email de una cuenta de la billetera.</p>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="access-first">Nombre</Label>
              <Input id="access-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-last">Apellido</Label>
              <Input id="access-last" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear acceso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Reporte de un distribuidor ──────────────────────────────────────────────

function DistributorReportDialog({
  distributor,
  open,
  onOpenChange,
}: {
  distributor: Distributor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const period = getPeriod(periodKey);
  const enabled = open && !!distributor;
  const { data: volume = [], isLoading: volumeLoading } = useAccountVolume(period, distributor?.id, enabled);
  const { data: detail = [], isLoading: detailLoading } = useCommissionDetail(period, distributor?.id, enabled);
  const { data: movements = [], isLoading: movementsLoading } = useMovements(period, distributor?.id, null, enabled);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals(null, distributor?.id, enabled);
  const slug = distributor?.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "distribuidor";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{distributor?.name}</DialogTitle>
          <DialogDescription>
            {distributor?.accountsCount ?? 0} CVUs asignados · Comisiones acumuladas: {formatARS(distributor?.commissionBalance)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        </div>
        <Tabs defaultValue="cvus">
          <TabsList>
            <TabsTrigger value="cvus">CVUs y volumen</TabsTrigger>
            <TabsTrigger value="commissions">Comisiones</TabsTrigger>
            <TabsTrigger value="movements">Movimientos</TabsTrigger>
            <TabsTrigger value="withdrawals">Retiros</TabsTrigger>
          </TabsList>
          <TabsContent value="cvus" className="pt-4">
            <AccountVolumeTable rows={volume} isLoading={volumeLoading} exportName={`cvus_${slug}`} />
          </TabsContent>
          <TabsContent value="commissions" className="pt-4">
            <CommissionDetailTable rows={detail} isLoading={detailLoading} adminView exportName={`comisiones_${slug}`} />
          </TabsContent>
          <TabsContent value="movements" className="pt-4">
            <MovementsTable rows={movements} isLoading={movementsLoading} exportName={`movimientos_${slug}`} />
          </TabsContent>
          <TabsContent value="withdrawals" className="pt-4">
            {/* Todos los retiros del distribuidor (no depende del período) */}
            <WithdrawalsTable rows={withdrawals} isLoading={withdrawalsLoading} exportName={`retiros_${slug}`} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

const Distribuidores = () => {
  const { data: distributors = [], isLoading } = useDistributors();
  const save = useSaveDistributor();
  const { resetPassword } = useDistributorAccess();

  const [selected, setSelected] = useState<Distributor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [revealed, setRevealed] = useState<{ email?: string; password: string } | null>(null);

  const open = (setter: (v: boolean) => void, distributor: Distributor | null) => {
    setSelected(distributor);
    setter(true);
  };

  const handleToggleStatus = async (d: Distributor) => {
    try {
      await save.mutateAsync({
        id: d.id,
        name: d.name,
        cuit: d.cuit,
        contactEmail: d.contactEmail,
        status: d.status === "active" ? "inactive" : "active",
      });
      toast.success(
        d.status === "active"
          ? "Distribuidor desactivado: sus CVUs siguen asignados, pero las comisiones nuevas van completas a Magnate"
          : "Distribuidor activado: vuelve a recibir su parte de las comisiones nuevas"
      );
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cambiar el estado");
    }
  };

  const handleResetPassword = async (d: Distributor) => {
    try {
      const password = await resetPassword.mutateAsync(d.id);
      setRevealed({ email: d.loginEmail, password });
    } catch (err: any) {
      toast.error(err?.message || "No se pudo generar la contraseña");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Distribuidor",
      render: (d: Distributor) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{d.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{formatCuit(d.cuit)}</p>
        </div>
      ),
    },
    {
      key: "access",
      header: "Acceso al panel",
      className: "hidden md:table-cell",
      render: (d: Distributor) =>
        d.loginEmail ? (
          <span className="text-sm">{d.loginEmail}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin acceso</span>
        ),
    },
    {
      key: "accountsCount",
      header: "CVUs",
      className: "text-right tabular-nums",
      render: (d: Distributor) => (
        <Link
          to={`/usuarios?distribuidor=${d.id}`}
          className="text-primary hover:underline"
          title="Ver sus CVUs en Usuarios"
        >
          {d.accountsCount}
        </Link>
      ),
    },
    {
      key: "commissionBalance",
      header: "Comisiones acumuladas",
      className: "hidden sm:table-cell text-right tabular-nums",
      render: (d: Distributor) => formatARS(d.commissionBalance),
    },
    {
      key: "status",
      header: "Estado",
      render: (d: Distributor) => (
        <span
          className={
            d.status === "active"
              ? "rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success"
              : "rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {d.status === "active" ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (d: Distributor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones de ${d.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card">
            <DropdownMenuItem className="gap-2" onClick={() => open(setReportOpen, d)}>
              <BarChart3 className="h-4 w-4" /> Ver CVUs y comisiones
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => open(setFormOpen, d)}>
              <Pencil className="h-4 w-4" /> Editar datos
            </DropdownMenuItem>
            {d.userId ? (
              <DropdownMenuItem className="gap-2" onClick={() => handleResetPassword(d)}>
                <KeyRound className="h-4 w-4" /> Nueva contraseña
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="gap-2" onClick={() => open(setAccessOpen, d)}>
                <UserPlus className="h-4 w-4" /> Dar acceso al panel
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={d.status === "active" ? "gap-2 text-warning" : "gap-2 text-success"}
              onClick={() => handleToggleStatus(d)}
            >
              <Power className="h-4 w-4" /> {d.status === "active" ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header title="Distribuidores" subtitle="Administradores que gestionan CVUs y comparten comisiones" />

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Los CVUs se asignan desde <Link to="/usuarios" className="text-primary hover:underline">Usuarios</Link>.
            El reparto de cada comisión entre Magnate y el distribuidor se configura en{" "}
            <Link to="/comisiones" className="text-primary hover:underline">Comisiones</Link>.
          </p>
          <Button className="gap-2 shrink-0" onClick={() => open(setFormOpen, null)}>
            <Plus className="h-4 w-4" />
            Nuevo distribuidor
          </Button>
        </div>

        {isLoading ? (
          <div className="premium-card p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : distributors.length === 0 ? (
          <div className="premium-card p-10 text-center space-y-3">
            <Handshake className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">Todavía no hay distribuidores</p>
            <p className="text-sm text-muted-foreground">Crea el primero para empezar a asignarle CVUs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={distributors} />
          </div>
        )}
      </div>

      <DistributorFormDialog distributor={selected} open={formOpen} onOpenChange={setFormOpen} />
      <AccessDialog
        distributor={selected}
        open={accessOpen}
        onOpenChange={setAccessOpen}
        onCreated={(email, password) => setRevealed({ email, password })}
      />
      <DistributorReportDialog distributor={selected} open={reportOpen} onOpenChange={setReportOpen} />
      <PasswordRevealDialog
        open={!!revealed}
        onOpenChange={(value) => !value && setRevealed(null)}
        email={revealed?.email}
        password={revealed?.password ?? null}
      />
    </div>
  );
};

export default Distribuidores;
