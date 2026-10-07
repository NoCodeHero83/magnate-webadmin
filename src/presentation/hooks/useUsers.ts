import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseUserRepository } from "../../infrastructure/supabase/SupabaseUserRepository";
import { QueryOptions } from "../../core/types/pagination";

const userRepository = new SupabaseUserRepository();

export function useUsers(options?: QueryOptions, enabled = true) {
    return useQuery({
        queryKey: ["users", options],
        queryFn: () => userRepository.getAll(options),
        enabled,
    });
}

export function useUser(id: string) {
    return useQuery({
        queryKey: ["users", id],
        queryFn: () => userRepository.getById(id),
        enabled: !!id,
    });
}

export function useUserStats(enabled = true) {
    return useQuery({
        queryKey: ["users", "stats"],
        queryFn: () => userRepository.getStats(),
        enabled,
    });
}

export function useUserReviews(userId: string | null) {
    return useQuery({
        queryKey: ["user-reviews", userId],
        queryFn: () => userRepository.getReviews(userId!),
        enabled: !!userId,
    });
}

export function useReviewUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, decision, reason }: { userId: string; decision: "approve" | "reject"; reason?: string }) =>
            userRepository.reviewUser(userId, decision, reason),
        // También si falla (ej. otro admin ya revisó la cuenta): refrescar el estado real
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
        },
    });
}

export function useAccountLimits(userId: string | null) {
    return useQuery({
        queryKey: ["account-limits", userId],
        queryFn: () => userRepository.getAccountLimits(userId!),
        enabled: !!userId,
    });
}

export function useUpdateAccountLimits() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            accountId,
            limits,
        }: {
            accountId: string;
            limits: {
                monthlyLimit?: number;
                dailyLimit?: number | null;
                perTransactionLimit?: number | null;
            };
        }) => userRepository.updateAccountLimits(accountId, limits),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-limits"] });
        },
    });
}
