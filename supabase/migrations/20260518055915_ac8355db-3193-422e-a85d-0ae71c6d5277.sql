
CREATE TABLE public.sprite_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer text NOT NULL CHECK (layer IN ('body','eyes','mouth','head','hand','background')),
  key text NOT NULL,
  name text NOT NULL,
  asset_path text NOT NULL,
  emotion_tags text[] NOT NULL DEFAULT '{}',
  color_tone text,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (layer, key)
);

CREATE INDEX idx_sprite_parts_layer ON public.sprite_parts(layer) WHERE active;
CREATE INDEX idx_sprite_parts_tags ON public.sprite_parts USING GIN (emotion_tags);

ALTER TABLE public.sprite_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sprite_parts_select_authenticated"
  ON public.sprite_parts FOR SELECT TO authenticated
  USING (active = true);
