\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES
 ('00000000-0000-4000-8000-000000000001','viewer@example.test','{"username":"viewer_a","user_type":"viewer"}',now()),
 ('00000000-0000-4000-8000-000000000002','creator@example.test','{"username":"creator_a","user_type":"creative"}',now()),
 ('00000000-0000-4000-8000-000000000003','other@example.test','{"username":"viewer_b","role":"admin"}',now());
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles)<>3 OR (SELECT count(*) FROM public.star_balances)<>3 OR (SELECT count(*) FROM public.parental_controls)<>3 THEN RAISE EXCEPTION 'Signup defaults missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.content_settings WHERE cartoon_only_mode IS DISTINCT FROM false) THEN RAISE EXCEPTION 'Standard viewer feed is not enabled by default'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') THEN RAISE EXCEPTION 'Signup metadata escalated role'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false)<>0 THEN RAISE EXCEPTION 'An application table has no RLS'; END IF;
END $$;
INSERT INTO public.videos(id,creator_id,title,video_url,moderation_status) VALUES
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Approved test','https://example.test/video.mp4','approved'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Pending test','https://example.test/pending.mp4','pending');
UPDATE public.videos SET is_kids_cartoon=true,content_category='learning' WHERE moderation_status='approved';
UPDATE public.star_balances SET balance=100 WHERE user_id='00000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"session_id":"session-a","email":"viewer@example.test"}',true);
RESET ROLE;
-- Unclassified approved creator content is visible in the standard viewer feed.
UPDATE public.videos SET is_kids_cartoon=false WHERE moderation_status='approved';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.videos)<>1 THEN RAISE EXCEPTION 'Viewer cannot see approved creator reels or pending reel leaked'; END IF;
END $$;
RESET ROLE;
UPDATE public.videos SET is_kids_cartoon=true WHERE moderation_status='approved';
-- Legacy preference values must not restrict the new shared feed.
UPDATE public.content_settings SET cartoon_only_mode=true WHERE user_id='00000000-0000-4000-8000-000000000001';
UPDATE public.videos SET content_category='music' WHERE moderation_status='approved';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.videos)<>1 THEN RAISE EXCEPTION 'Legacy category preference hid a shared approved reel'; END IF;
 BEGIN UPDATE public.videos SET is_kids_cartoon=true; RAISE EXCEPTION 'Viewer self-classified cartoon'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.videos SET content_category='learning',is_kids_cartoon=false WHERE moderation_status='approved';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.videos)<>1 THEN RAISE EXCEPTION 'Legacy cartoon flag hid a shared approved reel'; END IF;
END $$;
RESET ROLE;
UPDATE public.videos SET is_kids_cartoon=true WHERE moderation_status='approved';
SET LOCAL ROLE authenticated;
SELECT public.increment_video_views('10000000-0000-4000-8000-000000000001');
SELECT public.increment_video_views('10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF (SELECT views_count FROM public.videos WHERE id='10000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Duplicate view within 24 hours'; END IF;
END $$;
RESET ROLE;
UPDATE private.reel_view_windows SET counted_at=now()-interval '24 hours 1 second';
SET LOCAL ROLE authenticated;
SELECT public.increment_video_views('10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF (SELECT views_count FROM public.videos WHERE id='10000000-0000-4000-8000-000000000001')<>2 THEN RAISE EXCEPTION 'Return after 24 hours not counted'; END IF;
END $$;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.videos)<>1 THEN RAISE EXCEPTION 'Pending video visible to viewer'; END IF;
 IF (SELECT count(*) FROM public.star_balances)<>1 THEN RAISE EXCEPTION 'Private balances leaked'; END IF;
 BEGIN UPDATE public.star_balances SET balance=9999; RAISE EXCEPTION 'Client minted stars'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.profiles SET is_verified=true WHERE id=auth.uid(); RAISE EXCEPTION 'Client self-verified'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),'admin'); RAISE EXCEPTION 'Client assigned admin'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.videos(creator_id,title,video_url) VALUES(auth.uid(),'Viewer upload','https://example.test/no.mp4'); RAISE EXCEPTION 'Viewer uploaded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.guardian_links(guardian_id,child_id,status) VALUES(auth.uid(),'00000000-0000-4000-8000-000000000003','verified'); RAISE EXCEPTION 'Client self-verified guardian'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.verify_parental_pin('00000000-0000-4000-8000-000000000003','1234') THEN RAISE EXCEPTION 'Cross-user PIN verified'; END IF;
END $$;
SELECT public.set_parental_pin(auth.uid(),'1234');
DO $$ BEGIN
 IF public.has_parent_access() THEN RAISE EXCEPTION 'PIN-protected access was not locked'; END IF;
 IF public.verify_parental_pin(auth.uid(),'9999') THEN RAISE EXCEPTION 'Wrong PIN accepted'; END IF;
 IF NOT public.verify_parental_pin(auth.uid(),'1234') THEN RAISE EXCEPTION 'Correct PIN rejected'; END IF;
 IF EXISTS(SELECT 1 FROM public.parental_controls WHERE parental_pin IS NOT NULL) THEN RAISE EXCEPTION 'PIN hash leaked in public settings'; END IF;
 BEGIN PERFORM public.set_parental_pin('00000000-0000-4000-8000-000000000003','1234'); RAISE EXCEPTION 'Cross-user PIN set'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Cross-user PIN set' THEN RAISE; END IF; END;
END $$;
DO $$ BEGIN IF NOT public.has_parent_access() THEN RAISE EXCEPTION 'Verified PIN did not establish session access'; END IF; END $$;
SELECT public.send_stars('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',10,'20000000-0000-4000-8000-000000000001');
SELECT public.send_stars('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',10,'20000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF (SELECT balance FROM public.star_balances WHERE user_id=auth.uid())<>90 THEN RAISE EXCEPTION 'Idempotency failed'; END IF;
 BEGIN PERFORM public.send_stars('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',500,'20000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'Overspend accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Overspend accepted' THEN RAISE; END IF; END;
 IF (SELECT balance FROM public.star_balances WHERE user_id=auth.uid())<>90 THEN RAISE EXCEPTION 'Failed transfer changed sender'; END IF;
END $$;
INSERT INTO public.likes(user_id,video_id) VALUES(auth.uid(),'10000000-0000-4000-8000-000000000001');
INSERT INTO public.comments(user_id,video_id,content) VALUES(auth.uid(),'10000000-0000-4000-8000-000000000001','Test comment');
INSERT INTO public.follows(follower_id,following_id) VALUES(auth.uid(),'00000000-0000-4000-8000-000000000002');
SELECT public.record_screen_time(); SELECT public.record_screen_time();
DO $$ BEGIN
 IF public.get_screen_time_usage()<>1 THEN RAISE EXCEPTION 'Rapid screen-time ticks were double counted'; END IF;
 IF (SELECT likes_count FROM public.videos WHERE id='10000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Like counter trigger failed'; END IF;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','someone-else/avatar.png'); RAISE EXCEPTION 'Cross-user storage write accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','00000000-0000-4000-8000-000000000001/avatar.png');
SELECT public.change_user_type('creative');
DO $$ BEGIN IF NOT public.has_role(auth.uid(),'creative') THEN RAISE EXCEPTION 'Atomic role change failed'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"session_id":"session-b","email":"creator@example.test"}',true);
DO $$ BEGIN
 IF (SELECT balance FROM public.star_balances WHERE user_id=auth.uid())<>10 THEN RAISE EXCEPTION 'Gift recipient not credited'; END IF;
 IF (SELECT pending_balance FROM public.creator_monetization WHERE user_id=auth.uid())<>10 THEN RAISE EXCEPTION 'Creator ledger not credited'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE user_id=auth.uid())<>4 THEN RAISE EXCEPTION 'Notification triggers missing/duplicated'; END IF;
END $$;
INSERT INTO public.videos(creator_id,title,video_url) VALUES(auth.uid(),'New upload','https://example.test/new.mp4');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.notifications)<>0 THEN RAISE EXCEPTION 'Another user notifications leaked'; END IF;
 IF (SELECT count(*) FROM public.screen_time_usage)<>0 THEN RAISE EXCEPTION 'Another user screen time leaked'; END IF;
END $$;
SELECT public.set_parental_pin(auth.uid(),'4321');
DO $$ DECLARE attempt integer; BEGIN
 FOR attempt IN 1..10 LOOP PERFORM public.verify_parental_pin(auth.uid(),'0000'); END LOOP;
 IF public.verify_parental_pin(auth.uid(),'4321') THEN RAISE EXCEPTION 'PIN lockout was bypassed'; END IF;
 FOR attempt IN 1..100 LOOP IF NOT public.consume_api_quota('chat') THEN RAISE EXCEPTION 'Quota exhausted too early'; END IF; END LOOP;
 IF public.consume_api_quota('chat') THEN RAISE EXCEPTION 'Daily API quota was bypassed'; END IF;
 BEGIN PERFORM * FROM private.pin_hashes; RAISE EXCEPTION 'Private PIN hashes leaked'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM private.pin_hashes WHERE user_id='00000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Account cascade incomplete'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: signup, RLS, roles, moderation visibility, PINs, wallet atomicity/idempotency, counters, notifications, storage, quotas, PIN lockout, screen time and deletion cascades' AS result;
