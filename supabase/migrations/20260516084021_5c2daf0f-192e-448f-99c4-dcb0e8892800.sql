ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_status_check;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_status_check
  CHECK (status IN ('published', 'hidden', 'removed'));

CREATE INDEX IF NOT EXISTS idx_community_posts_status_created
  ON public.community_posts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON public.post_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_post_comments_user
  ON public.post_comments(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prepare_community_post_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := OLD.user_id;
  NEW.monster_id := OLD.monster_id;
  NEW.anonymous_name := OLD.anonymous_name;
  NEW.image_url := OLD.image_url;
  NEW.emotion_summary := OLD.emotion_summary;
  NEW.like_count := OLD.like_count;
  NEW.comment_count := OLD.comment_count;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();

  IF NEW.caption IS DISTINCT FROM OLD.caption THEN
    NEW.edited_at := now();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prepare_community_post_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_community_post_update_trigger ON public.community_posts;
CREATE TRIGGER prepare_community_post_update_trigger
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.prepare_community_post_update();

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
       SET comment_count = comment_count + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
       SET comment_count = GREATEST(0, comment_count - 1)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_post_comment_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS post_comments_count_trigger ON public.post_comments;
CREATE TRIGGER post_comments_count_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

UPDATE public.community_posts cp
   SET comment_count = COALESCE(sub.c, 0)
  FROM (SELECT post_id, COUNT(*)::int AS c FROM public.post_comments GROUP BY post_id) sub
 WHERE cp.id = sub.post_id;

UPDATE public.community_posts
   SET comment_count = 0
 WHERE id NOT IN (SELECT post_id FROM public.post_comments);

DROP POLICY IF EXISTS "posts_select_authenticated" ON public.community_posts;
CREATE POLICY "posts_select_authenticated" ON public.community_posts
  FOR SELECT TO authenticated
  USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON public.community_posts;
CREATE POLICY "posts_update_own" ON public.community_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);