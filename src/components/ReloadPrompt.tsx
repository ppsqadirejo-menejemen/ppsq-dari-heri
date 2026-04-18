import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-slate-200 shadow-lg rounded-xl p-4 max-w-sm w-full flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800">
            {offlineReady ? 'Aplikasi siap digunakan offline' : 'Versi baru tersedia'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {offlineReady
              ? 'Aplikasi ini telah di-cache dan siap digunakan tanpa koneksi internet.'
              : 'Versi baru dari aplikasi telah tersedia. Klik update untuk memuat versi terbaru.'}
          </p>
        </div>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {needRefresh && (
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Klik untuk Update
        </button>
      )}
    </div>
  );
}
