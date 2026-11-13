-- ToonlyReels: fresh Supabase project baseline. Run ONCE in an empty project's SQL Editor.
-- Not an upgrade script. Never run the archived Lovable migrations after this baseline.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'Fresh-project baseline: public.profiles already exists. No changes applied.';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TYPE public.user_type AS ENUM ('viewer', 'creative');
CREATE TYPE public.app_role AS ENUM ('viewer', 'creative', 'admin');
CREATE TYPE public.notification_type AS ENUM ('like', 'comment', 'follow', 'reply', 'new_video', 'star_gift', 'verification', 'system');

CREATE TABLE public.blocks (
  blocked_id uuid NOT NULL,
  blocker_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY
);

CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL
);

CREATE TABLE public.comments (
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid,
  updated_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL
);

CREATE TABLE public.content_settings (
  cartoon_only_mode boolean DEFAULT true,
  comments_visibility text DEFAULT 'emoji_only',
  content_categories text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  interaction_limits boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.creator_monetization (
  created_at timestamptz DEFAULT now(),
  eligibility_checked_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_eligible boolean DEFAULT false,
  pending_balance integer DEFAULT 0,
  revenue_split_creator integer DEFAULT 70,
  revenue_split_platform integer DEFAULT 30,
  total_stars_earned integer DEFAULT 0,
  total_withdrawn integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.creator_verifications (
  business_document_url text,
  business_email text NOT NULL,
  company_name text,
  created_at timestamptz DEFAULT now(),
  full_name text NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_document_url text,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  status text DEFAULT 'pending' NOT NULL,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.device_tokens (
  created_at timestamptz DEFAULT now() NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  last_seen_at timestamptz,
  platform text DEFAULT 'android' NOT NULL,
  provider text DEFAULT 'fcm' NOT NULL,
  token text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid NOT NULL
);

CREATE TABLE public.follows (
  created_at timestamptz DEFAULT now() NOT NULL,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY
);

CREATE TABLE public.likes (
  created_at timestamptz DEFAULT now() NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL
);

CREATE TABLE public.notification_delivery_logs (
  created_at timestamptz DEFAULT now() NOT NULL,
  dedupe_key text,
  event_type text,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid,
  provider_id text,
  request_body jsonb,
  response_body jsonb,
  response_code integer,
  status text DEFAULT 'pending' NOT NULL,
  user_id uuid
);

CREATE TABLE public.notification_preferences (
  comments_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  follows_enabled boolean DEFAULT true,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  likes_enabled boolean DEFAULT true,
  new_videos_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT false,
  replies_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.notifications (
  actor_id uuid NOT NULL,
  comment_id uuid,
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_read boolean DEFAULT false,
  type public.notification_type NOT NULL,
  user_id uuid NOT NULL,
  video_id uuid
);

CREATE TABLE public.parental_controls (
  bedtime_end time DEFAULT '07:00',
  bedtime_lock boolean DEFAULT false,
  bedtime_start time DEFAULT '21:00',
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parental_pin text,
  profile_pin_enabled boolean DEFAULT true,
  school_end_time time DEFAULT '15:00',
  school_hours_lock boolean DEFAULT false,
  school_start_time time DEFAULT '08:00',
  screen_time_enabled boolean DEFAULT true,
  screen_time_limit integer DEFAULT 60,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.playback_settings (
  autoplay boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subtitles_enabled boolean DEFAULT true,
  subtitles_size text DEFAULT 'medium',
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  video_quality text DEFAULT 'auto'
);

CREATE TABLE public.profile_secrets (
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_pin text,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.profiles (
  age_range text DEFAULT '7-9',
  avatar_url text,
  bio text,
  cover_photo_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  facebook_url text,
  id uuid PRIMARY KEY,
  instagram_url text,
  is_premium boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  selected_avatar text DEFAULT '🦊',
  social_links_order text[] DEFAULT '{}'::text[],
  social_links_visible text[] DEFAULT '{}'::text[],
  tiktok_url text,
  updated_at timestamptz DEFAULT now() NOT NULL,
  user_type public.user_type DEFAULT 'viewer' NOT NULL,
  username text NOT NULL,
  youtube_url text
);

CREATE TABLE public.push_templates (
  body_template text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  event_type text PRIMARY KEY,
  title_template text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.reports (
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reason text NOT NULL,
  reported_id uuid NOT NULL,
  reported_type text NOT NULL,
  reporter_id uuid NOT NULL
);

CREATE TABLE public.saved_videos (
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL
);

CREATE TABLE public.star_balances (
  balance integer DEFAULT 0 NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  total_earned integer DEFAULT 0 NOT NULL,
  total_spent integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

CREATE TABLE public.star_packs (
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active boolean DEFAULT false,
  name text NOT NULL,
  price_cents integer NOT NULL,
  stars_amount integer NOT NULL
);

CREATE TABLE public.star_transactions (
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  from_user_id uuid,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  to_user_id uuid,
  type text NOT NULL,
  video_id uuid
);

CREATE TABLE public.user_roles (
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role NOT NULL,
  user_id uuid NOT NULL
);

CREATE TABLE public.user_type_changes (
  changed_at timestamptz DEFAULT now() NOT NULL,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  new_type text NOT NULL,
  original_type text NOT NULL,
  user_id uuid NOT NULL
);

CREATE TABLE public.video_analytics (
  completed boolean DEFAULT true,
  device_type text,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL,
  viewer_id uuid,
  watch_duration double precision DEFAULT 0 NOT NULL,
  watched_at timestamptz DEFAULT now()
);

CREATE TABLE public.video_downloads (
  created_at timestamptz DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL
);

CREATE TABLE public.videos (
  created_at timestamptz DEFAULT now() NOT NULL,
  creator_id uuid NOT NULL,
  description text,
  duration double precision,
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  likes_count integer DEFAULT 0 NOT NULL,
  subtitles jsonb,
  tags text[] DEFAULT '{}'::text[],
  thumbnail_url text,
  title text NOT NULL,
  transcription_status text DEFAULT 'pending',
  updated_at timestamptz DEFAULT now() NOT NULL,
  video_url text NOT NULL,
  video_variants jsonb DEFAULT '{}'::jsonb NOT NULL,
  views_count integer DEFAULT 0 NOT NULL
);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE public.content_settings ADD CONSTRAINT content_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.creator_monetization ADD CONSTRAINT creator_monetization_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.creator_verifications ADD CONSTRAINT creator_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.creator_verifications ADD CONSTRAINT creator_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.device_tokens ADD CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.likes ADD CONSTRAINT likes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE public.notification_delivery_logs ADD CONSTRAINT notification_delivery_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE SET NULL;
ALTER TABLE public.notification_delivery_logs ADD CONSTRAINT notification_delivery_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE public.parental_controls ADD CONSTRAINT parental_controls_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.playback_settings ADD CONSTRAINT playback_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profile_secrets ADD CONSTRAINT profile_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.saved_videos ADD CONSTRAINT saved_videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.saved_videos ADD CONSTRAINT saved_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE public.star_balances ADD CONSTRAINT star_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.star_transactions ADD CONSTRAINT star_transactions_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.star_transactions ADD CONSTRAINT star_transactions_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.star_transactions ADD CONSTRAINT star_transactions_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_type_changes ADD CONSTRAINT user_type_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.video_analytics ADD CONSTRAINT video_analytics_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE public.video_analytics ADD CONSTRAINT video_analytics_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.video_downloads ADD CONSTRAINT video_downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.video_downloads ADD CONSTRAINT video_downloads_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE public.videos ADD CONSTRAINT videos_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD UNIQUE (username);
ALTER TABLE public.profiles ADD CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');
ALTER TABLE public.profiles ADD CHECK (bio IS NULL OR char_length(bio) <= 500);
ALTER TABLE public.videos ADD CHECK (char_length(title) BETWEEN 1 AND 500);
ALTER TABLE public.videos ADD CHECK (description IS NULL OR char_length(description) <= 5000);
ALTER TABLE public.videos ADD CHECK (duration IS NULL OR duration BETWEEN 0 AND 120);
ALTER TABLE public.videos ADD CHECK (likes_count >= 0 AND views_count >= 0);
ALTER TABLE public.videos ADD CHECK (jsonb_typeof(video_variants) = 'object');
ALTER TABLE public.videos ADD CHECK (transcription_status IN ('pending','processing','completed','failed'));
ALTER TABLE public.comments ADD CHECK (char_length(content) BETWEEN 1 AND 500);
ALTER TABLE public.follows ADD UNIQUE (follower_id, following_id);
ALTER TABLE public.follows ADD CHECK (follower_id <> following_id);
ALTER TABLE public.blocks ADD UNIQUE (blocker_id, blocked_id);
ALTER TABLE public.blocks ADD CHECK (blocker_id <> blocked_id);
ALTER TABLE public.likes ADD UNIQUE (user_id, video_id);
ALTER TABLE public.comment_likes ADD UNIQUE (user_id, comment_id);
ALTER TABLE public.saved_videos ADD UNIQUE (user_id, video_id);
ALTER TABLE public.creator_verifications ADD CHECK (status IN ('pending','approved','rejected'));
ALTER TABLE public.reports ADD CHECK (reported_type IN ('video','comment','profile'));
ALTER TABLE public.reports ADD CHECK (char_length(reason) BETWEEN 1 AND 1000);
ALTER TABLE public.parental_controls ADD CHECK (screen_time_limit BETWEEN 1 AND 1440);
ALTER TABLE public.parental_controls ADD UNIQUE (user_id);
ALTER TABLE public.playback_settings ADD CHECK (video_quality IN ('auto','medium','high'));
ALTER TABLE public.playback_settings ADD CHECK (subtitles_size IN ('small','medium','large'));
ALTER TABLE public.playback_settings ADD UNIQUE (user_id);
ALTER TABLE public.star_balances ADD CHECK (balance >= 0 AND total_earned >= 0 AND total_spent >= 0);
ALTER TABLE public.star_balances ADD UNIQUE (user_id);
ALTER TABLE public.star_packs ADD CHECK (stars_amount > 0 AND price_cents > 0);
ALTER TABLE public.star_transactions ADD CHECK (amount > 0);
ALTER TABLE public.star_transactions ADD CHECK (type IN ('purchase','gift','earning','withdrawal'));
ALTER TABLE public.creator_monetization ADD CHECK (pending_balance >= 0 AND total_stars_earned >= 0 AND total_withdrawn >= 0);
ALTER TABLE public.creator_monetization ADD CHECK (revenue_split_creator + revenue_split_platform = 100 AND revenue_split_creator BETWEEN 0 AND 100);
ALTER TABLE public.creator_monetization ADD UNIQUE (user_id);
ALTER TABLE public.user_roles ADD UNIQUE (user_id, role);
ALTER TABLE public.video_analytics ADD CHECK (watch_duration BETWEEN 0 AND 120);
ALTER TABLE public.device_tokens ADD UNIQUE (token);
ALTER TABLE public.device_tokens ADD CHECK (platform IN ('android','ios','web'));
ALTER TABLE public.content_settings ADD UNIQUE (user_id);
ALTER TABLE public.notification_preferences ADD UNIQUE (user_id);
ALTER TABLE public.profile_secrets ADD UNIQUE (user_id);
ALTER TABLE public.user_type_changes ADD UNIQUE (user_id);

ALTER TABLE public.videos ADD COLUMN moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected'));
ALTER TABLE public.reports ADD COLUMN status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed'));
ALTER TABLE public.reports ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN reviewed_at timestamptz;
ALTER TABLE public.reports ADD COLUMN resolution text;
ALTER TABLE public.star_transactions ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX star_transfer_idempotency ON public.star_transactions(from_user_id,request_id) WHERE request_id IS NOT NULL;
CREATE TABLE public.monthly_report_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
 email text NOT NULL, enabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cleanup_logs (executed_at timestamptz NOT NULL DEFAULT now(), id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cleanup_type text NOT NULL, results jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.guardian_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','revoked')),
 verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(guardian_id,child_id), CHECK(guardian_id <> child_id)
);
CREATE TABLE public.parental_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, policy_version text NOT NULL,
 status text NOT NULL CHECK(status IN ('granted','revoked')), verification_method text NOT NULL,
 provider_reference text UNIQUE, consented_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE public.screen_time_usage (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, usage_date date NOT NULL DEFAULT CURRENT_DATE,
 minutes_used integer NOT NULL DEFAULT 0 CHECK(minutes_used BETWEEN 0 AND 1440), bonus_minutes integer NOT NULL DEFAULT 0 CHECK(bonus_minutes BETWEEN 0 AND 1440), last_tick_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,usage_date)
);
CREATE TABLE public.pin_attempts (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, pin_type text NOT NULL CHECK(pin_type IN ('parental','profile')),
 failed_attempts integer NOT NULL DEFAULT 0, locked_until timestamptz, PRIMARY KEY(user_id,pin_type)
);
CREATE TABLE public.video_renditions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
 quality text NOT NULL CHECK(quality IN ('tiny','low','medium','high','original')), storage_path text NOT NULL,
 width integer CHECK(width>0), height integer CHECK(height>0), bitrate integer CHECK(bitrate>0), codec text,
 mime_type text NOT NULL, has_audio boolean NOT NULL DEFAULT true, size_bytes bigint CHECK(size_bytes>0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(video_id,quality)
);
CREATE TABLE public.video_processing_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('transcode','thumbnail','transcribe','moderate')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
 attempts integer NOT NULL DEFAULT 0, source_path text NOT NULL, last_error text,
 available_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(video_id,kind)
);
CREATE TABLE public.conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.conversation_members (
 conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, last_read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE public.messaging_permissions (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, enabled boolean NOT NULL DEFAULT false, approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 content text NOT NULL CHECK(char_length(content) BETWEEN 1 AND 2000), moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.billing_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, event_id text NOT NULL, user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','processed','failed')), payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,event_id)
);
CREATE TABLE public.payout_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 stars_amount integer NOT NULL CHECK(stars_amount>0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','rejected')),
 provider_reference text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.account_deletion_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')), requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, last_error text
);
CREATE TABLE public.api_usage (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, feature text NOT NULL, usage_date date NOT NULL DEFAULT CURRENT_DATE, calls integer NOT NULL DEFAULT 0 CHECK(calls>=0), PRIMARY KEY(user_id,feature,usage_date));
CREATE TABLE public.moderation_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 target_type text NOT NULL CHECK(target_type IN ('video','comment','profile','message','report','verification')), target_id uuid NOT NULL,
 action text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_blocked_id ON public.blocks(blocked_id);
CREATE INDEX idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_created_at ON public.blocks(created_at);
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_created_at ON public.comment_likes(created_at);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_video_id ON public.comments(video_id);
CREATE INDEX idx_content_settings_created_at ON public.content_settings(created_at);
CREATE INDEX idx_content_settings_user_id ON public.content_settings(user_id);
CREATE INDEX idx_creator_monetization_created_at ON public.creator_monetization(created_at);
CREATE INDEX idx_creator_monetization_user_id ON public.creator_monetization(user_id);
CREATE INDEX idx_creator_verifications_created_at ON public.creator_verifications(created_at);
CREATE INDEX idx_creator_verifications_user_id ON public.creator_verifications(user_id);
CREATE INDEX idx_device_tokens_created_at ON public.device_tokens(created_at);
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_follows_created_at ON public.follows(created_at);
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);
CREATE INDEX idx_likes_created_at ON public.likes(created_at);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_likes_video_id ON public.likes(video_id);
CREATE INDEX idx_notification_delivery_logs_created_at ON public.notification_delivery_logs(created_at);
CREATE INDEX idx_notification_delivery_logs_notification_id ON public.notification_delivery_logs(notification_id);
CREATE INDEX idx_notification_delivery_logs_provider_id ON public.notification_delivery_logs(provider_id);
CREATE INDEX idx_notification_delivery_logs_user_id ON public.notification_delivery_logs(user_id);
CREATE INDEX idx_notification_preferences_created_at ON public.notification_preferences(created_at);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_notifications_actor_id ON public.notifications(actor_id);
CREATE INDEX idx_notifications_comment_id ON public.notifications(comment_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_video_id ON public.notifications(video_id);
CREATE INDEX idx_parental_controls_created_at ON public.parental_controls(created_at);
CREATE INDEX idx_parental_controls_user_id ON public.parental_controls(user_id);
CREATE INDEX idx_playback_settings_created_at ON public.playback_settings(created_at);
CREATE INDEX idx_playback_settings_user_id ON public.playback_settings(user_id);
CREATE INDEX idx_profile_secrets_created_at ON public.profile_secrets(created_at);
CREATE INDEX idx_profile_secrets_user_id ON public.profile_secrets(user_id);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX idx_reports_created_at ON public.reports(created_at);
CREATE INDEX idx_reports_reported_id ON public.reports(reported_id);
CREATE INDEX idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX idx_saved_videos_created_at ON public.saved_videos(created_at);
CREATE INDEX idx_saved_videos_user_id ON public.saved_videos(user_id);
CREATE INDEX idx_saved_videos_video_id ON public.saved_videos(video_id);
CREATE INDEX idx_star_balances_user_id ON public.star_balances(user_id);
CREATE INDEX idx_star_packs_created_at ON public.star_packs(created_at);
CREATE INDEX idx_star_transactions_created_at ON public.star_transactions(created_at);
CREATE INDEX idx_star_transactions_from_user_id ON public.star_transactions(from_user_id);
CREATE INDEX idx_star_transactions_to_user_id ON public.star_transactions(to_user_id);
CREATE INDEX idx_star_transactions_video_id ON public.star_transactions(video_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_type_changes_user_id ON public.user_type_changes(user_id);
CREATE INDEX idx_video_analytics_video_id ON public.video_analytics(video_id);
CREATE INDEX idx_video_analytics_viewer_id ON public.video_analytics(viewer_id);
CREATE INDEX idx_video_downloads_created_at ON public.video_downloads(created_at);
CREATE INDEX idx_video_downloads_user_id ON public.video_downloads(user_id);
CREATE INDEX idx_video_downloads_video_id ON public.video_downloads(video_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at);
CREATE INDEX idx_videos_creator_id ON public.videos(creator_id);

CREATE INDEX idx_video_feed ON public.videos(moderation_status,created_at DESC);
CREATE INDEX idx_video_tags ON public.videos USING gin(tags);
CREATE INDEX idx_video_variants ON public.videos USING gin(video_variants);
CREATE INDEX idx_unread_notifications ON public.notifications(user_id,created_at DESC) WHERE is_read=false;
CREATE INDEX idx_analytics_watched_at ON public.video_analytics(viewer_id,watched_at DESC);
CREATE INDEX idx_job_queue ON public.video_processing_jobs(status,available_at);
CREATE INDEX idx_guardian_child ON public.guardian_links(child_id,status);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id,created_at);
CREATE INDEX idx_conversation_member ON public.conversation_members(user_id);

-- Server-owned identity, PIN, wallet, analytics and moderation operations.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE private.pin_hashes (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, pin_type text NOT NULL CHECK(pin_type IN ('parental','profile')), hash text NOT NULL, PRIMARY KEY(user_id,pin_type));
CREATE TABLE private.parental_sessions (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, session_id text NOT NULL, expires_at timestamptz NOT NULL, PRIMARY KEY(user_id,session_id));

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
CREATE FUNCTION public.is_guardian(_child_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.guardian_links WHERE guardian_id=auth.uid() AND child_id=_child_id AND status='verified');
$$;
CREATE FUNCTION public.is_blocked(_other_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.blocks WHERE (blocker_id=auth.uid() AND blocked_id=_other_id) OR (blocked_id=auth.uid() AND blocker_id=_other_id));
$$;
CREATE FUNCTION public.has_parent_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (
   NOT EXISTS(SELECT 1 FROM private.pin_hashes WHERE user_id=auth.uid() AND pin_type='parental')
   OR EXISTS(SELECT 1 FROM private.parental_sessions WHERE user_id=auth.uid() AND session_id=auth.jwt()->>'session_id' AND expires_at>now())
 );
$$;
CREATE FUNCTION public.can_access_report(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (auth.uid()=_user_id AND public.has_parent_access()) OR public.is_guardian(_user_id);
$$;
CREATE FUNCTION public.is_conversation_member(_conversation_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.conversation_members WHERE conversation_id=_conversation_id AND user_id=auth.uid());
$$;

CREATE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE base_name text; candidate text; selected_type public.user_type;
BEGIN
 base_name=left(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'username','member_'||left(NEW.id::text,8)), '[^a-zA-Z0-9_]', '', 'g'),24);
 IF char_length(base_name)<3 THEN base_name='member_'||left(NEW.id::text,8); END IF;
 candidate=base_name;
 WHILE EXISTS(SELECT 1 FROM public.profiles WHERE lower(username)=lower(candidate)) LOOP
  candidate=left(base_name,21)||'_'||substr(gen_random_uuid()::text,1,8);
 END LOOP;
 selected_type=CASE WHEN NEW.raw_user_meta_data->>'user_type'='creative' THEN 'creative'::public.user_type ELSE 'viewer'::public.user_type END;
 INSERT INTO public.profiles(id,username,user_type) VALUES(NEW.id,candidate,selected_type);
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,selected_type::text::public.app_role);
 INSERT INTO public.content_settings(user_id) VALUES(NEW.id);
 INSERT INTO public.parental_controls(user_id) VALUES(NEW.id);
 INSERT INTO public.playback_settings(user_id) VALUES(NEW.id);
 INSERT INTO public.notification_preferences(user_id) VALUES(NEW.id);
 INSERT INTO public.star_balances(user_id) VALUES(NEW.id);
 INSERT INTO public.creator_monetization(user_id) VALUES(NEW.id);
 INSERT INTO public.messaging_permissions(user_id) VALUES(NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE UNIQUE INDEX profiles_username_case_insensitive ON public.profiles(lower(username));

CREATE FUNCTION public.change_user_type(_new_type public.user_type) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_type public.user_type;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_parent_access() THEN RAISE EXCEPTION 'Parent access required'; END IF;
 SELECT user_type INTO STRICT old_type FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF old_type=_new_type THEN RETURN; END IF;
 INSERT INTO public.user_type_changes(user_id,original_type,new_type) VALUES(auth.uid(),old_type::text,_new_type::text);
 UPDATE public.profiles SET user_type=_new_type WHERE id=auth.uid();
 DELETE FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('creative','viewer');
 INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),_new_type::text::public.app_role);
END $$;

CREATE FUNCTION private.set_pin(_user_id uuid, _pin_type text, _raw_pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _raw_pin IS NULL OR _raw_pin !~ '^[0-9]{4}$' OR _pin_type NOT IN ('profile','parental') THEN RAISE EXCEPTION 'PIN must be four digits'; END IF;
 IF auth.role()<>'service_role' AND (auth.uid() IS DISTINCT FROM _user_id OR NOT public.has_parent_access()) THEN RAISE EXCEPTION 'Parent access required'; END IF;
 INSERT INTO private.pin_hashes(user_id,pin_type,hash) VALUES(_user_id,_pin_type,extensions.crypt(_raw_pin,extensions.gen_salt('bf',10)))
 ON CONFLICT(user_id,pin_type) DO UPDATE SET hash=excluded.hash;
 DELETE FROM public.pin_attempts WHERE user_id=_user_id AND pin_type=_pin_type;
END $$;
CREATE FUNCTION private.verify_pin(_user_id uuid, _pin_type text, _raw_pin text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE stored_hash text; attempts public.pin_attempts%ROWTYPE; valid boolean;
BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM _user_id OR _raw_pin IS NULL OR _raw_pin !~ '^[0-9]{4}$' THEN RETURN false; END IF;
 INSERT INTO public.pin_attempts(user_id,pin_type) VALUES(_user_id,_pin_type) ON CONFLICT DO NOTHING;
 SELECT * INTO attempts FROM public.pin_attempts WHERE user_id=_user_id AND pin_type=_pin_type FOR UPDATE;
 IF attempts.locked_until>now() THEN RETURN false; END IF;
 SELECT hash INTO stored_hash FROM private.pin_hashes WHERE user_id=_user_id AND pin_type=_pin_type;
 valid=COALESCE(extensions.crypt(_raw_pin,stored_hash)=stored_hash,false);
 IF valid THEN
  UPDATE public.pin_attempts SET failed_attempts=0,locked_until=NULL WHERE user_id=_user_id AND pin_type=_pin_type;
  IF _pin_type='parental' AND auth.jwt()->>'session_id' IS NOT NULL THEN
   INSERT INTO private.parental_sessions(user_id,session_id,expires_at) VALUES(_user_id,auth.jwt()->>'session_id',now()+interval '10 minutes')
   ON CONFLICT(user_id,session_id) DO UPDATE SET expires_at=excluded.expires_at;
  END IF;
 ELSE
  UPDATE public.pin_attempts SET failed_attempts=CASE WHEN locked_until IS NOT NULL AND locked_until<=now() THEN 1 ELSE failed_attempts+1 END,
   locked_until=CASE WHEN failed_attempts>=9 AND (locked_until IS NULL OR locked_until>now()) THEN now()+interval '15 minutes' ELSE NULL END
   WHERE user_id=_user_id AND pin_type=_pin_type;
 END IF;
 RETURN valid;
END $$;
CREATE FUNCTION public.set_profile_pin(_user_id uuid,_raw_pin text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT private.set_pin(_user_id,'profile',_raw_pin) $$;
CREATE FUNCTION public.set_parental_pin(_user_id uuid,_raw_pin text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT private.set_pin(_user_id,'parental',_raw_pin) $$;
CREATE FUNCTION public.verify_profile_pin(_user_id uuid,_raw_pin text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT private.verify_pin(_user_id,'profile',_raw_pin) $$;
CREATE FUNCTION public.verify_parental_pin(_user_id uuid,_raw_pin text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT private.verify_pin(_user_id,'parental',_raw_pin) $$;
CREATE FUNCTION public.set_profile_pin_admin(_user_id uuid,_raw_pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF; PERFORM private.set_pin(_user_id,'profile',_raw_pin); END $$;
CREATE FUNCTION public.set_parental_pin_admin(_user_id uuid,_raw_pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF; PERFORM private.set_pin(_user_id,'parental',_raw_pin); END $$;

CREATE FUNCTION public.update_video_variants(_video_id uuid,_variants jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF jsonb_typeof(_variants)<>'object' OR NOT EXISTS(SELECT 1 FROM public.videos WHERE id=_video_id AND (creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'))) THEN RAISE EXCEPTION 'Invalid variants or unauthorized'; END IF;
 UPDATE public.videos SET video_variants=_variants WHERE id=_video_id;
END $$;
CREATE FUNCTION public.increment_video_views(_video_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 UPDATE public.videos SET views_count=views_count+1 WHERE id=_video_id AND moderation_status='approved' AND NOT public.is_blocked(creator_id);
END $$;
CREATE FUNCTION public.update_video_likes_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' THEN UPDATE public.videos SET likes_count=likes_count+1 WHERE id=NEW.video_id; RETURN NEW;
 ELSE UPDATE public.videos SET likes_count=GREATEST(0,likes_count-1) WHERE id=OLD.video_id; RETURN OLD; END IF;
END $$;
CREATE TRIGGER likes_count_trigger AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.update_video_likes_count();
CREATE FUNCTION public.validate_comment_parent() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.comments WHERE id=NEW.parent_id AND video_id=NEW.video_id) THEN RAISE EXCEPTION 'Reply must be on the same video'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_comment_parent BEFORE INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.validate_comment_parent();
CREATE FUNCTION public.notify_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recipient uuid; item_video uuid; item_comment uuid; kind public.notification_type; enabled boolean;
BEGIN
 IF TG_TABLE_NAME='likes' THEN SELECT creator_id INTO recipient FROM public.videos WHERE id=NEW.video_id; kind='like'; item_video=NEW.video_id;
 ELSIF TG_TABLE_NAME='comments' THEN
  SELECT creator_id INTO recipient FROM public.videos WHERE id=NEW.video_id; kind='comment'; item_video=NEW.video_id; item_comment=NEW.id;
  IF NEW.parent_id IS NOT NULL THEN SELECT user_id INTO recipient FROM public.comments WHERE id=NEW.parent_id; kind='reply'; END IF;
 ELSIF TG_TABLE_NAME='follows' THEN recipient=NEW.following_id; kind='follow';
 ELSIF TG_TABLE_NAME='comment_likes' THEN SELECT user_id,video_id INTO recipient,item_video FROM public.comments WHERE id=NEW.comment_id; kind='like'; item_comment=NEW.comment_id;
 END IF;
 IF recipient IS NULL OR recipient=NEW.user_id THEN RETURN NEW; END IF;
 SELECT CASE kind WHEN 'like' THEN likes_enabled WHEN 'comment' THEN comments_enabled WHEN 'reply' THEN replies_enabled WHEN 'follow' THEN follows_enabled ELSE true END INTO enabled FROM public.notification_preferences WHERE user_id=recipient;
 IF COALESCE(enabled,true) THEN INSERT INTO public.notifications(user_id,actor_id,type,video_id,comment_id) VALUES(recipient,NEW.user_id,kind,item_video,item_comment); END IF;
 RETURN NEW;
END $$;
-- follows has follower_id rather than user_id, so it uses its own bounded trigger.
CREATE FUNCTION public.notify_follow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF COALESCE((SELECT follows_enabled FROM public.notification_preferences WHERE user_id=NEW.following_id),true) THEN
 INSERT INTO public.notifications(user_id,actor_id,type) VALUES(NEW.following_id,NEW.follower_id,'follow'); END IF; RETURN NEW; END $$;
CREATE TRIGGER on_like AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.notify_activity();
CREATE TRIGGER on_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_activity();
CREATE TRIGGER on_comment_like AFTER INSERT ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.notify_activity();
CREATE TRIGGER on_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

CREATE FUNCTION public.send_stars(_creator_id uuid,_video_id uuid,_amount integer,_request_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sender uuid:=auth.uid(); remaining integer; previous public.star_transactions%ROWTYPE;
BEGIN
 IF sender IS NULL OR _request_id IS NULL OR _creator_id=sender OR _amount IS NULL OR NOT (_amount=ANY(ARRAY[1,5,10,50,100,500])) THEN RAISE EXCEPTION 'Invalid gift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.videos WHERE id=_video_id AND creator_id=_creator_id AND moderation_status='approved') OR public.is_blocked(_creator_id) THEN RAISE EXCEPTION 'Video is unavailable'; END IF;
 -- Lock both wallets in a stable order; serialise retries and bidirectional gifts.
 PERFORM 1 FROM public.star_balances WHERE user_id IN (sender,_creator_id) ORDER BY user_id FOR UPDATE;
 SELECT * INTO previous FROM public.star_transactions WHERE from_user_id=sender AND request_id=_request_id;
 IF FOUND THEN
  IF previous.to_user_id IS DISTINCT FROM _creator_id OR previous.video_id IS DISTINCT FROM _video_id OR previous.amount<>_amount THEN RAISE EXCEPTION 'Request ID reused with different gift'; END IF;
  SELECT balance INTO remaining FROM public.star_balances WHERE user_id=sender; RETURN remaining;
 END IF;
 UPDATE public.star_balances SET balance=balance-_amount,total_spent=total_spent+_amount,updated_at=now() WHERE user_id=sender AND balance>=_amount RETURNING balance INTO remaining;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stars'; END IF;
 UPDATE public.star_balances SET balance=balance+_amount,total_earned=total_earned+_amount,updated_at=now() WHERE user_id=_creator_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Creator wallet is unavailable'; END IF;
 UPDATE public.creator_monetization SET total_stars_earned=total_stars_earned+_amount,pending_balance=pending_balance+_amount,updated_at=now() WHERE user_id=_creator_id;
 INSERT INTO public.star_transactions(from_user_id,to_user_id,video_id,amount,type,request_id) VALUES(sender,_creator_id,_video_id,_amount,'gift',_request_id);
 INSERT INTO public.notifications(user_id,actor_id,type,video_id) VALUES(_creator_id,sender,'star_gift',_video_id);
 RETURN remaining;
END $$;
CREATE FUNCTION public.check_monetization_eligibility() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eligible boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'creative') THEN RAISE EXCEPTION 'Creator access required'; END IF;
 SELECT (SELECT count(*) FROM public.follows WHERE following_id=auth.uid())>=5000 AND COALESCE((SELECT sum(a.watch_duration) FROM public.video_analytics a JOIN public.videos v ON v.id=a.video_id WHERE v.creator_id=auth.uid()),0)>=3600000000 INTO eligible;
 UPDATE public.creator_monetization SET is_eligible=eligible,eligibility_checked_at=now() WHERE user_id=auth.uid(); RETURN eligible;
END $$;
CREATE FUNCTION public.star_leaderboard(_kind text) RETURNS TABLE(user_id uuid,amount integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT b.user_id,CASE WHEN _kind='earned' THEN b.total_earned ELSE b.total_spent END FROM public.star_balances b
 JOIN public.profiles p ON p.id=b.user_id
 WHERE auth.uid() IS NOT NULL AND _kind IN ('earned','spent') AND p.user_type='creative' AND NOT public.is_blocked(b.user_id)
 ORDER BY 2 DESC,b.user_id LIMIT 20;
$$;
CREATE FUNCTION public.record_screen_time() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE used integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 INSERT INTO public.screen_time_usage(user_id,usage_date,minutes_used,last_tick_at) VALUES(auth.uid(),CURRENT_DATE,1,now())
 ON CONFLICT(user_id,usage_date) DO UPDATE SET minutes_used=LEAST(1440,public.screen_time_usage.minutes_used+1),last_tick_at=now() WHERE public.screen_time_usage.last_tick_at<=now()-interval '55 seconds';
 SELECT GREATEST(0,minutes_used-bonus_minutes) INTO used FROM public.screen_time_usage WHERE user_id=auth.uid() AND usage_date=CURRENT_DATE; RETURN used;
END $$;
CREATE FUNCTION public.get_screen_time_usage() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT COALESCE((SELECT GREATEST(0,minutes_used-bonus_minutes) FROM public.screen_time_usage WHERE user_id=auth.uid() AND usage_date=CURRENT_DATE),0) $$;
CREATE FUNCTION public.diskie_render_push_template(template text, actor_name text, reel_title text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT replace(replace(template,'{{actor_name}}',actor_name),'{{reel_title}}',reel_title) $$;
-- Deny by default; access below is explicit and every application table has RLS.
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_monetization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_type_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_renditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() OR NOT public.is_blocked(id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_edit ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
GRANT UPDATE(username,avatar_url,bio,cover_photo_url,selected_avatar,age_range,tiktok_url,instagram_url,facebook_url,youtube_url,social_links_order,social_links_visible) ON public.profiles TO authenticated;
CREATE POLICY videos_read ON public.videos FOR SELECT TO authenticated USING ((moderation_status='approved' OR creator_id=auth.uid() OR public.has_role(auth.uid(),'admin')) AND NOT public.is_blocked(creator_id));
CREATE POLICY videos_upload ON public.videos FOR INSERT TO authenticated WITH CHECK (creator_id=auth.uid() AND public.has_role(auth.uid(),'creative') AND moderation_status='pending' AND views_count=0 AND likes_count=0 AND transcription_status='pending' AND subtitles IS NULL AND video_variants='{}'::jsonb);
CREATE POLICY videos_edit ON public.videos FOR UPDATE TO authenticated USING (creator_id=auth.uid()) WITH CHECK (creator_id=auth.uid());
CREATE POLICY videos_remove ON public.videos FOR DELETE TO authenticated USING (creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT INSERT,DELETE ON public.videos TO authenticated; GRANT UPDATE(title,description,video_url,thumbnail_url,tags,duration) ON public.videos TO authenticated;
CREATE POLICY likes_read ON public.likes FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved'));
CREATE POLICY likes_add ON public.likes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved'));
CREATE POLICY likes_remove ON public.likes FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,DELETE ON public.likes TO authenticated;
CREATE POLICY saved_videos_read ON public.saved_videos FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY saved_videos_add ON public.saved_videos FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved'));
CREATE POLICY saved_videos_remove ON public.saved_videos FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,DELETE ON public.saved_videos TO authenticated;
CREATE POLICY video_downloads_read ON public.video_downloads FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY video_downloads_add ON public.video_downloads FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved') AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_premium=true));
CREATE POLICY video_downloads_remove ON public.video_downloads FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,DELETE ON public.video_downloads TO authenticated;
CREATE POLICY comments_read ON public.comments FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved'));
CREATE POLICY comments_add ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved'));
CREATE POLICY comments_edit ON public.comments FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY comments_remove ON public.comments FOR DELETE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT INSERT,DELETE ON public.comments TO authenticated; GRANT UPDATE(content) ON public.comments TO authenticated;
CREATE POLICY comment_likes_read ON public.comment_likes FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.comments c WHERE c.id=comment_id));
CREATE POLICY comment_likes_add ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.comments c WHERE c.id=comment_id));
CREATE POLICY comment_likes_remove ON public.comment_likes FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,DELETE ON public.comment_likes TO authenticated;
CREATE POLICY follows_read ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY follows_add ON public.follows FOR INSERT TO authenticated WITH CHECK (follower_id=auth.uid() AND NOT public.is_blocked(following_id));
CREATE POLICY follows_remove ON public.follows FOR DELETE TO authenticated USING (follower_id=auth.uid());
GRANT INSERT,DELETE ON public.follows TO authenticated;
CREATE POLICY blocks_read ON public.blocks FOR SELECT TO authenticated USING (blocker_id=auth.uid());
CREATE POLICY blocks_add ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id=auth.uid());
CREATE POLICY blocks_remove ON public.blocks FOR DELETE TO authenticated USING (blocker_id=auth.uid());
GRANT INSERT,DELETE ON public.blocks TO authenticated;
CREATE POLICY content_settings_read ON public.content_settings FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY content_settings_add ON public.content_settings FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.has_parent_access());
CREATE POLICY content_settings_edit ON public.content_settings FOR UPDATE TO authenticated USING (user_id=auth.uid() AND public.has_parent_access()) WITH CHECK (user_id=auth.uid() AND public.has_parent_access());
CREATE POLICY content_settings_remove ON public.content_settings FOR DELETE TO authenticated USING (user_id=auth.uid() AND public.has_parent_access());
GRANT INSERT,UPDATE,DELETE ON public.content_settings TO authenticated;
CREATE POLICY parental_controls_read ON public.parental_controls FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY parental_controls_add ON public.parental_controls FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.has_parent_access() AND parental_pin IS NULL);
CREATE POLICY parental_controls_edit ON public.parental_controls FOR UPDATE TO authenticated USING (user_id=auth.uid() AND public.has_parent_access() AND parental_pin IS NULL) WITH CHECK (user_id=auth.uid() AND public.has_parent_access() AND parental_pin IS NULL);
CREATE POLICY parental_controls_remove ON public.parental_controls FOR DELETE TO authenticated USING (user_id=auth.uid() AND public.has_parent_access() AND parental_pin IS NULL);
GRANT INSERT,UPDATE,DELETE ON public.parental_controls TO authenticated;
CREATE POLICY playback_settings_read ON public.playback_settings FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY playback_settings_add ON public.playback_settings FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY playback_settings_edit ON public.playback_settings FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY playback_settings_remove ON public.playback_settings FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,UPDATE,DELETE ON public.playback_settings TO authenticated;
CREATE POLICY notification_preferences_read ON public.notification_preferences FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY notification_preferences_add ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY notification_preferences_edit ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY notification_preferences_remove ON public.notification_preferences FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,UPDATE,DELETE ON public.notification_preferences TO authenticated;
CREATE POLICY monthly_report_settings_read ON public.monthly_report_settings FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY monthly_report_settings_add ON public.monthly_report_settings FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.has_parent_access() AND lower(email)=lower(auth.jwt()->>'email'));
CREATE POLICY monthly_report_settings_edit ON public.monthly_report_settings FOR UPDATE TO authenticated USING (user_id=auth.uid() AND public.has_parent_access() AND lower(email)=lower(auth.jwt()->>'email')) WITH CHECK (user_id=auth.uid() AND public.has_parent_access() AND lower(email)=lower(auth.jwt()->>'email'));
CREATE POLICY monthly_report_settings_remove ON public.monthly_report_settings FOR DELETE TO authenticated USING (user_id=auth.uid() AND public.has_parent_access() AND lower(email)=lower(auth.jwt()->>'email'));
GRANT INSERT,UPDATE,DELETE ON public.monthly_report_settings TO authenticated;
CREATE POLICY device_tokens_read ON public.device_tokens FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY device_tokens_add ON public.device_tokens FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY device_tokens_edit ON public.device_tokens FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY device_tokens_remove ON public.device_tokens FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT INSERT,UPDATE,DELETE ON public.device_tokens TO authenticated;
CREATE POLICY profile_secrets_read ON public.profile_secrets FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY pin_attempts_read ON public.pin_attempts FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY user_type_changes_read ON public.user_type_changes FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY star_balances_read ON public.star_balances FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY creator_monetization_read ON public.creator_monetization FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY screen_time_usage_read ON public.screen_time_usage FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY api_usage_read ON public.api_usage FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY payout_requests_read ON public.payout_requests FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY account_deletion_requests_read ON public.account_deletion_requests FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY star_transactions_read ON public.star_transactions FOR SELECT TO authenticated USING (from_user_id=auth.uid() OR to_user_id=auth.uid());
CREATE POLICY star_packs_read ON public.star_packs FOR SELECT TO authenticated USING (is_active=true);
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY roles_admin ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT,UPDATE,DELETE ON public.user_roles TO authenticated;
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY notifications_mark_read ON public.notifications FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY notifications_remove ON public.notifications FOR DELETE TO authenticated USING (user_id=auth.uid());
GRANT UPDATE(is_read),DELETE ON public.notifications TO authenticated;
CREATE POLICY analytics_read ON public.video_analytics FOR SELECT TO authenticated USING (viewer_id=auth.uid() OR public.is_guardian(viewer_id) OR EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.creator_id=auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY analytics_add ON public.video_analytics FOR INSERT TO authenticated WITH CHECK (viewer_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND v.moderation_status='approved'));
GRANT INSERT ON public.video_analytics TO authenticated;
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated USING (reporter_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY reports_add ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id=auth.uid() AND status='open' AND reviewed_by IS NULL AND reviewed_at IS NULL AND resolution IS NULL);
CREATE POLICY reports_review ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT,UPDATE ON public.reports TO authenticated;
CREATE POLICY verification_read ON public.creator_verifications FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY verification_add ON public.creator_verifications FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND status='pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND rejection_reason IS NULL);
CREATE POLICY verification_review ON public.creator_verifications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY verification_remove ON public.creator_verifications FOR DELETE TO authenticated USING (user_id=auth.uid() AND status='pending');
GRANT INSERT,UPDATE,DELETE ON public.creator_verifications TO authenticated;
CREATE POLICY cleanup_logs_admin_read ON public.cleanup_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY notification_delivery_logs_admin_read ON public.notification_delivery_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY billing_events_admin_read ON public.billing_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY moderation_actions_admin_read ON public.moderation_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY templates_read ON public.push_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY guardian_links_read ON public.guardian_links FOR SELECT TO authenticated USING (guardian_id=auth.uid() OR child_id=auth.uid());
CREATE POLICY consents_read ON public.parental_consents FOR SELECT TO authenticated USING (guardian_id=auth.uid() OR child_id=auth.uid());
CREATE POLICY messaging_permissions_read ON public.messaging_permissions FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_guardian(user_id));
CREATE POLICY conversations_read ON public.conversations FOR SELECT TO authenticated USING (public.is_conversation_member(id));
CREATE POLICY members_read ON public.conversation_members FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id));
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id) AND (moderation_status='approved' OR sender_id=auth.uid()));
CREATE POLICY messages_add ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND moderation_status='pending' AND public.is_conversation_member(conversation_id) AND EXISTS(SELECT 1 FROM public.messaging_permissions WHERE user_id=auth.uid() AND enabled=true) AND NOT EXISTS(SELECT 1 FROM public.conversation_members m WHERE m.conversation_id=messages.conversation_id AND public.is_blocked(m.user_id)));
GRANT INSERT ON public.messages TO authenticated;
CREATE POLICY video_processing_jobs_read ON public.video_processing_jobs FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id AND (v.creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY video_renditions_read ON public.video_renditions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id));
CREATE TRIGGER touch_comments BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_content_settings BEFORE UPDATE ON public.content_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_creator_monetization BEFORE UPDATE ON public.creator_monetization FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_creator_verifications BEFORE UPDATE ON public.creator_verifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_device_tokens BEFORE UPDATE ON public.device_tokens FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_notification_preferences BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_parental_controls BEFORE UPDATE ON public.parental_controls FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_playback_settings BEFORE UPDATE ON public.playback_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_profile_secrets BEFORE UPDATE ON public.profile_secrets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_push_templates BEFORE UPDATE ON public.push_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_star_balances BEFORE UPDATE ON public.star_balances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_videos BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_monthly_report_settings BEFORE UPDATE ON public.monthly_report_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_video_processing_jobs BEFORE UPDATE ON public.video_processing_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_messaging_permissions BEFORE UPDATE ON public.messaging_permissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER touch_payout_requests BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage paths must start with the signed-in user's UUID. Published UGC/avatars are public;
-- identity documents remain private. No service-role keys belong in the app/APK.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('videos','videos',true,262144000,ARRAY['video/mp4','video/webm','video/quicktime','video/x-msvideo','image/jpeg','image/png','image/webp']),
 ('avatars','avatars',true,10485760,ARRAY['image/jpeg','image/png','image/webp']),
 ('verification-documents','verification-documents',false,10485760,ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT(id) DO NOTHING;
CREATE POLICY public_media_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id IN ('videos','avatars'));
CREATE POLICY upload_own_media ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 (storage.foldername(name))[1]=auth.uid()::text AND (bucket_id IN ('avatars','verification-documents') OR (bucket_id='videos' AND public.has_role(auth.uid(),'creative'))));
CREATE POLICY update_own_media ON storage.objects FOR UPDATE TO authenticated USING((storage.foldername(name))[1]=auth.uid()::text AND bucket_id IN ('videos','avatars')) WITH CHECK((storage.foldername(name))[1]=auth.uid()::text AND bucket_id IN ('videos','avatars'));
CREATE POLICY delete_own_media ON storage.objects FOR DELETE TO authenticated USING((storage.foldername(name))[1]=auth.uid()::text AND bucket_id IN ('videos','avatars','verification-documents'));
CREATE POLICY verification_documents_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='verification-documents' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO authenticated,anon,service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_guardian(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_parent_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_type(public.user_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_pin(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_parental_pin(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_profile_pin(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_parental_pin(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_video_variants(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_video_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_stars(uuid,uuid,integer,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_monetization_eligibility() TO authenticated;
GRANT EXECUTE ON FUNCTION public.star_leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_screen_time() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_screen_time_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.diskie_render_push_template(text,text,text) TO authenticated;

-- Star packs remain inactive until real Play Billing/payment verification is wired server-side.
INSERT INTO public.star_packs(name,stars_amount,price_cents,is_active) VALUES ('Starter',50,99,false),('Popular',200,299,false),('Super',500,599,false),('Mega',1500,1499,false);
INSERT INTO public.push_templates(event_type,title_template,body_template) VALUES
 ('like','New like','{{actor_name}} liked {{reel_title}}'),('comment','New comment','{{actor_name}} commented on {{reel_title}}'),('follow','New follower','{{actor_name}} followed you');
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications,public.comments,public.likes,public.follows,public.videos,public.profiles,public.messages;

CREATE FUNCTION public.consume_api_quota(_feature text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE allowed_calls integer; current_calls integer;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 allowed_calls=CASE _feature WHEN 'chat' THEN 100 WHEN 'transcription' THEN 20 WHEN 'report' THEN 5 ELSE 0 END;
 IF allowed_calls=0 THEN RETURN false; END IF;
 INSERT INTO public.api_usage(user_id,feature,usage_date,calls) VALUES(auth.uid(),_feature,CURRENT_DATE,1)
 ON CONFLICT(user_id,feature,usage_date) DO UPDATE SET calls=public.api_usage.calls+1 WHERE public.api_usage.calls<allowed_calls
 RETURNING calls INTO current_calls;
 RETURN current_calls IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.consume_api_quota(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_api_quota(text) TO authenticated,service_role;
CREATE FUNCTION public.review_video(_video_id uuid,_status text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous_status text; owner_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') OR _status NOT IN ('approved','rejected') OR nullif(trim(_reason),'') IS NULL THEN RAISE EXCEPTION 'Admin review and reason required'; END IF;
 SELECT moderation_status,creator_id INTO STRICT previous_status,owner_id FROM public.videos WHERE id=_video_id FOR UPDATE;
 UPDATE public.videos SET moderation_status=_status WHERE id=_video_id;
 INSERT INTO public.moderation_actions(moderator_id,target_type,target_id,action,reason) VALUES(auth.uid(),'video',_video_id,_status,_reason);
 IF _status='approved' AND previous_status<>'approved' THEN
  INSERT INTO public.notifications(user_id,actor_id,type,video_id)
  SELECT f.follower_id,owner_id,'new_video',_video_id FROM public.follows f
  JOIN public.notification_preferences n ON n.user_id=f.follower_id
  WHERE f.following_id=owner_id AND n.new_videos_enabled=true LIMIT 1000;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_video(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_video(uuid,text,text) TO authenticated,service_role;

CREATE FUNCTION public.grant_screen_time_extension() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT public.has_parent_access() OR NOT EXISTS(SELECT 1 FROM private.pin_hashes WHERE user_id=auth.uid() AND pin_type='parental') THEN RAISE EXCEPTION 'Verified parent PIN required'; END IF;
 INSERT INTO public.screen_time_usage(user_id,usage_date,bonus_minutes) VALUES(auth.uid(),CURRENT_DATE,15)
 ON CONFLICT(user_id,usage_date) DO UPDATE SET bonus_minutes=LEAST(1440,public.screen_time_usage.bonus_minutes+15);
END $$;
REVOKE ALL ON FUNCTION public.grant_screen_time_extension() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_screen_time_extension() TO authenticated,service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
