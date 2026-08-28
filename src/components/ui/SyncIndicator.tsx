'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff, RefreshCw } from 'lucide-react';
import { db } from '@/lib/offline/db';
import { forceSync } from '@/lib/offline/sync';
import { useLiveQuery } from 'dexie-react-hooks';

export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pendingCount = useLiveQuery(() => db.outbox.count(), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      if (pendingCount && pendingCount > 0) {
        setIsSyncing(true);
        await forceSync(queryClient);
        setIsSyncing(false);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Intentar sincronizar cuando el tab vuelve a estar visible (iOS fallback)
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (pendingCount && pendingCount > 0) {
          setIsSyncing(true);
          await forceSync(queryClient);
          setIsSyncing(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleOfflineAction = () => {
      setToastMsg('Guardado en cola. Se subirá al reconectar.');
      setTimeout(() => setToastMsg(null), 3000);
    };
    window.addEventListener('offline-action', handleOfflineAction);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('offline-action', handleOfflineAction);
    };
  }, [pendingCount, queryClient]);

  const showIndicator = !isOnline || (pendingCount && pendingCount > 0) || isSyncing || toastMsg !== null;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          style={{
            position: 'fixed',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-glass)',
            padding: '12px 24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '220px',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isOnline ? (
              <>
                <WifiOff size={18} color="var(--credito-amarillo)" />
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Sin conexión
                </span>
              </>
            ) : isSyncing ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <RefreshCw size={18} color="var(--brand)" />
                </motion.div>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Sincronizando...
                </span>
              </>
            ) : pendingCount && pendingCount > 0 ? (
              <>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--credito-amarillo)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {pendingCount} pendientes
                </span>
                <button
                  onClick={async () => {
                    setIsSyncing(true);
                    await forceSync(queryClient);
                    setIsSyncing(false);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginLeft: '8px'
                  }}
                >
                  Reintentar
                </button>
              </>
            ) : null}
          </div>
          
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}
            >
              {toastMsg}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
