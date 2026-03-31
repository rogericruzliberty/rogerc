/**
 * Liberty Field App — Exports Screen
 *
 * Lists generated ZIP exports for completed submissions.
 * Users can request new exports and download existing ones.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/apiClient';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/colors';

interface ExportItem {
  id: string;
  submissionId: string;
  status: 'processing' | 'ready' | 'failed';
  downloadLink?: string;
  siteName?: string;
  createdAt: string;
}

export function ExportListScreen() {
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExports = useCallback(async () => {
    try {
      // In production, this would fetch from the API
      // For now, show placeholder state
      setExports([]);
    } catch (err) {
      console.error('[Exports] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExports();
    }, [fetchExports]),
  );

  const handleDownload = async (item: ExportItem) => {
    if (item.downloadLink) {
      try {
        await Linking.openURL(item.downloadLink);
      } catch {
        Alert.alert('Error', 'Failed to open download link');
      }
    }
  };

  function getStatusIcon(status: string) {
    switch (status) {
      case 'ready':
        return { name: 'checkmark-circle' as const, color: Colors.success };
      case 'processing':
        return { name: 'hourglass-outline' as const, color: Colors.warning };
      default:
        return { name: 'alert-circle' as const, color: Colors.danger };
    }
  }

  function renderExport({ item }: { item: ExportItem }) {
    const icon = getStatusIcon(item.status);
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleDownload(item)}
        disabled={item.status !== 'ready'}
        activeOpacity={0.7}
      >
        <Ionicons name={icon.name} size={24} color={icon.color} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.siteName || 'Export'}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        {item.status === 'ready' && (
          <Ionicons name="download-outline" size={22} color={Colors.navy} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={exports}
        renderItem={renderExport}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchExports();
          }} tintColor={Colors.navy} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No exports yet</Text>
            <Text style={styles.emptySubtext}>
              After completing a site survey, you can generate a ZIP export with all data and files organized in folders.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.warmBg },
  list: { padding: Spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary,
  },
  cardDate: {
    fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2,
  },
  empty: {
    alignItems: 'center', paddingTop: 80, gap: Spacing.sm, paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20,
  },
});
