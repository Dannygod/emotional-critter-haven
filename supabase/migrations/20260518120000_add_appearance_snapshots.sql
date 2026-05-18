ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS appearance jsonb;

ALTER TABLE public.diaries
  ADD COLUMN IF NOT EXISTS appearance jsonb;
