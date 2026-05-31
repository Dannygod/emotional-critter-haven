import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  X,
  Flag,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import moomoImg from "@/assets/moomo-default.png";
import { MonsterSprite } from "@/components/MonsterSprite";

export const Route = createFileRoute("/_authenticated/community")({ component: CommunityPage });

type PostRow = Database["public"]["Tables"]["community_posts"]["Row"];
type CommentRow = Database["public"]["Tables"]["post_comments"]["Row"];
type PostWithComments = PostRow & { post_comments?: CommentRow[] };

const MAX_CAPTION = 200;
const MAX_COMMENT = 160;

const REPORT_REASONS = [
  { value: "personal_info", label: "包含個人資訊" },
  { value: "offensive", label: "攻擊性或霸凌言論" },
  { value: "dangerous", label: "危險或自傷內容" },
  { value: "other", label: "其他" },
] as const;

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Share confirmation dialog state
  const [showShareConfirm, setShowShareConfirm] = useState(false);

  // Report dialog state
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    id: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*, post_comments(*)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("created_at", { ascending: true, referencedTable: "post_comments" })
        .limit(50);
      if (error) throw error;
      return (data || []) as PostWithComments[];
    },
  });

  const { data: myLikes } = useQuery({
    queryKey: ["my-post-likes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map((like) => like.post_id));
    },
  });

  const { data: monster } = useQuery({
    queryKey: ["monster", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monsters")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const share = useMutation({
    mutationFn: async () => {
      if (!monster || !profile) throw new Error("還沒準備好你的怪獸資料");
      const cleanCaption = caption.trim();
      const { error } = await supabase.from("community_posts").insert({
        user_id: user!.id,
        monster_id: monster.id,
        anonymous_name: profile.anonymous_name || "匿名小哞",
        appearance: monster.appearance,
        image_url: monster.image_url,
        caption: cleanCaption || null,
        emotion_summary:
          (monster.appearance as { primaryEmotion?: string } | null)?.primaryEmotion || "neutral",
        status: "published",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCaption("");
      setShowShareConfirm(false);
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("已匿名分享！");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePost = useMutation({
    mutationFn: async ({ postId, nextCaption }: { postId: string; nextCaption: string }) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ caption: nextCaption.trim() || null })
        .eq("id", postId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditingCaption("");
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("貼文已更新");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["my-post-likes"] });
      toast.success("貼文已刪除");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user!.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user!.id });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["my-post-likes", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async (postId: string) => {
      if (!profile) throw new Error("還沒準備好你的匿名暱稱");
      const content = (commentDrafts[postId] || "").trim();
      if (!content) throw new Error("留言不能空白");
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user!.id,
        anonymous_name: profile.anonymous_name || "匿名小哞",
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, postId) => {
      setCommentDrafts((drafts) => ({ ...drafts, [postId]: "" }));
      setOpenComments((state) => ({ ...state, [postId]: true }));
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!reportTarget || !reportReason) throw new Error("請選擇檢舉原因");
      const payload: Record<string, unknown> = {
        reporter_id: user!.id,
        reason: reportReason,
        detail: reportDetail.trim() || null,
      };
      if (reportTarget.type === "post") payload.post_id = reportTarget.id;
      else payload.comment_id = reportTarget.id;

      // post_reports table added via migration — cast to bypass generated types
      const { error } = await (supabase.from as any)("post_reports").insert(payload);
      if (error) {
        if (error.code === "23505") throw new Error("你已經檢舉過了");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("已收到你的檢舉，我們會盡快處理");
      setReportTarget(null);
      setReportReason("");
      setReportDetail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const communityStats = useMemo(() => {
    const safePosts = posts || [];
    return {
      posts: safePosts.length,
      comments: safePosts.reduce(
        (sum, post) => sum + (post.comment_count ?? post.post_comments?.length ?? 0),
        0,
      ),
      likes: safePosts.reduce((sum, post) => sum + post.like_count, 0),
    };
  }, [posts]);

  const startEditing = (post: PostWithComments) => {
    setEditingId(post.id);
    setEditingCaption(post.caption || "");
  };

  const confirmDeletePost = (postId: string) => {
    if (window.confirm("確定要刪除這篇分享嗎？留言與愛心也會一起移除。")) deletePost.mutate(postId);
  };

  const handleShareClick = () => {
    setShowShareConfirm(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <Sparkles className="h-4 w-4" /> Moomo 交流角落
          </p>
          <h1 className="mt-1 font-display text-3xl text-cocoa">匿名怪獸交流</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            分享今天的小哞，也用一句溫柔的話接住別人。這裡適合陪伴、共鳴和輕輕的鼓勵。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-border/70 bg-card p-2 text-center shadow-pillow">
          <Stat label="分享" value={communityStats.posts} />
          <Stat label="留言" value={communityStats.comments} />
          <Stat label="愛心" value={communityStats.likes} />
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-border/70 bg-card p-4 shadow-pillow md:p-5">
        {monster ? (
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex items-center gap-3 sm:w-44 sm:flex-col sm:items-start">
              <MonsterSprite appearance={monster.appearance as any} size={80} animate={false} className="rounded-2xl" />
              <div>
                <p className="font-display text-lg text-cocoa">{monster.name}</p>
                <p className="text-xs text-muted-foreground">
                  以 {profile?.anonymous_name || "匿名小哞"} 分享
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={MAX_CAPTION}
                rows={3}
                placeholder="想對大家說些什麼？可以分享今天的小哞狀態，或留一句給同樣努力的人。"
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {caption.length}/{MAX_CAPTION} · 不需要完美，真實一點就很好
                </p>
                <button
                  onClick={handleShareClick}
                  disabled={share.isPending || !profile}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-pillow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> {share.isPending ? "分享中…" : "匿名分享"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">準備好一隻小哞後，就能來這裡匿名分享。</p>
        )}
      </section>

      {/* ── 分享前提醒 Dialog ─────────────── */}
      {showShareConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-pillow">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg text-cocoa">分享前請確認</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>請確認你的內容<strong className="text-cocoa">不包含個人資訊</strong>（真實姓名、學校、電話等）</span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>這裡是<strong className="text-cocoa">溫柔的空間</strong>，請避免攻擊性或傷害性言論</span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>分享的內容將以<strong className="text-cocoa">匿名暱稱</strong>呈現</span>
              </li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowShareConfirm(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-cocoa hover:bg-cream-deep"
              >
                返回修改
              </button>
              <button
                onClick={() => share.mutate()}
                disabled={share.isPending}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-pillow disabled:opacity-50"
              >
                {share.isPending ? "分享中…" : "確認分享"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 檢舉 Dialog ─────────────────── */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-pillow">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              <h3 className="font-display text-lg text-cocoa">
                檢舉{reportTarget.type === "post" ? "貼文" : "留言"}
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              我們會盡快審核你的檢舉，不符合社群精神的內容將被隱藏。
            </p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    reportReason === r.value
                      ? "border-accent bg-accent/10 text-cocoa"
                      : "border-border bg-background text-muted-foreground hover:bg-cream-deep"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reportReason === r.value}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded-full border-2 ${
                    reportReason === r.value ? "border-accent bg-accent" : "border-border"
                  }`} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="補充說明（選填）"
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setReportTarget(null); setReportReason(""); setReportDetail(""); }}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-cocoa hover:bg-cream-deep"
              >
                取消
              </button>
              <button
                onClick={() => submitReport.mutate()}
                disabled={submitReport.isPending || !reportReason}
                className="rounded-full bg-destructive px-5 py-2 text-sm font-medium text-white shadow-pillow disabled:opacity-50"
              >
                {submitReport.isPending ? "送出中…" : "送出檢舉"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {postsLoading && <p className="text-sm text-muted-foreground">載入交流區中…</p>}
        {!postsLoading && posts?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground lg:col-span-2">
            這裡還很安靜。第一篇小哞分享，可以從一句「今天有點累」開始。
          </div>
        )}
        {posts?.map((post) => {
          const comments = post.post_comments || [];
          const isOwner = post.user_id === user?.id;
          const isEditing = editingId === post.id;
          const commentsOpen = openComments[post.id] ?? comments.length > 0;
          const liked = myLikes?.has(post.id) || false;

          return (
            <article
              key={post.id}
              className="rounded-3xl border border-border/70 bg-card p-5 shadow-pillow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {post.anonymous_name} · {emotionLabel(post.emotion_summary)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTime(post.created_at)}
                    {post.edited_at ? " · 已編輯" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => startEditing(post)}
                        aria-label="編輯貼文"
                        className="rounded-full p-2 text-muted-foreground transition hover:bg-cream-deep hover:text-cocoa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => confirmDeletePost(post.id)}
                        aria-label="刪除貼文"
                        className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {!isOwner && (
                    <button
                      onClick={() => setReportTarget({ type: "post", id: post.id })}
                      aria-label="檢舉貼文"
                      className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      title="檢舉"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex justify-center">
                {post.appearance ? (
                  <MonsterSprite
                    appearance={post.appearance as any}
                    size={144}
                    animate={false}
                    className="rounded-2xl"
                  />
                ) : (
                  <img
                    src={post.image_url || moomoImg}
                    alt="匿名分享的小哞"
                    className="h-36 w-36 object-contain"
                  />
                )}
              </div>

              {isEditing ? (
                <div className="mt-3">
                  <textarea
                    value={editingCaption}
                    onChange={(e) => setEditingCaption(e.target.value)}
                    maxLength={MAX_CAPTION}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-accent"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {editingCaption.length}/{MAX_CAPTION}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-cocoa hover:bg-cream-deep"
                      >
                        <X className="h-3.5 w-3.5" />
                        取消
                      </button>
                      <button
                        onClick={() =>
                          updatePost.mutate({ postId: post.id, nextCaption: editingCaption })
                        }
                        disabled={updatePost.isPending}
                        className="rounded-full bg-cocoa px-4 py-1.5 text-xs text-cream disabled:opacity-60"
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 min-h-6 whitespace-pre-wrap break-words text-sm leading-6 text-cocoa">
                  {post.caption || "今天的小哞只是安靜出現，沒有多說什麼。"}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLike.mutate({ postId: post.id, liked })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${liked ? "bg-blush/20 text-cocoa" : "text-muted-foreground hover:bg-cream-deep hover:text-cocoa"}`}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-blush text-blush" : ""}`} />
                    {post.like_count}
                  </button>
                  <button
                    onClick={() =>
                      setOpenComments((state) => ({ ...state, [post.id]: !commentsOpen }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-cream-deep hover:text-cocoa"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.comment_count ?? comments.length}
                  </button>
                </div>
              </div>

              {commentsOpen && (
                <div className="mt-4 space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-2xl bg-cream/70 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-cocoa">{comment.anonymous_name}</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-cocoa">
                            {comment.content}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatTime(comment.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {comment.user_id === user?.id ? (
                            <button
                              onClick={() => deleteComment.mutate(comment.id)}
                              aria-label="刪除留言"
                              className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setReportTarget({ type: "comment", id: comment.id })}
                              aria-label="檢舉留言"
                              className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                              title="檢舉"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      value={commentDrafts[post.id] || ""}
                      onChange={(e) =>
                        setCommentDrafts((drafts) => ({ ...drafts, [post.id]: e.target.value }))
                      }
                      maxLength={MAX_COMMENT}
                      placeholder="留一句溫柔的回應"
                      className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none transition focus:border-accent"
                    />
                    <button
                      onClick={() => addComment.mutate(post.id)}
                      disabled={addComment.isPending || !(commentDrafts[post.id] || "").trim()}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-pillow disabled:opacity-50"
                      aria-label="送出留言"
                    >
                      <Send className="h-4 w-4" />
                    </button>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-2xl bg-cream px-3 py-2">
      <p className="font-display text-lg text-cocoa">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function emotionLabel(value: string | null) {
  const labels: Record<string, string> = {
    anger: "生氣小哞",
    sadness: "難過小哞",
    anxiety: "緊張小哞",
    joy: "開心小哞",
    calm: "平靜小哞",
    neutral: "普通小哞",
  };
  return labels[value || "neutral"] || `${value} 小哞`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
