import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/presentation/context/AuthContext";
import { PANEL_ROLES } from "@/presentation/components/auth/RequireAuth";
import { TotpEnrollment } from "@/infrastructure/supabase/SupabaseAuthService";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";

/** Segundo paso del login: configurar el 2FA (la primera vez) o ingresar el código */
export function Mfa() {
    const { user, isLoading, enrollTotp, verifyTotp, logout } = useAuth();
    const navigate = useNavigate();
    const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const needsEnroll = user?.mfa === "enroll";

    useEffect(() => {
        if (!needsEnroll || enrollment) return;
        enrollTotp()
            .then(setEnrollment)
            .catch((err) => setError(err.message || "No se pudo iniciar la configuración del 2FA"));
    }, [needsEnroll, enrollment, enrollTotp]);

    if (isLoading) return null;
    if (!user || !PANEL_ROLES.includes(user.role)) return <Navigate to="/login" replace />;
    if (user.mfa === "ok") return <Navigate to="/" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await verifyTotp(code.trim(), enrollment?.factorId);
            navigate("/", { replace: true });
        } catch (err: any) {
            setError(err.message || "Código incorrecto");
            setCode("");
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        Verificación en dos pasos
                    </CardTitle>
                    <CardDescription className="text-center">
                        {needsEnroll
                            ? "Escanea el código con una app autenticadora (Google Authenticator, Authy, 1Password) e ingresa el código de 6 dígitos."
                            : "Ingresa el código de 6 dígitos de tu app autenticadora."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {needsEnroll && (
                            enrollment ? (
                                <div className="space-y-3 text-center">
                                    <img src={enrollment.qrCode} alt="Código QR para la app autenticadora" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
                                    <p className="text-xs text-muted-foreground">¿No puedes escanearlo? Ingresa esta clave:</p>
                                    <p className="font-mono text-sm break-all select-all">{enrollment.secret}</p>
                                </div>
                            ) : !error && (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="totp">Código</Label>
                            <Input
                                id="totp"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                autoFocus
                                maxLength={6}
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                disabled={busy || (needsEnroll && !enrollment)}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={busy || code.length !== 6 || (needsEnroll && !enrollment)}>
                            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Verificar
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={handleCancel} disabled={busy}>
                            Salir
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
