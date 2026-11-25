import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COCHABAMBA_PROVINCES } from "@/data/cochabamba-geo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad Abierta · Comunidad Segura Cochabamba" },
      { name: "description", content: "Espacio libre de conversación ciudadana para vecinos y OTBs de Cochabamba." },
      { property: "og:title", content: "Comunidad Abierta · Comunidad Segura Cochabamba" },
      { property: "og:description", content: "Conversa libremente con vecinos de las 16 provincias de Cochabamba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComunidadPage,
});

const TEMAS = [
  { id: "general", label: "Conversación General" },
  { id: "seguridad", label: "Seguridad Vecinal" },
  { id: "vias", label: "Estado de Vías" },
  { id: "ayuda", label: "Ayuda Mutua" },
];

function ComunidadPage() {
  const { user, profile, isModerator } = useAuth();
  const queryClient = useQueryClient();
  const [temaFiltro, setTemaFiltro] = useState("todos");
  const [temaNuevo, setTemaNuevo] = useState("general");
  const [provinciaId, setProvinciaId] = useState("cercado");
  const [contenido, setContenido] = useState("");
  const [sending, setSending] = useState(false);

  const { data: mensajes = [] } = useQuery({
    queryKey: ["mensajes_comunidad"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensajes_comunidad")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`comunidad-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mensajes_comunidad" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["mensajes_comunidad"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para participar en la conversación.");
      return;
    }
    if (!contenido.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("mensajes_comunidad").insert({
        autor_id: user.id,
        autor_nombre: profile?.nombre_completo ?? user.email?.split("@")[0] ?? "Vecino",
        provincia_id: provinciaId,
        tema: temaNuevo,
        contenido: contenido.trim(),
      });
      if (error) throw error;
      setContenido("");
      void queryClient.invalidateQueries({ queryKey: ["mensajes_comunidad"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mensajes_comunidad").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar el mensaje.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["mensajes_comunidad"] });
  };

  const visible = temaFiltro === "todos" ? mensajes : mensajes.filter((m) => m.tema === temaFiltro);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Espacio Ciudadano en Vivo
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Conversación Libre de la Comunidad
          </h1>
        </div>
        {!user && (
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth">Inicia sesión para escribir</Link>
          </Button>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="rounded-3xl glass-panel p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={temaNuevo}
            onChange={(e) => setTemaNuevo(e.target.value)}
            className="h-9 rounded-xl border border-input bg-secondary/70 px-3 text-xs text-foreground"
          >
            {TEMAS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={provinciaId}
            onChange={(e) => setProvinciaId(e.target.value)}
            className="h-9 rounded-xl border border-input bg-secondary/70 px-3 text-xs text-foreground"
          >
            {COCHABAMBA_PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          rows={3}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder={
            user
              ? "Comparte avisos, preguntas o conversa libremente con tu comunidad..."
              : "Inicia sesión para publicar un mensaje en la comunidad..."
          }
          disabled={!user}
          className="rounded-2xl bg-secondary/70 text-sm"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={sending || !user || !contenido.trim()} className="rounded-full px-5">
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Enviando..." : "Publicar mensaje"}
          </Button>
        </div>
      </form>

      {/* Topic Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTemaFiltro("todos")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            temaFiltro === "todos" ? "bg-foreground text-background" : "glass-pill text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {TEMAS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemaFiltro(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              temaFiltro === t.id ? "bg-foreground text-background" : "glass-pill text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-2xl glass-panel p-10 text-center space-y-2">
            <MessageSquare className="mx-auto h-7 w-7 text-primary/70" />
            <p className="text-sm text-muted-foreground">
              Aún no hay mensajes en este canal. Inicia la conversación con tus vecinos.
            </p>
          </div>
        ) : (
          visible.map((msg) => (
            <div key={msg.id} className="rounded-2xl glass-panel p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">{msg.autor_nombre}</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {TEMAS.find((t) => t.id === msg.tema)?.label ?? msg.tema}
                  </span>
                  {msg.provincia_id && (
                    <span className="text-muted-foreground capitalize">
                      {msg.provincia_id.replace("_", " ")}
                    </span>
                  )}
                </div>
                {(user?.id === msg.autor_id || isModerator) && (
                  <button
                    onClick={() => void handleDelete(msg.id)}
                    className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                    title="Eliminar mensaje"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">
                {msg.contenido}
              </p>
              <div className="text-[10px] text-muted-foreground">
                {new Date(msg.creado_en).toLocaleString("es-BO")}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}