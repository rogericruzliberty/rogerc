/**
 * Liberty Field App — useAnswers Hook
 *
 * Manages answer state for a wizard step, with local SQLite
 * persistence and sync queue integration.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAnswers, saveAnswer } from '../services/database';
import { syncEngine } from '../services/syncEngine';
import type { AnswerState } from '../types';
import type { QuestionDef } from '../constants/questions';

export function useAnswers(submissionId: string, questions: QuestionDef[]) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(true);

  // Load saved answers from SQLite
  useEffect(() => {
    async function load() {
      try {
        const rows = await getAnswers(submissionId);
        const state: AnswerState = {};

        for (const row of rows) {
          state[row.question_key] = {
            value: row.value,
            isNa: Boolean(row.is_na),
          };
        }

        // Initialize missing keys
        for (const q of questions) {
          if (!state[q.key]) {
            state[q.key] = { value: null, isNa: false };
          }
        }

        setAnswers(state);
      } catch (err) {
        console.error('[useAnswers] Load error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [submissionId, questions]);

  // Update a single answer
  const updateAnswer = useCallback(
    async (questionKey: string, value: string | null, isNa: boolean) => {
      setAnswers((prev) => ({
        ...prev,
        [questionKey]: { value, isNa },
      }));

      // Persist to SQLite
      await saveAnswer(submissionId, questionKey, value, isNa);

      // Enqueue for sync
      syncEngine.enqueue({
        type: 'answer',
        entityId: `${submissionId}:${questionKey}`,
        payload: { submissionId, questionKey, value, isNa },
      });
    },
    [submissionId],
  );

  // Check if all required questions are answered
  const isStepComplete = useCallback(() => {
    return questions
      .filter((q) => q.required)
      .every((q) => {
        const ans = answers[q.key];
        return ans && (ans.isNa || (ans.value !== null && ans.value !== ''));
      });
  }, [questions, answers]);

  return { answers, loading, updateAnswer, isStepComplete };
}
