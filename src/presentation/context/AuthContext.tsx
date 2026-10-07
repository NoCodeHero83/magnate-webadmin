import React, { createContext, useContext, useEffect, useState } from "react";
import { SupabaseAuthService, AuthUser } from "../../infrastructure/supabase/SupabaseAuthService";

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
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
        setUser(authUser);
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const changePassword = (newPassword: string) => authService.changePassword(newPassword);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword }}>
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
