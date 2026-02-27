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
import NotFound from "@/presentation/pages/NotFound";

const queryClient = new QueryClient();

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
              <Route path="/" element={<Dashboard />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/transacciones" element={<Transacciones />} />
              <Route path="/configuracion" element={<Configuracion />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
