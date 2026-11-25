import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const zoneQuestionSchema = z.object({
  provinciaId: z.string().min(1),
  provinciaNombre: z.string().min(1),
  municipioNombre: z.string().optional(),
  distritoNombre: z.string().optional(),
  pregunta: z.string().min(4, "Escribe una pregunta de al menos 4 caracteres.").max(400),
});

export const askZoneAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => zoneQuestionSchema.parse(input))
  .handler(async ({ data }) => {
    const { answerZoneQuestion } = await import("./zone-assistant.server");
    return answerZoneQuestion(data);
  });