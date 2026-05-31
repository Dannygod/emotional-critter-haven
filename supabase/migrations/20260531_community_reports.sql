-- Community reports table for flagging inappropriate content.
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts ON DELETE CASCADE,
  comment_id UUID REFERENCES public.post_comments ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reason TEXT NOT NULL,       -- 'personal_info' | 'offensive' | 'dangerous' | 'other'
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'reviewed' | 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT report_target_check CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "reports_insert_own" ON public.post_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "reports_select_own" ON public.post_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- Prevent duplicate reports from the same user on the same target
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_post_unique
  ON public.post_reports(post_id, reporter_id) WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_comment_unique
  ON public.post_reports(comment_id, reporter_id) WHERE comment_id IS NOT NULL;
