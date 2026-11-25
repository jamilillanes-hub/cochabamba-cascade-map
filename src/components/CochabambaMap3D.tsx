import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ChevronRight,
  MapPin,
  Building2,
  Palette,
} from "lucide-react";
import {
  COCHABAMBA_PROVINCES,
  DISTRICT_COLORS,
  INDEX_OPTIONS,
  MAP_BEACONS,
  NEIGHBOR_LABELS,
  ROAD_CORRIDORS,
  getRiskColors,
  type DistrictGeo,
  type IndexKey,
  type MunicipalityGeo,
  type ProvinceGeo,
} from "@/data/cochabamba-geo";

export type ProvinceIndicesMap = Record<
  string,
  {
    indice_general: number;
    indice_robos: number;
    indice_asesinatos: number;
    indice_derrumbes: number;
    indice_inundaciones: number;
    indice_incendios: number;
    fuente_oficial: string;
  }
>;

interface CochabambaMap3DProps {
  indicesByProvince: ProvinceIndicesMap;
  reportCountsByProvince: Record<string, number>;
}

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 4.2;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function polyPoints(pts: [number, number][], dy = 0): string {
  return pts.map(([x, y]) => `${x},${y + dy}`).join(" ");
}

function polyCentroid(pts: [number, number][]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  const n = pts.length || 1;
  return [sx / n, sy / n];
}

export function CochabambaMap3D({
  indicesByProvince,
  reportCountsByProvince,
}: CochabambaMap3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Free 3D camera state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.05);
  const [pitch, setPitch] = useState(32); // 0° top-down to 68° oblique 3D
  const [yaw, setYaw] = useState(-6); // 360° free rotation

  // Map mode & drill-down state
  const [activeIndex, setActiveIndex] = useState<IndexKey>("indice_general");
  const [colorMode, setColorMode] = useState<"reference" | "index">("reference");
  const [hoveredProvId, setHoveredProvId] = useState<string | null>(null);
  const [selectedProvId, setSelectedProvId] = useState<string | null>(null);
  const [selectedMunId, setSelectedMunId] = useState<string | null>(null);
  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);

  // Drag tracking
  const dragRef = useRef<{
    active: boolean;
    mode: "pan" | "orbit";
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    origYaw: number;
    origPitch: number;
    moved: boolean;
  }>({
    active: false,
    mode: "pan",
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
    origYaw: 0,
    origPitch: 0,
    moved: false,
  });

  const selectedProvince: ProvinceGeo | null = useMemo(
    () => COCHABAMBA_PROVINCES.find((p) => p.id === selectedProvId) ?? null,
    [selectedProvId],
  );

  const selectedMunicipality: MunicipalityGeo | null = useMemo(
    () => selectedProvince?.municipalities.find((m) => m.id === selectedMunId) ?? null,
    [selectedProvince, selectedMunId],
  );

  const selectedDistrict: DistrictGeo | null = useMemo(
    () => selectedMunicipality?.districts.find((d) => d.id === selectedDistId) ?? null,
    [selectedMunicipality, selectedDistId],
  );

  // Wheel zoom anchored at cursor (non-passive native listener)
  const wheelStateRef = useRef({ zoom, pan });
  wheelStateRef.current = { zoom, pan };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const { zoom: curZoom, pan: curPan } = wheelStateRef.current;
      const nextZoom = clamp(curZoom * Math.exp(-dy * 0.0015), MIN_ZOOM, MAX_ZOOM);
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      const k = nextZoom / curZoom;
      setZoom(nextZoom);
      setPan({
        x: px - (px - curPan.x) * k,
        y: py - (py - curPan.y) * k,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Keyboard free-movement controls (WASD, arrows, Q/E rotate, R/F pitch, +/- zoom)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const step = 36;
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          setPan((p) => ({ ...p, y: p.y + step }));
          break;
        case "s":
        case "arrowdown":
          setPan((p) => ({ ...p, y: p.y - step }));
          break;
        case "a":
        case "arrowleft":
          setPan((p) => ({ ...p, x: p.x + step }));
          break;
        case "d":
        case "arrowright":
          setPan((p) => ({ ...p, x: p.x - step }));
          break;
        case "q":
          setYaw((y) => y - 10);
          break;
        case "e":
          setYaw((y) => y + 10);
          break;
        case "r":
          setPitch((p) => clamp(p + 6, 0, 68));
          break;
        case "f":
          setPitch((p) => clamp(p - 6, 0, 68));
          break;
        case "+":
        case "=":
          setZoom((z) => clamp(z * 1.15, MIN_ZOOM, MAX_ZOOM));
          break;
        case "-":
          setZoom((z) => clamp(z / 1.15, MIN_ZOOM, MAX_ZOOM));
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-map-ui='true']")) return;
    const isOrbit = e.button === 2 || e.shiftKey;
    dragRef.current = {
      active: true,
      mode: isOrbit ? "orbit" : "pan",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      origYaw: yaw,
      origPitch: pitch,
      moved: false,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    if (dragRef.current.mode === "orbit") {
      setYaw(dragRef.current.origYaw + dx * 0.35);
      setPitch(clamp(dragRef.current.origPitch - dy * 0.25, 0, 68));
    } else {
      setPan({
        x: dragRef.current.origPanX + dx,
        y: dragRef.current.origPanY + dy,
      });
    }
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const resetCamera = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1.05);
    setPitch(32);
    setYaw(-6);
    setSelectedProvId(null);
    setSelectedMunId(null);
    setSelectedDistId(null);
  };

  const getProvinceScore = (provId: string): number => {
    const row = indicesByProvince[provId];
    if (!row) return 45;
    return row[activeIndex] ?? 45;
  };

  const handleProvinceClick = (prov: ProvinceGeo) => {
    if (dragRef.current.moved) return;
    setSelectedProvId(prov.id);
    setSelectedMunId(null);
    setSelectedDistId(null);
    // Gently center toward selected province
    const [cx, cy] = polyCentroid(prov.polygon);
    setPan({ x: (500 - cx) * 1.1, y: (360 - cy) * 0.9 });
    setZoom((z) => clamp(Math.max(z, 1.55), MIN_ZOOM, MAX_ZOOM));
  };

  const handleMunicipalityClick = (mun: MunicipalityGeo) => {
    if (dragRef.current.moved) return;
    setSelectedMunId(mun.id);
    setSelectedDistId(null);
    const [cx, cy] = polyCentroid(mun.polygon);
    setPan({ x: (500 - cx) * 1.65, y: (360 - cy) * 1.35 });
    setZoom((z) => clamp(Math.max(z, 2.2), MIN_ZOOM, MAX_ZOOM));
  };

  // Histogram data for bottom-right card
  const histogramItems = useMemo(() => {
    if (selectedMunicipality) {
      return selectedMunicipality.districts
        .map((d) => ({
          id: d.id,
          label: d.code,
          score: d.riskScore,
          color: DISTRICT_COLORS[d.type].top,
        }))
        .sort((a, b) => a.score - b.score);
    }
    if (selectedProvince) {
      return selectedProvince.municipalities
        .map((m) => ({
          id: m.id,
          label: m.name.slice(0, 6),
          score: m.riskScore,
          color: getRiskColors(m.riskScore).top,
        }))
        .sort((a, b) => a.score - b.score);
    }
    return COCHABAMBA_PROVINCES.map((p) => {
      const score = getProvinceScore(p.id);
      return {
        id: p.id,
        label: p.name.slice(0, 4),
        score,
        color: colorMode === "reference" ? p.referenceColor : getRiskColors(score).top,
      };
    }).sort((a, b) => a.score - b.score);
  }, [selectedProvince, selectedMunicipality, activeIndex, indicesByProvince, colorMode]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-[calc(100vh-3.75rem)] min-h-[600px] w-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Top Floating Index Pill Bar */}
      <div
        data-map-ui="true"
        className="pointer-events-auto absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-1 rounded-full glass-pill p-1">
          {INDEX_OPTIONS.map((opt) => {
            const isActive = activeIndex === opt.key && colorMode === "index";
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setActiveIndex(opt.key);
                  setColorMode("index");
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-foreground text-background shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.short}
              </button>
            );
          })}
          <button
            onClick={() => setColorMode(colorMode === "reference" ? "index" : "reference")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              colorMode === "reference"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Alternar colores de referencia de Cochabamba"
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Oficial</span>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 rounded-full glass-pill px-3.5 py-1.5 text-xs">
          <button
            onClick={() => {
              setSelectedProvId(null);
              setSelectedMunId(null);
              setSelectedDistId(null);
              setPan({ x: 0, y: 0 });
              setZoom(1.05);
            }}
            className={`font-medium transition-colors ${
              !selectedProvince ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cochabamba (16)
          </button>
          {selectedProvince && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => {
                  setSelectedMunId(null);
                  setSelectedDistId(null);
                }}
                className={`font-medium transition-colors ${
                  !selectedMunicipality
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {selectedProvince.name}
              </button>
            </>
          )}
          {selectedMunicipality && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-primary">{selectedMunicipality.name}</span>
            </>
          )}
        </div>
      </div>

      {/* 3D Interactive Stage */}
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ perspective: "1350px" }}
      >
        <div
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotateX(${pitch}deg) rotateZ(${yaw}deg)`,
            transformStyle: "preserve-3d",
            transition: dragRef.current.active ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="relative w-[960px] max-w-none"
        >
          <svg
            viewBox="0 0 1000 720"
            className="h-auto w-full overflow-visible drop-shadow-[0_32px_48px_rgba(0,0,0,0.85)]"
          >
            <defs>
              <radialGradient id="obsidian-glow" cx="50%" cy="48%" r="55%">
                <stop offset="0%" stopColor="#161d2e" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#07080b" stopOpacity="0.1" />
              </radialGradient>
              <filter id="road-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="prov-glow" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.65" />
              </filter>
            </defs>

            {/* Subtle Topographic Contour Rings */}
            <g opacity="0.32" fill="none" stroke="#334155" strokeWidth="0.7">
              <ellipse cx="480" cy="360" rx="440" ry="300" strokeDasharray="3 6" />
              <ellipse cx="480" cy="360" rx="350" ry="230" />
              <ellipse cx="470" cy="350" rx="250" ry="165" strokeDasharray="2 5" />
              <ellipse cx="450" cy="340" rx="150" ry="100" />
            </g>

            {/* Neighbor Department Dashed Borders */}
            <g stroke="#475569" strokeWidth="1" strokeDasharray="5 5" opacity="0.45" fill="none">
              <path d="M 140 10 L 185 88 M 30 140 L 165 245 M 20 390 L 152 378 M 60 565 L 184 502 M 380 710 L 468 488 M 820 658 L 960 670 M 836 342 L 980 390 M 708 42 L 850 10" />
            </g>

            {NEIGHBOR_LABELS.map((n) => (
              <text
                key={n.name}
                x={n.x}
                y={n.y}
                fill="#94A3B8"
                fontSize="13"
                fontWeight="600"
                letterSpacing="0.22em"
                opacity="0.6"
                textAnchor="middle"
              >
                {n.name}
              </text>
            ))}

            {/* Contiguous 16 Provinces Extruded 3D Prisms */}
            <g filter="url(#prov-glow)">
              {COCHABAMBA_PROVINCES.map((prov) => {
                const score = getProvinceScore(prov.id);
                const riskColors = getRiskColors(score);
                const isSelected = selectedProvId === prov.id;
                const isHovered = hoveredProvId === prov.id;
                const dimmed = selectedProvId !== null && !isSelected;

                const topColor = dimmed
                  ? "#141821"
                  : colorMode === "reference"
                    ? prov.referenceColor
                    : riskColors.top;
                const sideColor = dimmed
                  ? "#0c0f16"
                  : colorMode === "reference"
                    ? prov.referenceSide
                    : riskColors.side;

                const baseExtrude = 8 + Math.round((score / 100) * 14);
                const lift = isSelected ? 12 : isHovered ? 6 : 0;
                const extrudeDepth = dimmed ? 4 : baseExtrude + lift;

                return (
                  <g
                    key={prov.id}
                    onMouseEnter={() => setHoveredProvId(prov.id)}
                    onMouseLeave={() => setHoveredProvId(null)}
                    onClick={() => handleProvinceClick(prov)}
                    className="cursor-pointer transition-opacity duration-300"
                  >
                    {/* Extruded 3D Side Wall */}
                    <polygon
                      points={polyPoints(prov.polygon, extrudeDepth)}
                      fill={sideColor}
                      stroke="rgba(0,0,0,0.45)"
                      strokeWidth="0.9"
                    />
                    {/* Satin Top Face */}
                    <polygon
                      points={polyPoints(prov.polygon, -lift)}
                      fill={topColor}
                      fillOpacity={dimmed ? 0.85 : isSelected ? 0.96 : 0.9}
                      stroke={
                        isSelected || isHovered
                          ? "#FFFFFF"
                          : dimmed
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(255,255,255,0.42)"
                      }
                      strokeWidth={isSelected || isHovered ? 2 : 1.1}
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>

            {/* Level 2: Municipalities inside the Selected Province */}
            {selectedProvince && (
              <g>
                {selectedProvince.municipalities.map((mun) => {
                  const isMunSelected = selectedMunId === mun.id;
                  const munDimmed = selectedMunId !== null && !isMunSelected;
                  const rc = getRiskColors(mun.riskScore);
                  const [mx, my] = polyCentroid(mun.polygon);

                  return (
                    <g
                      key={mun.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMunicipalityClick(mun);
                      }}
                      className="cursor-pointer"
                    >
                      <polygon
                        points={polyPoints(mun.polygon, -14)}
                        fill={munDimmed ? "#1e293b" : rc.top}
                        fillOpacity={munDimmed ? 0.72 : 0.92}
                        stroke={isMunSelected ? "#FBBF24" : "#FFFFFF"}
                        strokeWidth={isMunSelected ? 2.2 : 1.2}
                        strokeLinejoin="round"
                      />
                      {!selectedMunicipality && (
                        <text
                          x={mx}
                          y={my - 12}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="9.5"
                          fontWeight="700"
                          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}
                        >
                          {mun.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Level 3: Districts / Comunas inside the Selected Municipality */}
            {selectedMunicipality && (
              <g>
                {selectedMunicipality.districts.map((dist) => {
                  const dc = DISTRICT_COLORS[dist.type];
                  const isDistSelected = selectedDistId === dist.id;
                  const [dx, dy] = polyCentroid(dist.polygon);

                  return (
                    <g
                      key={dist.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDistId(dist.id);
                      }}
                      className="cursor-pointer"
                    >
                      <polygon
                        points={polyPoints(dist.polygon, -18)}
                        fill={dc.top}
                        fillOpacity={isDistSelected ? 1 : 0.9}
                        stroke={isDistSelected ? "#FBBF24" : "#FFFFFF"}
                        strokeWidth={isDistSelected ? 2 : 0.9}
                      />
                      <text
                        x={dx}
                        y={dy - 16}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="7.5"
                        fontWeight="700"
                        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
                      >
                        {dist.code}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Golden Road Corridors (F-4 & F-7) */}
            {!selectedMunicipality && (
              <g fill="none" strokeLinecap="round" pointerEvents="none">
                {ROAD_CORRIDORS.map((road) => (
                  <g key={road.id}>
                    <path
                      d={road.path}
                      stroke={road.status === "alerta" ? "rgba(244,63,94,0.35)" : "rgba(251,191,36,0.28)"}
                      strokeWidth="6"
                      filter="url(#road-glow)"
                    />
                    <path
                      d={road.path}
                      stroke={road.status === "alerta" ? "#F43F5E" : "#FBBF24"}
                      strokeWidth="2.2"
                    />
                  </g>
                ))}
              </g>
            )}

            {/* 3D Volumetric Beacons */}
            {!selectedMunicipality &&
              MAP_BEACONS.map((b) => (
                <g key={b.id} pointerEvents="none">
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r="9"
                    fill="none"
                    stroke={b.color}
                    strokeWidth="1.5"
                    className="animate-beacon"
                  />
                  <line
                    x1={b.x}
                    y1={b.y}
                    x2={b.x}
                    y2={b.y - 26}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="1.2"
                  />
                  <circle cx={b.x} cy={b.y - 28} r="5.5" fill={b.color} stroke="#FFFFFF" strokeWidth="1.4" />
                </g>
              ))}

            {/* Province Labels & Callout Leader Lines */}
            {!selectedProvince &&
              COCHABAMBA_PROVINCES.map((prov) => {
                const [lx, ly] = prov.labelPos;
                const hasCallout = Boolean(prov.callout);
                const [tx, ty] = prov.callout ?? prov.labelPos;

                return (
                  <g key={`lbl-${prov.id}`} pointerEvents="none">
                    {hasCallout && (
                      <>
                        <circle cx={lx} cy={ly} r="3.5" fill="#F8FAFC" stroke="#08090C" strokeWidth="1.5" />
                        <line
                          x1={lx}
                          y1={ly}
                          x2={tx}
                          y2={ty}
                          stroke="rgba(255,255,255,0.55)"
                          strokeWidth="1"
                        />
                      </>
                    )}
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="12"
                      fontWeight="700"
                      style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}
                    >
                      {prov.name}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
      </div>

      {/* Left Inspector Panel: Municipalities & Districts Drill-down */}
      <div
        data-map-ui="true"
        className="pointer-events-auto absolute top-20 left-4 z-20 w-72 max-h-[calc(100%-8rem)] overflow-y-auto rounded-2xl glass-panel p-4 space-y-3"
      >
        {!selectedProvince ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-foreground">
                Cochabamba · 16 Provincias
              </h2>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                3D Libre
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Arrastra para moverte libremente, usa la rueda para acercar, o Shift + arrastre para
              girar 360° e inclinar. Toca cualquier provincia para ver sus municipios.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {COCHABAMBA_PROVINCES.map((prov) => {
                const score = getProvinceScore(prov.id);
                const rc = getRiskColors(score);
                return (
                  <button
                    key={prov.id}
                    onClick={() => handleProvinceClick(prov)}
                    className="flex items-center justify-between rounded-lg bg-secondary/60 px-2.5 py-1.5 text-left text-[11px] hover:bg-accent transition-colors"
                  >
                    <span className="truncate font-medium text-foreground">{prov.name}</span>
                    <span
                      className="ml-1 font-mono text-[10px] font-bold"
                      style={{ color: rc.top }}
                    >
                      {score}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : !selectedMunicipality ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                  Provincia
                </span>
                <h2 className="font-display text-base font-bold text-foreground">
                  {selectedProvince.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProvId(null)}
                className="rounded-lg bg-secondary px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Volver
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Capital: {selectedProvince.capital}</span>
              <span className="font-semibold text-primary">
                {reportCountsByProvince[selectedProvince.id] ?? 0} reportes
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Municipios ({selectedProvince.municipalities.length}) — Toca para ver distritos
              </p>
              {selectedProvince.municipalities.map((mun) => {
                const rc = getRiskColors(mun.riskScore);
                return (
                  <button
                    key={mun.id}
                    onClick={() => handleMunicipalityClick(mun)}
                    className="flex w-full items-center justify-between rounded-xl bg-secondary/70 px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span>{mun.name}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {mun.districts.length} distritos · {mun.population} hab.
                      </span>
                    </div>
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-bold text-background"
                      style={{ backgroundColor: rc.top }}
                    >
                      {mun.riskScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                  Municipio · {selectedProvince.name}
                </span>
                <h2 className="font-display text-base font-bold text-foreground">
                  {selectedMunicipality.name}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedMunId(null);
                  setSelectedDistId(null);
                }}
                className="rounded-lg bg-secondary px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Municipios
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Distritos y Comunas ({selectedMunicipality.districts.length})
              </p>
              {selectedMunicipality.districts.map((dist) => {
                const dc = DISTRICT_COLORS[dist.type];
                const isSelected = selectedDistId === dist.id;
                return (
                  <button
                    key={dist.id}
                    onClick={() => setSelectedDistId(dist.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      isSelected ? "bg-primary/20 border border-primary/50" : "bg-secondary/70 hover:bg-accent"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <MapPin className="h-3 w-3 shrink-0" style={{ color: dc.top }} />
                        <span className="truncate">{dist.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {dc.label} · {dist.population} hab.
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: dc.top }}
                    >
                      {dist.code}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDistrict && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs space-y-1">
                <div className="font-semibold text-foreground">{selectedDistrict.name}</div>
                <div className="text-muted-foreground">
                  Categoría: {DISTRICT_COLORS[selectedDistrict.type].label}
                </div>
                <div className="text-muted-foreground">
                  Índice local: <strong className="text-primary">{selectedDistrict.riskScore}/100</strong>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom-Left Camera Controls */}
      <div
        data-map-ui="true"
        className="pointer-events-auto absolute bottom-5 left-4 z-20 flex items-center gap-1.5 rounded-full glass-pill p-1.5"
      >
        <button
          onClick={() => setZoom((z) => clamp(z * 1.2, MIN_ZOOM, MAX_ZOOM))}
          className="rounded-full p-2 text-foreground hover:bg-accent"
          title="Acercar (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => clamp(z / 1.2, MIN_ZOOM, MAX_ZOOM))}
          className="rounded-full p-2 text-foreground hover:bg-accent"
          title="Alejar (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPitch((p) => (p > 10 ? 0 : 38))}
          className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent flex items-center gap-1"
          title="Alternar vista 3D / 2D"
        >
          <Layers className="h-3.5 w-3.5 text-primary" />
          {pitch > 10 ? "3D" : "2D"}
        </button>
        <button
          onClick={() => setYaw((y) => y + 25)}
          className="rounded-full p-2 text-foreground hover:bg-accent"
          title="Girar mapa (Q/E)"
        >
          <Compass className="h-4 w-4" />
        </button>
        <button
          onClick={resetCamera}
          className="rounded-full p-2 text-foreground hover:bg-accent"
          title="Restablecer vista"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom-Right Live Histogram Legend */}
      <div
        data-map-ui="true"
        className="pointer-events-auto absolute bottom-22 right-5 z-20 hidden sm:block w-72 rounded-2xl glass-panel p-3.5"
      >
        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="font-semibold text-foreground">
            {selectedMunicipality
              ? `Distritos · ${selectedMunicipality.name}`
              : selectedProvince
                ? `Municipios · ${selectedProvince.name}`
                : "Distribución 16 Provincias"}
          </span>
          <span className="text-muted-foreground">0–100</span>
        </div>
        <div className="flex h-16 items-end gap-1">
          {histogramItems.map((item) => (
            <div key={item.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(12, Math.round((item.score / 100) * 52))}px`,
                  backgroundColor: item.color,
                }}
                title={`${item.label}: ${item.score}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-risk-low" /> Bajo
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-risk-medium" /> Moderado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-risk-high" /> Alto
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-risk-critical" /> Crítico
          </span>
        </div>
      </div>
    </div>
  );
}