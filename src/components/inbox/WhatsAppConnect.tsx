import { useEffect, useState } from "react";
import { Check, Loader2, QrCode, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInbox } from "@/lib/inbox-store";
import QRCode from "qrcode";

export function WhatsAppConnect() {
  const [open, setOpen] = useState(false);
  const { whatsappQr, whatsappStatus } = useInbox();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (whatsappQr) {
      QRCode.toDataURL(whatsappQr, { width: 300, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("Error generating QR:", err));
    } else {
      setQrDataUrl(null);
    }
  }, [whatsappQr]);

  const connected = whatsappStatus === 'connected';

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">WhatsApp Business</p>
            <p className="text-xs text-muted-foreground">
              {connected
                ? "Sesión activa y vinculada correctamente."
                : "Vincula tu número escaneando el código QR dinámico."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
              <Wifi className="h-3 w-3" /> Conectado
            </Badge>
          ) : (
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
              <QrCode className="h-3 w-3" /> Conectar
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Abre WhatsApp en tu teléfono → <b>Dispositivos vinculados</b> → <b>Vincular un dispositivo</b> y escanea el código.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative grid h-[260px] w-[260px] place-items-center overflow-hidden rounded-xl border bg-white">
              {whatsappStatus === 'loading' && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Iniciando servicio…</span>
                </div>
              )}

              {whatsappStatus === 'disconnected' && !qrDataUrl && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Esperando código QR desde el servidor…</span>
                </div>
              )}

              {qrDataUrl && whatsappStatus !== "connected" && (
                <img src={qrDataUrl} alt="QR de WhatsApp" className="h-full w-full object-contain p-2" />
              )}

              {whatsappStatus === "connected" && (
                <div className="flex flex-col items-center gap-2 text-emerald-600">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15">
                    <Check className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">¡Conectado!</p>
                </div>
              )}

              {whatsappStatus === "error" && (
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <WifiOff className="h-8 w-8" />
                  <p className="text-sm font-medium">Error de conexión</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {whatsappStatus === 'disconnected' && qrDataUrl ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-muted-foreground">
                    Código listo para escanear
                  </span>
                </>
              ) : whatsappStatus === "connected" ? (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                  <Check className="h-3 w-3" /> Conexión confirmada
                </Badge>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}