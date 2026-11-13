BEGIN;
-- Classification is reviewed metadata, never inferred from titles or uploader tags.
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_kids_cartoon boolean NOT NULL DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS content_category text CHECK (content_category IN ('learning','music','adventure','comedy'));
ALTER TABLE public.content_settings ALTER COLUMN content_categories SET DEFAULT ARRAY['learning']::text[];
UPDATE public.content_settings SET content_categories=ARRAY['learning']::text[] WHERE COALESCE(cardinality(content_categories),0)=0;
DROP POLICY IF EXISTS videos_upload ON public.videos;
CREATE POLICY videos_upload ON public.videos FOR INSERT TO authenticated WITH CHECK (
 creator_id=auth.uid() AND public.has_role(auth.uid(),'creative') AND moderation_status='pending'
 AND views_count=0 AND likes_count=0 AND transcription_status='pending' AND subtitles IS NULL
 AND video_variants='{}'::jsonb AND is_kids_cartoon=false AND content_category IS NULL);
CREATE OR REPLACE FUNCTION public.matches_content_preferences(_video_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.videos v LEFT JOIN public.content_settings s ON s.user_id=auth.uid()
 WHERE v.id=_video_id AND (NOT COALESCE(s.cartoon_only_mode,true) OR
 (v.is_kids_cartoon AND v.content_category=ANY(CASE WHEN COALESCE(cardinality(s.content_categories),0)=0 THEN ARRAY['learning']::text[] ELSE s.content_categories END))))
$$;
REVOKE ALL ON FUNCTION public.matches_content_preferences(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.matches_content_preferences(uuid) TO authenticated;
DROP POLICY IF EXISTS videos_read ON public.videos;
CREATE POLICY videos_read ON public.videos FOR SELECT TO authenticated USING (
 (creator_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (moderation_status='approved' AND public.matches_content_preferences(id)))
 AND NOT public.is_blocked(creator_id));
CREATE OR REPLACE FUNCTION public.classify_kids_cartoon(_video_id uuid,_is_kids_cartoon boolean,_category text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin review required'; END IF;
 UPDATE public.videos SET is_kids_cartoon=_is_kids_cartoon,content_category=_category WHERE id=_video_id;
END $$;
REVOKE ALL ON FUNCTION public.classify_kids_cartoon(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.classify_kids_cartoon(uuid,boolean,text) TO authenticated;
CREATE TABLE IF NOT EXISTS private.reel_view_windows (
 video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
 viewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
 counted_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(video_id,viewer_id)
);
CREATE OR REPLACE FUNCTION public.increment_video_views(_video_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE counted boolean; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.videos WHERE id=_video_id AND moderation_status='approved' AND NOT public.is_blocked(creator_id)) OR NOT public.matches_content_preferences(_video_id) THEN RETURN; END IF;
 INSERT INTO private.reel_view_windows(video_id,viewer_id) VALUES(_video_id,auth.uid())
 ON CONFLICT(video_id,viewer_id) DO UPDATE SET counted_at=now()
 WHERE private.reel_view_windows.counted_at <= now()-interval '24 hours'
 RETURNING true INTO counted;
 IF counted THEN UPDATE public.videos SET views_count=views_count+1 WHERE id=_video_id; END IF;
END $$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='comment_likes' AND schemaname='public') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
 END IF;
END $$;
COMMIT;
