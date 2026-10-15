import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] py-2.5 px-4 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-300 ${
        isOnline
          ? 'bg-emerald-700 text-white'
          : 'bg-[#0b1c30] border-b border-amber-500/40 text-amber-200'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-emerald-300" />
          <span>Connection restored — live MLS data syncing now.</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>
            You are offline. Cached property listings and leads are available for review.
          </span>
        </>
      )}
    </div>
  );
};
