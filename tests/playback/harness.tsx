import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import VideoPlayer from '../../src/components/VideoPlayer';
import Feed from '../../src/pages/Feed';
import Upload from '../../src/pages/Upload';
import NotificationPermissionPrompt from '../../src/components/NotificationPermissionPrompt';
import BottomNav from '../../src/components/BottomNav';
import Settings from '../../src/pages/Settings';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import '../../src/index.css';

function Harness() {
  const [active, setActive] = useState(!new URLSearchParams(location.search).has('paused'));
  const scenario = new URLSearchParams(location.search).get('scenario') || 'valid';
  const actual = scenario.startsWith('actual-');
  const original = actual ? '/__actual-reel/original.mp4' : '/__playback-fixtures/original.mp4';
  const variants = scenario === 'original-only' || scenario === 'actual-original' ? {} : actual ? {
    low: { url: '/__actual-reel/low.mp4' }, medium: { url: '/__actual-reel/medium.mp4' }, high: { url: '/__actual-reel/high.mp4' },
  } : {
    low: { url: scenario === 'generated' ? '/__playback-fixtures/generated-low.webm' : '/__playback-fixtures/low.mp4' },
    medium: { url: scenario === 'generated' ? '/__playback-fixtures/generated-medium.webm' : '/__playback-fixtures/medium.mp4' },
    ...(scenario === 'high' ? { high: { url: '/__playback-fixtures/high.mp4' } } : {}),
  };
  Object.assign(window, { setAuditActive: setActive });
  if (scenario === 'notification-prompt') return <MemoryRouter initialEntries={['/feed']}><ThemeProvider><NotificationPermissionPrompt /><BottomNav /></ThemeProvider></MemoryRouter>;
  if (scenario === 'settings-shared') return <BrowserRouter><ThemeProvider><TooltipProvider><Settings /></TooltipProvider></ThemeProvider></BrowserRouter>;
  if (scenario === 'upload-compression') return <BrowserRouter><ThemeProvider><TooltipProvider><Upload /></TooltipProvider></ThemeProvider></BrowserRouter>;
  if (scenario === 'feed-startup') return <BrowserRouter><ThemeProvider><TooltipProvider><Feed /></TooltipProvider></ThemeProvider></BrowserRouter>;
  return <BrowserRouter><div style={{height: "100dvh"}}><VideoPlayer
    video={{ id: 'audit-video', video_url: original, video_variants: variants, title: 'Playback test',
      description: '', creator_id: 'audit-creator', likes_count: 0, views_count: 0,
      profiles: { username: 'audit', avatar_url: '', is_verified: false } }}
    currentUserId="" isPremium={false} isActive={active} onCommentsClick={() => {}}
  /></div></BrowserRouter>;
}

createRoot(document.getElementById('root')!).render(<Harness />);
