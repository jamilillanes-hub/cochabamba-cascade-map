import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PhoneCall, MapPin, Navigation, ShieldAlert } from "lucide-react";
import { EMERGENCY_DIRECTORY, haversineKm, type EmergencyUnit } from "@/data/emergencias";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/emergencias")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Seguridad 24/7 · Comunidad Segura" },
      { name: "description", content: "Directorio 24/7 de policías, hospitales, bomberos, SAR y servicios básicos de Cochabamba." },
      { property: "og:title", content: "Biblioteca de Seguridad 24/7 · Comunidad Segura" },
      { property: "og:description", content: "Números y ubicaciones de emergencia 24/7 en Cochabamba con orden por proximidad GPS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmergenciasPage,
});

const CAT_LABELS: Record<EmergencyUnit["category"] | "todos", string> = {
  todos: "Todos",
  policia: "Policía / EPI",
  hospital: "Hospitales 24h",
  bomberos: "Bomberos",
  rescate: "Rescate SAR",
  servicios: "Servicios Básicos",
};

function EmergenciasPage() {
  const [cat, setCat] = useState<EmergencyUnit["category"] | "todos">("todos");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Cache directory in localStorage for offline readiness
  useEffect(() => {
    try {
      localStorage.setItem("cs_emergencias_24_7", JSON.stringify(EMERGENCY_DIRECTORY));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const requestGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  const items = useMemo(() => {
    const filtered =
      cat === "todos" ? EMERGENCY_DIRECTORY : EMERGENCY_DIRECTORY.filter((u) => u.category === cat);
    if (!coords) return filtered.map((u) => ({ unit: u, distKm: null as number | null }));
    return filtered
      .map((u) => ({ unit: u, distKm: haversineKm(coords.lat, coords.lng, u.lat, u.lng) }))
      .sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
  }, [cat, coords]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Disponible Sin Iniciar Sesión · Respaldo Local
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Biblioteca de Seguridad 24/7
          </h1>
        </div>
        <Button variant="secondary" onClick={requestGps} className="rounded-full">
          <Navigation className="mr-2 h-4 w-4 text-primary" />
          {coords ? "Ordenado por tu GPS" : "Ordenar por cercanía GPS"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CAT_LABELS) as Array<EmergencyUnit["category"] | "todos">).map((k) => (
          <button
            key={k}
            onClick={() => setCat(k)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              cat === k ? "bg-foreground text-background" : "glass-pill text-muted-foreground hover:text-foreground"
            }`}
          >
            {CAT_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ unit, distKm }) => (
          <div key={unit.id} className="rounded-2xl glass-panel p-5 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                  <ShieldAlert className="h-3 w-3" />
                  {CAT_LABELS[unit.category]}
                </span>
                {distKm !== null && (
                  <span className="text-[11px] font-semibold text-risk-low">
                    {distKm.toFixed(1)} km
                  </span>
                )}
              </div>
              <h2 className="font-display text-base font-bold text-foreground">{unit.name}</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                {unit.address}
              </p>
            </div>

            <Button asChild size="sm" variant="destructive" className="w-full rounded-xl">
              <a href={`tel:${unit.phone}`}>
                <PhoneCall className="mr-2 h-3.5 w-3.5" />
                Llamar {unit.phone}
              </a>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}