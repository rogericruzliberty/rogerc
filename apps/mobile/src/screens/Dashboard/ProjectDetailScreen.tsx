/**
 * Liberty Field App — Project Detail Screen
 *
 * Shows project info and lists existing submissions.
 * "New Submission" button starts the wizard.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '../../navigation/RootNavigator';
import { apiClient } from '../../services/apiClient';
import { generateId } from '../../services/database';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/colors';
import type { Submission } from '../../types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'ProjectDetail'>;

export function ProjectDetailScreen({ route, navigation }: Props) {
  const { projectId } = route.params;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/projects/${projectId}/submissions`);
      setSubmissions(res.data.data);
    } catch (err) {
      console.error('[ProjectDetail] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      fetchSubmissions();
    }, [fetchSubmissions]),
  );

  const startNewSubmission = useCallback(async () => {
    try {
      const submissionId = generateId();
      // Create submission locally first (offline-first)
      // The sync engine will push it to the server
      navigation.navigate('WizardStep1', { projectId, submissionId });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to create submission');
    }
  }, [projectId, navigation]);

  const resumeSubmission = useCallback(
    (submission: Submission) => {
      // Determine which step to resume from based on answer count
      const step = submission.status === 'COMPLETED' ? 'WizardStep5' : 'WizardStep1';
      navigation.navigate(step, {
        projectId,
        submissionId: submission.id,
      });
    },
    [projectId, navigation],
  );

  function getStatusColor(status: string) {
    switch (status) {
      case 'COMPLETED':
        return Colors.success;
      case 'SYNCED':
        return Colors.navy;
      default:
        return Colors.warning;
    }
  }

  function renderSubmission({ item }: { item: Submission }) {
    const date = new Date(item.startedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.submissionCard}
        onPress={() => resumeSubmission(item)}
        activeOpacity={0.7}
      >
        <View style={styles.submissionHeader}>
          <View>
            <Text style={styles.submissionName}>
              {item.siteName || 'Untitled Survey'}
            </Text>
            <Text style={styles.submissionDate}>{date}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.submissionStats}>
          <Text style={styles.statText}>
            {item._count?.answers ?? 0} answers
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>
            {item._count?.contacts ?? 0} contacts
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>
            {item._count?.attachments ?? 0} files
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* New Submission Button */}
      <TouchableOpacity
        style={styles.newButton}
        onPress={startNewSubmission}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={22} color={Colors.textOnNavy} />
        <Text style={styles.newButtonText}>New Site Survey</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.navy}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={submissions}
          renderItem={renderSubmission}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No submissions yet</Text>
              <Text style={styles.emptySubtext}>
                Tap "New Site Survey" to start collecting data.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.navy,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  newButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textOnNavy,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  submissionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  submissionName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  submissionDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  submissionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statDot: {
    color: Colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
