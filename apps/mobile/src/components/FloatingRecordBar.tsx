/**
 * Liberty Field App — Floating Record Bar
 *
 * Persistent audio recording control that sits above the
 * bottom tab bar. Stays visible across all wizard screens.
 * Managed by AudioRecordingProvider context.
 */

import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/colors';
import { AudioRecordingContext } from '../providers/AudioRecordingProvider';

export function FloatingRecordBar() {
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useContext(AudioRecordingContext);

  // Format seconds into MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Not recording — show "Start Recording" button
  if (!isRecording) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={startRecording}
          activeOpacity={0.8}
        >
          <View style={styles.recordDot} />
          <Text style={styles.startText}>Start Audio Recording</Text>
          <Ionicons name="mic-outline" size={20} color={Colors.navy} />
        </TouchableOpacity>
      </View>
    );
  }

  // Currently recording — show controls
  return (
    <View style={styles.container}>
      <View style={styles.recordingBar}>
        {/* Pulsing indicator */}
        <View style={styles.indicatorRow}>
          <View style={[styles.recordDotActive, isPaused && styles.recordDotPaused]} />
          <Text style={styles.recordingLabel}>
            {isPaused ? 'Paused' : 'Recording'}
          </Text>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {isPaused ? (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={resumeRecording}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={18} color={Colors.navy} />
              <Text style={styles.controlText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pauseRecording}
              activeOpacity={0.7}
            >
              <Ionicons name="pause" size={18} color={Colors.navy} />
              <Text style={styles.controlText}>Pause</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={stopRecording}
            activeOpacity={0.7}
          >
            <Ionicons name="stop" size={18} color={Colors.danger} />
            <Text style={[styles.controlText, styles.stopText]}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // above bottom tab bar
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },

  // Start state
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.lightBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadow.md,
  },
  startText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.navy,
  },

  // Recording state
  recordingBar: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.md,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    opacity: 0.4,
  },
  recordDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    // In production, add pulsing animation via Animated API
  },
  recordDotPaused: {
    backgroundColor: Colors.warning,
  },
  recordingLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.danger,
  },
  durationText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.navy,
  },
  stopButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  stopText: {
    color: Colors.danger,
  },
});
