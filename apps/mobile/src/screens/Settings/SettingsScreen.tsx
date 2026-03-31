/**
 * Liberty Field App — Settings Screen
 *
 * Google Drive linking, account info, app version, logout.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/apiClient';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/colors';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  googleDriveLinked: boolean;
}

export function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiClient.get('/api/auth/me');
        setProfile(res.data.data);
      } catch {
        // Offline or not logged in
      }
    }
    loadProfile();
  }, []);

  const handleLinkDrive = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/auth/google/link');
      const { authUrl } = res.data.data;
      await Linking.openURL(authUrl);
    } catch {
      Alert.alert('Error', 'Failed to start Google Drive linking.');
    }
  }, []);

  const handleUnlinkDrive = useCallback(async () => {
    Alert.alert(
      'Unlink Google Drive',
      'Files already uploaded will remain. Future uploads will not work until you re-link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/api/auth/google/unlink');
              setProfile((prev) =>
                prev ? { ...prev, googleDriveLinked: false } : prev,
              );
            } catch {
              Alert.alert('Error', 'Failed to unlink Google Drive.');
            }
          },
        },
      ],
    );
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          // Clear tokens and reset to login screen
          // In production: clear SQLite user_cache, reset nav state
        },
      },
    ]);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={Colors.navy} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.name || 'Loading...'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          {profile?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile.role}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Google Drive */}
      <Text style={styles.sectionTitle}>Storage</Text>
      <View style={styles.card}>
        <Ionicons
          name="logo-google"
          size={24}
          color={profile?.googleDriveLinked ? Colors.success : Colors.textMuted}
        />
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>Google Drive</Text>
          <Text style={styles.rowSubtext}>
            {profile?.googleDriveLinked
              ? 'Linked — files upload to your Drive'
              : 'Not linked — link to enable file uploads'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.linkButton,
            profile?.googleDriveLinked && styles.linkButtonLinked,
          ]}
          onPress={
            profile?.googleDriveLinked ? handleUnlinkDrive : handleLinkDrive
          }
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.linkButtonText,
              profile?.googleDriveLinked && styles.linkButtonTextLinked,
            ]}
          >
            {profile?.googleDriveLinked ? 'Unlink' : 'Link'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* App info */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>Liberty Field App</Text>
          <Text style={styles.rowSubtext}>Version 1.0.0</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.warmBg },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start', marginTop: Spacing.xs,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
    paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.navy,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: Spacing.xl, marginBottom: Spacing.sm, marginLeft: Spacing.xs,
  },
  rowInfo: { flex: 1 },
  rowTitle: {
    fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary,
  },
  rowSubtext: {
    fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2,
  },
  linkButton: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, backgroundColor: Colors.navy,
  },
  linkButtonLinked: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  linkButtonText: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.textOnNavy,
  },
  linkButtonTextLinked: { color: Colors.textSecondary },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, marginTop: Spacing.xxl, padding: Spacing.lg,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.danger,
  },
  logoutText: {
    fontSize: FontSize.md, fontWeight: '600', color: Colors.danger,
  },
});
