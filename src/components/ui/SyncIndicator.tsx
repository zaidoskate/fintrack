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
  const queryClient = useQueryClient();

  const pendingCount = useLiveQuery(() => db.outbox.count(), []);

  useEffect(() => {
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pendingCount, queryClient]);

  const showIndicator = !isOnline || (pendingCount && pendingCount > 0) || isSyncing;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-glass)',
            padding: '8px 16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {!isOnline ? (
            <>
              <WifiOff size={14} color="var(--credito-amarillo)" />
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                Sin conexión
              </span>
            </>
          ) : isSyncing ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RefreshCw size={14} color="var(--brand)" />
              </motion.div>
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                Sincronizando...
              </span>
            </>
          ) : (
            <>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--credito-amarillo)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
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
                  padding: '4px 8px',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                Reintentar
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
