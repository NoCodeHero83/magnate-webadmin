import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Info, Loader2 } from "lucide-react";
import { Switch } from "@/presentation/components/ui/switch";
import { Label } from "@/presentation/components/ui/label";
import { supabase } from "@/infrastructure/supabase/client";

/**
 * El panel siempre pide el 2FA. Este switch hace que también lo exija la base
 * (is_admin / is_distributor solo valen con una sesión con código), así una
 * contraseña robada no sirve ni usando la API directamente.
 */
export function MfaSettingsCard() {
  const [required, setRequired] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.rpc("staff_mfa_required").then(({ data, error }) => {
      if (!error) setRequired(data === true);
    });
  }, []);

  const handleToggle = async (value: boolean) => {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "require_staff_mfa", value, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar la configuración");
      return;
    }
    setRequired(value);
    toast.success(value ? "La base ahora exige el 2FA" : "La base ya no exige el 2FA");
  };

  return (
    <div className="premium-card p-4 md:p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Verificación en dos pasos
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          El panel pide el código de la app autenticadora a administradores y distribuidores en cada ingreso.
        </p>
      </div>

      {required === null ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4">
          <div>
            <Label htmlFor="require-staff-mfa" className="font-medium text-foreground cursor-pointer">
              Exigir el 2FA también en la base de datos
            </Label>
            <p className="text-sm text-muted-foreground">
              Sin el código, una contraseña robada no da permisos de administrador ni de distribuidor, ni siquiera llamando a la API directamente.
            </p>
          </div>
          <Switch id="require-staff-mfa" checked={required} disabled={saving} onCheckedChange={handleToggle} />
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        Actívalo cuando todos los administradores y distribuidores hayan configurado su 2FA en esta versión del panel.
      </p>
    </div>
  );
}
