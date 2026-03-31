/**
 * Liberty Field App — Wizard Step 5: Review & Submit
 *
 * Summary of all answers across all steps. Submit marks
 * the submission as COMPLETED and triggers final sync.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '../../navigation/RootNavigator';
import {
  STEP1_UPLOADS,
  STEP2_CONTACTS,
  STEP3_SITE_QUESTIONS,
  STEP4_OBSERVATIONS,
  WIZARD_STEPS,
} from '../../constants/questions';
import { getAnswers } from '../../services/database';
import { syncEngine } from '../../services/syncEngine';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/colors';
import type { AnswerState } from '../../types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'WizardStep5'>;

const ALL_QUESTIONS = [
  ...STEP1_UPLOADS,
  ...STEP2_CONTACTS,
  ...STEP3_SITE_QUESTIONS,
  ...STEP4_OBSERVATIONS,
];

export function WizardStep5Review({ route, navigation }: Props) {
  const { projectId, submissionId } = route.params;
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const rows = await getAnswers(submissionId);
      const state: AnswerState = {};
      for (const row of rows) {
        state[row.question_key] = { value: row.value, isNa: Boolean(row.is_na) };
      }
      setAnswers(state);
      setLoading(false);
    }
    load();
  }, [submissionId]);

  // Count completed vs total per step
  function getStepStats(questions: typeof ALL_QUESTIONS) {
    const required = questions.filter((q) => q.required);
    const answered = required.filter((q) => {
      const ans = answers[q.key];
      return ans && (ans.isNa || (ans.value !== null && ans.value !== ''));
    });
    return { answered: answered.length, total: required.length };
  }

  const stepData = [
    { title: 'Uploads & Documents', questions: STEP1_UPLOADS },
    { title: 'Contacts', questions: STEP2_CONTACTS },
    { title: 'Site Questions', questions: STEP3_SITE_QUESTIONS },
    { title: 'Site Observations', questions: STEP4_OBSERVATIONS },
  ];

  const totalRequired = ALL_QUESTIONS.filter((q) => q.required).length;
  const totalAnswered = ALL_QUESTIONS.filter((q) => q.required).filter((q) => {
    const ans = answers[q.key];
    return ans && (ans.isNa || (ans.value !== null && ans.value !== ''));
  }).length;

  const handleSubmit = useCallback(async () => {
    if (totalAnswered < totalRequired) {
      Alert.alert(
        'Incomplete',
        `You have ${totalRequired - totalAnswered} unanswered required questions. Continue anyway?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => doSubmit() },
        ],
      );
    } else {
      doSubmit();
    }

    async function doSubmit() {
      setSubmitting(true);
      try {
        // Enqueue the submission status change
        syncEngine.enqueue({
          type: 'submission',
          entityId: submissionId,
          payload: {
            id: submissionId,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          },
        });

        Alert.alert(
          'Submitted!',
          'Your site survey has been submitted and will sync when connected.',
          [
            {
              text: 'OK',
              onPress: () => navigation.popToTop(),
            },
          ],
        );
      } catch (err) {
        Alert.alert('Error', 'Failed to submit. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [totalAnswered, totalRequired, submissionId, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              style={[styles.progressDot, step === 5 && styles.progressDotActive]}
            />
          ))}
        </View>

        {/* Overall progress */}
        <View style={styles.overallCard}>
          <Text style={styles.overallTitle}>Survey Completion</Text>
          <Text style={styles.overallCount}>
            {totalAnswered} / {totalRequired} required questions
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(totalAnswered / totalRequired) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Per-step summary */}
        {stepData.map((step, index) => {
          const stats = getStepStats(step.questions);
          const isComplete = stats.answered === stats.total;
          return (
            <TouchableOpacity
              key={step.title}
              style={styles.stepCard}
              onPress={() => {
                const screenName = `WizardStep${index + 1}` as keyof ProjectsStackParamList;
                navigation.navigate(screenName as any, { projectId, submissionId });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.stepRow}>
                <Ionicons
                  name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isComplete ? Colors.success : Colors.textMuted}
                />
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepStats}>
                    {stats.answered}/{stats.total} required answered
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Submit footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={Colors.navy} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.textOnNavy} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.textOnNavy} />
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.warmBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  progressRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: Spacing.sm, marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.navy, width: 28 },
  overallCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadow.md,
  },
  overallTitle: {
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary,
  },
  overallCount: {
    fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs,
  },
  progressBar: {
    height: 8, backgroundColor: Colors.border, borderRadius: 4,
    marginTop: Spacing.md, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: Colors.success, borderRadius: 4,
  },
  stepCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  stepInfo: { flex: 1 },
  stepTitle: {
    fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary,
  },
  stepStats: {
    fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: Spacing.lg, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.navy,
  },
  backButtonText: {
    fontSize: FontSize.md, fontWeight: '600', color: Colors.navy,
  },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  submitButtonText: {
    fontSize: FontSize.md, fontWeight: '700', color: Colors.textOnNavy,
  },
});
