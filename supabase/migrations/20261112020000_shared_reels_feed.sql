-- One approved-reels feed for every signed-in account type.
-- Removes cartoon/category visibility restrictions; keeps blocks and draft access.
BEGIN;
ALTER TABLE public.content_settings ALTER COLUMN cartoon_only_mode SET DEFAULT false;
ALTER TABLE public.content_settings ALTER COLUMN content_categories SET DEFAULT '{}'::text[];
INSERT INTO public.content_settings(user_id,cartoon_only_mode)
SELECT id,false FROM public.profiles ON CONFLICT(user_id) DO NOTHING;
UPDATE public.content_settings SET cartoon_only_mode=false WHERE cartoon_only_mode IS DISTINCT FROM false;

-- Retain the legacy function name for installed apps and the view-count RPC.
-- Saved category preferences no longer affect access.
CREATE OR REPLACE FUNCTION public.matches_content_preferences(_video_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.videos WHERE id=_video_id AND moderation_status='approved')
$$;
REVOKE ALL ON FUNCTION public.matches_content_preferences(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.matches_content_preferences(uuid) TO authenticated;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.videos,public.profiles TO authenticated;
DROP POLICY IF EXISTS videos_read ON public.videos;
CREATE POLICY videos_read ON public.videos FOR SELECT TO authenticated USING (
 NOT public.is_blocked(creator_id)
 AND (moderation_status='approved' OR creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'))
);
COMMIT;

SELECT moderation_status,count(*) AS reels FROM public.videos GROUP BY moderation_status;
