import { Bot, Sparkles, Clock, ShieldOff, Save, Loader2 } from "lucide-react";
import { useInbox } from "@/lib/inbox-store";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function BotPage() {
  const { conversations, contacts } = useInbox();
  const blocked = contacts.filter((c) => c.blocked).length;
  const paused = conversations.filter((c) => c.botPausedUntil && c.botPausedUntil > Date.now()).length;
  const handled = 142; // Esto podría venir de un endpoint de stats en el futuro

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{ [key: string]: string }>({
    bot_enabled: "true",
    system_prompt: "",
    model_name: "gemini-flash-lite-latest",
    temperature: "0.7",
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await apiFetch("/api/config");
        const configMap: { [key: string]: string } = {};
        data.forEach((item: { clave: string; valor: string }) => {
          configMap[item.clave] = item.valor;
        });
        setConfig((prev) => ({ ...prev, ...configMap }));
      } catch (error) {
        console.error("Error fetching config:", error);
        toast.error("No se pudo cargar la configuración del bot");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guardamos cada clave individualmente como espera el backend actual
      const promises = Object.entries(config).map(([clave, valor]) =>
        apiFetch("/api/config", {
          method: "POST",
          body: JSON.stringify({ clave, valor }),
        })
      );
      await Promise.all(promises);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (clave: string, valor: string) => {
    setConfig((prev) => ({ ...prev, [clave]: valor }));
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto pb-20 md:pb-0">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gradient-brand)] text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Bot de IA — Gemini</h1>
              <p className="text-sm text-muted-foreground">Configura el comportamiento del asistente automático.</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:p-8 md:grid-cols-3">
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Mensajes hoy" value={handled} accent="primary" />
        <Stat icon={<Clock className="h-4 w-4" />} label="Pausas activas" value={paused} accent="warning" />
        <Stat icon={<ShieldOff className="h-4 w-4" />} label="Bloqueados" value={blocked} accent="destructive" />
      </div>

      <div className="grid gap-6 px-4 pb-8 md:px-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Estado del Bot</h2>
                <p className="text-sm text-muted-foreground">Activa o desactiva las respuestas automáticas globalmente.</p>
              </div>
              <Switch 
                checked={config.bot_enabled === "true"} 
                onCheckedChange={(checked) => updateConfig("bot_enabled", checked ? "true" : "false")}
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo de Lenguaje</Label>
                <Input 
                  id="model" 
                  value={config.model_name} 
                  onChange={(e) => updateConfig("model_name", e.target.value)}
                  placeholder="ej: gemini-1.5-flash"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp">Temperatura ({config.temperature})</Label>
                <Input 
                  id="temp" 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="1"
                  value={config.temperature} 
                  onChange={(e) => updateConfig("temperature", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Valores altos (0.8+) son más creativos, valores bajos (0.2) son más precisos.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Información</h2>
            <p className="text-sm text-muted-foreground">
              El bot responde automáticamente salvo que:
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                Un agente haya respondido recientemente (Pausa Manual).
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-destructive shrink-0" />
                El contacto esté bloqueado.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-success shrink-0" />
                El bot esté desactivado globalmente arriba.
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col h-full">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Instrucciones del Sistema (Prompt)</h2>
            <p className="text-sm text-muted-foreground">Define la personalidad y reglas que debe seguir el bot.</p>
          </div>
          <Textarea 
            className="flex-1 min-h-[400px] font-mono text-sm leading-relaxed"
            value={config.system_prompt}
            onChange={(e) => updateConfig("system_prompt", e.target.value)}
            placeholder="Eres un asistente de ventas..."
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: "primary" | "warning" | "destructive" }) {
  const color = accent === "primary" ? "var(--primary)" : accent === "warning" ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}