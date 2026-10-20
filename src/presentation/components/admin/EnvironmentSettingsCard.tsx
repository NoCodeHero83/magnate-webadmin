import { useState } from "react";
import { toast } from "sonner";
import { Server, ScanFace, MailCheck, CheckCircle2, XCircle, Info, Loader2 } from "lucide-react";
import { Switch } from "@/presentation/components/ui/switch";
import { Label } from "@/presentation/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/presentation/components/ui/alert-dialog";
import { useEnvironmentSettings, useSaveEnvironmentSettings } from "@/presentation/hooks/useAppSettings";
import { AppEnvironment, IdentityVerificationMode } from "@/infrastructure/supabase/SupabaseAppSettingsRepository";

const ENVIRONMENT_LABELS: Record<AppEnvironment, string> = {
  development: "Desarrollo (ZapSign de pruebas)",
  production: "Producción (ZapSign real)",
};

function CredentialStatus({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
      ) : (
        <XCircle className={`h-4 w-4 shrink-0 ${optional ? "text-muted-foreground" : "text-destructive"}`} />
      )}
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground">{ok ? "cargadas" : optional ? "sin configurar (opcional)" : "faltan"}</span>
    </div>
  );
}

/** Entorno de la plataforma (elige las credenciales de ZapSign) y verificación simulada para pruebas */
export function EnvironmentSettingsCard() {
  const { data: settings, isLoading, isError } = useEnvironmentSettings();
  const save = useSaveEnvironmentSettings();
  const [confirmProduction, setConfirmProduction] = useState(false);

  const apply = async (
    environment: AppEnvironment,
    identityVerification: IdentityVerificationMode,
    showCodesOnScreen: boolean,
    message: string
  ) => {
    try {
      await save.mutateAsync({ environment, identityVerification, showCodesOnScreen });
      toast.success(message);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar la configuración");
    }
  };

  const handleEnvironment = (environment: AppEnvironment) => {
    if (!settings || environment === settings.environment) return;
    if (environment === "production") {
      setConfirmProduction(true);
      return;
    }
    apply("development", settings.identityVerification, settings.showCodesOnScreen, "Entorno de desarrollo activado");
  };

  return (
    <div className="premium-card p-4 md:p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          Entorno y verificación de identidad
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          El entorno define con qué ZapSign se verifica la identidad en el registro: el de pruebas o el real.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !settings ? (
        <p className="text-sm text-destructive">No se pudo cargar la configuración del entorno.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="font-medium text-foreground">Entorno</Label>
                <p className="text-sm text-muted-foreground">
                  En producción el registro exige una verificación real aprobada.
                </p>
              </div>
              <Select value={settings.environment} onValueChange={(v) => handleEnvironment(v as AppEnvironment)} disabled={save.isPending}>
                <SelectTrigger className="sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">{ENVIRONMENT_LABELS.development}</SelectItem>
                  <SelectItem value="production" disabled={!settings.productionConfigured}>
                    {ENVIRONMENT_LABELS.production}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 pt-1">
              <CredentialStatus ok={settings.sandboxConfigured} label="Credenciales de pruebas (sandbox):" />
              <CredentialStatus ok={settings.productionConfigured} label="Credenciales de producción:" />
              <CredentialStatus ok={settings.productionBiometric} label="Validación biométrica de producción:" optional />
            </div>
            {!settings.productionConfigured && (
              <p className="text-xs text-muted-foreground">
                Para habilitar producción, carga en Supabase Vault <code>zapsign_api_key_prod</code> y{" "}
                <code>zapsign_template_id_prod</code> (opcional: <code>zapsign_selfie_validation_type_prod</code>).
              </p>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4">
            <div className="flex gap-3">
              <ScanFace className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="identity-simulated" className="font-medium text-foreground cursor-pointer">
                  Simular la verificación de identidad
                </Label>
                <p className="text-sm text-muted-foreground">
                  {settings.environment === "production"
                    ? "No disponible en producción."
                    : "En el registro aparece \"Simular verificación\" y se da por verificada sin pasar por ZapSign. Solo para pruebas."}
                </p>
              </div>
            </div>
            <Switch
              id="identity-simulated"
              checked={settings.identityVerification === "simulated"}
              disabled={save.isPending || settings.environment === "production"}
              onCheckedChange={(value) =>
                apply(
                  settings.environment,
                  value ? "simulated" : "zapsign",
                  settings.showCodesOnScreen,
                  value ? "Verificación simulada activada" : "Verificación con ZapSign activada"
                )
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4">
            <div className="flex gap-3">
              <MailCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="show-codes" className="font-medium text-foreground cursor-pointer">
                  Mostrar los códigos en pantalla
                </Label>
                <p className="text-sm text-muted-foreground">
                  {settings.environment === "production"
                    ? "No disponible en producción."
                    : "Los códigos que se envían por email (registro, dispositivo nuevo, cambio de PIN y transferencias web) también aparecen en pantalla, por si el correo no llega. Solo para pruebas."}
                </p>
              </div>
            </div>
            <Switch
              id="show-codes"
              checked={settings.showCodesOnScreen}
              disabled={save.isPending || settings.environment === "production"}
              onCheckedChange={(value) =>
                apply(
                  settings.environment,
                  settings.identityVerification,
                  value,
                  value ? "Los códigos se muestran en pantalla" : "Los códigos ya no se muestran en pantalla"
                )
              }
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            Aplica al instante para la app desde la versión del 20/10/2026. Las versiones anteriores no usan esta configuración.
          </p>
        </div>
      )}

      <AlertDialog open={confirmProduction} onOpenChange={setConfirmProduction}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pasar a producción?</AlertDialogTitle>
            <AlertDialogDescription>
              La verificación de identidad pasa a usar ZapSign real, con costo por cada verificación. La
              verificación simulada y los códigos en pantalla se apagan. Desde ese momento, el registro exige una verificación
              real aprobada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => apply("production", "zapsign", false, "Entorno de producción activado")}>
              Pasar a producción
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
