import { useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/presentation/context/AuthContext";
import { useIdleLogout } from "@/presentation/hooks/useIdleLogout";

/** Minutos sin actividad hasta cerrar la sesión del panel */
const IDLE_MINUTES = 30;

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleIdle = useCallback(async () => {
    await logout().catch(() => undefined);
    toast.info("Cerramos tu sesión por inactividad");
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  useIdleLogout(handleIdle, IDLE_MINUTES * 60 * 1000, !!user);

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
