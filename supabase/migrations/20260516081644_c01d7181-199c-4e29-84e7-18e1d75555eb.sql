-- 1. Remove overly permissive profiles policy
DROP POLICY IF EXISTS profiles_select_public_anon ON public.profiles;

-- 2. Ensure one like per user per post
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_unique;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_unique UNIQUE (post_id, user_id);

-- 3. Trigger-maintained like_count (atomic, race-free)
CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
       SET like_count = like_count + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
       SET like_count = GREATEST(0, like_count - 1)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

-- 4. Resync existing counts
UPDATE public.community_posts cp
   SET like_count = COALESCE(sub.c, 0)
  FROM (SELECT post_id, COUNT(*)::int AS c FROM public.post_likes GROUP BY post_id) sub
 WHERE cp.id = sub.post_id;

UPDATE public.community_posts SET like_count = 0
 WHERE id NOT IN (SELECT post_id FROM public.post_likes);