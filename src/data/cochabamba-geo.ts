export type DistrictType = "URBANO" | "PERIURBANO" | "RURAL" | "TIOC";

export type IndexKey =
  | "indice_general"
  | "indice_robos"
  | "indice_asesinatos"
  | "indice_derrumbes"
  | "indice_inundaciones"
  | "indice_incendios";

export interface DistrictGeo {
  id: string;
  name: string;
  code: string;
  type: DistrictType;
  population: string;
  riskScore: number;
  polygon: [number, number][];
}

export interface MunicipalityGeo {
  id: string;
  name: string;
  population: string;
  riskScore: number;
  polygon: [number, number][];
  districts: DistrictGeo[];
}

export interface ProvinceGeo {
  id: string;
  name: string;
  capital: string;
  referenceColor: string;
  referenceSide: string;
  callout?: [number, number];
  labelPos: [number, number];
  polygon: [number, number][];
  municipalities: MunicipalityGeo[];
}

export const INDEX_OPTIONS: Array<{ key: IndexKey; label: string; short: string }> = [
  { key: "indice_general", label: "Índice General de Riesgo", short: "General" },
  { key: "indice_robos", label: "Robos y Hurtos", short: "Robos" },
  { key: "indice_asesinatos", label: "Asesinatos y Homicidios", short: "Homicidios" },
  { key: "indice_derrumbes", label: "Derrumbes y Deslizamientos", short: "Derrumbes" },
  { key: "indice_inundaciones", label: "Inundaciones y Riadas", short: "Inundaciones" },
  { key: "indice_incendios", label: "Incendios y Clima", short: "Incendios" },
];

export const DISTRICT_COLORS: Record<DistrictType, { top: string; side: string; label: string }> = {
  URBANO: { top: "#0284C7", side: "#0369A1", label: "Distrito Urbano" },
  PERIURBANO: { top: "#D97706", side: "#B45309", label: "Distrito Periurbano" },
  RURAL: { top: "#0D9488", side: "#0F766E", label: "Distrito Rural" },
  TIOC: { top: "#7C3AED", side: "#5B21B6", label: "Territorio Indígena (TIOC)" },
};

export function getRiskColors(score: number): { top: string; side: string; tier: string } {
  if (score >= 75) return { top: "#E11D48", side: "#9F1239", tier: "Crítico (75–100)" };
  if (score >= 55) return { top: "#F97316", side: "#C2410C", tier: "Alto (55–74)" };
  if (score >= 35) return { top: "#EAB308", side: "#CA8A04", tier: "Moderado (35–54)" };
  return { top: "#10B981", side: "#059669", tier: "Bajo (0–34)" };
}

function bbox(poly: [number, number][]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

// Subdivides a parent polygon's bounding box into contiguous grid cells clipped aesthetically inside
function buildSubPolygons(
  parent: [number, number][],
  count: number,
): [number, number][][] {
  const b = bbox(parent);
  const cols = count <= 2 ? count : count <= 4 ? 2 : count <= 6 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const padX = b.w * 0.06;
  const padY = b.h * 0.06;
  const cellW = (b.w - padX * 2) / cols;
  const cellH = (b.h - padY * 2) / rows;
  const result: [number, number][][] = [];

  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x0 = b.minX + padX + c * cellW;
    const y0 = b.minY + padY + r * cellH;
    const x1 = x0 + cellW;
    const y1 = y0 + cellH;
    result.push([
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ]);
  }
  return result;
}

function makeDistricts(
  munId: string,
  munPoly: [number, number][],
  specs: Array<{ code: string; name: string; type: DistrictType; pop: string; risk: number }>,
): DistrictGeo[] {
  const polys = buildSubPolygons(munPoly, specs.length);
  return specs.map((s, idx) => ({
    id: `${munId}-${s.code.toLowerCase()}`,
    code: s.code,
    name: s.name,
    type: s.type,
    population: s.pop,
    riskScore: s.risk,
    polygon: polys[idx] ?? munPoly,
  }));
}

function makeMunicipalities(
  provId: string,
  provPoly: [number, number][],
  muns: Array<{
    id: string;
    name: string;
    pop: string;
    risk: number;
    districts: Array<{ code: string; name: string; type: DistrictType; pop: string; risk: number }>;
  }>,
): MunicipalityGeo[] {
  const polys = buildSubPolygons(provPoly, muns.length);
  return muns.map((m, idx) => {
    const poly = polys[idx] ?? provPoly;
    return {
      id: `${provId}-${m.id}`,
      name: m.name,
      population: m.pop,
      riskScore: m.risk,
      polygon: poly,
      districts: makeDistricts(`${provId}-${m.id}`, poly, m.districts),
    };
  });
}

// Shared-vertex contiguous polygons forming the exact silhouette of Cochabamba (viewBox 0 0 1000 720)
const P_AYOPAYA: [number, number][] = [
  [215, 28], [260, 56], [308, 76], [332, 108], [336, 152], [358, 178],
  [345, 226], [312, 246], [288, 294], [250, 318], [218, 304], [190, 322],
  [172, 288], [164, 248], [186, 206], [192, 146], [182, 86], [196, 46],
];
const P_CHAPARE: [number, number][] = [
  [332, 108], [392, 148], [462, 162], [534, 150], [588, 118], [632, 46],
  [668, 28], [708, 42], [692, 106], [648, 168], [608, 224], [552, 260],
  [486, 308], [452, 332], [412, 344], [388, 306], [364, 284], [345, 226],
  [358, 178], [336, 152],
];
const P_CARRASCO: [number, number][] = [
  [708, 42], [722, 118], [728, 188], [768, 248], [818, 296], [836, 342],
  [802, 392], [752, 434], [734, 462], [702, 434], [668, 476], [612, 444],
  [558, 412], [552, 366], [584, 316], [608, 224], [648, 168], [692, 106],
];
const P_TIRAQUE: [number, number][] = [
  [608, 224], [584, 316], [552, 366], [486, 358], [452, 332], [486, 308], [552, 260],
];
const P_QUILLACOLLO: [number, number][] = [
  [345, 226], [364, 284], [388, 306], [358, 346], [334, 386], [304, 396],
  [276, 368], [288, 294], [312, 246],
];
const P_CERCADO: [number, number][] = [
  [364, 284], [388, 306], [412, 344], [392, 366], [358, 346],
];
const P_TAPACARI: [number, number][] = [
  [218, 304], [250, 318], [288, 294], [276, 368], [304, 396], [268, 414],
  [214, 404], [174, 412], [150, 378], [166, 336], [190, 322],
];
const P_ARQUE: [number, number][] = [
  [214, 404], [268, 414], [304, 396], [316, 442], [296, 466], [244, 456], [202, 444],
];
const P_BOLIVAR: [number, number][] = [
  [202, 444], [244, 456], [296, 466], [322, 488], [282, 514], [218, 534], [184, 502], [186, 468],
];
const P_CAPINOTA: [number, number][] = [
  [304, 396], [334, 386], [358, 346], [392, 366], [382, 434], [352, 476], [322, 488], [296, 466], [316, 442],
];
const P_ESTEBAN_ARCE: [number, number][] = [
  [392, 366], [428, 384], [468, 406], [492, 448], [468, 488], [434, 502], [382, 434],
];
const P_GERMAN_JORDAN: [number, number][] = [
  [392, 366], [412, 344], [436, 356], [428, 384],
];
const P_PUNATA: [number, number][] = [
  [412, 344], [452, 332], [472, 358], [468, 406], [428, 384], [436, 356],
];
const P_ARANI: [number, number][] = [
  [452, 332], [486, 358], [552, 366], [558, 412], [492, 448], [468, 406], [472, 358],
];
const P_MIZQUE: [number, number][] = [
  [492, 448], [558, 412], [612, 444], [596, 522], [574, 594], [504, 532], [468, 488],
];
const P_CAMPERO: [number, number][] = [
  [612, 444], [668, 476], [702, 434], [734, 462], [788, 484], [818, 526],
  [838, 616], [816, 658], [736, 646], [648, 618], [574, 594], [596, 522],
];

export const COCHABAMBA_PROVINCES: ProvinceGeo[] = [
  {
    id: "ayopaya",
    name: "Ayopaya",
    capital: "Independencia",
    referenceColor: "#16A34A",
    referenceSide: "#15803D",
    labelPos: [262, 182],
    polygon: P_AYOPAYA,
    municipalities: makeMunicipalities("ayopaya", P_AYOPAYA, [
      {
        id: "independencia",
        name: "Independencia",
        pop: "23,535",
        risk: 48,
        districts: [
          { code: "D1", name: "Centro Urbano Independencia", type: "URBANO", pop: "6,200", risk: 42 },
          { code: "D2", name: "Sivingani - Calchani", type: "RURAL", pop: "8,900", risk: 54 },
          { code: "D3", name: "Machaca - Cavicavini", type: "RURAL", pop: "8,435", risk: 49 },
        ],
      },
      {
        id: "morochata",
        name: "Morochata",
        pop: "12,797",
        risk: 44,
        districts: [
          { code: "D1", name: "Morochata Central", type: "PERIURBANO", pop: "4,400", risk: 40 },
          { code: "D2", name: "Punacachi - Chinchiri", type: "RURAL", pop: "8,397", risk: 48 },
        ],
      },
      {
        id: "cocapata",
        name: "Cocapata",
        pop: "18,076",
        risk: 52,
        districts: [
          { code: "D1", name: "Cocapata Valle", type: "RURAL", pop: "9,100", risk: 50 },
          { code: "D2", name: "Altamachi TIOC", type: "TIOC", pop: "8,976", risk: 56 },
        ],
      },
    ]),
  },
  {
    id: "chapare",
    name: "Chapare",
    capital: "Sacaba",
    referenceColor: "#B45309",
    referenceSide: "#92400E",
    labelPos: [478, 212],
    polygon: P_CHAPARE,
    municipalities: makeMunicipalities("chapare", P_CHAPARE, [
      {
        id: "sacaba",
        name: "Sacaba",
        pop: "218,502",
        risk: 68,
        districts: [
          { code: "D1", name: "Distrito 1 Centro", type: "URBANO", pop: "54,200", risk: 72 },
          { code: "D2", name: "Distrito 2 Quintanilla", type: "URBANO", pop: "48,900", risk: 70 },
          { code: "D3", name: "Distrito 3 Pacata", type: "URBANO", pop: "41,300", risk: 64 },
          { code: "D4", name: "Distrito 4 Huayllani", type: "PERIURBANO", pop: "32,100", risk: 62 },
          { code: "D5", name: "Distrito 5 Lava Lava", type: "RURAL", pop: "22,000", risk: 58 },
          { code: "D6", name: "Distrito 6 Chiñata", type: "PERIURBANO", pop: "20,002", risk: 66 },
        ],
      },
      {
        id: "colomi",
        name: "Colomi",
        pop: "21,179",
        risk: 62,
        districts: [
          { code: "D1", name: "Colomi Urbano", type: "URBANO", pop: "7,100", risk: 56 },
          { code: "D2", name: "Tablas Monte", type: "RURAL", pop: "7,800", risk: 72 },
          { code: "D3", name: "Candelaria", type: "RURAL", pop: "6,279", risk: 58 },
        ],
      },
      {
        id: "villa_tunari",
        name: "Villa Tunari",
        pop: "72,623",
        risk: 82,
        districts: [
          { code: "D1", name: "Villa Tunari Centro", type: "URBANO", pop: "18,400", risk: 76 },
          { code: "D2", name: "Eterazama - Chipiriri", type: "PERIURBANO", pop: "22,100", risk: 84 },
          { code: "D3", name: "Isinuta - TIPNIS", type: "TIOC", pop: "16,900", risk: 86 },
          { code: "D4", name: "El Sillar - Cristal Mayu", type: "RURAL", pop: "15,223", risk: 88 },
        ],
      },
    ]),
  },
  {
    id: "carrasco",
    name: "Carrasco",
    capital: "Totora",
    referenceColor: "#0891B2",
    referenceSide: "#0E7490",
    labelPos: [706, 336],
    polygon: P_CARRASCO,
    municipalities: makeMunicipalities("carrasco", P_CARRASCO, [
      {
        id: "puerto_villarroel",
        name: "Puerto Villarroel",
        pop: "56,280",
        risk: 74,
        districts: [
          { code: "D1", name: "Ivirgarzama", type: "URBANO", pop: "24,500", risk: 78 },
          { code: "D2", name: "Puerto Villarroel", type: "PERIURBANO", pop: "16,800", risk: 74 },
          { code: "D3", name: "Territorio Yuqui", type: "TIOC", pop: "14,980", risk: 70 },
        ],
      },
      {
        id: "chimore",
        name: "Chimoré",
        pop: "21,623",
        risk: 66,
        districts: [
          { code: "D1", name: "Chimoré Urbano", type: "URBANO", pop: "11,200", risk: 68 },
          { code: "D2", name: "Senda 3 - Río Ichilo", type: "RURAL", pop: "10,423", risk: 64 },
        ],
      },
      {
        id: "totora",
        name: "Totora",
        pop: "14,618",
        risk: 48,
        districts: [
          { code: "D1", name: "Totora Colonial", type: "URBANO", pop: "4,800", risk: 42 },
          { code: "D2", name: "Tiraque C - Arepucho", type: "RURAL", pop: "9,818", risk: 54 },
        ],
      },
      {
        id: "entre_rios",
        name: "Entre Ríos",
        pop: "31,307",
        risk: 70,
        districts: [
          { code: "D1", name: "Entre Ríos Centro", type: "URBANO", pop: "15,400", risk: 72 },
          { code: "D2", name: "Bulo Bulo", type: "PERIURBANO", pop: "15,907", risk: 68 },
        ],
      },
    ]),
  },
  {
    id: "tiraque",
    name: "Tiraque",
    capital: "Tiraque",
    referenceColor: "#EA580C",
    referenceSide: "#C2410C",
    labelPos: [534, 306],
    polygon: P_TIRAQUE,
    municipalities: makeMunicipalities("tiraque", P_TIRAQUE, [
      {
        id: "tiraque",
        name: "Tiraque",
        pop: "21,113",
        risk: 52,
        districts: [
          { code: "D1", name: "Tiraque Centro", type: "URBANO", pop: "6,400", risk: 46 },
          { code: "D2", name: "Palca - Koari", type: "RURAL", pop: "14,713", risk: 58 },
        ],
      },
      {
        id: "shinahota",
        name: "Shinahota",
        pop: "20,841",
        risk: 64,
        districts: [
          { code: "D1", name: "Shinahota Urbano", type: "URBANO", pop: "11,200", risk: 66 },
          { code: "D2", name: "San Isidro", type: "PERIURBANO", pop: "9,641", risk: 62 },
        ],
      },
    ]),
  },
  {
    id: "quillacollo",
    name: "Quillacollo",
    capital: "Quillacollo",
    referenceColor: "#EAB308",
    referenceSide: "#CA8A04",
    labelPos: [324, 326],
    polygon: P_QUILLACOLLO,
    municipalities: makeMunicipalities("quillacollo", P_QUILLACOLLO, [
      {
        id: "quillacollo",
        name: "Quillacollo",
        pop: "165,830",
        risk: 72,
        districts: [
          { code: "D1", name: "Distrito 1 Central", type: "URBANO", pop: "42,100", risk: 76 },
          { code: "D2", name: "Distrito 2 Tacata", type: "URBANO", pop: "36,400", risk: 70 },
          { code: "D3", name: "Distrito 3 Piñami", type: "PERIURBANO", pop: "45,800", risk: 74 },
          { code: "D4", name: "Distrito 4 El Paso", type: "RURAL", pop: "41,530", risk: 64 },
        ],
      },
      {
        id: "colcapirhua",
        name: "Colcapirhua",
        pop: "66,215",
        risk: 66,
        districts: [
          { code: "D1", name: "Sumumpaya", type: "URBANO", pop: "34,200", risk: 68 },
          { code: "D2", name: "Capacachi", type: "PERIURBANO", pop: "32,015", risk: 64 },
        ],
      },
      {
        id: "tiquipaya",
        name: "Tiquipaya",
        pop: "61,839",
        risk: 62,
        districts: [
          { code: "D1", name: "Casco Viejo", type: "URBANO", pop: "28,400", risk: 58 },
          { code: "D2", name: "Torrentera Taquiña", type: "PERIURBANO", pop: "33,439", risk: 74 },
        ],
      },
      {
        id: "vinto",
        name: "Vinto",
        pop: "55,773",
        risk: 58,
        districts: [
          { code: "D1", name: "Vinto Centro", type: "URBANO", pop: "31,200", risk: 60 },
          { code: "D2", name: "Anocaraire - Pairumani", type: "RURAL", pop: "24,573", risk: 54 },
        ],
      },
      {
        id: "sipe_sipe",
        name: "Sipe Sipe",
        pop: "45,620",
        risk: 54,
        districts: [
          { code: "D1", name: "Sipe Sipe Urbano", type: "PERIURBANO", pop: "22,400", risk: 56 },
          { code: "D2", name: "Mallco Rancho - Itapaya", type: "RURAL", pop: "23,220", risk: 52 },
        ],
      },
    ]),
  },
  {
    id: "cercado",
    name: "Cercado",
    capital: "Cochabamba",
    referenceColor: "#2563EB",
    referenceSide: "#1D4ED8",
    labelPos: [382, 326],
    callout: [338, 250],
    polygon: P_CERCADO,
    municipalities: makeMunicipalities("cercado", P_CERCADO, [
      {
        id: "cochabamba",
        name: "Cochabamba (GAMC)",
        pop: "661,484",
        risk: 78,
        districts: [
          { code: "D1", name: "Comuna Tunari · D1 Mesadilla", type: "PERIURBANO", pop: "48,200", risk: 68 },
          { code: "D2", name: "Comuna Tunari · D2 Mayorazgo", type: "URBANO", pop: "62,400", risk: 70 },
          { code: "D3", name: "Comuna Molle · D3 Sarco", type: "URBANO", pop: "54,100", risk: 66 },
          { code: "D4", name: "Comuna Molle · D4 Chimba", type: "URBANO", pop: "58,300", risk: 74 },
          { code: "D5", name: "Comuna Itocta · D5 Jaihuayco", type: "URBANO", pop: "61,200", risk: 82 },
          { code: "D6", name: "Comuna Alejo Calatayud · D6", type: "URBANO", pop: "52,800", risk: 80 },
          { code: "D7", name: "Comuna Valle Hermoso · D7", type: "PERIURBANO", pop: "46,900", risk: 78 },
          { code: "D8", name: "Comuna Valle Hermoso · D8", type: "PERIURBANO", pop: "44,200", risk: 84 },
          { code: "D9", name: "Comuna Itocta · D9 Sur", type: "PERIURBANO", pop: "64,500", risk: 86 },
          { code: "D10", name: "Comuna Adela Zamudio · D10 Centro", type: "URBANO", pop: "49,800", risk: 88 },
          { code: "D11", name: "Comuna Adela Zamudio · D11 Muyurina", type: "URBANO", pop: "36,400", risk: 64 },
          { code: "D12", name: "Comuna Adela Zamudio · D12 Cala Cala", type: "URBANO", pop: "42,100", risk: 60 },
          { code: "D13", name: "Comuna Tunari · D13 Parque Tunari", type: "RURAL", pop: "14,200", risk: 72 },
          { code: "D14", name: "Comuna Valle Hermoso · D14", type: "PERIURBANO", pop: "26,384", risk: 76 },
        ],
      },
    ]),
  },
  {
    id: "tapacari",
    name: "Tapacarí",
    capital: "Tapacarí",
    referenceColor: "#1D4ED8",
    referenceSide: "#1E40AF",
    labelPos: [216, 366],
    polygon: P_TAPACARI,
    municipalities: makeMunicipalities("tapacari", P_TAPACARI, [
      {
        id: "tapacari",
        name: "Tapacarí",
        pop: "24,595",
        risk: 44,
        districts: [
          { code: "D1", name: "Tapacarí Pueblo", type: "PERIURBANO", pop: "5,200", risk: 40 },
          { code: "D2", name: "Challa - Leque", type: "RURAL", pop: "11,400", risk: 48 },
          { code: "D3", name: "Ramadas - Tuna", type: "RURAL", pop: "7,995", risk: 44 },
        ],
      },
    ]),
  },
  {
    id: "arque",
    name: "Arque",
    capital: "Arque",
    referenceColor: "#16A34A",
    referenceSide: "#15803D",
    labelPos: [262, 434],
    polygon: P_ARQUE,
    municipalities: makeMunicipalities("arque", P_ARQUE, [
      {
        id: "arque",
        name: "Arque",
        pop: "10,597",
        risk: 38,
        districts: [
          { code: "D1", name: "Arque Central", type: "RURAL", pop: "5,400", risk: 36 },
          { code: "D2", name: "Colcha", type: "RURAL", pop: "5,197", risk: 40 },
        ],
      },
      {
        id: "tacopaya",
        name: "Tacopaya",
        pop: "10,253",
        risk: 40,
        districts: [
          { code: "D1", name: "Tacopaya", type: "RURAL", pop: "5,600", risk: 42 },
          { code: "D2", name: "Ventilla", type: "RURAL", pop: "4,653", risk: 38 },
        ],
      },
    ]),
  },
  {
    id: "bolivar",
    name: "Bolívar",
    capital: "Bolívar",
    referenceColor: "#F97316",
    referenceSide: "#C2410C",
    labelPos: [250, 494],
    polygon: P_BOLIVAR,
    municipalities: makeMunicipalities("bolivar", P_BOLIVAR, [
      {
        id: "bolivar",
        name: "Bolívar",
        pop: "7,279",
        risk: 32,
        districts: [
          { code: "D1", name: "Bolívar Urbano", type: "RURAL", pop: "3,400", risk: 30 },
          { code: "D2", name: "Carpani - Yarvicoya", type: "RURAL", pop: "3,879", risk: 34 },
        ],
      },
    ]),
  },
  {
    id: "capinota",
    name: "Capinota",
    capital: "Capinota",
    referenceColor: "#DC2626",
    referenceSide: "#B91C1C",
    labelPos: [350, 424],
    polygon: P_CAPINOTA,
    municipalities: makeMunicipalities("capinota", P_CAPINOTA, [
      {
        id: "capinota",
        name: "Capinota",
        pop: "19,392",
        risk: 44,
        districts: [
          { code: "D1", name: "Capinota Central", type: "URBANO", pop: "9,800", risk: 46 },
          { code: "D2", name: "Irpa Irpa", type: "PERIURBANO", pop: "9,592", risk: 42 },
        ],
      },
      {
        id: "santivanez",
        name: "Santiváñez",
        pop: "6,527",
        risk: 38,
        districts: [
          { code: "D1", name: "Parque Industrial Santiváñez", type: "PERIURBANO", pop: "3,800", risk: 42 },
          { code: "D2", name: "Poquera", type: "RURAL", pop: "2,727", risk: 34 },
        ],
      },
      {
        id: "sicaya",
        name: "Sicaya",
        pop: "3,740",
        risk: 34,
        districts: [
          { code: "D1", name: "Sicaya Valle", type: "RURAL", pop: "3,740", risk: 34 },
        ],
      },
    ]),
  },
  {
    id: "esteban_arce",
    name: "Esteban Arce",
    capital: "Tarata",
    referenceColor: "#94A3B8",
    referenceSide: "#64748B",
    labelPos: [432, 434],
    polygon: P_ESTEBAN_ARCE,
    municipalities: makeMunicipalities("esteban_arce", P_ESTEBAN_ARCE, [
      {
        id: "tarata",
        name: "Tarata",
        pop: "8,242",
        risk: 36,
        districts: [
          { code: "D1", name: "Tarata Histórico", type: "URBANO", pop: "4,600", risk: 34 },
          { code: "D2", name: "Huayculi", type: "RURAL", pop: "3,642", risk: 38 },
        ],
      },
      {
        id: "anzaldo",
        name: "Anzaldo",
        pop: "7,192",
        risk: 38,
        districts: [
          { code: "D1", name: "Anzaldo Central", type: "RURAL", pop: "7,192", risk: 38 },
        ],
      },
      {
        id: "arbieto",
        name: "Arbieto",
        pop: "17,352",
        risk: 44,
        districts: [
          { code: "D1", name: "Arbieto - La Angostura", type: "PERIURBANO", pop: "17,352", risk: 44 },
        ],
      },
      {
        id: "sacabamba",
        name: "Sacabamba",
        pop: "4,366",
        risk: 32,
        districts: [
          { code: "D1", name: "Sacabamba", type: "RURAL", pop: "4,366", risk: 32 },
        ],
      },
    ]),
  },
  {
    id: "german_jordan",
    name: "Germán Jordán",
    capital: "Cliza",
    referenceColor: "#22C55E",
    referenceSide: "#16A34A",
    labelPos: [414, 366],
    callout: [414, 290],
    polygon: P_GERMAN_JORDAN,
    municipalities: makeMunicipalities("german_jordan", P_GERMAN_JORDAN, [
      {
        id: "cliza",
        name: "Cliza",
        pop: "21,743",
        risk: 52,
        districts: [
          { code: "D1", name: "Cliza Urbano", type: "URBANO", pop: "12,400", risk: 54 },
          { code: "D2", name: "Ucureña", type: "PERIURBANO", pop: "9,343", risk: 48 },
        ],
      },
      {
        id: "toco",
        name: "Toco",
        pop: "7,057",
        risk: 42,
        districts: [
          { code: "D1", name: "Toco", type: "RURAL", pop: "7,057", risk: 42 },
        ],
      },
      {
        id: "tolata",
        name: "Tolata",
        pop: "5,542",
        risk: 46,
        districts: [
          { code: "D1", name: "Tolata", type: "PERIURBANO", pop: "5,542", risk: 46 },
        ],
      },
    ]),
  },
  {
    id: "punata",
    name: "Punata",
    capital: "Punata",
    referenceColor: "#06B6D4",
    referenceSide: "#0891B2",
    labelPos: [452, 368],
    callout: [478, 286],
    polygon: P_PUNATA,
    municipalities: makeMunicipalities("punata", P_PUNATA, [
      {
        id: "punata",
        name: "Punata",
        pop: "28,707",
        risk: 56,
        districts: [
          { code: "D1", name: "Punata Centro", type: "URBANO", pop: "17,200", risk: 58 },
          { code: "D2", name: "Villa Capinota - Camacho", type: "PERIURBANO", pop: "11,507", risk: 52 },
        ],
      },
      {
        id: "san_benito",
        name: "San Benito",
        pop: "13,562",
        risk: 48,
        districts: [
          { code: "D1", name: "San Benito", type: "PERIURBANO", pop: "13,562", risk: 48 },
        ],
      },
      {
        id: "villa_rivero",
        name: "Villa Rivero",
        pop: "8,135",
        risk: 40,
        districts: [
          { code: "D1", name: "Villa Rivero", type: "RURAL", pop: "8,135", risk: 40 },
        ],
      },
    ]),
  },
  {
    id: "arani",
    name: "Arani",
    capital: "Arani",
    referenceColor: "#FACC15",
    referenceSide: "#CA8A04",
    labelPos: [514, 392],
    callout: [552, 396],
    polygon: P_ARANI,
    municipalities: makeMunicipalities("arani", P_ARANI, [
      {
        id: "arani",
        name: "Arani",
        pop: "9,504",
        risk: 36,
        districts: [
          { code: "D1", name: "Arani Urbano", type: "URBANO", pop: "4,900", risk: 34 },
          { code: "D2", name: "Pocoata", type: "RURAL", pop: "4,604", risk: 38 },
        ],
      },
      {
        id: "vacas",
        name: "Vacas",
        pop: "8,940",
        risk: 34,
        districts: [
          { code: "D1", name: "Vacas Lagunas", type: "RURAL", pop: "8,940", risk: 34 },
        ],
      },
    ]),
  },
  {
    id: "mizque",
    name: "Mizque",
    capital: "Mizque",
    referenceColor: "#16A34A",
    referenceSide: "#15803D",
    labelPos: [544, 496],
    polygon: P_MIZQUE,
    municipalities: makeMunicipalities("mizque", P_MIZQUE, [
      {
        id: "mizque",
        name: "Mizque",
        pop: "26,680",
        risk: 50,
        districts: [
          { code: "D1", name: "Mizque Centro", type: "URBANO", pop: "9,200", risk: 48 },
          { code: "D2", name: "AIOC Raqaypampa", type: "TIOC", pop: "7,344", risk: 54 },
          { code: "D3", name: "Tin Tin - Molinero", type: "RURAL", pop: "10,136", risk: 48 },
        ],
      },
      {
        id: "vila_vila",
        name: "Vila Vila",
        pop: "5,459",
        risk: 44,
        districts: [
          { code: "D1", name: "Vila Vila", type: "RURAL", pop: "5,459", risk: 44 },
        ],
      },
      {
        id: "alayco",
        name: "Alalay",
        pop: "3,447",
        risk: 42,
        districts: [
          { code: "D1", name: "Alalay", type: "RURAL", pop: "3,447", risk: 42 },
        ],
      },
    ]),
  },
  {
    id: "campero",
    name: "Campero",
    capital: "Aiquile",
    referenceColor: "#E11D48",
    referenceSide: "#BE123C",
    labelPos: [718, 560],
    polygon: P_CAMPERO,
    municipalities: makeMunicipalities("campero", P_CAMPERO, [
      {
        id: "aiquile",
        name: "Aiquile",
        pop: "23,267",
        risk: 60,
        districts: [
          { code: "D1", name: "Aiquile Urbano", type: "URBANO", pop: "10,400", risk: 58 },
          { code: "D2", name: "Quiroga - Villa Granado", type: "RURAL", pop: "12,867", risk: 62 },
        ],
      },
      {
        id: "pasorapa",
        name: "Pasorapa",
        pop: "6,696",
        risk: 54,
        districts: [
          { code: "D1", name: "Pasorapa", type: "RURAL", pop: "6,696", risk: 54 },
        ],
      },
      {
        id: "omereque",
        name: "Omereque",
        pop: "5,643",
        risk: 56,
        districts: [
          { code: "D1", name: "Omereque", type: "RURAL", pop: "5,643", risk: 56 },
        ],
      },
    ]),
  },
];

export const ROAD_CORRIDORS: Array<{ id: string; name: string; status: "normal" | "alerta"; path: string }> = [
  {
    id: "f4-norte",
    name: "Ruta F-4 (Cochabamba – Villa Tunari – Puerto Villarroel)",
    status: "alerta",
    path: "M 190 278 Q 290 264 382 324 Q 422 254 478 168 Q 560 156 645 154 L 800 154",
  },
  {
    id: "f7-sur",
    name: "Ruta F-7 (Cochabamba – Epizana – Santa Cruz)",
    status: "normal",
    path: "M 382 324 Q 446 352 518 380 Q 618 408 796 436",
  },
];

export const NEIGHBOR_LABELS: Array<{ name: string; x: number; y: number }> = [
  { name: "BENI", x: 108, y: 104 },
  { name: "ORURO", x: 76, y: 462 },
  { name: "POTOSÍ", x: 158, y: 636 },
  { name: "CHUQUISACA", x: 662, y: 690 },
  { name: "SANTA CRUZ", x: 932, y: 506 },
];

export const MAP_BEACONS: Array<{
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  provinceId: string;
}> = [
  { id: "b-sillar", label: "El Sillar · Corte F-4", x: 478, y: 168, color: "#F43F5E", provinceId: "chapare" },
  { id: "b-villarroel", label: "Puerto Villarroel · Alerta", x: 626, y: 152, color: "#F97316", provinceId: "carrasco" },
  { id: "b-cercado", label: "Eje Metropolitano", x: 382, y: 324, color: "#38BDF8", provinceId: "cercado" },
];