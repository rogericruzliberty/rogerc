/**
 * Liberty Field App — Sync Status Screen
 *
 * Shows sync queue status, pending/failed items, and manual retry controls.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '../../services/syncEngine';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/colors';

export function SyncScreen() {
  const stats = useSyncStatus();
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsub();
  }, []);

  const handleRetryAll = () => {
    syncEngine.retryAllFailed();
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <View style={styles.container}>
      {/* Connection banner */}
      <View style={[styles.banner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
        <Ionicons
          name={isOnline ? 'wifi' : 'cloud-offline-outline'}
          size={18}
          color={isOnline ? Colors.success : Colors.danger}
        />
        <Text style={[styles.bannerText, { color: isOnline ? Colors.success : Colors.danger }]}>
          {isOnline ? 'Connected' : 'Offline — data will sync when reconnected'}
        </Text>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Stats cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color={Colors.warning} />
                <Text style={styles.statNumber}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="sync-outline" size={24} color={Colors.navy} />
                <Text style={styles.statNumber}>{stats.syncing}</Text>
                <Text style={styles.statLabel}>Syncing</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="alert-circle-outline" size={24} color={Colors.danger} />
                <Text style={styles.statNumber}>{stats.failed}</Text>
                <Text style={styles.statLabel}>Failed</Text>
              </View>
            </View>

            {/* Retry button */}
            {stats.failed > 0 && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetryAll}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={Colors.textOnNavy} />
                <Text style={styles.retryButtonText}>Retry All Failed ({stats.failed})</Text>
              </TouchableOpacity>
            )}

            {/* Empty state */}
            {stats.total === 0 && (
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
                <Text style={styles.emptyTitle}>All synced!</Text>
                <Text style={styles.emptySubtext}>
                  All your data is up to date with the server.
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.warmBg },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  bannerOnline: { backgroundColor: Colors.successBg },
  bannerOffline: { backgroundColor: Colors.dangerBg },
  bannerText: { fontSize: FontSize.sm, fontWeight: '600' },
  content: { padding: Spacing.lg },
  statsRow: {
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs, ...Shadow.sm,
  },
  statNumber: {
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.danger,
    padding: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: Spacing.xl,
  },
  retryButtonText: {
    fontSize: FontSize.md, fontWeight: '700', color: Colors.textOnNavy,
  },
  empty: {
    alignItems: 'center', paddingTop: 40, gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.success,
  },
  emptySubtext: {
    fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center',
  },
});
