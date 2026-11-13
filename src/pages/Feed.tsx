import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/VideoPlayer';
import VideoSkeleton from '@/components/VideoSkeleton';
import CommentsSheet from '@/components/CommentsSheet';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import RatingPrompt from '@/components/RatingPrompt';
import ChangelogModal from '@/components/ChangelogModal';
import ScreenTimeLock from '@/components/ScreenTimeLock';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';

import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAppRating } from '@/hooks/useAppRating';
import { useChangelog } from '@/hooks/useChangelog';
import { useScreenTime } from '@/hooks/useScreenTime';

interface SubtitleSegment {
  id: number;
  text: string;
  start: number;
  end: number;
}

interface Video {
  id: string;
  video_url: string;
  title: string;
  description: string;
  creator_id: string;
  likes_count: number;
  views_count: number;
  tags?: string[] | null;
  subtitles?: SubtitleSegment[] | null;
  video_variants?: unknown;
  profiles: {
    username: string;
    avatar_url: string;
    is_verified: boolean;
  };
}

const PAGE_SIZE = 10;

const Feed = () => {
  const navigate = useNavigate();
  const { triggerScrollHaptic } = useHapticFeedback();
  const { playSwipeSound, initAudio } = useSoundEffects();
  const { showRatingPrompt, trackPositiveAction, handleRateNow, handleRemindLater, handleNoThanks } = useAppRating();
  const { showChangelog, isNewVersion, currentVersion, changelog, markAsSeen } = useChangelog();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [page, setPage] = useState(0);
  const hasMoreRef = useRef(true);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const isPulling = useRef(false);
  const isSwipingVertically = useRef(false);
  const [warmAfterId, setWarmAfterId] = useState<string | null>(null);
  const videosRef = useRef<Video[]>([]);

  // Screen time tracking
  const { isLocked, lockReason, timeUsed, timeLimit, unlock } = useScreenTime(currentUserId);

  const PULL_THRESHOLD = 80;
  const SWIPE_THRESHOLD = 50;
  const SWIPE_VELOCITY_THRESHOLD = 0.3;

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth');
      return;
    }
    
    setCurrentUserId(session.user.id);
    
    // All account types use the same feed; account decoration does not block it.
    // Video RLS also enforces blocked creators while the local block list loads.
    void fetchUserProfile(session.user.id);
    void fetchBlockedUsers(session.user.id);
    await fetchVideos(0, true, []);
    setIsLoading(false);
  };

  const fetchBlockedUsers = async (userId: string): Promise<string[]> => {
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);
    
    const ids = blocks?.map(b => b.blocked_id) || [];
    setBlockedUserIds(ids);
    return ids;
  };

  const fetchVideos = async (
    pageNum: number, 
    reset: boolean = false, 
    blockedIds?: string[]
  ) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    // Use provided values or fall back to state
    const idsToFilter = blockedIds || blockedUserIds;
    
    let query = supabase
      .from('videos')
      .select(`
        *,
        subtitles,
        profiles(username, avatar_url, is_verified)
      `)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    
    // Filter out videos from blocked users
    if (idsToFilter.length > 0) {
      query = query.not('creator_id', 'in', `(${idsToFilter.join(',')})`);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching videos:', error);
      return;
    }

    // A push can target an older approved reel outside the first page. RLS still
    // enforces visibility and blocks; normal app startup makes no extra request.
    const target = new URLSearchParams(window.location.search).get('video');
    let rows = data || [];
    if (reset && target && /^[0-9a-f-]{36}$/i.test(target) && !rows.some(row => row.id === target)) {
      const { data: requested } = await supabase.from('videos').select('*, subtitles, profiles(username, avatar_url, is_verified)')
        .eq('id', target).eq('moderation_status', 'approved').maybeSingle();
      if (requested) rows = [requested, ...rows];
    } else if (reset && target) {
      rows = [...rows.filter(row => row.id === target), ...rows.filter(row => row.id !== target)];
    }

    // Transform data to ensure subtitles are properly typed
    const transformedVideos: Video[] = rows.map(video => ({
      ...video,
      subtitles: video.subtitles as unknown as SubtitleSegment[] | null
    }));
    
    if ((data || []).length < PAGE_SIZE) {
      hasMoreRef.current = false;
      setHasMore(false);
    }

    // Stable ordering lets the next-reel buffer stay useful.
    const nextVideos = transformedVideos;
    
    if (reset) {
      videosRef.current = nextVideos;
      setVideos(nextVideos);
      setPage(0);
      hasMoreRef.current = (data || []).length === PAGE_SIZE;
      setHasMore((data || []).length === PAGE_SIZE);
    } else {
      const existing = new Set(videosRef.current.map(video => video.id));
      const merged = [...videosRef.current, ...nextVideos.filter(video => !existing.has(video.id))];
      videosRef.current = merged;
      setVideos(merged);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .maybeSingle();
    
    setIsPremium(profile?.is_premium || false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    activeIndexRef.current = 0;
    setActiveIndex(0);
    setPage(0);
    hasMoreRef.current = true;
    setHasMore(true);
    await fetchVideos(0, true);
    setIsRefreshing(false);
    toast.success('Feed refreshed!');
    
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadMoreVideos = async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current) return;
    
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchVideos(nextPage, false);
    setPage(nextPage);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      try {
        await supabase.from('videos').delete().eq('id', videoId);
        toast.success('Video deleted');
        const filtered = videosRef.current.filter(v => v.id !== videoId);
        videosRef.current = filtered;
        setVideos(filtered);
      } catch (error) {
        toast.error('Failed to delete video');
      }
    }
  };

  // Handle scroll snap to detect active video and load more - uses refs to avoid dependency churn
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    const vids = videosRef.current;
    
    if (newIndex !== activeIndexRef.current && newIndex >= 0 && newIndex < vids.length) {
      // Haptic feedback when snapping to new video
      triggerScrollHaptic();
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);
      
    }
    
    // Load more when near the end (3 videos before last) - use refs to avoid stale closures
    if (newIndex >= vids.length - 3 && hasMoreRef.current && !isLoadingMoreRef.current) {
      loadMoreVideos();
    }
  }, [triggerScrollHaptic, loadMoreVideos]);

  // Swipe gesture handlers with acceleration
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
    isSwipingVertically.current = false;
    
    // Initialize audio on first touch
    initAudio();
    
    // Check for pull to refresh
    if (containerRef.current?.scrollTop === 0) {
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    const deltaX = Math.abs(touch.clientX - touchStartX.current);
    
    // Determine swipe direction on first significant move
    if (!isSwipingVertically.current && Math.abs(deltaY) > 10) {
      isSwipingVertically.current = Math.abs(deltaY) > deltaX;
    }
    
    // Handle pull to refresh only at top
    if (isPulling.current && containerRef.current?.scrollTop === 0 && deltaY > 0) {
      setPullDistance(Math.min(deltaY, PULL_THRESHOLD * 1.5));
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaY = touchStartY.current - touch.clientY;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaY) / deltaTime;
    
    // Handle pull to refresh
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      await handleRefresh();
    }
    setPullDistance(0);
    isPulling.current = false;
    
    // Handle fast swipe gestures for video navigation
    if (isSwipingVertically.current && velocity > SWIPE_VELOCITY_THRESHOLD) {
      const container = containerRef.current;
      if (!container) return;
      
      if (deltaY > SWIPE_THRESHOLD && activeIndex < videos.length - 1) {
        // Swipe up - next video with acceleration
        const targetIndex = activeIndex + 1;
        container.scrollTo({
          top: targetIndex * containerRef.current.clientHeight,
          behavior: 'smooth'
        });
        triggerScrollHaptic();
        playSwipeSound();
      } else if (deltaY < -SWIPE_THRESHOLD && activeIndex > 0) {
        // Swipe down - previous video with acceleration
        const targetIndex = activeIndex - 1;
        container.scrollTo({
          top: targetIndex * containerRef.current.clientHeight,
          behavior: 'smooth'
        });
        triggerScrollHaptic();
        playSwipeSound();
      }
    }
    
    isSwipingVertically.current = false;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoading) {
    return (
      <ResponsiveLayout contentClassName="reel-page">
        <div className="reel-viewport w-full overflow-hidden bg-black">
          <VideoSkeleton />
        </div>
      </ResponsiveLayout>
    );
  }

  if (videos.length === 0 && !isLoading) {
    return (
      <ResponsiveLayout contentClassName="reel-page">
        <div className="reel-viewport bg-black flex flex-col">
          <div className="flex-1 flex items-center justify-center pb-24">
            <div className="text-center">
              <h2 className="text-2xl font-black mb-2 text-white">
                No videos yet!
              </h2>
              <p className="text-white/60">
                Check back later for amazing animations
              </p>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout contentClassName="reel-page">
      <div 
        ref={containerRef}
        className="reel-viewport w-full overflow-y-scroll bg-black scrollbar-hide"
        style={{ 
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          willChange: 'scroll-position',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >

        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div 
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-black/80 transition-all md:left-56 lg:left-64"
            style={{ height: pullDistance }}
          >
            <RefreshCw 
              className={`h-6 w-6 text-white transition-transform ${
                pullDistance >= PULL_THRESHOLD ? 'rotate-180' : ''
              } ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </div>
        )}

        {videos.map((video, index) => {
          // Only render videos within a window around the active index for better performance
          const shouldRender = Math.abs(index - activeIndex) <= 1;
          
          return (
            <div 
              key={video.id} 
              className="h-full w-full flex-shrink-0"
              style={{ 
                scrollSnapAlign: 'start',
                willChange: index === activeIndex ? 'transform' : 'auto',
                transform: 'translateZ(0)',
                contain: 'layout style paint',
                contentVisibility: 'visible'
              }}
            >
              {shouldRender ? (
                <VideoPlayer
                  video={video}
                  currentUserId={currentUserId}
                  isPremium={isPremium}
                  isActive={index === activeIndex}
                  warmup={index === activeIndex + 1 && warmAfterId === videos[activeIndex]?.id}
                  onPlaybackStarted={() => setWarmAfterId(video.id)}
                  aboveBottomNav
                  onCommentsClick={() => setSelectedVideoId(video.id)}
                  onDelete={video.creator_id === currentUserId ? () => handleDeleteVideo(video.id) : undefined}
                  onPositiveAction={trackPositiveAction}
                />
              ) : (
                <div className="h-full w-full bg-black" />
              )}
            </div>
          );
        })}
        
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="h-full w-full flex items-center justify-center bg-black snap-start">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        
        <CommentsSheet
          videoId={selectedVideoId || ''}
          isOpen={!!selectedVideoId}
          onClose={() => {
            setSelectedVideoId(null);
            trackPositiveAction();
          }}
          currentUserId={currentUserId}
        />
        
        {/* Rating Prompt */}
        <RatingPrompt
          open={showRatingPrompt}
          onRateNow={handleRateNow}
          onRemindLater={handleRemindLater}
          onNoThanks={handleNoThanks}
        />
        
        {/* Changelog Modal */}
        <ChangelogModal
          open={showChangelog}
          onClose={markAsSeen}
          isNewVersion={isNewVersion}
          currentVersion={currentVersion}
          changelog={changelog}
        />
        
        {/* Screen Time Lock */}
        {isLocked && currentUserId && (
          <ScreenTimeLock
            userId={currentUserId}
            lockReason={lockReason}
            timeUsed={timeUsed}
            timeLimit={timeLimit}
            onUnlock={unlock}
          />
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default Feed;
