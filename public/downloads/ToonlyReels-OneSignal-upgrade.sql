-- Durable OneSignal delivery. Safe to apply before provider secrets are configured.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS private.notification_push_outbox (
 notification_id uuid PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','skipped','dead')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid, leased_until timestamptz, provider_id text, last_error text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_push_pending ON private.notification_push_outbox(status,available_at);
CREATE TABLE IF NOT EXISTS private.onesignal_delivery_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), webhook_secret text NOT NULL CHECK(length(webhook_secret)>=32)
);
CREATE TABLE IF NOT EXISTS private.push_identity_limits (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 window_started timestamptz NOT NULL DEFAULT now(), calls integer NOT NULL DEFAULT 0
);
ALTER TABLE private.notification_push_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.onesignal_delivery_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.push_identity_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.notification_push_outbox,private.onesignal_delivery_config,private.push_identity_limits FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.push_notification_allowed(_notification_id uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.notifications n JOIN public.notification_preferences p ON p.user_id=n.user_id
  LEFT JOIN public.videos v ON v.id=n.video_id
  WHERE n.id=_notification_id AND p.push_enabled IS TRUE AND n.actor_id<>n.user_id
   AND CASE n.type WHEN 'like' THEN COALESCE(p.likes_enabled,true)
    WHEN 'comment' THEN COALESCE(p.comments_enabled,true) WHEN 'reply' THEN COALESCE(p.replies_enabled,true)
    WHEN 'follow' THEN COALESCE(p.follows_enabled,true) WHEN 'new_video' THEN COALESCE(p.new_videos_enabled,true) ELSE true END
   AND NOT EXISTS(SELECT 1 FROM public.blocks b WHERE
    (b.blocker_id=n.user_id AND b.blocked_id=n.actor_id) OR (b.blocker_id=n.actor_id AND b.blocked_id=n.user_id))
   AND (n.video_id IS NULL OR (v.moderation_status='approved' AND NOT EXISTS(SELECT 1 FROM public.blocks b WHERE
    (b.blocker_id=n.user_id AND b.blocked_id=v.creator_id) OR (b.blocker_id=v.creator_id AND b.blocked_id=n.user_id))))
   AND CASE n.type
    WHEN 'like' THEN CASE WHEN n.comment_id IS NULL
     THEN EXISTS(SELECT 1 FROM public.likes l WHERE l.video_id=n.video_id AND l.user_id=n.actor_id)
     ELSE EXISTS(SELECT 1 FROM public.comment_likes l WHERE l.comment_id=n.comment_id AND l.user_id=n.actor_id) END
    WHEN 'comment' THEN EXISTS(SELECT 1 FROM public.comments c WHERE c.id=n.comment_id AND c.user_id=n.actor_id AND c.video_id=n.video_id)
    WHEN 'reply' THEN EXISTS(SELECT 1 FROM public.comments c WHERE c.id=n.comment_id AND c.user_id=n.actor_id AND c.video_id=n.video_id)
    WHEN 'follow' THEN EXISTS(SELECT 1 FROM public.follows f WHERE f.following_id=n.user_id AND f.follower_id=n.actor_id)
    WHEN 'new_video' THEN EXISTS(SELECT 1 FROM public.follows f WHERE f.following_id=n.actor_id AND f.follower_id=n.user_id)
    ELSE true END
 )
$$;
REVOKE ALL ON FUNCTION private.push_notification_allowed(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.wake_onesignal_delivery() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE secret_value text; BEGIN
 SELECT webhook_secret INTO secret_value FROM private.onesignal_delivery_config WHERE singleton;
 IF secret_value IS NULL OR NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN RETURN false; END IF;
 IF current_setting('toonly.push_woken',true)='true' THEN RETURN true; END IF;
 PERFORM set_config('toonly.push_woken','true',true);
 -- Fixed own-project endpoint: configuration cannot redirect a stored secret to another host.
 EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 10000)'
 USING 'https://vxenlskelqwpghclxbjj.supabase.co/functions/v1/onesignal-delivery',
  jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret_value), '{}'::jsonb;
 RETURN true;
EXCEPTION WHEN OTHERS THEN
 -- Do not fail a like/reply when networking is unavailable. The durable queue remains.
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION private.wake_onesignal_delivery() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.enqueue_onesignal_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF private.push_notification_allowed(NEW.id) THEN
  INSERT INTO private.notification_push_outbox(notification_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
  PERFORM private.wake_onesignal_delivery();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enqueue_onesignal_notification() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS queue_onesignal_notification ON public.notifications;
CREATE TRIGGER queue_onesignal_notification AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION private.enqueue_onesignal_notification();

CREATE OR REPLACE FUNCTION public.configure_onesignal_delivery(_webhook_secret text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF length(COALESCE(_webhook_secret,''))<32 THEN RAISE EXCEPTION 'Use a random webhook secret of at least 32 characters'; END IF;
 INSERT INTO private.onesignal_delivery_config(singleton,webhook_secret) VALUES(true,_webhook_secret)
 ON CONFLICT(singleton) DO UPDATE SET webhook_secret=EXCLUDED.webhook_secret;
 BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   EXECUTE 'SELECT cron.schedule($1,$2,$3)' USING 'toonly-onesignal-delivery','* * * * *','SELECT private.wake_onesignal_delivery();';
  END IF;
 EXCEPTION WHEN OTHERS THEN NULL;
 END;
 RETURN private.wake_onesignal_delivery();
END $$;
REVOKE ALL ON FUNCTION public.configure_onesignal_delivery(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.configure_onesignal_delivery(text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_onesignal_notifications(_limit integer DEFAULT 25)
RETURNS TABLE(notification_id uuid,lease_id uuid,user_id uuid,event_type text,video_id uuid,comment_id uuid,sound_enabled boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF;
 UPDATE private.notification_push_outbox q SET status='skipped',last_error='preferences_or_content_changed',updated_at=now()
 WHERE q.status IN ('pending','processing') AND NOT private.push_notification_allowed(q.notification_id);
 UPDATE private.notification_push_outbox q SET status='dead',last_error='delivery_window_expired',updated_at=now()
 WHERE q.status IN ('pending','processing') AND (q.created_at<now()-interval '24 hours' OR (q.attempts>=8 AND COALESCE(q.leased_until,now())<=now()));
 RETURN QUERY
 WITH ready AS (
  SELECT q.notification_id FROM private.notification_push_outbox q
  WHERE ((q.status='pending' AND q.available_at<=now()) OR (q.status='processing' AND q.leased_until<now()))
   AND q.attempts<8 ORDER BY q.created_at LIMIT GREATEST(1,LEAST(COALESCE(_limit,25),50)) FOR UPDATE SKIP LOCKED
 ), leased AS (
  UPDATE private.notification_push_outbox q SET status='processing',attempts=q.attempts+1,lease_id=gen_random_uuid(),
   leased_until=now()+interval '2 minutes',updated_at=now()
  FROM ready r WHERE q.notification_id=r.notification_id RETURNING q.notification_id,q.lease_id
 ) SELECT l.notification_id,l.lease_id,n.user_id,n.type::text,n.video_id,n.comment_id,COALESCE(p.sound_enabled,true)
 FROM leased l JOIN public.notifications n ON n.id=l.notification_id JOIN public.notification_preferences p ON p.user_id=n.user_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_onesignal_notifications(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_onesignal_notifications(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.onesignal_notification_allowed(_notification_id uuid,_lease_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF;
 RETURN EXISTS(SELECT 1 FROM private.notification_push_outbox q WHERE q.notification_id=_notification_id AND q.lease_id=_lease_id AND q.status='processing')
  AND private.push_notification_allowed(_notification_id);
END $$;
REVOKE ALL ON FUNCTION public.onesignal_notification_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.onesignal_notification_allowed(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_onesignal_notification(_notification_id uuid,_lease_id uuid,_outcome text,
 _provider_id text DEFAULT NULL,_error text DEFAULT NULL,_response_code integer DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recipient uuid; kind text; BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF;
 IF _outcome NOT IN ('sent','retry','skipped','dead') THEN RAISE EXCEPTION 'Invalid delivery outcome'; END IF;
 UPDATE private.notification_push_outbox q SET
  status=CASE WHEN _outcome='retry' AND q.attempts>=8 THEN 'dead' WHEN _outcome='retry' THEN 'pending' ELSE _outcome END,
  available_at=CASE WHEN _outcome='retry' THEN now()+make_interval(secs=>LEAST(3600,power(2,q.attempts)::integer*30)) ELSE q.available_at END,
  provider_id=left(_provider_id,200),last_error=left(_error,200),lease_id=NULL,leased_until=NULL,updated_at=now()
 WHERE q.notification_id=_notification_id AND q.lease_id=_lease_id AND q.status='processing';
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT user_id,type::text INTO recipient,kind FROM public.notifications WHERE id=_notification_id;
 INSERT INTO public.notification_delivery_logs(notification_id,user_id,event_type,dedupe_key,provider_id,response_code,status)
 VALUES(_notification_id,recipient,kind,_notification_id::text,left(_provider_id,200),_response_code,_outcome);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finish_onesignal_notification(uuid,uuid,text,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_onesignal_notification(uuid,uuid,text,text,text,integer) TO service_role;

-- One source of publication notifications for both dashboard SQL and admin RPC.
CREATE OR REPLACE FUNCTION private.notify_published_reel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.moderation_status<>'approved' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.moderation_status='approved' THEN RETURN NEW; END IF;
 INSERT INTO public.notifications(user_id,actor_id,type,video_id)
 SELECT f.follower_id,NEW.creator_id,'new_video',NEW.id FROM public.follows f
 JOIN public.notification_preferences p ON p.user_id=f.follower_id
 WHERE f.following_id=NEW.creator_id AND f.follower_id<>NEW.creator_id AND p.new_videos_enabled IS TRUE
  AND NOT EXISTS(SELECT 1 FROM public.blocks b WHERE
   (b.blocker_id=f.follower_id AND b.blocked_id=NEW.creator_id) OR (b.blocker_id=NEW.creator_id AND b.blocked_id=f.follower_id))
 ORDER BY f.follower_id LIMIT 1000;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.notify_published_reel() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS notify_approved_reel ON public.videos;
CREATE TRIGGER notify_approved_reel AFTER INSERT OR UPDATE OF moderation_status ON public.videos
FOR EACH ROW EXECUTE FUNCTION private.notify_published_reel();

CREATE OR REPLACE FUNCTION public.review_video(_video_id uuid,_status text,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') OR _status NOT IN ('approved','rejected') OR nullif(trim(_reason),'') IS NULL THEN
  RAISE EXCEPTION 'Admin review and reason required';
 END IF;
 PERFORM 1 FROM public.videos WHERE id=_video_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Video not found'; END IF;
 UPDATE public.videos SET moderation_status=_status WHERE id=_video_id;
 INSERT INTO public.moderation_actions(moderator_id,target_type,target_id,action,reason)
 VALUES(auth.uid(),'video',_video_id,_status,_reason);
 -- notify_approved_reel inserts follower alerts once for this transition.
END $$;
REVOKE ALL ON FUNCTION public.review_video(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_video(uuid,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.consume_push_identity_quota() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total integer; BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 INSERT INTO private.push_identity_limits(user_id,calls) VALUES(auth.uid(),1)
 ON CONFLICT(user_id) DO UPDATE SET
  calls=CASE WHEN private.push_identity_limits.window_started<now()-interval '1 hour' THEN 1 ELSE private.push_identity_limits.calls+1 END,
  window_started=CASE WHEN private.push_identity_limits.window_started<now()-interval '1 hour' THEN now() ELSE private.push_identity_limits.window_started END
 WHERE private.push_identity_limits.window_started<now()-interval '1 hour' OR private.push_identity_limits.calls<30
 RETURNING calls INTO total;
 RETURN total IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.consume_push_identity_quota() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_push_identity_quota() TO authenticated;
COMMIT;
