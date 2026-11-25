export interface EmergencyUnit {
  id: string;
  name: string;
  category: "policia" | "hospital" | "bomberos" | "rescate" | "servicios";
  phone: string;
  address: string;
  province: string;
  lat: number;
  lng: number;
  hours: string;
}

export const EMERGENCY_DIRECTORY: EmergencyUnit[] = [
  { id: "bol-110", name: "Radio Patrullas BOL-110", category: "policia", phone: "110", address: "Av. Heroínas y San Martín, Cercado", province: "Cercado", lat: -17.3935, lng: -66.157, hours: "24/7" },
  { id: "epi-central", name: "EPI Central · Policía Boliviana", category: "policia", phone: "44251660", address: "Plaza Colón, Cercado", province: "Cercado", lat: -17.386, lng: -66.156, hours: "24/7" },
  { id: "epi-norte", name: "EPI Norte · Coña Coña", category: "policia", phone: "44401110", address: "Av. Blanco Galindo Km 4", province: "Cercado", lat: -17.394, lng: -66.192, hours: "24/7" },
  { id: "epi-sur", name: "EPI Sur · Alalay", category: "policia", phone: "44221110", address: "Av. Petrolera Km 3", province: "Cercado", lat: -17.425, lng: -66.142, hours: "24/7" },
  { id: "epi-quillacollo", name: "Comando Regional Quillacollo", category: "policia", phone: "44260110", address: "Plaza 15 de Agosto, Quillacollo", province: "Quillacollo", lat: -17.392, lng: -66.278, hours: "24/7" },
  { id: "epi-sacaba", name: "EPI Sacaba · Chapare", category: "policia", phone: "44701110", address: "Plaza 6 de Agosto, Sacaba", province: "Chapare", lat: -17.404, lng: -66.041, hours: "24/7" },
  { id: "felcc", name: "FELCC Cochabamba", category: "policia", phone: "116", address: "Av. Ayacucho y Heroínas", province: "Cercado", lat: -17.394, lng: -66.159, hours: "24/7" },
  { id: "transito", name: "Organismo Operativo de Tránsito", category: "policia", phone: "111", address: "Av. Oquendo", province: "Cercado", lat: -17.391, lng: -66.148, hours: "24/7" },
  { id: "diprove", name: "DIPROVE (Robo de Vehículos)", category: "policia", phone: "115", address: "Zona Sud, Cercado", province: "Cercado", lat: -17.412, lng: -66.155, hours: "24/7" },
  { id: "viedma", name: "Hospital Clínico Viedma", category: "hospital", phone: "44220225", address: "Av. Aniceto Arce", province: "Cercado", lat: -17.388, lng: -66.146, hours: "24/7" },
  { id: "urquidi", name: "Maternológico Germán Urquidi", category: "hospital", phone: "44220230", address: "Av. Oquendo y Venezuela", province: "Cercado", lat: -17.387, lng: -66.147, hours: "24/7" },
  { id: "patino", name: "Hospital Pediátrico Albina Patiño", category: "hospital", phone: "44225480", address: "Av. Aniceto Arce", province: "Cercado", lat: -17.389, lng: -66.145, hours: "24/7" },
  { id: "mexico", name: "Hospital México (Sacaba)", category: "hospital", phone: "44702310", address: "Av. Villazón Km 12, Sacaba", province: "Chapare", lat: -17.402, lng: -66.048, hours: "24/7" },
  { id: "klein", name: "Hospital Salomón Klein", category: "hospital", phone: "44701580", address: "Quintanilla, Sacaba", province: "Chapare", lat: -17.399, lng: -66.098, hours: "24/7" },
  { id: "bomberos", name: "Bomberos Nataniel Aguirre", category: "bomberos", phone: "119", address: "Av. Circunvalación", province: "Cercado", lat: -17.372, lng: -66.154, hours: "24/7" },
  { id: "sar-bolivia", name: "SAR-Bolivia Cochabamba", category: "rescate", phone: "123", address: "Av. Uyuni y América", province: "Cercado", lat: -17.376, lng: -66.152, hours: "24/7" },
  { id: "sar-fab", name: "SAR-FAB Rescate Aéreo", category: "rescate", phone: "128", address: "Aeropuerto Jorge Wilstermann", province: "Cercado", lat: -17.421, lng: -66.177, hours: "24/7" },
  { id: "elfec", name: "ELFEC Emergencias Eléctricas", category: "servicios", phone: "176", address: "Av. Heroínas 0-686", province: "Cercado", lat: -17.392, lng: -66.161, hours: "24/7" },
  { id: "semapa", name: "SEMAPA Agua y Alcantarillado", category: "servicios", phone: "178", address: "Av. Kapac Yupanqui", province: "Cercado", lat: -17.396, lng: -66.172, hours: "24/7" },
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}