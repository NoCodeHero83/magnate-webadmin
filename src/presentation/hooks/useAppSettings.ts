import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    SupabaseAppSettingsRepository,
    ApprovalSettingKey,
    ApprovalSettings,
    AppEnvironment,
    IdentityVerificationMode,
} from "../../infrastructure/supabase/SupabaseAppSettingsRepository";

const appSettingsRepository = new SupabaseAppSettingsRepository();

export function useApprovalSettings() {
    return useQuery({
        queryKey: ["app-settings", "approval"],
        queryFn: () => appSettingsRepository.getApprovalSettings(),
    });
}

const FIELD_BY_KEY: Record<ApprovalSettingKey, keyof ApprovalSettings> = {
    require_approval_business: "requireApprovalBusiness",
    require_approval_personal: "requireApprovalPersonal",
};

export function useUpdateApprovalSetting() {
    const queryClient = useQueryClient();
    const queryKey = ["app-settings", "approval"];
    return useMutation({
        mutationFn: ({ key, value }: { key: ApprovalSettingKey; value: boolean }) =>
            appSettingsRepository.setBoolean(key, value),
        // El switch cambia al instante y vuelve atrás si falla
        onMutate: async ({ key, value }) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ApprovalSettings>(queryKey);
            if (previous) {
                queryClient.setQueryData<ApprovalSettings>(queryKey, { ...previous, [FIELD_BY_KEY[key]]: value });
            }
            return { previous };
        },
        onError: (_error, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });
}

export function useEnvironmentSettings() {
    return useQuery({
        queryKey: ["app-settings", "environment"],
        queryFn: () => appSettingsRepository.getEnvironmentSettings(),
    });
}

export function useSaveEnvironmentSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ environment, identityVerification }: { environment: AppEnvironment; identityVerification: IdentityVerificationMode }) =>
            appSettingsRepository.setEnvironmentSettings(environment, identityVerification),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["app-settings", "environment"] }),
    });
}
