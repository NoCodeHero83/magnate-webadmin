import React, { createContext, useContext, useEffect, useState } from "react";
import { SupabaseAuthService, AuthUser, TotpEnrollment } from "../../infrastructure/supabase/SupabaseAuthService";
import { markPanelActivity } from "../hooks/useIdleLogout";

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    logout: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    /** 2FA: alta del factor TOTP */
    enrollTotp: () => Promise<TotpEnrollment>;
    /** 2FA: valida el código y deja la sesión en aal2 */
    verifyTotp: (code: string, factorId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authService = new SupabaseAuthService();

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Verificar si hay una sesión activa al cargar
        authService.getCurrentUser().then((currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
    }, []);

    const login = async (email: string, password: string) => {
        const authUser = await authService.login(email, password);
        markPanelActivity();
        setUser(authUser);
        return authUser;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const changePassword = (currentPassword: string, newPassword: string) =>
        authService.changePassword(currentPassword, newPassword);

    const enrollTotp = () => authService.enrollTotp();

    const verifyTotp = async (code: string, factorId?: string) => {
        await authService.verifyTotp(code, factorId);
        setUser((prev) => (prev ? { ...prev, mfa: "ok" } : prev));
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword, enrollTotp, verifyTotp }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
