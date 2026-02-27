import { useQuery } from "@tanstack/react-query";
import { SupabaseTransactionRepository } from "../../infrastructure/supabase/SupabaseTransactionRepository";
import { QueryOptions } from "../../core/types/pagination";

const transactionRepository = new SupabaseTransactionRepository();

export function useTransactions(options?: QueryOptions) {
    return useQuery({
        queryKey: ["transactions", options],
        queryFn: () => transactionRepository.getAll(options),
    });
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: () => transactionRepository.getStats(),
    });
}
