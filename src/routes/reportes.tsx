import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, PhoneCall, CheckCircle2, XCircle, ShieldAlert, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { classifyIncident, type IncidentClassification } from "@/lib/ai.functions";
import { COCHABAMBA_PROVINCES } from "@/data/cochabamba-geo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes Ciudadanos con IA · Comunidad Segura" },
      { name: "description", content: "Registra incidentes en Cochabamba con clasificación inteligente y moderación." },
      { property: "og:title", content: "Reportes Ciudadanos con IA · Comunidad Segura" },
      { property: "og:description", content: "Reportes ciudadanos compartidos en tiempo real con clasificación IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportesPage,
});

function ReportesPage() {
  const { user, profile, isModerator } = useAuth();
  const queryClient = useQueryClient();
  const classifyFn = useServerFn(classifyIncident);

  const [provinciaId, setProvinciaId] = useState("cercado");
  const [municipioDistrito, setMunicipioDistrito] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState<IncidentClassification | null>(null);

  // Moderator official alert form
  const [alertTitulo, setAlertTitulo] = useState("");
  const [alertNivel, setAlertNivel] = useState<"amarilla" | "naranja" | "roja">("naranja");
  const [alertFuente, setAlertFuente] = useState("SATD Cochabamba");
  const [alertDesc, setAlertDesc] = useState("");

  const { data: reportes = [] } = useQuery({
    queryKey: ["reportes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reportes")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`reportes-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reportes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["reportes"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleClassify = async () => {
    if (descripcion.trim().length < 8) {
      toast.error("Describe el incidente con al menos 8 caracteres para clasificarlo.");
      return;
    }
    setClassifying(true);
    try {
      const provName = COCHABAMBA_PROVINCES.find((p) => p.id === provinciaId)?.name ?? "Cochabamba";
      const res = await classifyFn({ data: { descripcion: descripcion.trim(), provincia: provName } });
      setAiResult(res);
      toast.success("Incidente clasificado con IA.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al clasificar con IA.");
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para guardar reportes compartidos.");
      return;
    }
    if (descripcion.trim().length < 8) {
      toast.error("Escribe una descripción más detallada.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("reportes").insert({
        autor_id: user.id,
        autor_nombre: profile?.nombre_completo ?? user.email ?? "Ciudadano",
        provincia_id: provinciaId,
        municipio_distrito: municipioDistrito.trim() || null,
        descripcion: descripcion.trim(),
        categoria_ia: aiResult?.categoria ?? "robo",
        urgencia_ia: aiResult?.urgencia ?? "media",
        motivo_breve_ia: aiResult?.motivo_breve ?? "Reporte ciudadano sin clasificación previa.",
        entidad_sugerida_ia: aiResult?.entidad_sugerida ?? "BOL-110 Radio Patrullas",
        telefono_sugerido_ia: aiResult?.telefono_sugerido ?? "110",
      });
      if (error) throw error;
      setDescripcion("");
      setMunicipioDistrito("");
      setAiResult(null);
      toast.success("Reporte publicado en la base compartida.");
      void queryClient.invalidateQueries({ queryKey: ["reportes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el reporte.");
    } finally {
      setSaving(false);
    }
  };

  const handleModerate = async (id: string, estado: "verificado" | "rechazado") => {
    if (!user) return;
    const { error } = await supabase
      .from("reportes")
      .update({ estado_verificacion: estado, moderado_por: user.id })
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el estado.");
      return;
    }
    toast.success(`Reporte marcado como ${estado}.`);
    void queryClient.invalidateQueries({ queryKey: ["reportes"] });
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !alertTitulo.trim() || !alertDesc.trim()) return;
    const { error } = await supabase.from("alertas_oficiales").insert({
      titulo: alertTitulo.trim(),
      nivel: alertNivel,
      categoria: "alerta_oficial",
      provincias_afectadas: [provinciaId],
      descripcion: alertDesc.trim(),
      fuente_oficial: alertFuente.trim() || "SATD Cochabamba",
      cargado_por: user.id,
    });
    if (error) {
      toast.error("No se pudo publicar la alerta oficial.");
      return;
    }
    setAlertTitulo("");
    setAlertDesc("");
    toast.success("Alerta oficial publicada en el mapa.");
    void queryClient.invalidateQueries({ queryKey: ["alertas_oficiales"] });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Red Ciudadana Compartida
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Reportes Ciudadanos con IA
          </h1>
        </div>
        {!user && (
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth">Inicia sesión para reportar</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Report Form */}
        <form onSubmit={handleSubmitReport} className="lg:col-span-2 rounded-3xl glass-panel p-6 space-y-4 h-fit">
          <h2 className="font-display text-lg font-bold">Nuevo Reporte</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prov">Provincia</Label>
              <select
                id="prov"
                value={provinciaId}
                onChange={(e) => setProvinciaId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-xs text-foreground"
              >
                {COCHABAMBA_PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mun">Municipio / Distrito</Label>
              <Input
                id="mun"
                value={municipioDistrito}
                onChange={(e) => setMunicipioDistrito(e.target.value)}
                placeholder="Ej. Cercado D10"
                className="rounded-xl bg-secondary/70 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Relato del incidente</Label>
            <Textarea
              id="desc"
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe qué ocurrió, referencia exacta y si hay personas en riesgo..."
              className="rounded-xl bg-secondary/70 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleClassify()}
            disabled={classifying}
            className="w-full rounded-xl border border-primary/40 text-primary hover:bg-primary/15"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {classifying ? "Clasificando con IA..." : "Clasificar con IA"}
          </Button>

          {aiResult && (
            <div className="rounded-2xl border border-primary/35 bg-primary/10 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-primary">{aiResult.categoria}</span>
                <span className="rounded-full bg-destructive/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                  Urgencia {aiResult.urgencia}
                </span>
              </div>
              <p className="text-foreground">{aiResult.motivo_breve}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Entidad: {aiResult.entidad_sugerida}</span>
                {(aiResult.urgencia === "alta" || aiResult.urgencia === "critica") && (
                  <Button asChild size="sm" variant="destructive" className="h-7 rounded-lg text-[11px]">
                    <a href={`tel:${aiResult.telefono_sugerido}`}>
                      <PhoneCall className="mr-1 h-3 w-3" />
                      Llamar {aiResult.telefono_sugerido}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          <Button type="submit" disabled={saving || !user} className="w-full rounded-xl font-semibold">
            <Send className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Publicar Reporte"}
          </Button>
        </form>

        {/* Shared Reports Feed + Moderator Panel */}
        <div className="lg:col-span-3 space-y-6">
          {isModerator && (
            <form onSubmit={handleCreateAlert} className="rounded-3xl glass-panel border-primary/35 p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldAlert className="h-4 w-4" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider">
                  Panel de Moderador · Cargar Alerta Oficial
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={alertTitulo}
                  onChange={(e) => setAlertTitulo(e.target.value)}
                  placeholder="Título del boletín"
                  className="rounded-xl bg-secondary/70 text-xs sm:col-span-2"
                />
                <select
                  value={alertNivel}
                  onChange={(e) => setAlertNivel(e.target.value as "amarilla" | "naranja" | "roja")}
                  className="flex h-10 rounded-xl border border-input bg-secondary/70 px-3 text-xs text-foreground"
                >
                  <option value="amarilla">Amarilla</option>
                  <option value="naranja">Naranja</option>
                  <option value="roja">Roja</option>
                </select>
              </div>
              <Input
                value={alertFuente}
                onChange={(e) => setAlertFuente(e.target.value)}
                placeholder="Fuente oficial (SATD, FELCC, ABC)"
                className="rounded-xl bg-secondary/70 text-xs"
              />
              <Textarea
                rows={2}
                value={alertDesc}
                onChange={(e) => setAlertDesc(e.target.value)}
                placeholder="Detalle del boletín oficial..."
                className="rounded-xl bg-secondary/70 text-xs"
              />
              <Button type="submit" size="sm" className="rounded-xl">
                Publicar Alerta Oficial
              </Button>
            </form>
          )}

          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold">
              Reportes Recientes ({reportes.length})
            </h2>
            {reportes.length === 0 ? (
              <div className="rounded-2xl glass-panel p-8 text-center text-sm text-muted-foreground">
                Aún no hay reportes ciudadanos registrados. Sé el primero en reportar un incidente.
              </div>
            ) : (
              reportes.map((rep) => (
                <div key={rep.id} className="rounded-2xl glass-panel p-5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {rep.categoria_ia}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase text-foreground">
                        Urgencia {rep.urgencia_ia}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {rep.provincia_id.replace("_", " ")}
                        {rep.municipio_distrito ? ` · ${rep.municipio_distrito}` : ""}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        rep.estado_verificacion === "verificado"
                          ? "text-risk-low"
                          : rep.estado_verificacion === "rechazado"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {rep.estado_verificacion}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{rep.descripcion}</p>
                  {rep.motivo_breve_ia && (
                    <p className="text-xs text-muted-foreground">IA: {rep.motivo_breve_ia}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span>Por {rep.autor_nombre}</span>
                    {isModerator && rep.estado_verificacion === "pendiente" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 rounded-lg text-[11px]"
                          onClick={() => void handleModerate(rep.id, "verificado")}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-risk-low" />
                          Verificar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 rounded-lg text-[11px]"
                          onClick={() => void handleModerate(rep.id, "rechazado")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5 text-destructive" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}