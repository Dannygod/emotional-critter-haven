import { ANALYSIS_JSON_SCHEMA, AnalysisResultSchema, type AnalysisResult } from "./ai-schema";

const SYSTEM = `你是「Moomo 沐哞」的情緒分析師。使用者會輸入一段碎碎念或抱怨。請用繁體中文，溫柔接住情緒，不說教不診斷。
分析主要情緒、強度(0-100)、建議一個怪獸配件(head/face/body)，以及抽取具象關鍵字 (concreteKeywords)。

重要：在抽取具象關鍵字 (concreteKeywords) 的 text 屬性時，請優先比對並使用以下支援的「特定關鍵字標籤」；如果使用者的文字包含或意圖類似以下詞彙，請「精準且完全一致地使用」下列標籤：
[雨, 哭, 生氣, 緊張, 開心, 害羞, 平靜, 煩, 吵架, 累, 睡眠, 害怕, 難過, 放鬆, 被愛, 慶祝, 受傷, 孤單, 抱抱, 休息, 壓力, 夜晚, 睡不著]
只有在完全沒有類似詞彙時，才自行提取其他具體名詞。

回覆要短(2-3句)、像在拍拍對方的肩膀。若偵測自傷/傷人/危急，把 safetyLevel 設為對應值並在 reply 提供求助建議。`;

/**
 * Call the Lovable AI gateway and return a validated AnalysisResult.
 * Throws on HTTP errors, rate limits, or invalid response shapes.
 */
export async function analyzeEmotion(text: string): Promise<AnalysisResult> {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze_emotion",
          description: "Return structured emotion analysis",
          parameters: ANALYSIS_JSON_SCHEMA,
        },
      }],
      tool_choice: { type: "function", function: { name: "analyze_emotion" } },
    }),
  });

  if (!aiRes.ok) {
    if (aiRes.status === 429) throw new Error("AI 請求太頻繁了，等一下再試試");
    if (aiRes.status === 402) throw new Error("Lovable AI 額度用完了，請到設定加值");
    throw new Error("AI 分析失敗");
  }

  const aiJson = await aiRes.json();
  const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  const raw = tc ? JSON.parse(tc.function.arguments) : null;
  if (!raw) throw new Error("AI 回應格式錯誤");

  // Zod validation — reject malformed LLM output early
  const parsed = AnalysisResultSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("AI response validation failed:", parsed.error.format());
    throw new Error("AI 回應格式不正確，請重試");
  }

  return parsed.data;
}
