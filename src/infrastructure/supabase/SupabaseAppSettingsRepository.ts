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
        // Mismos valores por defecto que la BD (get_setting_bool) si falta la fila
        return {
            requireApprovalBusiness: map.has("require_approval_business") ? map.get("require_approval_business") === true : true,
            requireApprovalPersonal: map.get("require_approval_personal") === true,
        };
    }

    async setBoolean(key: ApprovalSettingKey, value: boolean): Promise<void> {
        const { data: auth } = await supabase.auth.getUser();
        // upsert: crea la fila si no existe
        const { error } = await supabase
            .from("app_settings")
            .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null }, { onConflict: "key" });

        if (error) throw new Error(`Error updating setting: ${error.message}`);
    }
}
