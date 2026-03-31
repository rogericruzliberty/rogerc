/**
 * Liberty Field App — Wizard Step 1: Uploads & Documents
 *
 * Upload rules & regs, COI, base drawings, and enter project address.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '../../navigation/RootNavigator';
import { FormField } from '../../components/FormField';
import { STEP1_UPLOADS, getSections, getQuestionsForSection } from '../../constants/questions';
import { useAnswers } from '../../hooks/useAnswers';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/colors';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'WizardStep1'>;

export function WizardStep1Uploads({ route, navigation }: Props) {
  const { projectId, submissionId } = route.params;
  const { answers, loading, updateAnswer, isStepComplete } = useAnswers(
    submissionId,
    STEP1_UPLOADS,
  );

  const handleFileUpload = useCallback(async (questionKey: string) => {
    Alert.alert('Upload File', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            updateAnswer(questionKey, result.assets[0].uri, false);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
            allowsMultipleSelection: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            const uris = result.assets.map((a) => a.uri).join(',');
            updateAnswer(questionKey, uris, false);
          }
        },
      },
      {
        text: 'Document',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            multiple: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            const uris = result.assets.map((a) => a.uri).join(',');
            updateAnswer(questionKey, uris, false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [updateAnswer]);

  const sections = getSections(STEP1_UPLOADS);

  const shouldShowQuestion = (q: typeof STEP1_UPLOADS[0]): boolean => {
    if (!q.showWhen) return true;
    if ('isEmpty' in q.showWhen) {
      const dep = answers[q.showWhen.key];
      return q.showWhen.isEmpty ? (!dep?.value || dep.value === '') : (!!dep?.value && dep.value !== '');
    }
    if ('equals' in q.showWhen) {
      return answers[q.showWhen.key]?.value === q.showWhen.equals;
    }
    return true;
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress indicator */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              style={[styles.progressDot, step === 1 && styles.progressDotActive]}
            />
          ))}
        </View>

        {sections.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section}</Text>
            {getQuestionsForSection(STEP1_UPLOADS, section)
              .filter(shouldShowQuestion)
              .map((q) => (
                <FormField
                  key={q.key}
                  question={q}
                  value={answers[q.key]?.value ?? null}
                  isNa={answers[q.key]?.isNa ?? false}
                  onChangeValue={(val) => updateAnswer(q.key, val, false)}
                  onToggleNa={(na) => updateAnswer(q.key, null, na)}
                  onFileUpload={() => handleFileUpload(q.key)}
                />
              ))}
          </View>
        ))}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        <View style={{ width: 100 }} />
        <TouchableOpacity
          style={[styles.nextButton, !isStepComplete() && styles.nextButtonDisabled]}
          onPress={() =>
            navigation.navigate('WizardStep2', { projectId, submissionId })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.textOnNavy} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.warmBg },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.navy, width: 28 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.lg, fontWeight: '700',
    color: Colors.navy, marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: Spacing.lg, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.navy, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    fontSize: FontSize.md, fontWeight: '700', color: Colors.textOnNavy,
  },
});
