import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const classifyInputSchema = z.object({
  descripcion: z.string().min(8, "Describe el incidente con al menos 8 caracteres."),
  provincia: z.string().optional(),
});

export interface IncidentClassification {
  categoria:
    | "robo"
    | "asesinato"
    | "derrumbe"
    | "inundacion"
    | "incendio"
    | "infraestructura_vial"
    | "emergencia_medica";
  urgencia: "baja" | "media" | "alta" | "critica";
  motivo_breve: string;
  entidad_sugerida: string;
  telefono_sugerido: string;
}

export const classifyIncident = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => classifyInputSchema.parse(input))
  .handler(async ({ data }): Promise<IncidentClassification> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY no está configurada en el servidor.");
    }

    const systemPrompt = `Eres el clasificador oficial de incidentes ciudadanos de Comunidad Segura en Cochabamba, Bolivia.
Analiza el relato ciudadano y responde ÚNICAMENTE con un objeto JSON válido con estas claves exactas:
- categoria: una de ["robo", "asesinato", "derrumbe", "inundacion", "incendio", "infraestructura_vial", "emergencia_medica"]
- urgencia: una de ["baja", "media", "alta", "critica"]
- motivo_breve: justificación concisa en español (máximo 120 caracteres)
- entidad_sugerida: entidad oficial en Cochabamba (ej. "BOL-110 Radio Patrullas", "FELCC", "Bomberos Nataniel Aguirre", "SAR-Bolivia", "ABC / SATD", "Hospital Viedma / SEDES", "Tránsito")
- telefono_sugerido: número corto oficial en Bolivia (ej. "110", "116", "119", "123", "111", "168")`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Provincia: ${data.provincia ?? "Cochabamba"}\nRelato: ${data.descripcion}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI Gateway error:", res.status, errText);
      throw new Error("No se pudo clasificar el incidente en este momento.");
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<IncidentClassification>;

    return {
      categoria: parsed.categoria ?? "robo",
      urgencia: parsed.urgencia ?? "media",
      motivo_breve: parsed.motivo_breve ?? "Incidente ciudadano registrado para evaluación.",
      entidad_sugerida: parsed.entidad_sugerida ?? "BOL-110 Radio Patrullas",
      telefono_sugerido: parsed.telefono_sugerido ?? "110",
    };
  });