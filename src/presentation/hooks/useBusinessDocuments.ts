import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseBusinessDocumentRepository } from "../../infrastructure/supabase/SupabaseBusinessDocumentRepository";

export const businessDocumentRepository = new SupabaseBusinessDocumentRepository();

export function useBusinessDocuments(userId: string | null) {
  return useQuery({
    queryKey: ["business-documents", userId],
    queryFn: () => businessDocumentRepository.getForUser(userId!),
    enabled: !!userId,
  });
}

export function useReviewDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, decision, reason }: { documentId: string; decision: "approve" | "reject"; reason?: string }) =>
      businessDocumentRepository.review(documentId, decision, reason),
    // También si falla (ej. el usuario subió otra versión): refrescar
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["business-documents"] }),
  });
}
