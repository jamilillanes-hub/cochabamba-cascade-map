import { useState } from "react";
import { PhoneCall, MapPin, X, ShieldAlert, Loader2 } from "lucide-react";
import { EMERGENCY_DIRECTORY, haversineKm, type EmergencyUnit } from "@/data/emergencias";
import { Button } from "@/components/ui/button";

export function FloatingSosButton() {
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState<{ unit: EmergencyUnit; distKm: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const policeUnits = EMERGENCY_DIRECTORY.filter((u) => u.category === "policia");
  const fallbackBol110 = policeUnits[0]!;

  const locateNearest = () => {
    setOpen(true);
    setLocating(true);
    setGpsError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocating(false);
      setGpsError("GPS no disponible en este dispositivo. Usa BOL-110 directamente.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let best = fallbackBol110;
        let bestDist = Infinity;
        for (const unit of policeUnits) {
          const d = haversineKm(latitude, longitude, unit.lat, unit.lng);
          if (d < bestDist) {
            bestDist = d;
            best = unit;
          }
        }
        setNearest({ unit: best, distKm: bestDist });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setGpsError("No se pudo obtener tu ubicación GPS. Respaldo activo: BOL-110.");
      },
      { timeout: 6000 },
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl glass-panel p-4 border-destructive/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-display text-sm font-bold">Emergencia SOS · Cochabamba</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Cerrar panel SOS"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {locating ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Calculando EPI o unidad policial más cercana...</span>
              </div>
            ) : nearest ? (
              <div className="rounded-xl bg-secondary/70 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{nearest.unit.name}</span>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {nearest.distKm.toFixed(1)} km
                  </span>
                </div>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {nearest.unit.address}
                </p>
                <Button asChild size="sm" variant="destructive" className="mt-2 w-full rounded-xl">
                  <a href={`tel:${nearest.unit.phone}`}>
                    <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                    Llamar {nearest.unit.phone}
                  </a>
                </Button>
              </div>
            ) : (
              gpsError && <p className="text-muted-foreground">{gpsError}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button asChild size="sm" variant="destructive" className="rounded-xl">
                <a href="tel:110">
                  <PhoneCall className="mr-1 h-3.5 w-3.5" />
                  BOL-110
                </a>
              </Button>
              <Button asChild size="sm" variant="secondary" className="rounded-xl">
                <a href="tel:119">Bomberos 119</a>
              </Button>
              <Button asChild size="sm" variant="secondary" className="rounded-xl">
                <a href="tel:116">FELCC 116</a>
              </Button>
              <Button asChild size="sm" variant="secondary" className="rounded-xl">
                <a href="tel:123">SAR 123</a>
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={locateNearest}
        className="group relative flex h-14 items-center gap-2 rounded-full bg-destructive px-5 font-display text-sm font-bold text-destructive-foreground shadow-xl transition-transform hover:scale-105 active:scale-95"
        aria-label="Botón de emergencia SOS"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-destructive-foreground animate-ping absolute left-4 opacity-70" />
        <PhoneCall className="h-4 w-4 relative" />
        <span>SOS 110</span>
      </button>
    </div>
  );
}