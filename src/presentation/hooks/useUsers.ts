import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseUserRepository } from "../../infrastructure/supabase/SupabaseUserRepository";
import { QueryOptions } from "../../core/types/pagination";

const userRepository = new SupabaseUserRepository();

export function useUsers(options?: QueryOptions) {
    return useQuery({
        queryKey: ["users", options],
        queryFn: () => userRepository.getAll(options),
    });
}

export function useUser(id: string) {
    return useQuery({
        queryKey: ["users", id],
        queryFn: () => userRepository.getById(id),
        enabled: !!id,
    });
}

export function useUserStats() {
    return useQuery({
        queryKey: ["users", "stats"],
        queryFn: () => userRepository.getStats(),
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
