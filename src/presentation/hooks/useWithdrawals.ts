import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseWithdrawalRepository } from "../../infrastructure/supabase/SupabaseWithdrawalRepository";
import {
  ResolveWithdrawalInput,
  WithdrawalRequestInput,
  WithdrawalSettings,
  WithdrawalStatus,
} from "../../core/entities/Withdrawal";
import { Period } from "../../lib/format";

const repository = new SupabaseWithdrawalRepository();

export function useWithdrawalSettings(enabled = true) {
  return useQuery({
    queryKey: ["withdrawal-settings"],
    queryFn: () => repository.getSettings(),
    enabled,
  });
}

export function useSaveWithdrawalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: WithdrawalSettings) => repository.saveSettings(settings),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["withdrawal-settings"] }),
  });
}

export function useDistributorBalance(distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["distributor-balance", distributorId ?? "me"],
    queryFn: () => repository.getBalance(distributorId),
    enabled,
  });
}

export function useWithdrawals(status?: WithdrawalStatus | null, distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["withdrawals", status ?? "all", distributorId ?? "all"],
    queryFn: () => repository.list(status, distributorId),
    enabled,
  });
}

/** Cantidad de retiros pendientes (badge del menú del admin) */
export function usePendingWithdrawalsCount(enabled = true) {
  const query = useWithdrawals("pending", null, enabled);
  return query.data?.length ?? 0;
}

function useInvalidateWithdrawals() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    queryClient.invalidateQueries({ queryKey: ["distributor-balance"] });
    queryClient.invalidateQueries({ queryKey: ["distributor-me"] });
    queryClient.invalidateQueries({ queryKey: ["distributors"] });
  };
}

export function useWithdrawalMutations() {
  const onSettled = useInvalidateWithdrawals();
  return {
    request: useMutation({ mutationFn: (input: WithdrawalRequestInput) => repository.request(input), onSettled }),
    cancel: useMutation({ mutationFn: (id: string) => repository.cancel(id), onSettled }),
    resolve: useMutation({ mutationFn: (input: ResolveWithdrawalInput) => repository.resolve(input), onSettled }),
  };
}

export function useMovements(period: Period, distributorId?: string | null, accountId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["movements", distributorId ?? "all", accountId ?? "all", period.from.toISOString(), period.to.toISOString()],
    queryFn: () => repository.getMovements(period, distributorId, accountId),
    enabled,
  });
}
