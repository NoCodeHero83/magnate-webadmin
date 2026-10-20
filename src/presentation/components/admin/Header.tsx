import { useState } from "react";
import { ChevronDown, LogOut, KeyRound, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { Button } from "@/presentation/components/ui/button";
import { ChangePasswordDialog } from "@/presentation/components/admin/ChangePasswordDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/presentation/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header = ({ title, subtitle }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return (
    <header className="sticky top-0 z-30 h-20 glass-card border-b border-border/50">
      <div className="flex h-full items-center justify-between px-6">
        {/* Title */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-foreground">
                    {user?.email?.substring(0, 2).toUpperCase() || "AD"}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium">{user?.email || "Admin"}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Cambiar contraseña
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  );
};
