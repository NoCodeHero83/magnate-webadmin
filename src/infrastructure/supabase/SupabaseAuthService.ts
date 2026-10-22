import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";

export type StaffRole = "user" | "admin" | "distributor";

export interface AuthUser {
    id: string;
    email: string;
    role: StaffRole;
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
                };
        } catch {
            return null;
        }
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
