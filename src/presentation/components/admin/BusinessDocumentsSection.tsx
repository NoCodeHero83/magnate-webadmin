import { useState } from "react";
import { toast } from "sonner";
import { FileCheck2, FileText, CheckCircle2, XCircle, Clock, Upload, Loader2, Eye } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { Textarea } from "@/presentation/components/ui/textarea";
import { useBusinessDocuments, useReviewDocument, businessDocumentRepository } from "@/presentation/hooks/useBusinessDocuments";
import { BusinessDocumentSlot } from "@/infrastructure/supabase/SupabaseBusinessDocumentRepository";

const STATUS = {
  pending: { label: "Por revisar", icon: Clock, className: "text-warning" },
  approved: { label: "Aprobado", icon: CheckCircle2, className: "text-success" },
  rejected: { label: "Rechazado", icon: XCircle, className: "text-destructive" },
} as const;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Cuántos documentos obligatorios faltan aprobar (para avisar antes de aprobar la cuenta) */
export const missingRequiredDocuments = (slots: BusinessDocumentSlot[] | undefined) =>
  (slots ?? []).filter((s) => s.required && s.document?.status !== "approved");

function DocumentRow({ slot }: { slot: BusinessDocumentSlot }) {
  const review = useReviewDocument();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [opening, setOpening] = useState(false);
  const doc = slot.document;

  const handleOpen = async () => {
    if (!doc) return;
    // Abrir la pestaña antes del await para que el navegador no la bloquee
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const url = await businessDocumentRepository.getFileUrl(doc.storagePath);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        toast.error("El navegador bloqueó la ventana. Habilita las ventanas emergentes para este sitio.");
      }
    } catch (error: any) {
      tab?.close();
      toast.error(error?.message || "No se pudo abrir el documento");
    } finally {
      setOpening(false);
    }
  };

  const handleReview = async (decision: "approve" | "reject") => {
    if (!doc) return;
    if (decision === "reject" && reason.trim().length < 3) {
      toast.error("Indica el motivo para que la empresa sepa qué corregir.");
      return;
    }
    try {
      await review.mutateAsync({ documentId: doc.id, decision, reason: reason.trim() || undefined });
      toast.success(decision === "approve" ? `${slot.name}: aprobado` : `${slot.name}: rechazado. Le avisamos a la empresa.`);
      setRejecting(false);
      setReason("");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar la revisión");
    }
  };

  const status = doc ? STATUS[doc.status] : null;

  return (
    <li className="rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {slot.name}
            {!slot.required && <span className="text-xs font-normal text-muted-foreground"> (opcional)</span>}
          </p>
          {doc ? (
            <p className="text-xs text-muted-foreground truncate">
              {doc.fileName} · {formatSize(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString("es-AR")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Upload className="h-3 w-3" /> Todavía no lo subió
            </p>
          )}
        </div>
        {status && (
          <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${status.className}`}>
            <status.icon className="h-3.5 w-3.5" /> {status.label}
          </span>
        )}
      </div>

      {doc?.status === "rejected" && doc.reason && (
        <p className="text-xs text-destructive">Motivo: {doc.reason}</p>
      )}

      {doc && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleOpen} disabled={opening}>
            {opening ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
            Ver
          </Button>
          {doc.status === "pending" && !rejecting && (
            <>
              <Button size="sm" onClick={() => handleReview("approve")} disabled={review.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Aprobar
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => setRejecting(true)} disabled={review.isPending}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Rechazar
              </Button>
            </>
          )}
        </div>
      )}

      {rejecting && (
        <div className="space-y-2">
          <Textarea
            placeholder="Qué tiene que corregir (la empresa lo recibe por email)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setRejecting(false); setReason(""); }} disabled={review.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleReview("reject")} disabled={review.isPending}>
              {review.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Rechazar documento
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Documentación de la empresa en el detalle del usuario */
export function BusinessDocumentsSection({ userId }: { userId: string }) {
  const { data: slots, isLoading, isError } = useBusinessDocuments(userId);
  const missing = missingRequiredDocuments(slots);

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-primary" /> Documentación de la empresa
      </h4>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : isError || !slots ? (
        <p className="text-sm text-destructive">No se pudo cargar la documentación.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {missing.length === 0
              ? "Todos los documentos obligatorios están aprobados."
              : `Faltan aprobar ${missing.length} ${missing.length === 1 ? "documento obligatorio" : "documentos obligatorios"}.`}
          </p>
          <ul className="space-y-2">
            {slots.map((slot) => (
              <DocumentRow key={slot.code} slot={slot} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
