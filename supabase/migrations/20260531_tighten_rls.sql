-- ============================================================
-- Migration: Tighten RLS policies
-- Purpose: Restrict overly permissive SELECT policies on
--          monsters, accessories, and profiles tables.
-- ============================================================

-- 1. monsters: only owner OR referenced by published community post
DROP POLICY IF EXISTS "monsters_select_public" ON public.monsters;
CREATE POLICY "monsters_select_scoped" ON public.monsters
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR id IN (SELECT monster_id FROM public.community_posts WHERE status = 'published')
  );

-- 2. accessories: owner only (accessories are never shown publicly)
DROP POLICY IF EXISTS "accessories_select_public" ON public.accessories;
CREATE POLICY "accessories_select_own" ON public.accessories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. profiles: remove the fully open SELECT policy
--    (profiles_select_own already covers personal access)
DROP POLICY IF EXISTS "profiles_select_public_anon" ON public.profiles;
