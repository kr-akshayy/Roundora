import { useEffect, useState } from 'react';
import { Smartphone, Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // Check if already running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return; // Already installed, don't show prompt
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show guide for iOS users if not standalone
    if (iosDevice && !isStandalone) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Top Floating PWA Install Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white px-4 py-2.5 shadow-lg relative z-50 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone size={16} />
          </div>
          <div>
            <span className="font-bold text-white">Install Roundora App</span>
            <span className="text-white/80 hidden sm:inline ml-1.5">— Fast 1-click access without browser bar!</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="bg-white text-brand-700 hover:bg-slate-100 font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download size={13} /> Install App
          </button>

          <button
            onClick={() => setShowBanner(false)}
            className="text-white/70 hover:text-white p-1 rounded-md"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-brand-600 flex items-center justify-center mx-auto mb-3">
              <Share size={24} />
            </div>
            <h3 className="font-extrabold text-base mb-1">Install on iPhone / iPad</h3>
            <p className="text-xs text-slate-500 mb-4">
              To install Roundora on your iOS device:
            </p>
            <ol className="text-xs text-slate-700 text-left space-y-2 mb-5 font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button at bottom of Safari</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>Add</strong> top right</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="btn-primary w-full text-xs py-2.5"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
