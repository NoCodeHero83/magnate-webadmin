import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Button } from "@/presentation/components/ui/button";

interface PasswordRevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string;
  password: string | null;
}

/** Muestra una sola vez la contraseña temporal de un distribuidor */
export function PasswordRevealDialog({ open, onOpenChange, email, password }: PasswordRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(email ? `Usuario: ${email}\nContraseña: ${password}` : password);
      setCopied(true);
      toast.success("Copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Contraseña temporal
          </DialogTitle>
          <DialogDescription>
            Pásasela al distribuidor por un canal seguro. No se vuelve a mostrar: si se pierde, genera una nueva.
            Al entrar puede cambiarla desde su menú.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {email && (
            <div>
              <p className="text-xs text-muted-foreground">Usuario</p>
              <p className="font-mono text-sm select-all break-all">{email}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Contraseña</p>
            <p className="font-mono text-lg tracking-wider select-all rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
              {password}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copiar
            </Button>
            <Button onClick={() => onOpenChange(false)}>Listo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
