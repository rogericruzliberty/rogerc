/**
 * Liberty Field App — Audio Recording Provider
 *
 * React Context that wraps the entire navigator to provide
 * persistent background audio recording across all screens.
 * Recording continues as the user navigates between wizard steps.
 */

import React, { createContext, useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { db, generateId } from '../services/database';
import { syncEngine } from '../services/syncEngine';

// ─── Context Type ───────────────────────────

interface AudioRecordingContextType {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // in seconds
  currentSubmissionId: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // returns attachment ID
  setSubmissionId: (id: string) => void;
}

const defaultContext: AudioRecordingContextType = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  currentSubmissionId: null,
  startRecording: async () => {},
  pauseRecording: async () => {},
  resumeRecording: async () => {},
  stopRecording: async () => null,
  setSubmissionId: () => {},
};

export const AudioRecordingContext = createContext<AudioRecordingContextType>(defaultContext);

// ─── Provider Component ─────────────────────

export function AudioRecordingProvider({ children }: { children: React.ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      // Configure audio mode for background recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[Audio] Failed to start recording:', error);
      throw error;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.pauseAsync();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      console.error('[Audio] Failed to pause recording:', error);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.startAsync();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[Audio] Failed to resume recording:', error);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    try {
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop and get the recording URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setIsRecording(false);
      setIsPaused(false);

      if (!uri || !currentSubmissionId) return null;

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const sizeBytes = (fileInfo as any).size || 0;

      // Create a descriptive filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `AUDIO_${timestamp}.m4a`;

      // Copy to app's document directory for persistence
      const persistDir = `${FileSystem.documentDirectory}audio/`;
      await FileSystem.makeDirectoryAsync(persistDir, { intermediates: true });
      const persistUri = `${persistDir}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: persistUri });

      // Save to local DB
      const attachmentId = generateId();
      await db.runAsync(
        `INSERT INTO file_attachments (id, submission_id, type, filename, mime_type, size_bytes, local_uri, upload_status)
         VALUES (?, ?, 'AUDIO', ?, 'audio/mp4', ?, ?, 'pending')`,
        [attachmentId, currentSubmissionId, filename, sizeBytes, persistUri],
      );

      // Enqueue for sync
      await syncEngine.enqueue('attachment', attachmentId, 'upload', {
        submissionId: currentSubmissionId,
        localUri: persistUri,
        filename,
        mimeType: 'audio/mp4',
        sizeBytes,
        type: 'AUDIO',
      });

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setDuration(0);
      return attachmentId;
    } catch (error) {
      console.error('[Audio] Failed to stop recording:', error);
      return null;
    }
  }, [currentSubmissionId]);

  const value: AudioRecordingContextType = {
    isRecording,
    isPaused,
    duration,
    currentSubmissionId,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setSubmissionId: setCurrentSubmissionId,
  };

  return (
    <AudioRecordingContext.Provider value={value}>
      {children}
    </AudioRecordingContext.Provider>
  );
}
