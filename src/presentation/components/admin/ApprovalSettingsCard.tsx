import { toast } from "sonner";
import { ShieldCheck, Building2, User, Info, Loader2 } from "lucide-react";
import { Switch } from "@/presentation/components/ui/switch";
import { Label } from "@/presentation/components/ui/label";
import { useApprovalSettings, useUpdateApprovalSetting } from "@/presentation/hooks/useAppSettings";
import { ApprovalSettingKey } from "@/infrastructure/supabase/SupabaseAppSettingsRepository";

const OPTIONS: { key: ApprovalSettingKey; field: "requireApprovalBusiness" | "requireApprovalPersonal"; icon: typeof User; title: string; description: string }[] = [
  {
    key: "require_approval_business",
    field: "requireApprovalBusiness",
    icon: Building2,
    title: "Persona Jurídica",
    description: "Las cuentas de empresas nuevas quedan pendientes hasta que un administrador las apruebe.",
  },
  {
    key: "require_approval_personal",
    field: "requireApprovalPersonal",
    icon: User,
    title: "Persona Física",
    description: "Las cuentas personales nuevas quedan pendientes hasta que un administrador las apruebe.",
  },
];

export function ApprovalSettingsCard() {
  const { data: settings, isLoading, isError } = useApprovalSettings();
  const updateSetting = useUpdateApprovalSetting();

  const handleToggle = async (key: ApprovalSettingKey, value: boolean) => {
    try {
      await updateSetting.mutateAsync({ key, value });
      toast.success(value ? "Aprobación manual activada" : "Aprobación manual desactivada");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar la configuración");
    }
  };

  return (
    <div className="premium-card p-4 md:p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Aprobación de cuentas
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mientras una cuenta está pendiente, el usuario puede ingresar a la app pero no puede enviar ni recibir dinero.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !settings ? (
        <p className="text-sm text-destructive">No se pudo cargar la configuración de aprobación.</p>
      ) : (
        <div className="space-y-4">
          {OPTIONS.map(({ key, field, icon: Icon, title, description }) => (
            <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4">
              <div className="flex gap-3">
                <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <Label htmlFor={key} className="font-medium text-foreground cursor-pointer">
                    {title}: requiere aprobación
                  </Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                id={key}
                checked={settings[field]}
                disabled={updateSetting.isPending}
                onCheckedChange={(value) => handleToggle(key, value)}
              />
            </div>
          ))}

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            Los cambios solo aplican a los registros nuevos. Las cuentas que ya están pendientes deben aprobarse desde Usuarios.
          </p>
        </div>
      )}
    </div>
  );
}
