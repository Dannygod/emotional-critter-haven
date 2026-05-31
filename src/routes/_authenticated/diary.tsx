import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import moomoImg from "@/assets/moomo-default.png";
import { MonsterSprite } from "@/components/MonsterSprite";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { BookHeart, TrendingUp, TrendingDown, Hash, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/diary")({ component: DiaryPage });

const EMOTION_COLORS: Record<string, string> = {
  anger: "#e57373",
  sadness: "#64b5f6",
  anxiety: "#ce93d8",
  fatigue: "#ffcc80",
  frustration: "#ff8a65",
  loneliness: "#b39ddb",
  embarrassment: "#f48fb1",
  neutral: "#e0e0e0",
  comfort: "#a5d6a7",
};

const EMOTION_LABELS: Record<string, string> = {
  anger: "生氣",
  sadness: "難過",
  anxiety: "焦慮",
  fatigue: "疲憊",
  frustration: "挫折",
  loneliness: "孤單",
  embarrassment: "尷尬",
  neutral: "平靜",
  comfort: "療癒",
};

function DiaryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: diaries } = useQuery({
    queryKey: ["diaries", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("diaries").select("*, monsters(*)").eq("user_id", user!.id).order("created_at", { ascending: false })).data || [],
  });

  const { data: current } = useQuery({
    queryKey: ["monster", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("monsters").select("*").eq("user_id", user!.id).eq("status", "active").maybeSingle()).data,
  });

  const archive = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const startedAt = new Date(current.started_at);
      const ageDays = (Date.now() - startedAt.getTime()) / 86400000;
      if (ageDays < 1) throw new Error("小哞還沒滿一天，再陪牠久一點吧。");

      // Fetch all entries for this monster to build rich summary
      const { data: entries } = await supabase
        .from("emotion_entries")
        .select("primary_emotion, emotion_intensity, analysis, created_at")
        .eq("monster_id", current.id)
        .order("created_at", { ascending: true });

      const counts: Record<string, number> = {};
      const keywordCounts: Record<string, number> = {};
      let highestMood = current.mood_score;
      let lowestMood = current.mood_score;
      const totalEntries = entries?.length || 0;

      (entries || []).forEach((e) => {
        if (e.primary_emotion) counts[e.primary_emotion] = (counts[e.primary_emotion] || 0) + 1;

        // Track keywords
        const analysis = e.analysis as { concreteKeywords?: { text: string }[] } | null;
        if (analysis?.concreteKeywords) {
          analysis.concreteKeywords.forEach((kw) => {
            if (kw.text) keywordCounts[kw.text] = (keywordCounts[kw.text] || 0) + 1;
          });
        }

        // Track mood extremes via intensity
        const intensity = e.emotion_intensity || 50;
        const estimatedMood = e.primary_emotion === "comfort" ? intensity * 0.5 : -intensity * 0.5;
        if (estimatedMood > highestMood) highestMood = Math.round(estimatedMood);
        if (estimatedMood < lowestMood) lowestMood = Math.round(estimatedMood);
      });

      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([text, count]) => ({ text, count }));

      await supabase.from("diaries").insert({
        user_id: user!.id, monster_id: current.id,
        start_date: startedAt.toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        emotion_summary: { counts, top, totalEntries, highestMood, lowestMood, topKeywords },
        appearance: current.appearance,
        final_image_url: current.image_url,
        monster_snapshot: current,
      });
      await supabase.from("monsters").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", current.id);
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("小哞已經睡進日記裡了。"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-cocoa">情緒日記</h1>
          <p className="mt-1 text-muted-foreground">每隻小哞都是一段你走過的路。</p>
        </div>
        {current && <button onClick={() => archive.mutate()} className="rounded-full bg-cocoa px-5 py-2 text-sm text-cream hover:bg-cocoa/90">封存目前的小哞</button>}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {!diaries?.length && <div className="col-span-full rounded-3xl bg-card p-8 text-center text-muted-foreground shadow-pillow">還沒有日記。陪小哞滿一天就能封存囉。</div>}
        {diaries?.map((d: any) => {
          const summary = d.emotion_summary || {};
          const counts = summary.counts || {};
          const isExpanded = expandedId === d.id;

          // Build chart data
          const chartData = Object.entries(counts)
            .map(([emotion, count]) => ({
              emotion,
              label: EMOTION_LABELS[emotion] || emotion,
              count: count as number,
              color: EMOTION_COLORS[emotion] || "#ccc",
            }))
            .sort((a, b) => b.count - a.count);

          const totalEntries = summary.totalEntries || chartData.reduce((sum: number, c: { count: number }) => sum + c.count, 0);
          const topKeywords: { text: string; count: number }[] = summary.topKeywords || [];

          // Generate AI-like summary text (client-side)
          const summaryText = generateSummary(summary, d);

          return (
            <article key={d.id} className="rounded-3xl bg-card p-5 shadow-pillow sm:col-span-2 lg:col-span-1">
              <div className="flex justify-center">
                {d.appearance ? (
                  <MonsterSprite appearance={d.appearance as any} size={160} animate={false} className="rounded-2xl" />
                ) : (
                  <img src={d.final_image_url || moomoImg} alt="" className="h-40 w-40 object-contain" />
                )}
              </div>
              <h3 className="mt-3 font-display text-lg text-cocoa">{d.monsters?.name || "小哞"}</h3>
              <p className="text-xs text-muted-foreground">{d.start_date} → {d.end_date}</p>

              {/* Quick stats */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                  <BookHeart className="h-3 w-3" />
                  {totalEntries} 次輸入
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-3 py-1 text-xs text-cocoa">
                  最常出現：<strong>{EMOTION_LABELS[summary.top] || summary.top || "neutral"}</strong>
                </span>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-accent hover:underline"
              >
                {isExpanded ? "收起詳情" : "查看詳情"}
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Emotion proportion chart */}
                  {chartData.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-cocoa">
                        <TrendingUp className="h-3.5 w-3.5" /> 情緒比例
                      </h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="label" width={40} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: number) => [`${value} 次`, "次數"]}
                              contentStyle={{ borderRadius: 12, fontSize: 12 }}
                            />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                              {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Mood extremes */}
                  {(summary.highestMood != null || summary.lowestMood != null) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-leaf/10 px-3 py-2 text-center">
                        <TrendingUp className="mx-auto h-4 w-4 text-leaf" />
                        <p className="mt-1 text-xs text-muted-foreground">最高 Mood</p>
                        <p className="font-display text-lg text-cocoa">{summary.highestMood ?? "—"}</p>
                      </div>
                      <div className="rounded-2xl bg-blush/10 px-3 py-2 text-center">
                        <TrendingDown className="mx-auto h-4 w-4 text-blush" />
                        <p className="mt-1 text-xs text-muted-foreground">最低 Mood</p>
                        <p className="font-display text-lg text-cocoa">{summary.lowestMood ?? "—"}</p>
                      </div>
                    </div>
                  )}

                  {/* Top keywords */}
                  {topKeywords.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-cocoa">
                        <Hash className="h-3.5 w-3.5" /> 常見關鍵字
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {topKeywords.map((kw, i) => (
                          <span key={i} className="rounded-full bg-cream-deep px-3 py-1 text-xs text-cocoa">
                            {kw.text} ×{kw.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI-style summary */}
                  <div className="rounded-2xl border border-accent/20 bg-cream/50 p-3">
                    <h4 className="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent">
                      <MessageSquare className="h-3.5 w-3.5" /> 小結
                    </h4>
                    <p className="text-sm leading-relaxed text-cocoa">{summaryText}</p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Generate a warm summary text based on the diary stats (client-side, no AI call).
 */
function generateSummary(summary: any, diary: any): string {
  const total = summary.totalEntries || 0;
  const top = summary.top || "neutral";
  const topLabel = EMOTION_LABELS[top] || top;
  const monsterName = diary.monsters?.name || "小哞";
  const days = Math.max(1, Math.ceil(
    (new Date(diary.end_date).getTime() - new Date(diary.start_date).getTime()) / 86400000,
  ));

  if (total === 0) {
    return `${monsterName}陪伴了你 ${days} 天，雖然沒有太多對話，但牠一直都在。`;
  }

  const avgPerDay = (total / days).toFixed(1);
  const comfortCount = summary.counts?.comfort || 0;
  const comfortRatio = total > 0 ? Math.round((comfortCount / total) * 100) : 0;

  let mood = "";
  if (comfortRatio > 40) {
    mood = "這段時間你有不少溫暖的時刻，做得很好。";
  } else if (top === "sadness" || top === "loneliness") {
    mood = "這段路或許有點辛苦，但你有好好面對自己的感受，這很勇敢。";
  } else if (top === "anger" || top === "frustration") {
    mood = "看起來有些事情讓你很不好受，但你願意說出來，就是在照顧自己。";
  } else {
    mood = "每一次的傾訴都是一次小小的釋放，你做得比想像中好。";
  }

  return `${monsterName}陪伴了你 ${days} 天，你們一共聊了 ${total} 次（平均每天 ${avgPerDay} 次）。最常出現的情緒是「${topLabel}」。${mood}`;
}
