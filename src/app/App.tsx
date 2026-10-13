import { Toaster } from "@/presentation/components/ui/toaster";
import { Toaster as Sonner } from "@/presentation/components/ui/sonner";
import { TooltipProvider } from "@/presentation/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/presentation/context/AuthContext";
import { RequireAuth } from "@/presentation/components/auth/RequireAuth";
import { Login } from "@/presentation/pages/auth/Login";
import { AdminLayout } from "@/presentation/components/admin/AdminLayout";
import Dashboard from "@/presentation/pages/Dashboard";
import Usuarios from "@/presentation/pages/Usuarios";
import Transacciones from "@/presentation/pages/Transacciones";
import Configuracion from "@/presentation/pages/Configuracion";
import Distribuidores from "@/presentation/pages/Distribuidores";
import Comisiones from "@/presentation/pages/Comisiones";
import Retiros from "@/presentation/pages/Retiros";
import MiPanel from "@/presentation/pages/distribuidor/MiPanel";
import MisCvus from "@/presentation/pages/distribuidor/MisCvus";
import MisComisiones from "@/presentation/pages/distribuidor/MisComisiones";
import MisMovimientos from "@/presentation/pages/distribuidor/MisMovimientos";
import MisRetiros from "@/presentation/pages/distribuidor/MisRetiros";
import NotFound from "@/presentation/pages/NotFound";
import { useAuth } from "@/presentation/context/AuthContext";

const queryClient = new QueryClient();

/** Inicio según el rol: dashboard de Magnate o panel del distribuidor */
const Home = () => {
  const { user } = useAuth();
  return user?.role === "distributor" ? <MiPanel /> : <Dashboard />;
};

const adminOnly = (element: React.ReactNode) => <RequireAuth roles={["admin"]}>{element}</RequireAuth>;
const distributorOnly = (element: React.ReactNode) => <RequireAuth roles={["distributor"]}>{element}</RequireAuth>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/usuarios" element={adminOnly(<Usuarios />)} />
              <Route path="/transacciones" element={adminOnly(<Transacciones />)} />
              <Route path="/distribuidores" element={adminOnly(<Distribuidores />)} />
              <Route path="/comisiones" element={adminOnly(<Comisiones />)} />
              <Route path="/retiros" element={adminOnly(<Retiros />)} />
              <Route path="/configuracion" element={adminOnly(<Configuracion />)} />
              <Route path="/mis-cvus" element={distributorOnly(<MisCvus />)} />
              <Route path="/mis-comisiones" element={distributorOnly(<MisComisiones />)} />
              <Route path="/mis-movimientos" element={distributorOnly(<MisMovimientos />)} />
              <Route path="/mis-retiros" element={distributorOnly(<MisRetiros />)} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
