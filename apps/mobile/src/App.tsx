/**
 * Liberty Field App — Root Component
 *
 * Wraps the navigation with providers for audio recording,
 * status bar config, and safe area context.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioRecordingProvider } from './providers/AudioRecordingProvider';
import { FloatingRecordBar } from './components/FloatingRecordBar';
import { RootNavigator } from './navigation/RootNavigator';
import { initDatabase } from './services/database';
import { syncEngine } from './services/syncEngine';
import { Colors } from './constants/colors';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Initialize SQLite database and run migrations
        await initDatabase();

        // Start sync engine (listens for connectivity changes)
        syncEngine.start();

        setIsReady(true);
      } catch (err: any) {
        console.error('[App] Bootstrap error:', err);
        setError(err.message || 'Failed to initialize app');
      }
    }

    bootstrap();

    return () => {
      syncEngine.stop();
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Initialization Error</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.loadingText}>Loading Liberty Field...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <AudioRecordingProvider>
        <RootNavigator />
        <FloatingRecordBar />
      </AudioRecordingProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.warmBg,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.danger,
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
