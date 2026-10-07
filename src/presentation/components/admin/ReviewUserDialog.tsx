import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { User, getUserDisplayName } from "@/core/entities/User";
import { useReviewUser } from "@/presentation/hooks/useUsers";
import { useBusinessDocuments } from "@/presentation/hooks/useBusinessDocuments";
import { missingRequiredDocuments } from "@/presentation/components/admin/BusinessDocumentsSection";
import { Button } from "@/presentation/components/ui/button";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";

interface ReviewUserDialogProps {
  user: User | null;
  decision: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewUserDialog({ user, decision, open, onOpenChange }: ReviewUserDialogProps) {
  const [reason, setReason] = useState("");
  const reviewMutation = useReviewUser();
  const isReject = decision === "reject";
  // Antes de aprobar una empresa, avisar si faltan documentos obligatorios aprobados
  const checkDocs = open && !isReject && user?.accountType === "business";
  const { data: docSlots } = useBusinessDocuments(checkDocs ? user!.id : null);
  const missingDocs = checkDocs ? missingRequiredDocuments(docSlots) : [];

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!user) return null;

  const name = getUserDisplayName(user);

  const handleConfirm = async () => {
    try {
      await reviewMutation.mutateAsync({
        userId: user.id,
        decision,
        reason: reason.trim() || undefined,
      });
      toast.success(isReject ? `Cuenta de ${name} rechazada` : `Cuenta de ${name} aprobada`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo procesar la revisión");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReject ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            {isReject ? "Rechazar cuenta" : "Aprobar cuenta"}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? `La cuenta de ${name} quedará rechazada y no podrá operar. Se le enviará un email con el motivo.`
              : `La cuenta de ${name} quedará habilitada para enviar y recibir dinero. Se le enviará un email de confirmación.`}
          </DialogDescription>
        </DialogHeader>

        {missingDocs.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <p className="font-medium text-warning">Faltan documentos obligatorios aprobados</p>
            <p className="text-muted-foreground">{missingDocs.map((d) => d.name).join(", ")}. Puedes aprobar igual si ya los verificaste por otro medio.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="review-reason">
            {isReject ? "Motivo del rechazo (obligatorio)" : "Comentario interno (opcional)"}
          </Label>
          <Textarea
            id="review-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isReject ? "Ej: El CUIT no coincide con la razón social" : ""}
            className="bg-card border-border/50"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reviewMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant={isReject ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={reviewMutation.isPending || (isReject && !reason.trim())}
          >
            {reviewMutation.isPending ? "Procesando..." : isReject ? "Rechazar" : "Aprobar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
