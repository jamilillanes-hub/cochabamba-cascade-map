import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch() {
  let runId: string | undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

function getServerPublicSupabase() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export interface ZoneQuestionInput {
  provinciaId: string;
  provinciaNombre: string;
  municipioNombre?: string | undefined;
  distritoNombre?: string | undefined;
  pregunta: string;
}

export interface ZoneQuestionResult {
  answer: string;
  zoneLabel: string;
  reportsAnalyzed: number;
  alertsAnalyzed: number;
}

export async function answerZoneQuestion(
  input: ZoneQuestionInput,
): Promise<ZoneQuestionResult> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!lovableApiKey) {
    throw new Error("El servicio de IA no está configurado en el servidor.");
  }

  const zoneParts = [input.provinciaNombre, input.municipioNombre, input.distritoNombre].filter(
    Boolean,
  );
  const zoneLabel = zoneParts.join(" › ");

  let reportsContext = "No hay reportes ciudadanos recientes registrados en esta provincia.";
  let alertsContext = "No hay alertas oficiales vigentes para esta provincia.";
  let indexContext = "Sin índices provinciales disponibles.";
  let reportsAnalyzed = 0;
  let alertsAnalyzed = 0;

  const sb = getServerPublicSupabase();
  if (sb) {
    const [repRes, alertRes, idxRes] = await Promise.all([
      sb
        .from("reportes")
        .select(
          "categoria_ia, urgencia_ia, descripcion, municipio_distrito, estado_verificacion, creado_en",
        )
        .eq("provincia_id", input.provinciaId)
        .order("creado_en", { ascending: false })
        .limit(15),
      sb
        .from("alertas_oficiales")
        .select("titulo, nivel, categoria, descripcion, fuente_oficial, provincias_afectadas")
        .contains("provincias_afectadas", [input.provinciaId])
        .order("creado_en", { ascending: false })
        .limit(8),
      sb
        .from("indices_por_provincia")
        .select("*")
        .eq("provincia_id", input.provinciaId)
        .maybeSingle(),
    ]);

    const reps = repRes.data ?? [];
    reportsAnalyzed = reps.length;
    if (reps.length > 0) {
      reportsContext = reps
        .map(
          (r, i) =>
            `${i + 1}. [${r.categoria_ia.toUpperCase()} | Urgencia: ${r.urgencia_ia} | Estado: ${r.estado_verificacion}] (${r.municipio_distrito ?? input.provinciaNombre}): ${r.descripcion}`,
        )
        .join("\n");
    }

    const alerts = alertRes.data ?? [];
    alertsAnalyzed = alerts.length;
    if (alerts.length > 0) {
      alertsContext = alerts
        .map(
          (a, i) =>
            `${i + 1}. [Alerta ${a.nivel.toUpperCase()} - ${a.fuente_oficial}] ${a.titulo}: ${a.descripcion}`,
        )
        .join("\n");
    }

    if (idxRes.data) {
      const idx = idxRes.data;
      indexContext = `General: ${idx.indice_general}/100, Robos: ${idx.indice_robos}/100, Homicidios: ${idx.indice_asesinatos}/100, Derrumbes: ${idx.indice_derrumbes}/100, Inundaciones: ${idx.indice_inundaciones}/100, Incendios: ${idx.indice_incendios}/100 (Fuente: ${idx.fuente_oficial}).`;
    }
  }

  const runIdFetch = createRunIdFetch();
  const openai = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableApiKey,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: openai.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
    system: `Eres el asistente de seguridad ciudadana de Comunidad Segura para Cochabamba, Bolivia.
Responde en español claro, útil y conciso (máximo 140 palabras) basándote estrictamente en los reportes locales, alertas oficiales e índices provistos.
Si no hay reportes ciudadanos registrados en la zona, indícalo con transparencia y ofrece recomendaciones preventivas útiles basadas en los índices y alertas oficiales de la provincia. Incluye números de emergencia bolivianos (BOL-110, Bomberos 119, FELCC 116, SAR 123) cuando sea pertinente.`,
    prompt: `Zona seleccionada: ${zoneLabel}

Índices provinciales:
${indexContext}

Alertas oficiales vigentes:
${alertsContext}

Reportes ciudadanos recientes:
${reportsContext}

Pregunta del residente:
${input.pregunta}`,
  });

  const answer = (await result.text).trim();
  if (!answer) {
    throw new Error("El asistente no pudo generar una respuesta para esta zona.");
  }

  return {
    answer,
    zoneLabel,
    reportsAnalyzed,
    alertsAnalyzed,
  };
}