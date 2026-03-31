/**
 * Liberty Field App — FormField Component
 *
 * Universal form field component that renders the correct input
 * type based on the question definition. Supports:
 * - Text input
 * - Textarea
 * - Select (dropdown)
 * - Multi-select
 * - File upload trigger
 * - Contact card entry
 *
 * Every field includes an "N/A" toggle.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/colors';
import type { QuestionDef, SelectOption } from '../constants/questions';

// ─── Props ──────────────────────────────────

interface FormFieldProps {
  question: QuestionDef;
  value: string | null;
  isNa: boolean;
  onChangeValue: (value: string | null) => void;
  onToggleNa: (isNa: boolean) => void;
  onFileUpload?: () => void;
  onContactImport?: () => void;
}

// ─── Component ──────────────────────────────

export function FormField({
  question,
  value,
  isNa,
  onChangeValue,
  onToggleNa,
  onFileUpload,
  onContactImport,
}: FormFieldProps) {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    value ? value.split(',') : [],
  );

  const handleNaToggle = useCallback(() => {
    const newNa = !isNa;
    onToggleNa(newNa);
    if (newNa) {
      onChangeValue(null);
    }
  }, [isNa, onToggleNa, onChangeValue]);

  const handleSelectOption = useCallback(
    (option: SelectOption) => {
      if (question.type === 'multiselect') {
        const updated = selectedOptions.includes(option.value)
          ? selectedOptions.filter((v) => v !== option.value)
          : [...selectedOptions, option.value];
        setSelectedOptions(updated);
        onChangeValue(updated.join(','));
      } else {
        onChangeValue(option.value);
        setIsSelectOpen(false);
      }
    },
    [question.type, selectedOptions, onChangeValue],
  );

  // ─── Render Input by Type ─────────────────

  function renderInput() {
    if (isNa) {
      return (
        <View style={styles.naPlaceholder}>
          <Text style={styles.naText}>Marked as N/A</Text>
        </View>
      );
    }

    switch (question.type) {
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={value ?? ''}
            onChangeText={onChangeValue}
            placeholder={question.placeholder || 'Enter response...'}
            placeholderTextColor={Colors.textMuted}
          />
        );

      case 'textarea':
        return (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={value ?? ''}
            onChangeText={onChangeValue}
            placeholder={question.placeholder || 'Enter response...'}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );

      case 'select':
        return (
          <View>
            <TouchableOpacity
              style={styles.selectTrigger}
              onPress={() => setIsSelectOpen(!isSelectOpen)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectText,
                  !value && styles.selectPlaceholder,
                ]}
              >
                {value
                  ? question.options?.find((o) => o.value === value)?.label ?? value
                  : 'Select an option...'}
              </Text>
              <Ionicons
                name={isSelectOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            {isSelectOpen && (
              <View style={styles.selectDropdown}>
                {question.options?.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.selectOption,
                      value === option.value && styles.selectOptionActive,
                    ]}
                    onPress={() => handleSelectOption(option)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        value === option.value && styles.selectOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {value === option.value && (
                      <Ionicons name="checkmark" size={18} color={Colors.navy} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      case 'multiselect':
        return (
          <View style={styles.multiSelectContainer}>
            {question.options?.map((option) => {
              const isSelected = selectedOptions.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.multiSelectChip,
                    isSelected && styles.multiSelectChipActive,
                  ]}
                  onPress={() => handleSelectOption(option)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={isSelected ? Colors.navy : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.multiSelectText,
                      isSelected && styles.multiSelectTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'file_upload':
      case 'file_upload_multi':
        return (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onFileUpload}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.navy} />
            <Text style={styles.uploadText}>
              {question.type === 'file_upload_multi'
                ? 'Tap to upload files'
                : 'Tap to upload file'}
            </Text>
          </TouchableOpacity>
        );

      case 'contact':
        return (
          <View>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={onContactImport}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={20} color={Colors.navy} />
              <Text style={styles.contactButtonText}>Import from Contacts</Text>
            </TouchableOpacity>
            <View style={styles.contactForm}>
              <TextInput
                style={styles.contactInput}
                placeholder="Name"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={styles.contactInput}
                placeholder="Title"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={styles.contactInput}
                placeholder="Phone"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.contactInput}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.contactInput}
                placeholder="Company"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  }

  // ─── Main Render ──────────────────────────

  return (
    <View style={styles.container}>
      {/* Label + N/A toggle */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {question.label}
          {question.required && <Text style={styles.required}> *</Text>}
        </Text>
        <TouchableOpacity
          style={[styles.naToggle, isNa && styles.naToggleActive]}
          onPress={handleNaToggle}
          activeOpacity={0.7}
        >
          <Text style={[styles.naToggleText, isNa && styles.naToggleTextActive]}>
            N/A
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper text */}
      {question.helperText && !isNa && (
        <Text style={styles.helperText}>{question.helperText}</Text>
      )}

      {/* Input */}
      {renderInput()}
    </View>
  );
}

// ─── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    paddingRight: Spacing.md,
    lineHeight: 22,
  },
  required: {
    color: Colors.danger,
  },
  helperText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },

  // N/A Toggle
  naToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  naToggleActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  naToggleText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  naToggleTextActive: {
    color: Colors.textOnNavy,
  },
  naPlaceholder: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  naText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Text input
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 48,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Select
  selectTrigger: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  selectText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  selectPlaceholder: {
    color: Colors.textMuted,
  },
  selectDropdown: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    ...Shadow.md,
  },
  selectOption: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectOptionActive: {
    backgroundColor: Colors.surface,
  },
  selectOptionText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  selectOptionTextActive: {
    color: Colors.navy,
    fontWeight: '600',
  },

  // Multi-select
  multiSelectContainer: {
    gap: Spacing.sm,
  },
  multiSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  multiSelectChipActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.navy,
  },
  multiSelectText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  multiSelectTextActive: {
    color: Colors.navy,
    fontWeight: '600',
  },

  // File upload
  uploadButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.lightBlue,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  uploadText: {
    fontSize: FontSize.sm,
    color: Colors.navy,
    fontWeight: '600',
  },

  // Contact
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.lightBlue,
    marginBottom: Spacing.md,
  },
  contactButtonText: {
    fontSize: FontSize.sm,
    color: Colors.navy,
    fontWeight: '600',
  },
  contactForm: {
    gap: Spacing.sm,
  },
  contactInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 44,
  },
});
