import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { deleteEmotionEntry, clearAllEmotionEntries, deleteAccountData } from "@/lib/privacy.functions";
import { Trash2, AlertTriangle, ChevronDown, ChevronUp, Shield, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [anon, setAnon] = useState("");
  const [showEntries, setShowEntries] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const deleteEntryFn = useServerFn(deleteEmotionEntry);
  const clearAllFn = useServerFn(clearAllEmotionEntries);
  const deleteAccountFn = useServerFn(deleteAccountData);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("anonymous_name").eq("id", user.id).single().then(({ data }) => setAnon(data?.anonymous_name || ""));
  }, [user]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ anonymous_name: anon }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("已更新匿名暱稱");
  };

  // Fetch emotion entries for deletion UI
  const { data: entries, refetch: refetchEntries } = useQuery({
    queryKey: ["emotion-entries-settings", user?.id],
    enabled: !!user && showEntries,
    queryFn: async () => {
      const { data } = await supabase
        .from("emotion_entries")
        .select("id, raw_text, primary_emotion, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const deleteSingle = useMutation({
    mutationFn: (entryId: string) => deleteEntryFn({ data: { entryId } }),
    onSuccess: () => {
      toast.success("已刪除紀錄");
      refetchEntries();
      qc.invalidateQueries({ queryKey: ["monster"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAll = useMutation({
    mutationFn: () => clearAllFn(),
    onSuccess: () => {
      toast.success("已清空所有情緒紀錄");
      setConfirmClear(false);
      refetchEntries();
      qc.invalidateQueries({ queryKey: ["monster"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAccount = useMutation({
    mutationFn: () => deleteAccountFn(),
    onSuccess: async () => {
      toast.success("帳號資料已全部刪除");
      setConfirmDelete(false);
      await signOut();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-cocoa">設定</h1>
      <div className="mt-6 space-y-4">

        {/* ── 匿名暱稱 ─────────────────────────── */}
        <div className="rounded-3xl bg-card p-6 shadow-pillow">
          <label className="text-sm text-muted-foreground">交流區匿名暱稱</label>
          <input value={anon} onChange={(e) => setAnon(e.target.value)} maxLength={32} className="mt-2 w-full rounded-full border border-border bg-background px-4 py-2 outline-none focus:border-accent" />
          <button onClick={save} className="mt-3 rounded-full bg-accent px-5 py-2 text-sm text-accent-foreground">儲存</button>
        </div>

        {/* ── 帳號資訊 ─────────────────────────── */}
        <div className="rounded-3xl bg-card p-6 shadow-pillow">
          <p className="text-sm text-muted-foreground">登入身份：{user?.email}</p>
          <button onClick={() => signOut()} className="mt-3 rounded-full border border-border bg-background px-5 py-2 text-sm text-cocoa hover:bg-cream-deep">登出</button>
        </div>

        {/* ── 隱私說明 ─────────────────────────── */}
        <div className="rounded-3xl border border-accent/30 bg-cream p-6 shadow-pillow">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg text-cocoa">隱私與資料說明</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>你的情緒輸入內容只有你自己看得到，不會與其他使用者分享。</span>
            </li>
            <li className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>AI 分析僅用於更新怪獸外觀與推薦治癒任務，不會用於其他用途。</span>
            </li>
            <li className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>社群分享僅顯示匿名暱稱和怪獸外觀，不包含原始情緒文字。</span>
            </li>
            <li className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>你可以隨時刪除單筆紀錄、清空所有紀錄，或刪除全部帳號資料。</span>
            </li>
          </ul>
        </div>

        {/* ── 刪除單筆情緒紀錄 ──────────────── */}
        <div className="rounded-3xl bg-card p-6 shadow-pillow">
          <button
            onClick={() => setShowEntries(!showEntries)}
            className="flex w-full items-center justify-between text-sm text-cocoa"
          >
            <span className="font-display text-base">管理情緒紀錄</span>
            {showEntries ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showEntries && (
            <div className="mt-4 space-y-2">
              {!entries?.length && (
                <p className="text-sm text-muted-foreground">目前沒有情緒紀錄。</p>
              )}
              {entries?.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-2xl bg-cream/70 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cocoa">{entry.raw_text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.primary_emotion} · {new Date(entry.created_at).toLocaleString("zh-TW")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSingle.mutate(entry.id)}
                    disabled={deleteSingle.isPending}
                    className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="刪除此紀錄"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 清空所有情緒紀錄 ──────────────── */}
        <div className="rounded-3xl bg-card p-6 shadow-pillow">
          <h2 className="font-display text-base text-cocoa">清空所有情緒紀錄</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            這將永久刪除你所有的情緒輸入紀錄，此操作無法復原。
          </p>
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-background px-5 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> 清空紀錄
            </button>
          ) : (
            <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">確定要清空所有情緒紀錄嗎？</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-cocoa"
                >
                  取消
                </button>
                <button
                  onClick={() => clearAll.mutate()}
                  disabled={clearAll.isPending}
                  className="rounded-full bg-destructive px-4 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {clearAll.isPending ? "清除中…" : "確定清空"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 刪除帳號資料 ─────────────────── */}
        <div className="rounded-3xl border border-destructive/20 bg-card p-6 shadow-pillow">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-display text-base text-destructive">刪除帳號資料</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            這將永久刪除你的怪獸、情緒紀錄、日記、社群貼文、配件等所有資料，此操作無法復原。
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-background px-5 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> 刪除所有資料
            </button>
          ) : (
            <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">此操作無法復原！</p>
              <p className="mt-1 text-xs text-muted-foreground">
                請輸入「刪除」來確認：
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="輸入「刪除」"
                className="mt-2 w-full rounded-full border border-destructive/30 bg-background px-4 py-2 text-sm outline-none"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteConfirmText(""); }}
                  className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-cocoa"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteAccount.mutate()}
                  disabled={deleteAccount.isPending || deleteConfirmText !== "刪除"}
                  className="rounded-full bg-destructive px-4 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {deleteAccount.isPending ? "刪除中…" : "永久刪除"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
