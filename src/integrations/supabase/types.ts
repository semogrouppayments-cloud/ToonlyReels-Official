// Generated from the fresh-project PostgreSQL schema.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
 __InternalSupabase: { PostgrestVersion: "13.0.5" };
 public: {
  Tables: {
   account_deletion_requests: {
    Row: {
     id: string;
     user_id: string | null;
     status: string;
     requested_at: string;
     completed_at: string | null;
     last_error: string | null;
    };
    Insert: {
     id?: string;
     user_id?: string | null;
     status?: string;
     requested_at?: string;
     completed_at?: string | null;
     last_error?: string | null;
    };
    Update: {
     id?: string;
     user_id?: string | null;
     status?: string;
     requested_at?: string;
     completed_at?: string | null;
     last_error?: string | null;
    };
    Relationships: [
     { foreignKeyName: "account_deletion_requests_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   api_usage: {
    Row: {
     user_id: string;
     feature: string;
     usage_date: string;
     calls: number;
    };
    Insert: {
     user_id: string;
     feature: string;
     usage_date?: string;
     calls?: number;
    };
    Update: {
     user_id?: string;
     feature?: string;
     usage_date?: string;
     calls?: number;
    };
    Relationships: [
     { foreignKeyName: "api_usage_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   billing_events: {
    Row: {
     id: string;
     provider: string;
     event_id: string;
     user_id: string | null;
     status: string;
     payload: Json;
     created_at: string;
    };
    Insert: {
     id?: string;
     provider: string;
     event_id: string;
     user_id?: string | null;
     status?: string;
     payload?: Json;
     created_at?: string;
    };
    Update: {
     id?: string;
     provider?: string;
     event_id?: string;
     user_id?: string | null;
     status?: string;
     payload?: Json;
     created_at?: string;
    };
    Relationships: [
     { foreignKeyName: "billing_events_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   blocks: {
    Row: {
     blocked_id: string;
     blocker_id: string;
     created_at: string;
     id: string;
    };
    Insert: {
     blocked_id: string;
     blocker_id: string;
     created_at?: string;
     id?: string;
    };
    Update: {
     blocked_id?: string;
     blocker_id?: string;
     created_at?: string;
     id?: string;
    };
    Relationships: [
     { foreignKeyName: "blocks_blocked_id_fkey"; columns: ["blocked_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "blocks_blocker_id_fkey"; columns: ["blocker_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   cleanup_logs: {
    Row: {
     executed_at: string;
     id: string;
     cleanup_type: string;
     results: Json;
     created_at: string;
    };
    Insert: {
     executed_at?: string;
     id?: string;
     cleanup_type: string;
     results?: Json;
     created_at?: string;
    };
    Update: {
     executed_at?: string;
     id?: string;
     cleanup_type?: string;
     results?: Json;
     created_at?: string;
    };
    Relationships: [
    ];
   };
   comment_likes: {
    Row: {
     comment_id: string;
     created_at: string | null;
     id: string;
     user_id: string;
    };
    Insert: {
     comment_id: string;
     created_at?: string | null;
     id?: string;
     user_id: string;
    };
    Update: {
     comment_id?: string;
     created_at?: string | null;
     id?: string;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "comment_likes_comment_id_fkey"; columns: ["comment_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
     { foreignKeyName: "comment_likes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   comments: {
    Row: {
     content: string;
     created_at: string;
     id: string;
     parent_id: string | null;
     updated_at: string;
     user_id: string;
     video_id: string;
    };
    Insert: {
     content: string;
     created_at?: string;
     id?: string;
     parent_id?: string | null;
     updated_at?: string;
     user_id: string;
     video_id: string;
    };
    Update: {
     content?: string;
     created_at?: string;
     id?: string;
     parent_id?: string | null;
     updated_at?: string;
     user_id?: string;
     video_id?: string;
    };
    Relationships: [
     { foreignKeyName: "comments_parent_id_fkey"; columns: ["parent_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
     { foreignKeyName: "comments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "comments_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   content_settings: {
    Row: {
     cartoon_only_mode: boolean | null;
     comments_visibility: string | null;
     content_categories: string[] | null;
     created_at: string | null;
     id: string;
     interaction_limits: boolean | null;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     cartoon_only_mode?: boolean | null;
     comments_visibility?: string | null;
     content_categories?: string[] | null;
     created_at?: string | null;
     id?: string;
     interaction_limits?: boolean | null;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     cartoon_only_mode?: boolean | null;
     comments_visibility?: string | null;
     content_categories?: string[] | null;
     created_at?: string | null;
     id?: string;
     interaction_limits?: boolean | null;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "content_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   conversation_members: {
    Row: {
     conversation_id: string;
     user_id: string;
     last_read_at: string | null;
     created_at: string;
    };
    Insert: {
     conversation_id: string;
     user_id: string;
     last_read_at?: string | null;
     created_at?: string;
    };
    Update: {
     conversation_id?: string;
     user_id?: string;
     last_read_at?: string | null;
     created_at?: string;
    };
    Relationships: [
     { foreignKeyName: "conversation_members_conversation_id_fkey"; columns: ["conversation_id"]; isOneToOne: false; referencedRelation: "conversations"; referencedColumns: ["id"] },
     { foreignKeyName: "conversation_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   conversations: {
    Row: {
     id: string;
     created_at: string;
    };
    Insert: {
     id?: string;
     created_at?: string;
    };
    Update: {
     id?: string;
     created_at?: string;
    };
    Relationships: [
    ];
   };
   creator_monetization: {
    Row: {
     created_at: string | null;
     eligibility_checked_at: string | null;
     id: string;
     is_eligible: boolean | null;
     pending_balance: number | null;
     revenue_split_creator: number | null;
     revenue_split_platform: number | null;
     total_stars_earned: number | null;
     total_withdrawn: number | null;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     created_at?: string | null;
     eligibility_checked_at?: string | null;
     id?: string;
     is_eligible?: boolean | null;
     pending_balance?: number | null;
     revenue_split_creator?: number | null;
     revenue_split_platform?: number | null;
     total_stars_earned?: number | null;
     total_withdrawn?: number | null;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     created_at?: string | null;
     eligibility_checked_at?: string | null;
     id?: string;
     is_eligible?: boolean | null;
     pending_balance?: number | null;
     revenue_split_creator?: number | null;
     revenue_split_platform?: number | null;
     total_stars_earned?: number | null;
     total_withdrawn?: number | null;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "creator_monetization_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   creator_verifications: {
    Row: {
     business_document_url: string | null;
     business_email: string;
     company_name: string | null;
     created_at: string | null;
     full_name: string;
     id: string;
     id_document_url: string | null;
     rejection_reason: string | null;
     reviewed_at: string | null;
     reviewed_by: string | null;
     status: string;
     submitted_at: string;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     business_document_url?: string | null;
     business_email: string;
     company_name?: string | null;
     created_at?: string | null;
     full_name: string;
     id?: string;
     id_document_url?: string | null;
     rejection_reason?: string | null;
     reviewed_at?: string | null;
     reviewed_by?: string | null;
     status?: string;
     submitted_at?: string;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     business_document_url?: string | null;
     business_email?: string;
     company_name?: string | null;
     created_at?: string | null;
     full_name?: string;
     id?: string;
     id_document_url?: string | null;
     rejection_reason?: string | null;
     reviewed_at?: string | null;
     reviewed_by?: string | null;
     status?: string;
     submitted_at?: string;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "creator_verifications_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "creator_verifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   device_tokens: {
    Row: {
     created_at: string;
     id: string;
     last_seen_at: string | null;
     platform: string;
     provider: string;
     token: string;
     updated_at: string;
     user_id: string;
    };
    Insert: {
     created_at?: string;
     id?: string;
     last_seen_at?: string | null;
     platform?: string;
     provider?: string;
     token: string;
     updated_at?: string;
     user_id: string;
    };
    Update: {
     created_at?: string;
     id?: string;
     last_seen_at?: string | null;
     platform?: string;
     provider?: string;
     token?: string;
     updated_at?: string;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "device_tokens_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   follows: {
    Row: {
     created_at: string;
     follower_id: string;
     following_id: string;
     id: string;
    };
    Insert: {
     created_at?: string;
     follower_id: string;
     following_id: string;
     id?: string;
    };
    Update: {
     created_at?: string;
     follower_id?: string;
     following_id?: string;
     id?: string;
    };
    Relationships: [
     { foreignKeyName: "follows_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "follows_following_id_fkey"; columns: ["following_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   guardian_links: {
    Row: {
     id: string;
     guardian_id: string;
     child_id: string;
     status: string;
     verified_at: string | null;
     created_at: string;
    };
    Insert: {
     id?: string;
     guardian_id: string;
     child_id: string;
     status?: string;
     verified_at?: string | null;
     created_at?: string;
    };
    Update: {
     id?: string;
     guardian_id?: string;
     child_id?: string;
     status?: string;
     verified_at?: string | null;
     created_at?: string;
    };
    Relationships: [
     { foreignKeyName: "guardian_links_child_id_fkey"; columns: ["child_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "guardian_links_guardian_id_fkey"; columns: ["guardian_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   likes: {
    Row: {
     created_at: string;
     id: string;
     user_id: string;
     video_id: string;
    };
    Insert: {
     created_at?: string;
     id?: string;
     user_id: string;
     video_id: string;
    };
    Update: {
     created_at?: string;
     id?: string;
     user_id?: string;
     video_id?: string;
    };
    Relationships: [
     { foreignKeyName: "likes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "likes_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   messages: {
    Row: {
     id: string;
     conversation_id: string;
     sender_id: string;
     content: string;
     moderation_status: string;
     created_at: string;
    };
    Insert: {
     id?: string;
     conversation_id: string;
     sender_id: string;
     content: string;
     moderation_status?: string;
     created_at?: string;
    };
    Update: {
     id?: string;
     conversation_id?: string;
     sender_id?: string;
     content?: string;
     moderation_status?: string;
     created_at?: string;
    };
    Relationships: [
     { foreignKeyName: "messages_conversation_id_fkey"; columns: ["conversation_id"]; isOneToOne: false; referencedRelation: "conversations"; referencedColumns: ["id"] },
     { foreignKeyName: "messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   messaging_permissions: {
    Row: {
     user_id: string;
     enabled: boolean;
     approved_by: string | null;
     updated_at: string;
    };
    Insert: {
     user_id: string;
     enabled?: boolean;
     approved_by?: string | null;
     updated_at?: string;
    };
    Update: {
     user_id?: string;
     enabled?: boolean;
     approved_by?: string | null;
     updated_at?: string;
    };
    Relationships: [
     { foreignKeyName: "messaging_permissions_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "messaging_permissions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   moderation_actions: {
    Row: {
     id: string;
     moderator_id: string | null;
     target_type: string;
     target_id: string;
     action: string;
     reason: string;
     created_at: string;
    };
    Insert: {
     id?: string;
     moderator_id?: string | null;
     target_type: string;
     target_id: string;
     action: string;
     reason: string;
     created_at?: string;
    };
    Update: {
     id?: string;
     moderator_id?: string | null;
     target_type?: string;
     target_id?: string;
     action?: string;
     reason?: string;
     created_at?: string;
    };
    Relationships: [
     { foreignKeyName: "moderation_actions_moderator_id_fkey"; columns: ["moderator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   monthly_report_settings: {
    Row: {
     id: string;
     user_id: string;
     email: string;
     enabled: boolean;
     created_at: string;
     updated_at: string;
    };
    Insert: {
     id?: string;
     user_id: string;
     email: string;
     enabled?: boolean;
     created_at?: string;
     updated_at?: string;
    };
    Update: {
     id?: string;
     user_id?: string;
     email?: string;
     enabled?: boolean;
     created_at?: string;
     updated_at?: string;
    };
    Relationships: [
     { foreignKeyName: "monthly_report_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   notification_delivery_logs: {
    Row: {
     created_at: string;
     dedupe_key: string | null;
     event_type: string | null;
     id: string;
     notification_id: string | null;
     provider_id: string | null;
     request_body: Json | null;
     response_body: Json | null;
     response_code: number | null;
     status: string;
     user_id: string | null;
    };
    Insert: {
     created_at?: string;
     dedupe_key?: string | null;
     event_type?: string | null;
     id?: string;
     notification_id?: string | null;
     provider_id?: string | null;
     request_body?: Json | null;
     response_body?: Json | null;
     response_code?: number | null;
     status?: string;
     user_id?: string | null;
    };
    Update: {
     created_at?: string;
     dedupe_key?: string | null;
     event_type?: string | null;
     id?: string;
     notification_id?: string | null;
     provider_id?: string | null;
     request_body?: Json | null;
     response_body?: Json | null;
     response_code?: number | null;
     status?: string;
     user_id?: string | null;
    };
    Relationships: [
     { foreignKeyName: "notification_delivery_logs_notification_id_fkey"; columns: ["notification_id"]; isOneToOne: false; referencedRelation: "notifications"; referencedColumns: ["id"] },
     { foreignKeyName: "notification_delivery_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   notification_preferences: {
    Row: {
     comments_enabled: boolean | null;
     created_at: string | null;
     follows_enabled: boolean | null;
     id: string;
     likes_enabled: boolean | null;
     new_videos_enabled: boolean | null;
     push_enabled: boolean | null;
     replies_enabled: boolean | null;
     sound_enabled: boolean | null;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     comments_enabled?: boolean | null;
     created_at?: string | null;
     follows_enabled?: boolean | null;
     id?: string;
     likes_enabled?: boolean | null;
     new_videos_enabled?: boolean | null;
     push_enabled?: boolean | null;
     replies_enabled?: boolean | null;
     sound_enabled?: boolean | null;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     comments_enabled?: boolean | null;
     created_at?: string | null;
     follows_enabled?: boolean | null;
     id?: string;
     likes_enabled?: boolean | null;
     new_videos_enabled?: boolean | null;
     push_enabled?: boolean | null;
     replies_enabled?: boolean | null;
     sound_enabled?: boolean | null;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "notification_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   notifications: {
    Row: {
     actor_id: string;
     comment_id: string | null;
     created_at: string | null;
     id: string;
     is_read: boolean | null;
     type: Database["public"]["Enums"]["notification_type"];
     user_id: string;
     video_id: string | null;
    };
    Insert: {
     actor_id: string;
     comment_id?: string | null;
     created_at?: string | null;
     id?: string;
     is_read?: boolean | null;
     type: Database["public"]["Enums"]["notification_type"];
     user_id: string;
     video_id?: string | null;
    };
    Update: {
     actor_id?: string;
     comment_id?: string | null;
     created_at?: string | null;
     id?: string;
     is_read?: boolean | null;
     type?: Database["public"]["Enums"]["notification_type"];
     user_id?: string;
     video_id?: string | null;
    };
    Relationships: [
     { foreignKeyName: "notifications_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "notifications_comment_id_fkey"; columns: ["comment_id"]; isOneToOne: false; referencedRelation: "comments"; referencedColumns: ["id"] },
     { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "notifications_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   parental_consents: {
    Row: {
     id: string;
     guardian_id: string;
     child_id: string;
     policy_version: string;
     status: string;
     verification_method: string;
     provider_reference: string | null;
     consented_at: string;
     revoked_at: string | null;
    };
    Insert: {
     id?: string;
     guardian_id: string;
     child_id: string;
     policy_version: string;
     status: string;
     verification_method: string;
     provider_reference?: string | null;
     consented_at?: string;
     revoked_at?: string | null;
    };
    Update: {
     id?: string;
     guardian_id?: string;
     child_id?: string;
     policy_version?: string;
     status?: string;
     verification_method?: string;
     provider_reference?: string | null;
     consented_at?: string;
     revoked_at?: string | null;
    };
    Relationships: [
     { foreignKeyName: "parental_consents_child_id_fkey"; columns: ["child_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "parental_consents_guardian_id_fkey"; columns: ["guardian_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   parental_controls: {
    Row: {
     bedtime_end: string | null;
     bedtime_lock: boolean | null;
     bedtime_start: string | null;
     created_at: string | null;
     id: string;
     parental_pin: string | null;
     profile_pin_enabled: boolean | null;
     school_end_time: string | null;
     school_hours_lock: boolean | null;
     school_start_time: string | null;
     screen_time_enabled: boolean | null;
     screen_time_limit: number | null;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     bedtime_end?: string | null;
     bedtime_lock?: boolean | null;
     bedtime_start?: string | null;
     created_at?: string | null;
     id?: string;
     parental_pin?: string | null;
     profile_pin_enabled?: boolean | null;
     school_end_time?: string | null;
     school_hours_lock?: boolean | null;
     school_start_time?: string | null;
     screen_time_enabled?: boolean | null;
     screen_time_limit?: number | null;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     bedtime_end?: string | null;
     bedtime_lock?: boolean | null;
     bedtime_start?: string | null;
     created_at?: string | null;
     id?: string;
     parental_pin?: string | null;
     profile_pin_enabled?: boolean | null;
     school_end_time?: string | null;
     school_hours_lock?: boolean | null;
     school_start_time?: string | null;
     screen_time_enabled?: boolean | null;
     screen_time_limit?: number | null;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "parental_controls_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   payout_requests: {
    Row: {
     id: string;
     user_id: string;
     stars_amount: number;
     status: string;
     provider_reference: string | null;
     created_at: string;
     updated_at: string;
    };
    Insert: {
     id?: string;
     user_id: string;
     stars_amount: number;
     status?: string;
     provider_reference?: string | null;
     created_at?: string;
     updated_at?: string;
    };
    Update: {
     id?: string;
     user_id?: string;
     stars_amount?: number;
     status?: string;
     provider_reference?: string | null;
     created_at?: string;
     updated_at?: string;
    };
    Relationships: [
     { foreignKeyName: "payout_requests_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   pin_attempts: {
    Row: {
     user_id: string;
     pin_type: string;
     failed_attempts: number;
     locked_until: string | null;
    };
    Insert: {
     user_id: string;
     pin_type: string;
     failed_attempts?: number;
     locked_until?: string | null;
    };
    Update: {
     user_id?: string;
     pin_type?: string;
     failed_attempts?: number;
     locked_until?: string | null;
    };
    Relationships: [
     { foreignKeyName: "pin_attempts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   playback_settings: {
    Row: {
     autoplay: boolean | null;
     created_at: string | null;
     id: string;
     subtitles_enabled: boolean | null;
     subtitles_size: string | null;
     updated_at: string | null;
     user_id: string;
     video_quality: string | null;
    };
    Insert: {
     autoplay?: boolean | null;
     created_at?: string | null;
     id?: string;
     subtitles_enabled?: boolean | null;
     subtitles_size?: string | null;
     updated_at?: string | null;
     user_id: string;
     video_quality?: string | null;
    };
    Update: {
     autoplay?: boolean | null;
     created_at?: string | null;
     id?: string;
     subtitles_enabled?: boolean | null;
     subtitles_size?: string | null;
     updated_at?: string | null;
     user_id?: string;
     video_quality?: string | null;
    };
    Relationships: [
     { foreignKeyName: "playback_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   profile_secrets: {
    Row: {
     created_at: string | null;
     id: string;
     profile_pin: string | null;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     created_at?: string | null;
     id?: string;
     profile_pin?: string | null;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     created_at?: string | null;
     id?: string;
     profile_pin?: string | null;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "profile_secrets_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   profiles: {
    Row: {
     age_range: string | null;
     avatar_url: string | null;
     bio: string | null;
     cover_photo_url: string | null;
     created_at: string;
     facebook_url: string | null;
     id: string;
     instagram_url: string | null;
     is_premium: boolean | null;
     is_verified: boolean | null;
     selected_avatar: string | null;
     social_links_order: string[] | null;
     social_links_visible: string[] | null;
     tiktok_url: string | null;
     updated_at: string;
     user_type: Database["public"]["Enums"]["user_type"];
     username: string;
     youtube_url: string | null;
    };
    Insert: {
     age_range?: string | null;
     avatar_url?: string | null;
     bio?: string | null;
     cover_photo_url?: string | null;
     created_at?: string;
     facebook_url?: string | null;
     id: string;
     instagram_url?: string | null;
     is_premium?: boolean | null;
     is_verified?: boolean | null;
     selected_avatar?: string | null;
     social_links_order?: string[] | null;
     social_links_visible?: string[] | null;
     tiktok_url?: string | null;
     updated_at?: string;
     user_type?: Database["public"]["Enums"]["user_type"];
     username: string;
     youtube_url?: string | null;
    };
    Update: {
     age_range?: string | null;
     avatar_url?: string | null;
     bio?: string | null;
     cover_photo_url?: string | null;
     created_at?: string;
     facebook_url?: string | null;
     id?: string;
     instagram_url?: string | null;
     is_premium?: boolean | null;
     is_verified?: boolean | null;
     selected_avatar?: string | null;
     social_links_order?: string[] | null;
     social_links_visible?: string[] | null;
     tiktok_url?: string | null;
     updated_at?: string;
     user_type?: Database["public"]["Enums"]["user_type"];
     username?: string;
     youtube_url?: string | null;
    };
    Relationships: [
    ];
   };
   push_templates: {
    Row: {
     body_template: string;
     enabled: boolean;
     event_type: string;
     title_template: string;
     updated_at: string;
    };
    Insert: {
     body_template: string;
     enabled?: boolean;
     event_type: string;
     title_template: string;
     updated_at?: string;
    };
    Update: {
     body_template?: string;
     enabled?: boolean;
     event_type?: string;
     title_template?: string;
     updated_at?: string;
    };
    Relationships: [
    ];
   };
   reports: {
    Row: {
     created_at: string | null;
     id: string;
     reason: string;
     reported_id: string;
     reported_type: string;
     reporter_id: string;
     status: string;
     reviewed_by: string | null;
     reviewed_at: string | null;
     resolution: string | null;
    };
    Insert: {
     created_at?: string | null;
     id?: string;
     reason: string;
     reported_id: string;
     reported_type: string;
     reporter_id: string;
     status?: string;
     reviewed_by?: string | null;
     reviewed_at?: string | null;
     resolution?: string | null;
    };
    Update: {
     created_at?: string | null;
     id?: string;
     reason?: string;
     reported_id?: string;
     reported_type?: string;
     reporter_id?: string;
     status?: string;
     reviewed_by?: string | null;
     reviewed_at?: string | null;
     resolution?: string | null;
    };
    Relationships: [
     { foreignKeyName: "reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "reports_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   saved_videos: {
    Row: {
     created_at: string | null;
     id: string;
     user_id: string;
     video_id: string;
    };
    Insert: {
     created_at?: string | null;
     id?: string;
     user_id: string;
     video_id: string;
    };
    Update: {
     created_at?: string | null;
     id?: string;
     user_id?: string;
     video_id?: string;
    };
    Relationships: [
     { foreignKeyName: "saved_videos_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "saved_videos_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   screen_time_usage: {
    Row: {
     user_id: string;
     usage_date: string;
     minutes_used: number;
     bonus_minutes: number;
     last_tick_at: string;
    };
    Insert: {
     user_id: string;
     usage_date?: string;
     minutes_used?: number;
     bonus_minutes?: number;
     last_tick_at?: string;
    };
    Update: {
     user_id?: string;
     usage_date?: string;
     minutes_used?: number;
     bonus_minutes?: number;
     last_tick_at?: string;
    };
    Relationships: [
     { foreignKeyName: "screen_time_usage_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   star_balances: {
    Row: {
     balance: number;
     id: string;
     total_earned: number;
     total_spent: number;
     updated_at: string | null;
     user_id: string;
    };
    Insert: {
     balance?: number;
     id?: string;
     total_earned?: number;
     total_spent?: number;
     updated_at?: string | null;
     user_id: string;
    };
    Update: {
     balance?: number;
     id?: string;
     total_earned?: number;
     total_spent?: number;
     updated_at?: string | null;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "star_balances_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   star_packs: {
    Row: {
     created_at: string | null;
     id: string;
     is_active: boolean | null;
     name: string;
     price_cents: number;
     stars_amount: number;
    };
    Insert: {
     created_at?: string | null;
     id?: string;
     is_active?: boolean | null;
     name: string;
     price_cents: number;
     stars_amount: number;
    };
    Update: {
     created_at?: string | null;
     id?: string;
     is_active?: boolean | null;
     name?: string;
     price_cents?: number;
     stars_amount?: number;
    };
    Relationships: [
    ];
   };
   star_transactions: {
    Row: {
     amount: number;
     created_at: string | null;
     from_user_id: string | null;
     id: string;
     to_user_id: string | null;
     type: string;
     video_id: string | null;
     request_id: string | null;
    };
    Insert: {
     amount: number;
     created_at?: string | null;
     from_user_id?: string | null;
     id?: string;
     to_user_id?: string | null;
     type: string;
     video_id?: string | null;
     request_id?: string | null;
    };
    Update: {
     amount?: number;
     created_at?: string | null;
     from_user_id?: string | null;
     id?: string;
     to_user_id?: string | null;
     type?: string;
     video_id?: string | null;
     request_id?: string | null;
    };
    Relationships: [
     { foreignKeyName: "star_transactions_from_user_id_fkey"; columns: ["from_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "star_transactions_to_user_id_fkey"; columns: ["to_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "star_transactions_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   user_roles: {
    Row: {
     assigned_at: string | null;
     assigned_by: string | null;
     id: string;
     role: Database["public"]["Enums"]["app_role"];
     user_id: string;
    };
    Insert: {
     assigned_at?: string | null;
     assigned_by?: string | null;
     id?: string;
     role: Database["public"]["Enums"]["app_role"];
     user_id: string;
    };
    Update: {
     assigned_at?: string | null;
     assigned_by?: string | null;
     id?: string;
     role?: Database["public"]["Enums"]["app_role"];
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "user_roles_assigned_by_fkey"; columns: ["assigned_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "user_roles_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   user_type_changes: {
    Row: {
     changed_at: string;
     id: string;
     new_type: string;
     original_type: string;
     user_id: string;
    };
    Insert: {
     changed_at?: string;
     id?: string;
     new_type: string;
     original_type: string;
     user_id: string;
    };
    Update: {
     changed_at?: string;
     id?: string;
     new_type?: string;
     original_type?: string;
     user_id?: string;
    };
    Relationships: [
     { foreignKeyName: "user_type_changes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   video_analytics: {
    Row: {
     completed: boolean | null;
     device_type: string | null;
     id: string;
     video_id: string;
     viewer_id: string | null;
     watch_duration: number;
     watched_at: string | null;
    };
    Insert: {
     completed?: boolean | null;
     device_type?: string | null;
     id?: string;
     video_id: string;
     viewer_id?: string | null;
     watch_duration?: number;
     watched_at?: string | null;
    };
    Update: {
     completed?: boolean | null;
     device_type?: string | null;
     id?: string;
     video_id?: string;
     viewer_id?: string | null;
     watch_duration?: number;
     watched_at?: string | null;
    };
    Relationships: [
     { foreignKeyName: "video_analytics_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
     { foreignKeyName: "video_analytics_viewer_id_fkey"; columns: ["viewer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
   video_downloads: {
    Row: {
     created_at: string | null;
     id: string;
     user_id: string;
     video_id: string;
    };
    Insert: {
     created_at?: string | null;
     id?: string;
     user_id: string;
     video_id: string;
    };
    Update: {
     created_at?: string | null;
     id?: string;
     user_id?: string;
     video_id?: string;
    };
    Relationships: [
     { foreignKeyName: "video_downloads_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
     { foreignKeyName: "video_downloads_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   video_processing_jobs: {
    Row: {
     id: string;
     video_id: string;
     kind: string;
     status: string;
     attempts: number;
     source_path: string;
     last_error: string | null;
     available_at: string;
     started_at: string | null;
     finished_at: string | null;
     created_at: string;
     updated_at: string;
    };
    Insert: {
     id?: string;
     video_id: string;
     kind: string;
     status?: string;
     attempts?: number;
     source_path: string;
     last_error?: string | null;
     available_at?: string;
     started_at?: string | null;
     finished_at?: string | null;
     created_at?: string;
     updated_at?: string;
    };
    Update: {
     id?: string;
     video_id?: string;
     kind?: string;
     status?: string;
     attempts?: number;
     source_path?: string;
     last_error?: string | null;
     available_at?: string;
     started_at?: string | null;
     finished_at?: string | null;
     created_at?: string;
     updated_at?: string;
    };
    Relationships: [
     { foreignKeyName: "video_processing_jobs_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   video_renditions: {
    Row: {
     id: string;
     video_id: string;
     quality: string;
     storage_path: string;
     width: number | null;
     height: number | null;
     bitrate: number | null;
     codec: string | null;
     mime_type: string;
     has_audio: boolean;
     size_bytes: number | null;
     created_at: string;
    };
    Insert: {
     id?: string;
     video_id: string;
     quality: string;
     storage_path: string;
     width?: number | null;
     height?: number | null;
     bitrate?: number | null;
     codec?: string | null;
     mime_type: string;
     has_audio?: boolean;
     size_bytes?: number | null;
     created_at?: string;
    };
    Update: {
     id?: string;
     video_id?: string;
     quality?: string;
     storage_path?: string;
     width?: number | null;
     height?: number | null;
     bitrate?: number | null;
     codec?: string | null;
     mime_type?: string;
     has_audio?: boolean;
     size_bytes?: number | null;
     created_at?: string;
    };
    Relationships: [
     { foreignKeyName: "video_renditions_video_id_fkey"; columns: ["video_id"]; isOneToOne: false; referencedRelation: "videos"; referencedColumns: ["id"] },
    ];
   };
   videos: {
    Row: {
     created_at: string;
     creator_id: string;
     description: string | null;
     duration: number | null;
     id: string;
     likes_count: number;
     subtitles: Json | null;
     tags: string[] | null;
     thumbnail_url: string | null;
     title: string;
     transcription_status: string | null;
     updated_at: string;
     video_url: string;
     video_variants: Json;
     views_count: number;
     moderation_status: string;
     is_kids_cartoon: boolean;
     content_category: string | null;
    };
    Insert: {
     created_at?: string;
     creator_id: string;
     description?: string | null;
     duration?: number | null;
     id?: string;
     likes_count?: number;
     subtitles?: Json | null;
     tags?: string[] | null;
     thumbnail_url?: string | null;
     title: string;
     transcription_status?: string | null;
     updated_at?: string;
     video_url: string;
     video_variants?: Json;
     views_count?: number;
     moderation_status?: string;
     is_kids_cartoon?: boolean;
     content_category?: string | null;
    };
    Update: {
     created_at?: string;
     creator_id?: string;
     description?: string | null;
     duration?: number | null;
     id?: string;
     likes_count?: number;
     subtitles?: Json | null;
     tags?: string[] | null;
     thumbnail_url?: string | null;
     title?: string;
     transcription_status?: string | null;
     updated_at?: string;
     video_url?: string;
     video_variants?: Json;
     views_count?: number;
     moderation_status?: string;
     is_kids_cartoon?: boolean;
     content_category?: string | null;
    };
    Relationships: [
     { foreignKeyName: "videos_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
   };
  };
  Views: { [_ in never]: never };
  Functions: {
   classify_kids_cartoon: { Args: { _video_id: string; _is_kids_cartoon: boolean; _category: string }; Returns: undefined };
   matches_content_preferences: { Args: { _video_id: string }; Returns: boolean };
   can_access_report: { Args: { _user_id: string }; Returns: boolean };
   change_user_type: { Args: { _new_type: Database["public"]["Enums"]["user_type"] }; Returns: undefined };
   check_monetization_eligibility: { Args: Record<PropertyKey, never>; Returns: boolean };
   consume_api_quota: { Args: { _feature: string }; Returns: boolean };
   diskie_render_push_template: { Args: { template: string; actor_name: string; reel_title: string }; Returns: string };
   get_screen_time_usage: { Args: Record<PropertyKey, never>; Returns: number };
   grant_screen_time_extension: { Args: Record<PropertyKey, never>; Returns: undefined };
   has_parent_access: { Args: Record<PropertyKey, never>; Returns: boolean };
   has_role: { Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }; Returns: boolean };
   increment_video_views: { Args: { _video_id: string }; Returns: undefined };
   is_blocked: { Args: { _other_id: string }; Returns: boolean };
   is_conversation_member: { Args: { _conversation_id: string }; Returns: boolean };
   is_guardian: { Args: { _child_id: string }; Returns: boolean };
   record_screen_time: { Args: Record<PropertyKey, never>; Returns: number };
   review_video: { Args: { _video_id: string; _status: string; _reason: string }; Returns: undefined };
   send_stars: { Args: { _creator_id: string; _video_id: string; _amount: number; _request_id: string }; Returns: number };
   set_parental_pin: { Args: { _user_id: string; _raw_pin: string }; Returns: undefined };
   set_parental_pin_admin: { Args: { _user_id: string; _raw_pin: string }; Returns: undefined };
   set_profile_pin: { Args: { _user_id: string; _raw_pin: string }; Returns: undefined };
   set_profile_pin_admin: { Args: { _user_id: string; _raw_pin: string }; Returns: undefined };
   star_leaderboard: { Args: { _kind: string }; Returns: { user_id: string; amount: number }[] };
   update_video_variants: { Args: { _video_id: string; _variants: Json }; Returns: undefined };
   verify_parental_pin: { Args: { _user_id: string; _raw_pin: string }; Returns: boolean };
   verify_profile_pin: { Args: { _user_id: string; _raw_pin: string }; Returns: boolean };
  };
  Enums: {
   app_role: "viewer" | "creative" | "admin";
   notification_type: "like" | "comment" | "follow" | "reply" | "new_video" | "star_gift" | "verification" | "system";
   user_type: "viewer" | "creative";
  };
  CompositeTypes: { [_ in never]: never };
 };
};
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = { public: { Enums: {
  "app_role": [
    "viewer",
    "creative",
    "admin"
  ],
  "notification_type": [
    "like",
    "comment",
    "follow",
    "reply",
    "new_video",
    "star_gift",
    "verification",
    "system"
  ],
  "user_type": [
    "viewer",
    "creative"
  ]
} } } as const;
