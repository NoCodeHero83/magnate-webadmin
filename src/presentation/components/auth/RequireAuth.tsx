import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";

interface RequireAuthProps {
    children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
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

    if (user.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
                    <p className="mt-2 text-muted-foreground">
                        Solo los administradores pueden acceder a este panel.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
