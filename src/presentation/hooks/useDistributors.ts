import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SupabaseDistributorRepository,
  DistributorInput,
  DistributorAccessInput,
} from "../../infrastructure/supabase/SupabaseDistributorRepository";
import { SupabaseFeeRuleRepository } from "../../infrastructure/supabase/SupabaseFeeRuleRepository";
import { CommissionSettings, DistributorCommissionInput, FeeRuleInput } from "../../core/entities/Distributor";
import { Period } from "../../lib/format";

const distributorRepository = new SupabaseDistributorRepository();
const feeRuleRepository = new SupabaseFeeRuleRepository();

const periodKey = (period: Period) => [period.from.toISOString(), period.to.toISOString()];

// ── Distribuidores (admin) ──────────────────────────────────────────────────

export function useDistributors(enabled = true) {
  return useQuery({
    queryKey: ["distributors"],
    queryFn: () => distributorRepository.list(),
    enabled,
  });
}

export function useSaveDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DistributorInput) => distributorRepository.save(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["distributors"] }),
  });
}

export function useDistributorAccess() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: (input: DistributorAccessInput) => distributorRepository.createAccess(input),
      onSettled: () => queryClient.invalidateQueries({ queryKey: ["distributors"] }),
    }),
    resetPassword: useMutation({
      mutationFn: (distributorId: string) => distributorRepository.resetPassword(distributorId),
    }),
  };
}

function useInvalidateDistributorMoney() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["distributors"] });
    queryClient.invalidateQueries({ queryKey: ["distributor-balance"] });
    queryClient.invalidateQueries({ queryKey: ["distributor-adjustments"] });
    queryClient.invalidateQueries({ queryKey: ["distributor-periods"] });
    queryClient.invalidateQueries({ queryKey: ["distributor-network"] });
    queryClient.invalidateQueries({ queryKey: ["commission-summary"] });
  };
}

/** Quién lo trajo, % propio, red y liquidación de un distribuidor */
export function useSaveDistributorCommission() {
  const onSettled = useInvalidateDistributorMoney();
  return useMutation({
    mutationFn: (input: DistributorCommissionInput) => distributorRepository.saveCommission(input),
    onSettled,
  });
}

export function useAdjustDistributor() {
  const onSettled = useInvalidateDistributorMoney();
  return useMutation({
    mutationFn: ({ distributorId, amount, reason }: { distributorId: string; amount: number; reason: string }) =>
      distributorRepository.adjust(distributorId, amount, reason),
    onSettled,
  });
}

export function useCommissionSettings(enabled = true) {
  return useQuery({
    queryKey: ["commission-settings"],
    queryFn: () => distributorRepository.getSettings(),
    enabled,
  });
}

export function useSaveCommissionSettings() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDistributorMoney();
  return useMutation({
    mutationFn: (settings: CommissionSettings) => distributorRepository.saveSettings(settings),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-settings"] });
      invalidate();
    },
  });
}

export function useAssignAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountIds, distributorId }: { accountIds: string[]; distributorId: string | null }) =>
      distributorRepository.assignAccounts(accountIds, distributorId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      queryClient.invalidateQueries({ queryKey: ["account-volume"] });
    },
  });
}

export function useCommissionSummary(period: Period, enabled = true) {
  return useQuery({
    queryKey: ["commission-summary", ...periodKey(period)],
    queryFn: () => distributorRepository.getCommissionSummary(period),
    enabled,
  });
}

// ── Reportes (admin y distribuidor) ─────────────────────────────────────────

export function useAccountVolume(period: Period, distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["account-volume", distributorId ?? "all", ...periodKey(period)],
    queryFn: () => distributorRepository.getAccountVolume(period, distributorId),
    enabled,
  });
}

export function useCommissionDetail(period: Period, distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["commission-detail", distributorId ?? "all", ...periodKey(period)],
    queryFn: () => distributorRepository.getCommissionDetail(period, distributorId),
    enabled,
  });
}

export function useDistributorNetwork(distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["distributor-network", distributorId ?? "me"],
    queryFn: () => distributorRepository.getNetwork(distributorId),
    enabled,
  });
}

export function useNetworkDetail(period: Period, distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["distributor-network-detail", distributorId ?? "me", ...periodKey(period)],
    queryFn: () => distributorRepository.getNetworkDetail(period, distributorId),
    enabled,
  });
}

export function usePeriodSummary(distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["distributor-periods", distributorId ?? "me"],
    queryFn: () => distributorRepository.getPeriodSummary(distributorId),
    enabled,
  });
}

export function useAdjustments(distributorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["distributor-adjustments", distributorId ?? "me"],
    queryFn: () => distributorRepository.getAdjustments(distributorId),
    enabled,
  });
}

export function useDistributorMe(enabled = true) {
  return useQuery({
    queryKey: ["distributor-me"],
    queryFn: () => distributorRepository.getMe(),
    enabled,
  });
}

// ── Reglas de comisión (admin) ──────────────────────────────────────────────

export function useFeeRules() {
  return useQuery({
    queryKey: ["fee-rules"],
    queryFn: () => feeRuleRepository.list(),
  });
}

export function useFeeRuleMutations() {
  const queryClient = useQueryClient();
  const onSettled = () => queryClient.invalidateQueries({ queryKey: ["fee-rules"] });
  return {
    create: useMutation({ mutationFn: (input: FeeRuleInput) => feeRuleRepository.create(input), onSettled }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FeeRuleInput }) => feeRuleRepository.update(id, input),
      onSettled,
    }),
    remove: useMutation({ mutationFn: (id: string) => feeRuleRepository.remove(id), onSettled }),
  };
}
