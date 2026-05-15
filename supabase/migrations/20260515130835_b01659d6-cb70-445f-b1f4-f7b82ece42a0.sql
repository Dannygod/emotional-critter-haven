
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  anonymous_name TEXT NOT NULL DEFAULT 'moomo_friend',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- public read of anonymous_name only via posts join; allow read for community context
CREATE POLICY "profiles_select_public_anon" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, anonymous_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'moomo_' || substr(md5(random()::text), 1, 6)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Monsters
CREATE TABLE public.monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '小哞',
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  mood_score INT NOT NULL DEFAULT 0,
  negative_energy INT NOT NULL DEFAULT 0,
  positive_energy INT NOT NULL DEFAULT 0,
  base_color TEXT NOT NULL DEFAULT 'cream',
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monsters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monsters_own_all" ON public.monsters FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- public read for shared monsters via posts
CREATE POLICY "monsters_select_public" ON public.monsters FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_monsters_user_active ON public.monsters(user_id, status);

-- Emotion entries
CREATE TABLE public.emotion_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES public.monsters ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  primary_emotion TEXT,
  emotion_intensity INT,
  llm_reply TEXT,
  analysis JSONB,
  is_comforting BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emotion_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emotions_own" ON public.emotion_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_emotions_monster ON public.emotion_entries(monster_id, created_at DESC);

-- Accessories
CREATE TABLE public.accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES public.monsters ON DELETE CASCADE,
  slot TEXT NOT NULL, -- head | face | body
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'emotion', -- emotion | task | reward
  equipped BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accessories_own" ON public.accessories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accessories_select_public" ON public.accessories FOR SELECT TO authenticated USING (true);

-- Healing task library
CREATE TABLE public.healing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  reward_value INT NOT NULL DEFAULT 10,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.healing_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_read_all" ON public.healing_tasks FOR SELECT USING (true);

-- Seed task library
INSERT INTO public.healing_tasks (title, description, category, reward_value) VALUES
('喝一杯喜歡的飲料', '在杯底找回一點點快樂，慢慢喝完它', 'self-care', 10),
('深呼吸三次', '鼻子吸氣四秒，停兩秒，嘴巴吐氣六秒', 'breathing', 8),
('整理桌面一角', '只需要清理一個小區塊，讓視線清爽一點', 'environment', 12),
('寫下三件小確幸', '今天有什麼讓你嘴角微微上揚的瞬間？', 'reflection', 15),
('散步十分鐘', '不用走遠，讓腳帶你晃一下', 'movement', 15),
('拉個懶腰', '伸展手臂、轉轉脖子、甩甩腳', 'movement', 8),
('傳一句話給想念的人', '不用很長，告訴他你想到他了', 'connection', 12),
('聽一首治癒系歌曲', '挑一首讓你想起溫柔回憶的歌', 'self-care', 10),
('看窗外發呆兩分鐘', '什麼都不做，只是看看外面', 'breathing', 8),
('給自己一個擁抱', '雙手環抱自己，輕拍肩膀三下', 'self-care', 10),
('喝一大杯水', '身體可能比你想得更需要水分', 'self-care', 8),
('整理一張舊照片', '翻一翻相簿，找一張會讓你笑的照片', 'reflection', 12);

-- User tasks
CREATE TABLE public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES public.monsters ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.healing_tasks ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned', -- assigned | completed | abandoned
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_tasks_own" ON public.user_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_user_tasks_active ON public.user_tasks(monster_id, status);

-- Diaries
CREATE TABLE public.diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES public.monsters ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  emotion_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_image_url TEXT,
  monster_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diaries_own" ON public.diaries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Community posts
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES public.monsters,
  anonymous_name TEXT NOT NULL,
  image_url TEXT,
  caption TEXT,
  emotion_summary TEXT,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select_authenticated" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert_own" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  anonymous_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_authenticated" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- Likes
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_authenticated" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert_own" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);
