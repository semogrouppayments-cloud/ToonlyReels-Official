import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Download, Monitor, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const Install = () => {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [message, setMessage] = useState('');
  const native = Capacitor.isNativePlatform();
  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const install = async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === 'accepted' ? 'Installation requested. Follow your browser’s instructions.' : 'You can install later from your browser menu.');
    } catch { setMessage('Use your browser menu to install the app.'); }
    setPrompt(null);
  };
  return <main className="min-h-screen bg-background px-5 py-10 text-foreground">
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center space-y-3">
        <img src="/pwa-icon-192.png" width="80" height="80" alt="ToonlyReels" className="mx-auto rounded-2xl shadow-lg" />
        <h1 className="text-3xl font-bold">Get ToonlyReels</h1>
        <p className="text-muted-foreground">Use the web app or download the Android app.</p>
      </header>
      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Smartphone className="h-5 w-5" /> Install the web app</h2>
        {native ? <p className="text-sm text-muted-foreground">You’re already using the Android app.</p> : installed ?
          <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-green-600" /> You’re using the installed web app.</p> :
          prompt ? <Button onClick={install} size="lg" className="w-full gap-2"><Download className="h-5 w-5" /> Install PWA</Button> :
          ios ? <p className="text-sm text-muted-foreground">In Safari, tap <Share className="inline h-4 w-4" /> <strong>Share</strong>, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p> :
          <p className="text-sm text-muted-foreground">In Chrome or Edge, open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>. On a computer, use the install icon in the address bar.</p>}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <p className="text-xs text-muted-foreground">The app shell can load offline after installation. Sign-in and videos need an internet connection.</p>
      </section>
      {!native && <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Android APK</h2>
        <p className="text-sm text-muted-foreground">Version 0.1.7 · Android 7 or newer</p>
        <Button asChild size="lg" className="w-full gap-2">
          <a href="/downloads/ToonlyReels-0.1.7-signed.apk" download="ToonlyReels-0.1.7-signed.apk"><Download className="h-5 w-5" /> Download Android APK</a>
        </Button>
        <p className="text-xs text-muted-foreground">Signed Android release build. Android may ask you to allow installation from your browser. APK files install on Android devices.</p>
        <p className="text-xs text-muted-foreground">Updating an older development installation? <a className="text-primary underline" href="/downloads/ToonlyReels-0.1.7-debug.apk" download>Download the development update APK</a> to keep its existing signing certificate.</p>
        <a href="/downloads/release.json" className="text-xs text-primary underline">Version and SHA-256 checksum</a>
      </section>}
      <Button asChild variant="outline" className="w-full gap-2"><Link to="/"><Monitor className="h-4 w-4" /> Open ToonlyReels <ArrowRight className="h-4 w-4" /></Link></Button>
      <nav className="flex justify-center gap-5 text-xs text-muted-foreground"><Link to="/privacy-policy" className="underline">Privacy</Link><Link to="/terms-of-service" className="underline">Terms</Link></nav>
    </div>
  </main>;
};
export default Install;
