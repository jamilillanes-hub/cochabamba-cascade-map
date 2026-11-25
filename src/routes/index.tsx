import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CochabambaMap3D, type ProvinceIndicesMap } from "@/components/CochabambaMap3D";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa 3D Interactivo · Comunidad Segura Cochabamba" },
      {
        name: "description",
        content:
          "Explora en 3D las 16 provincias, 48 municipios y distritos de Cochabamba con índices de riesgo en tiempo real.",
      },
      { property: "og:title", content: "Mapa 3D Interactivo · Comunidad Segura Cochabamba" },
      {
        property: "og:description",
        content:
          "Cartografía 3D libre de Cochabamba: provincias, municipios, distritos, red vial y alertas oficiales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const queryClient = useQueryClient();

  const { data: indicesRows = [] } = useQuery({
    queryKey: ["indices_por_provincia"],
    queryFn: async () => {
      const { data, error } = await supabase.from("indices_por_provincia").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reportesRows = [] } = useQuery({
    queryKey: ["reportes_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reportes").select("provincia_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ["alertas_oficiales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_oficiales")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`map-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reportes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["reportes_counts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas_oficiales" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["alertas_oficiales"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const indicesByProvince: ProvinceIndicesMap = {};
  for (const row of indicesRows) {
    indicesByProvince[row.provincia_id] = {
      indice_general: row.indice_general,
      indice_robos: row.indice_robos,
      indice_asesinatos: row.indice_asesinatos,
      indice_derrumbes: row.indice_derrumbes,
      indice_inundaciones: row.indice_inundaciones,
      indice_incendios: row.indice_incendios,
      fuente_oficial: row.fuente_oficial,
    };
  }

  const reportCountsByProvince: Record<string, number> = {};
  for (const r of reportesRows) {
    reportCountsByProvince[r.provincia_id] = (reportCountsByProvince[r.provincia_id] ?? 0) + 1;
  }

  return (
    <div className="relative w-full">
      <CochabambaMap3D
        indicesByProvince={indicesByProvince}
        reportCountsByProvince={reportCountsByProvince}
      />

      {alertas.length > 0 && (
        <div className="mx-auto max-w-[1440px] px-4 py-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Boletines y Alertas Oficiales Vigentes
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {alertas.map((alerta) => (
              <div key={alerta.id} className="rounded-2xl glass-panel p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      alerta.nivel === "roja"
                        ? "bg-destructive/20 text-destructive"
                        : alerta.nivel === "naranja"
                          ? "bg-risk-high/20 text-risk-high"
                          : "bg-primary/20 text-primary"
                    }`}
                  >
                    Alerta {alerta.nivel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{alerta.fuente_oficial}</span>
                </div>
                <h3 className="font-display text-sm font-semibold text-foreground">{alerta.titulo}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{alerta.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
