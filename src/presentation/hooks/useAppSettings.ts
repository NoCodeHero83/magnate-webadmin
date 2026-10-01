import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseAppSettingsRepository, ApprovalSettingKey } from "../../infrastructure/supabase/SupabaseAppSettingsRepository";

const appSettingsRepository = new SupabaseAppSettingsRepository();

export function useApprovalSettings() {
    return useQuery({
        queryKey: ["app-settings", "approval"],
        queryFn: () => appSettingsRepository.getApprovalSettings(),
    });
}

export function useUpdateApprovalSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ key, value }: { key: ApprovalSettingKey; value: boolean }) =>
            appSettingsRepository.setBoolean(key, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app-settings"] });
        },
    });
}
