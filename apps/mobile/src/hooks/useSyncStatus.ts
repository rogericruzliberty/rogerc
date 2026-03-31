/**
 * Liberty Field App — useSyncStatus Hook
 *
 * Subscribes to real-time sync engine stats.
 */

import { useState, useEffect } from 'react';
import { syncEngine } from '../services/syncEngine';
import type { SyncStats } from '../types';

export function useSyncStatus() {
  const [stats, setStats] = useState<SyncStats>({
    pending: 0,
    syncing: 0,
    failed: 0,
    total: 0,
  });

  useEffect(() => {
    // Get initial stats
    setStats(syncEngine.getStats());

    // Subscribe to updates
    const unsubscribe = syncEngine.subscribe((newStats) => {
      setStats(newStats);
    });

    return unsubscribe;
  }, []);

  return stats;
}
