import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { StaffRole } from "@/infrastructure/supabase/SupabaseAuthService";

/** Roles que pueden entrar al panel */
export const PANEL_ROLES: StaffRole[] = ["admin", "distributor"];

interface RequireAuthProps {
    children: React.ReactNode;
    /** Roles permitidos (por defecto, todos los del panel) */
    roles?: StaffRole[];
}

export function RequireAuth({ children, roles = PANEL_ROLES }: RequireAuthProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Segundo paso: configurar o ingresar el código del 2FA
    if (PANEL_ROLES.includes(user.role) && user.mfa !== "ok") {
        return <Navigate to="/mfa" replace />;
    }

    // Un distribuidor que entra a una página de admin vuelve a su inicio
    if (PANEL_ROLES.includes(user.role) && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    if (!roles.includes(user.role)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
                    <p className="mt-2 text-muted-foreground">
                        Solo los administradores y distribuidores pueden acceder a este panel.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
