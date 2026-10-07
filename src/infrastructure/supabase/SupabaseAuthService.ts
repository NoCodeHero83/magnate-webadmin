import { supabase } from "./client";

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

        if (authError) throw new Error(`Login failed: ${authError.message}`);
        if (!authData.user) throw new Error("No user data returned");

        // Obtener el rol del usuario desde public.users
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("id", authData.user.id)
            .single();

        if (userError) throw new Error(`Error fetching user role: ${userError.message}`);

        return {
            id: authData.user.id,
            email: authData.user.email!,
            role: userData.role as StaffRole,
        };
    }

    async logout(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(`Logout failed: ${error.message}`);
    }

    async getCurrentUser(): Promise<AuthUser | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const { data: userData, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (error) return null;

        return {
            id: user.id,
            email: user.email!,
            role: userData.role as StaffRole,
        };
    }

    /** Cambia la contraseña del usuario que inició sesión */
    async changePassword(newPassword: string): Promise<void> {
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
