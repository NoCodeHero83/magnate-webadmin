import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";

export type StaffRole = "user" | "admin" | "distributor";

/**
 * Estado del 2FA (TOTP) de la sesión:
 * - ok:        la sesión ya validó el código (aal2)
 * - challenge: tiene un factor configurado y debe ingresar el código
 * - enroll:    todavía no configuró el 2FA
 */
export type MfaStatus = "ok" | "challenge" | "enroll";

export interface AuthUser {
    id: string;
    email: string;
    role: StaffRole;
    mfa: MfaStatus;
}

export interface TotpEnrollment {
    factorId: string;
    /** QR en formato SVG (data URL) para escanear con la app autenticadora */
    qrCode: string;
    /** Clave para cargar a mano si no se puede escanear */
    secret: string;
}

export class SupabaseAuthService {
    async login(email: string, password: string): Promise<AuthUser> {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) throw new Error("Email o contraseña incorrectos");
        if (!authData.user) throw new Error("No user data returned");

        const role = await this.getUserRole(authData.user.id);
        return {
            id: authData.user.id,
            email: authData.user.email!,
            role,
            mfa: await this.getMfaStatus(),
        };
    }

    async logout(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(`Logout failed: ${error.message}`);
    }

    async getCurrentUser(): Promise<AuthUser | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        try {
            return {
                id: user.id,
                email: user.email!,
                role: await this.getUserRole(user.id),
                mfa: await this.getMfaStatus(),
            };
        } catch {
            return null;
        }
    }

    async getMfaStatus(): Promise<MfaStatus> {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw new Error(error.message);
        if (data.currentLevel === "aal2") return "ok";
        return data.nextLevel === "aal2" ? "challenge" : "enroll";
    }

    /** Alta del factor TOTP (borra los intentos de alta que quedaron sin verificar) */
    async enrollTotp(): Promise<TotpEnrollment> {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        for (const factor of factors?.all ?? []) {
            if (factor.factor_type === "totp" && factor.status !== "verified") {
                await supabase.auth.mfa.unenroll({ factorId: factor.id });
            }
        }
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: `Magnate ${new Date().toISOString().slice(0, 10)}`,
        });
        if (error || !data) throw new Error(error?.message || "No se pudo iniciar el 2FA");
        return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
    }

    /** Valida un código TOTP. Sin factorId usa el factor ya configurado. */
    async verifyTotp(code: string, factorId?: string): Promise<void> {
        let id = factorId;
        if (!id) {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            id = factors?.totp?.[0]?.id;
        }
        if (!id) throw new Error("No hay un 2FA configurado");
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code });
        if (error) throw new Error("Código incorrecto o vencido");
    }

    /**
     * Cambia la contraseña del usuario que inició sesión. Antes verifica la actual con un
     * cliente aparte, sin tocar la sesión del panel.
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) throw new Error("Sesión no válida");

        const verifier = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, storageKey: "magnate-password-check" },
        });
        const { error: checkError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (checkError) throw new Error("CURRENT_PASSWORD_INVALID");
        // Cierra solo la sesión de verificación
        await verifier.auth.signOut({ scope: "local" });

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
    }

    async getUserRole(userId: string): Promise<StaffRole> {
        const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

        if (error) throw new Error(`Error fetching user role: ${error.message}`);
        return data.role as StaffRole;
    }
}
