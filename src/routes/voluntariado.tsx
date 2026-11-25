import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartHandshake, MapPin, Phone, Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COCHABAMBA_PROVINCES } from "@/data/cochabamba-geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/voluntariado")({
  head: () => ({
    meta: [
      { title: "Voluntariado · Comunidad Segura Cochabamba" },
      { name: "description", content: "Clases, talleres y sedes de acopio solidario en Cochabamba." },
      { property: "og:title", content: "Voluntariado · Comunidad Segura Cochabamba" },
      { property: "og:description", content: "Conecta con instituciones y puntos de voluntariado en Cochabamba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoluntariadoPage,
});

function VoluntariadoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [institucion, setInstitucion] = useState("");
  const [tipo, setTipo] = useState<"clase_taller" | "ubicacion_sede_acopio">("clase_taller");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [provinciaId, setProvinciaId] = useState("cercado");
  const [direccion, setDireccion] = useState("");
  const [fechaHorario, setFechaHorario] = useState("");
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: publicaciones = [] } = useQuery({
    queryKey: ["voluntariado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publicaciones_voluntariado")
        .select("*")
        .order("creado_en", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`vol-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "publicaciones_voluntariado" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["voluntariado"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para publicar actividades de voluntariado.");
      return;
    }
    if (!institucion.trim() || !titulo.trim() || !direccion.trim() || !telefono.trim()) {
      toast.error("Completa institución, título, dirección y teléfono.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("publicaciones_voluntariado").insert({
        autor_id: user.id,
        nombre_institucion: institucion.trim(),
        tipo_publicacion: tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || "Actividad comunitaria abierta.",
        provincia_id: provinciaId,
        direccion: direccion.trim(),
        fecha_horario: fechaHorario.trim() || null,
        telefono_contacto: telefono.trim(),
      });
      if (error) throw error;
      setInstitucion("");
      setTitulo("");
      setDescripcion("");
      setDireccion("");
      setFechaHorario("");
      setTelefono("");
      toast.success("Publicación de voluntariado guardada.");
      void queryClient.invalidateQueries({ queryKey: ["voluntariado"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Acción Solidaria
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Voluntariado y Centros de Acopio
          </h1>
        </div>
        {!user && (
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth">Inicia sesión para publicar</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="lg:col-span-2 rounded-3xl glass-panel p-6 space-y-3.5 h-fit">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Publicar Convocatoria
          </h2>
          <div className="space-y-1">
            <Label>Institución / OTB</Label>
            <Input value={institucion} onChange={(e) => setInstitucion(e.target.value)} placeholder="Ej. Cruz Roja Cochabamba" className="rounded-xl bg-secondary/70 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as "clase_taller" | "ubicacion_sede_acopio")} className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-xs text-foreground">
                <option value="clase_taller">Clase / Taller</option>
                <option value="ubicacion_sede_acopio">Sede / Acopio</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Provincia</Label>
              <select value={provinciaId} onChange={(e) => setProvinciaId(e.target.value)} className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-xs text-foreground">
                {COCHABAMBA_PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Taller de Primeros Auxilios" className="rounded-xl bg-secondary/70 text-xs" />
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué se necesita o qué se enseñará..." className="rounded-xl bg-secondary/70 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. América y..." className="rounded-xl bg-secondary/70 text-xs" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="70712345" className="rounded-xl bg-secondary/70 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Fecha y horario (opcional)</Label>
            <Input value={fechaHorario} onChange={(e) => setFechaHorario(e.target.value)} placeholder="Sábados 09:00 – 13:00" className="rounded-xl bg-secondary/70 text-xs" />
          </div>
          <Button type="submit" disabled={saving || !user} className="w-full rounded-xl font-semibold">
            {saving ? "Publicando..." : "Publicar en Red Compartida"}
          </Button>
        </form>

        <div className="lg:col-span-3 space-y-3">
          {publicaciones.length === 0 ? (
            <div className="rounded-2xl glass-panel p-8 text-center text-sm text-muted-foreground">
              Aún no hay convocatorias de voluntariado registradas.
            </div>
          ) : (
            publicaciones.map((pub) => (
              <div key={pub.id} className="rounded-2xl glass-panel p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                    <HeartHandshake className="h-3 w-3" />
                    {pub.tipo_publicacion === "clase_taller" ? "Clase / Taller" : "Sede / Acopio"}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{pub.nombre_institucion}</span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{pub.titulo}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{pub.descripcion}</p>
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {pub.direccion}
                  </span>
                  {pub.fecha_horario && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> {pub.fecha_horario}
                    </span>
                  )}
                  <a href={`tel:${pub.telefono_contacto}`} className="flex items-center gap-1 text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {pub.telefono_contacto}
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}