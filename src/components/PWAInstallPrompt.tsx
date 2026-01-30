import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) return; // Don't show for 24 hours after dismissal
    }

    // For iOS, show custom guide after delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For other browsers, listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  // iOS-specific guide
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 shadow-2xl border border-emerald-400/20">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {!showIOSGuide ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg">Install PayLoom</h3>
                <p className="text-emerald-100 text-sm">Get quick access from your home screen</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(true)}
                className="px-4 py-2 bg-white text-emerald-700 rounded-xl font-medium hover:bg-emerald-50 transition-colors flex-shrink-0"
              >
                How to
              </button>
            </div>
          ) : (
            <div className="text-white space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Install on iPhone/iPad
              </h3>
              <ol className="space-y-2 text-sm text-emerald-100">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Tap the <strong className="text-white">Share</strong> button (square with arrow) at the bottom of Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Tap <strong className="text-white">"Add"</strong> in the top right corner</span>
                </li>
              </ol>
              <button
                onClick={handleDismiss}
                className="w-full mt-2 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
              >
                Got it!
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard install prompt for Chrome, Edge, etc.
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 shadow-2xl border border-emerald-400/20">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg">Install PayLoom</h3>
            <p className="text-emerald-100 text-sm">Add to home screen for quick access & offline use</p>
          </div>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white text-emerald-700 rounded-xl font-medium hover:bg-emerald-50 transition-colors flex-shrink-0"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
