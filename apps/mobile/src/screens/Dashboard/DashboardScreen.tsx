/**
 * Liberty Field App — Dashboard Screen
 *
 * Lists all active projects. Tap a project to view details
 * and start/resume submissions.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '../../navigation/RootNavigator';
import { apiClient } from '../../services/apiClient';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/colors';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import type { Project } from '../../types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const syncStats = useSyncStatus();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/projects');
      setProjects(res.data.data);
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, [fetchProjects]);

  function renderProject({ item }: { item: Project }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ProjectDetail', {
            projectId: item.id,
            projectName: item.name,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons name="business-outline" size={24} color={Colors.navy} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.projectName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.address && (
              <Text style={styles.projectAddress} numberOfLines={1}>
                {item.address}
                {item.suiteNumber ? `, Suite ${item.suiteNumber}` : ''}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </View>
        {item.clientName && (
          <Text style={styles.clientName}>{item.clientName}</Text>
        )}
        <View style={styles.cardFooter}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item._count?.submissions ?? 0} submissions
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sync status bar */}
      {syncStats.pending > 0 && (
        <View style={styles.syncBar}>
          <Ionicons name="sync-outline" size={16} color={Colors.warning} />
          <Text style={styles.syncBarText}>
            {syncStats.pending} items waiting to sync
          </Text>
        </View>
      )}

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.navy}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No projects yet</Text>
            <Text style={styles.emptySubtext}>
              Projects will appear here once created by an admin.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.warmBg,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
  },
  syncBarText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  projectAddress: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clientName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginLeft: 56,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    marginLeft: 56,
  },
  badge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.navy,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
