INSERT INTO public.sprite_parts (layer, key, name, asset_path, emotion_tags, color_tone, rarity)
VALUES
  ('body', 'cream', '奶油身體', '/sprites/body/cream.png', ARRAY['neutral','fatigue','comfort'], 'cream', 'common'),
  ('body', 'sky', '天空身體', '/sprites/body/sky.png', ARRAY['sadness','loneliness','雨','哭'], 'blue', 'common'),
  ('body', 'lavender', '薰衣草身體', '/sprites/body/lavender.png', ARRAY['anxiety','loneliness','緊張'], 'purple', 'common'),
  ('body', 'butter', '奶油黃身體', '/sprites/body/butter.png', ARRAY['comfort','neutral','開心'], 'yellow', 'common'),
  ('body', 'blush', '臉紅身體', '/sprites/body/blush.png', ARRAY['embarrassment','comfort','害羞'], 'pink', 'common'),
  ('body', 'mint', '薄荷身體', '/sprites/body/mint.png', ARRAY['comfort','neutral','平靜'], 'green', 'rare'),
  ('body', 'clay', '陶土身體', '/sprites/body/clay.png', ARRAY['anger','frustration','生氣'], 'brown', 'common'),
  ('body', 'peach', '蜜桃身體', '/sprites/body/peach.png', ARRAY['frustration','embarrassment','煩'], 'peach', 'common'),

  ('eyes', 'normal', '普通眼睛', '/sprites/eyes/normal.png', ARRAY['neutral','comfort'], null, 'common'),
  ('eyes', 'angry', '生氣眼睛', '/sprites/eyes/angry.png', ARRAY['anger','frustration','生氣','吵架'], null, 'common'),
  ('eyes', 'sleepy', '睏睏眼睛', '/sprites/eyes/sleepy.png', ARRAY['fatigue','neutral','累','睡眠'], null, 'common'),
  ('eyes', 'nervous', '緊張眼睛', '/sprites/eyes/nervous.png', ARRAY['anxiety','embarrassment','緊張','害怕'], null, 'common'),
  ('eyes', 'teary', '含淚眼睛', '/sprites/eyes/teary.png', ARRAY['sadness','loneliness','哭','難過'], null, 'common'),
  ('eyes', 'sparkle', '閃亮眼睛', '/sprites/eyes/sparkle.png', ARRAY['comfort','neutral','開心'], null, 'rare'),

  ('mouth', 'smile', '微笑嘴巴', '/sprites/mouth/smile.png', ARRAY['comfort','neutral','開心','平靜'], null, 'common'),
  ('mouth', 'frown', '委屈嘴巴', '/sprites/mouth/frown.png', ARRAY['sadness','anxiety','fatigue','frustration','loneliness','embarrassment','anger'], null, 'common'),

  ('head', 'raincloud', '雨雲頭飾', '/sprites/head/raincloud.png', ARRAY['sadness','loneliness','雨','哭','難過'], null, 'common'),
  ('head', 'flame', '小火苗頭飾', '/sprites/head/flame.png', ARRAY['anger','frustration','生氣','火大'], null, 'common'),
  ('head', 'halo', '光環頭飾', '/sprites/head/halo.png', ARRAY['comfort','neutral','放鬆'], null, 'rare'),
  ('head', 'flowercrown', '花冠頭飾', '/sprites/head/flowercrown.png', ARRAY['comfort','loneliness','開心','被愛'], null, 'epic'),
  ('head', 'partyhat', '派對帽', '/sprites/head/partyhat.png', ARRAY['comfort','neutral','開心','慶祝'], null, 'rare'),
  ('head', 'bandage', '繃帶頭飾', '/sprites/head/bandage.png', ARRAY['sadness','fatigue','frustration','受傷','累'], null, 'common'),

  ('hand', 'plush', '抱抱玩偶', '/sprites/hand/plush.png', ARRAY['sadness','loneliness','comfort','孤單','抱抱'], null, 'common'),
  ('hand', 'tissue', '衛生紙', '/sprites/hand/tissue.png', ARRAY['sadness','哭','難過'], null, 'common'),
  ('hand', 'teacup', '熱茶杯', '/sprites/hand/teacup.png', ARRAY['fatigue','comfort','累','休息'], null, 'common'),
  ('hand', 'hammer', '小槌子', '/sprites/hand/hammer.png', ARRAY['anger','frustration','生氣','壓力'], null, 'common'),
  ('hand', 'balloon', '氣球', '/sprites/hand/balloon.png', ARRAY['comfort','embarrassment','開心','害羞'], null, 'rare'),

  ('background', 'cream', '奶油背景', '/sprites/background/cream.png', ARRAY['neutral','fatigue'], 'cream', 'common'),
  ('background', 'rain', '雨天背景', '/sprites/background/rain.png', ARRAY['sadness','loneliness','雨','難過'], 'blue', 'common'),
  ('background', 'stars', '星星背景', '/sprites/background/stars.png', ARRAY['anxiety','loneliness','夜晚','睡不著'], 'purple', 'common'),
  ('background', 'hearts', '愛心背景', '/sprites/background/hearts.png', ARRAY['comfort','embarrassment','被愛','害羞'], 'pink', 'rare'),
  ('background', 'sparks', '火花背景', '/sprites/background/sparks.png', ARRAY['anger','frustration','生氣','煩'], 'orange', 'common')
ON CONFLICT (layer, key) DO UPDATE SET
  name = EXCLUDED.name,
  asset_path = EXCLUDED.asset_path,
  emotion_tags = EXCLUDED.emotion_tags,
  color_tone = EXCLUDED.color_tone,
  rarity = EXCLUDED.rarity,
  active = true;
