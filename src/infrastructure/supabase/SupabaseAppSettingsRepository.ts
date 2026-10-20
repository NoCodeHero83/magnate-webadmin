import { supabase } from "./client";

export interface ApprovalSettings {
    requireApprovalBusiness: boolean;
    requireApprovalPersonal: boolean;
}

export type ApprovalSettingKey = "require_approval_business" | "require_approval_personal";

export type AppEnvironment = "development" | "production";
export type IdentityVerificationMode = "zapsign" | "simulated";

/** Entorno de la plataforma y verificación de identidad del registro */
export interface EnvironmentSettings {
    environment: AppEnvironment;
    identityVerification: IdentityVerificationMode;
    /** Credenciales de ZapSign cargadas en Supabase Vault (no se leen sus valores) */
    sandboxConfigured: boolean;
    productionConfigured: boolean;
    /** Validación biométrica estricta configurada para producción */
    productionBiometric: boolean;
    updatedAt: string | null;
}

/** Mensajes legibles para los errores de las funciones de la BD (CODIGO: mensaje) */
function dbErrorMessage(message: string): string {
    const known = message.match(/^[A-Z_]+: (.+)$/);
    if (known) return known[1];
    if (message.includes("FORBIDDEN")) return "No tienes permisos para hacer esto.";
    return message;
}

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

    async getEnvironmentSettings(): Promise<EnvironmentSettings> {
        const { data, error } = await supabase.rpc("admin_environment_settings");
        if (error) throw new Error(dbErrorMessage(error.message));
        const d = (data || {}) as any;
        return {
            environment: d.environment === "production" ? "production" : "development",
            identityVerification: d.identity_verification === "simulated" ? "simulated" : "zapsign",
            sandboxConfigured: !!d.sandbox_configured,
            productionConfigured: !!d.production_configured,
            productionBiometric: !!d.production_biometric,
            updatedAt: d.updated_at ?? null,
        };
    }

    async setEnvironmentSettings(environment: AppEnvironment, identityVerification: IdentityVerificationMode): Promise<void> {
        const { error } = await supabase.rpc("admin_set_environment_settings", {
            p_environment: environment,
            p_identity_verification: identityVerification,
        });
        if (error) throw new Error(dbErrorMessage(error.message));
    }
}
