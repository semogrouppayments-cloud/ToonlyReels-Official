-- Viewer Home defaults to all approved reels, as requested.
-- This turns Cartoon-Only Mode OFF for existing viewer accounts, but preserves
-- their category selections, comment settings, limits, blocked users and PINs.
-- Cartoon-Only Mode can be enabled again in Settings after applying this fix.
BEGIN;
ALTER TABLE public.content_settings ALTER COLUMN cartoon_only_mode SET DEFAULT false;

INSERT INTO public.content_settings(user_id,cartoon_only_mode)
SELECT id,false FROM public.profiles
ON CONFLICT(user_id) DO NOTHING;

UPDATE public.content_settings AS settings
SET cartoon_only_mode=false
FROM public.profiles AS profile
WHERE settings.user_id=profile.id
  AND profile.user_type='viewer'
  AND settings.cartoon_only_mode IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.matches_content_preferences(_video_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.videos AS video
  LEFT JOIN public.content_settings AS settings ON settings.user_id=auth.uid()
  WHERE video.id=_video_id AND (
   NOT COALESCE(settings.cartoon_only_mode,false)
   OR (video.is_kids_cartoon AND video.content_category=ANY(
    CASE WHEN COALESCE(cardinality(settings.content_categories),0)=0
     THEN ARRAY['learning']::text[] ELSE settings.content_categories END
   ))
  )
 )
$$;
REVOKE ALL ON FUNCTION public.matches_content_preferences(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.matches_content_preferences(uuid) TO authenticated;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.videos,public.profiles,public.content_settings TO authenticated;
DROP POLICY IF EXISTS videos_read ON public.videos;
CREATE POLICY videos_read ON public.videos FOR SELECT TO authenticated USING (
 NOT public.is_blocked(creator_id)
 AND (
  creator_id=auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR (moderation_status='approved' AND public.matches_content_preferences(id))
 )
);
COMMIT;

SELECT
 (SELECT count(*) FROM public.videos WHERE moderation_status='approved') AS approved_reels,
 (SELECT count(*) FROM public.videos WHERE moderation_status='pending') AS pending_reels,
 (SELECT count(*) FROM public.content_settings AS settings
  JOIN public.profiles AS profile ON profile.id=settings.user_id
  WHERE profile.user_type='viewer' AND settings.cartoon_only_mode=false) AS viewers_with_all_approved_reels;
