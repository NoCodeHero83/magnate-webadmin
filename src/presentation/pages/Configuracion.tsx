import { useState, useEffect } from "react";
import { Header } from "@/presentation/components/admin/Header";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { SupabaseSupportRepository } from "@/infrastructure/supabase/SupabaseSupportRepository";
import { ApprovalSettingsCard } from "@/presentation/components/admin/ApprovalSettingsCard";
import { WithdrawalSettingsCard } from "@/presentation/components/admin/WithdrawalSettingsCard";
import { MfaSettingsCard } from "@/presentation/components/admin/MfaSettingsCard";
import {
  Save,
  Building,
  Mail,
  Phone,
  Loader2
} from "lucide-react";

const supportRepo = new SupabaseSupportRepository();

const Configuracion = () => {
  const [generalSettings, setGeneralSettings] = useState({
    appName: "",
    supportEmail: "",
    supportPhone: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    console.log("Fetching support settings...");
    setIsLoading(true);
    try {
      const settings = await supportRepo.getSettings();
      console.log("Settings received:", settings);
      if (settings) {
        setGeneralSettings({
          appName: settings.name,
          supportEmail: settings.email,
          supportPhone: settings.phone,
        });
      } else {
        console.warn("No settings found in database");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await supportRepo.updateSettings({
        name: generalSettings.appName,
        email: generalSettings.supportEmail,
        phone: generalSettings.supportPhone,
      });

      if (success) {
        alert("Configuración actualizada correctamente");
      } else {
        alert("Error al actualizar la configuración");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Configuración"
        subtitle="Ajustes generales del sistema"
      />

      <div className="p-4 md:p-6 space-y-6">
        <ApprovalSettingsCard />
        <WithdrawalSettingsCard />
        <MfaSettingsCard />

        <div className="premium-card p-4 md:p-6 space-y-6">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Información General
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre de la Aplicación</Label>
              <Input
                value={generalSettings.appName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, appName: e.target.value })}
                className="bg-card border-border/50"
                placeholder="Nombre de la app"
              />
            </div>
            <div className="space-y-2">
              <Label>Email de Soporte</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={generalSettings.supportEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                  className="bg-card border-border/50 pl-10"
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label>Teléfono de Soporte</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={generalSettings.supportPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                  className="bg-card border-border/50 pl-10"
                  placeholder="+54 11 ..."
                />
              </div>
            </div>
          </div>

          <Button
            className="btn-premium text-primary-foreground w-full sm:w-auto"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;
