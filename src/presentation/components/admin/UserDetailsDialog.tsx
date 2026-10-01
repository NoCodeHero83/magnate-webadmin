import { Building2, History, CheckCircle2, XCircle } from "lucide-react";
import { User, getUserDisplayName } from "@/core/entities/User";
import { useUserReviews } from "@/presentation/hooks/useUsers";
import { StatusBadge } from "@/presentation/components/admin/StatusBadge";
import { AccountTypeBadge } from "@/presentation/components/admin/AccountTypeBadge";
import { Button } from "@/presentation/components/ui/button";
import { Label } from "@/presentation/components/ui/label";
import { Separator } from "@/presentation/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";

interface UserDetailsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (user: User, decision: "approve" | "reject") => void;
}

const formatDate = (value?: string) =>
  value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("es-AR") : "—";

const formatCuit = (cuit?: string) =>
  cuit && cuit.length === 11 ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit || "—";

const Field = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={className}>
    <Label className="text-muted-foreground text-xs">{label}</Label>
    <div className="text-sm break-words">{value}</div>
  </div>
);

export function UserDetailsDialog({ user, open, onOpenChange, onReview }: UserDetailsDialogProps) {
  const { data: reviews } = useUserReviews(open && user ? user.id : null);

  if (!user) return null;

  const isBusiness = user.accountType === "business";
  const company = user.businessProfile;
  const canApprove = user.verificationStatus === "pending" || user.verificationStatus === "rejected";
  const canReject = user.verificationStatus === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getUserDisplayName(user)}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            <AccountTypeBadge type={user.accountType} />
            <StatusBadge status={user.verificationStatus} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {user.verificationStatus === "rejected" && user.statusReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <span className="font-medium text-destructive">Motivo del rechazo: </span>
              {user.statusReason}
            </div>
          )}

          {isBusiness && company && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Datos de la empresa
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre legal" value={company.legalName} className="col-span-2" />
                <Field label="Nombre de fantasía" value={company.tradeName || "—"} />
                <Field label="CUIT" value={<span className="font-mono">{formatCuit(company.cuit)}</span>} />
                <Field label="Tipo societario" value={company.entityTypeName || company.entityType} />
                <Field label="Fecha de inscripción" value={formatDate(company.incorporationDate)} />
              </div>
              <Separator />
            </section>
          )}

          <section className="space-y-3">
            {isBusiness && <h4 className="text-sm font-semibold">Representante legal</h4>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" value={`${user.firstName} ${user.lastName}`} className="col-span-2" />
              <Field label="Email" value={user.email} className="col-span-2" />
              <Field label="Teléfono" value={user.phone} />
              <Field label="DNI" value={user.dni} />
              <Field label="CUIT/CUIL" value={<span className="font-mono">{formatCuit(user.cuitCuil)}</span>} />
              <Field label="Fecha de registro" value={new Date(user.createdAt).toLocaleString("es-AR")} />
              <Field label="ID" value={<span className="font-mono text-xs">{user.id}</span>} className="col-span-2" />
            </div>
          </section>

          {reviews && reviews.length > 0 && (
            <section className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Historial de revisiones
              </h4>
              <ul className="space-y-2">
                {reviews.map((review) => (
                  <li key={review.id} className="flex gap-2 text-sm">
                    {review.decision === "approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>
                        {review.decision === "approved" ? "Aprobada" : "Rechazada"}
                        {review.reviewerName ? ` por ${review.reviewerName}` : ""}
                        <span className="text-muted-foreground"> · {new Date(review.createdAt).toLocaleString("es-AR")}</span>
                      </p>
                      {review.reason && <p className="text-muted-foreground">{review.reason}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(canApprove || canReject) && (
            <div className="flex justify-end gap-2 pt-2">
              {canReject && (
                <Button variant="outline" className="text-destructive" onClick={() => onReview(user, "reject")}>
                  <XCircle className="h-4 w-4 mr-2" /> Rechazar
                </Button>
              )}
              {canApprove && (
                <Button onClick={() => onReview(user, "approve")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
