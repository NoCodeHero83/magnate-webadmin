import { supabase } from "./client";

export interface ApprovalSettings {
    requireApprovalBusiness: boolean;
    requireApprovalPersonal: boolean;
}

export type ApprovalSettingKey = "require_approval_business" | "require_approval_personal";

/** Configuración clave/valor de la tabla app_settings (solo admins pueden leer/escribir) */
export class SupabaseAppSettingsRepository {
    async getApprovalSettings(): Promise<ApprovalSettings> {
        const { data, error } = await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", ["require_approval_business", "require_approval_personal"]);

        if (error) throw new Error(`Error fetching app settings: ${error.message}`);

        const map = new Map((data || []).map((row) => [row.key, row.value]));
        return {
            requireApprovalBusiness: map.get("require_approval_business") === true,
            requireApprovalPersonal: map.get("require_approval_personal") === true,
        };
    }

    async setBoolean(key: ApprovalSettingKey, value: boolean): Promise<void> {
        const { data: auth } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from("app_settings")
            .update({ value, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null })
            .eq("key", key)
            .select("key");

        if (error) throw new Error(`Error updating setting: ${error.message}`);
        if (!data || data.length === 0) throw new Error("No se pudo guardar la configuración");
    }
}
