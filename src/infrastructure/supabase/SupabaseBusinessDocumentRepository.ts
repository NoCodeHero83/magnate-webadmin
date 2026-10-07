import { supabase } from "./client";

export type BusinessDocumentStatus = "pending" | "approved" | "rejected";

export interface BusinessDocumentSlot {
  /** Tipo de documento */
  code: string;
  name: string;
  required: boolean;
  /** Documento vigente de ese tipo (sin los reemplazados) */
  document?: {
    id: string;
    fileName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    status: BusinessDocumentStatus;
    reason?: string;
    reviewedAt?: string;
    createdAt: string;
  };
}

/** Documentación KYB de una empresa (tablas business_document_types / business_documents) */
export class SupabaseBusinessDocumentRepository {
  async getForUser(userId: string): Promise<BusinessDocumentSlot[]> {
    const [typesResult, docsResult] = await Promise.all([
      supabase.from("business_document_types").select("code, name, required").eq("is_active", true).order("sort_order"),
      supabase
        .from("business_documents")
        .select("id, doc_type, file_name, storage_path, mime_type, size_bytes, status, reason, reviewed_at, created_at")
        .eq("user_id", userId)
        .neq("status", "replaced"),
    ]);
    if (typesResult.error) throw new Error(typesResult.error.message);
    if (docsResult.error) throw new Error(docsResult.error.message);

    const docs = new Map((docsResult.data || []).map((d: any) => [d.doc_type, d]));
    return (typesResult.data || []).map((t: any) => {
      const d = docs.get(t.code);
      return {
        code: t.code,
        name: t.name,
        required: t.required,
        document: d
          ? {
            id: d.id,
            fileName: d.file_name,
            storagePath: d.storage_path,
            mimeType: d.mime_type,
            sizeBytes: Number(d.size_bytes) || 0,
            status: d.status,
            reason: d.reason || undefined,
            reviewedAt: d.reviewed_at || undefined,
            createdAt: d.created_at,
          }
          : undefined,
      };
    });
  }

  /** URL firmada de 5 minutos para ver el archivo (bucket privado) */
  async getFileUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60 * 5);
    if (error || !data?.signedUrl) throw new Error("No se pudo abrir el documento");
    return data.signedUrl;
  }

  async review(documentId: string, decision: "approve" | "reject", reason?: string): Promise<void> {
    const { error } = await supabase.rpc("admin_review_document", {
      p_document_id: documentId,
      p_decision: decision,
      p_reason: reason ?? null,
    });
    if (error) throw new Error(error.message.replace(/^[A-Z_]+:\s*/, ""));
  }
}
