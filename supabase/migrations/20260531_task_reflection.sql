-- Add reflection field to user_tasks for post-completion reflections.
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS reflection TEXT;
