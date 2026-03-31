/**
 * Liberty Field App — Wizard Step 2: Contacts
 *
 * Collect building manager, fire alarm, sprinkler, and EMS contacts.
 * Supports import from phone address book.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '../../navigation/RootNavigator';
import { FormField } from '../../components/FormField';
import { STEP2_CONTACTS, getSections, getQuestionsForSection } from '../../constants/questions';
import { useAnswers } from '../../hooks/useAnswers';
import { useContacts } from '../../hooks/useContacts';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/colors';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'WizardStep2'>;

export function WizardStep2Contacts({ route, navigation }: Props) {
  const { projectId, submissionId } = route.params;
  const { answers, loading, updateAnswer, isStepComplete } = useAnswers(
    submissionId,
    STEP2_CONTACTS,
  );
  const { importContact } = useContacts();

  const handleContactImport = async (questionKey: string) => {
    const contact = await importContact();
    if (contact) {
      const contactStr = JSON.stringify(contact);
      updateAnswer(questionKey, contactStr, false);
    }
  };

  const sections = getSections(STEP2_CONTACTS);

  if (loading) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              style={[styles.progressDot, step === 2 && styles.progressDotActive]}
            />
          ))}
        </View>

        {sections.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section}</Text>
            {getQuestionsForSection(STEP2_CONTACTS, section).map((q) => (
              <FormField
                key={q.key}
                question={q}
                value={answers[q.key]?.value ?? null}
                isNa={answers[q.key]?.isNa ?? false}
                onChangeValue={(val) => updateAnswer(q.key, val, false)}
                onToggleNa={(na) => updateAnswer(q.key, null, na)}
                onContactImport={() => handleContactImport(q.key)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

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
          style={[styles.nextButton, !isStepComplete() && styles.nextButtonDisabled]}
          onPress={() =>
            navigation.navigate('WizardStep3', { projectId, submissionId })
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
    flexDirection: 'row', justifyContent: 'center',
    gap: Spacing.sm, marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border,
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
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.navy,
  },
  backButtonText: {
    fontSize: FontSize.md, fontWeight: '600', color: Colors.navy,
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
