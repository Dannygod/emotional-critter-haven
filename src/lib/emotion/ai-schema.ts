import { z } from "zod";

// ── Zod schema for AI analysis result (Item 7) ─────────────
export const AnalysisResultSchema = z.object({
  primaryEmotion: z.enum([
    "anger", "sadness", "anxiety", "fatigue", "frustration",
    "loneliness", "embarrassment", "neutral", "comfort",
  ]),
  emotionIntensity: z.number().min(0).max(100),
  isComforting: z.boolean(),
  concreteKeywords: z.array(
    z.object({ text: z.string(), visualElement: z.string() }),
  ),
  suggestedAccessory: z.object({
    slot: z.enum(["head", "face", "body"]),
    name: z.string(),
  }),
  reply: z.string().min(1),
  safetyLevel: z.enum(["none", "self_harm", "harm_others", "crisis"]),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ── JSON Schema passed to the LLM tool call ────────────────
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    primaryEmotion: {
      type: "string",
      enum: [
        "anger", "sadness", "anxiety", "fatigue", "frustration",
        "loneliness", "embarrassment", "neutral", "comfort",
      ],
    },
    emotionIntensity: { type: "number" },
    isComforting: { type: "boolean" },
    concreteKeywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          visualElement: { type: "string" },
        },
        required: ["text", "visualElement"],
      },
    },
    suggestedAccessory: {
      type: "object",
      properties: {
        slot: { type: "string", enum: ["head", "face", "body"] },
        name: { type: "string" },
      },
      required: ["slot", "name"],
    },
    reply: { type: "string" },
    safetyLevel: {
      type: "string",
      enum: ["none", "self_harm", "harm_others", "crisis"],
    },
  },
  required: [
    "primaryEmotion", "emotionIntensity", "isComforting",
    "concreteKeywords", "suggestedAccessory", "reply", "safetyLevel",
  ],
  additionalProperties: false,
} as const;
