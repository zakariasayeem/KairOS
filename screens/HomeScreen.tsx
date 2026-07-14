import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addProject, addSubtask } from '../db/database';
import { fetchAIBreakdown, AISubtask } from '../lib/aiBreakdown';

type ScreenState = 'idle' | 'loading' | 'review' | 'error';
type Difficulty = 'easy' | 'medium' | 'hard';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [goalText, setGoalText] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<AISubtask[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBreakdown = async () => {
    if (goalText.trim().length === 0) return;
    Keyboard.dismiss();
    setScreenState('loading');
    setErrorMessage('');

    try {
      const result = await fetchAIBreakdown(goalText.trim());
      setSuggestedSubtasks(result.subtasks);
      setScreenState('review');
    } catch (error: any) {
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      setScreenState('error');
    }
  };

  const handleConfirm = () => {
  const projectId = addProject(goalText.trim(), '#6C5CE7');
  suggestedSubtasks.forEach((subtask) => {
    addSubtask(projectId, subtask.title, null, subtask.difficulty, subtask.est_minutes, 'ai_generated');
  });
  
    setGoalText('');
    setSuggestedSubtasks([]);
    setScreenState('idle');

    navigation.navigate('Projects', { screen: 'ProjectsList' });
navigation.navigate('Projects', {
  screen: 'ProjectDetail',
  params: { projectId, projectName: goalText.trim() },
});
  };

  const handleCancel = () => {
    setSuggestedSubtasks([]);
    setScreenState('idle');
  };

  const handleRetry = () => {
    setScreenState('idle');
    setErrorMessage('');
  };

  const updateSubtaskTitle = (index: number, title: string) => {
    setSuggestedSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, title } : s))
    );
  };

  const updateSubtaskMinutes = (index: number, minutesText: string) => {
    const minutes = parseInt(minutesText, 10);
    setSuggestedSubtasks((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, est_minutes: isNaN(minutes) ? 0 : minutes } : s
      )
    );
  };

  const cycleDifficulty = (index: number) => {
    const order: Difficulty[] = ['easy', 'medium', 'hard'];
    setSuggestedSubtasks((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const currentIndex = order.indexOf(s.difficulty);
        const nextDifficulty = order[(currentIndex + 1) % order.length];
        return { ...s, difficulty: nextDifficulty };
      })
    );
  };

  const moveSubtask = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= suggestedSubtasks.length) return;

    setSuggestedSubtasks((prev) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const removeSubtask = (index: number) => {
    setSuggestedSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'space-between' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topBar}>
          <Text style={styles.appName}>KairOS</Text>
          <View style={styles.iconPlaceholder} />
        </View>

        {screenState === 'review' ? (
          <ScrollView style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>Here's your breakdown:</Text>
            <Text style={styles.reviewSubtitle}>Tap to edit, use arrows to reorder</Text>

            {suggestedSubtasks.map((subtask, index) => (
              <View key={index} style={styles.subtaskPreview}>
                <View style={styles.reorderColumn}>
                  <TouchableOpacity
                    onPress={() => moveSubtask(index, -1)}
                    disabled={index === 0}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={index === 0 ? '#3A3A45' : '#A5ABB6'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveSubtask(index, 1)}
                    disabled={index === suggestedSubtasks.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={index === suggestedSubtasks.length - 1 ? '#3A3A45' : '#A5ABB6'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.subtaskContent}>
                  <TextInput
                    style={styles.subtaskTitleInput}
                    value={subtask.title}
                    onChangeText={(text) => updateSubtaskTitle(index, text)}
                    multiline
                  />
                  <View style={styles.subtaskMetaRow}>
                    <TouchableOpacity
                      style={[
                        styles.difficultyPill,
                        subtask.difficulty === 'easy' && styles.pillEasy,
                        subtask.difficulty === 'medium' && styles.pillMedium,
                        subtask.difficulty === 'hard' && styles.pillHard,
                      ]}
                      onPress={() => cycleDifficulty(index)}
                    >
                      <Text style={styles.difficultyPillText}>{subtask.difficulty}</Text>
                    </TouchableOpacity>

                    <View style={styles.minutesInputRow}>
                      <TextInput
                        style={styles.minutesInput}
                        value={String(subtask.est_minutes)}
                        onChangeText={(text) => updateSubtaskMinutes(index, text)}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.minutesLabel}>min</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity onPress={() => removeSubtask(index)}>
                  <Ionicons name="close-circle" size={20} color="#A5ABB6" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.reviewActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.ctaText}>Create Project</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What's Next</Text>
            <Text style={styles.cardBody}>No tasks yet</Text>
          </View>
        )}

        {screenState !== 'review' && (
          <View style={styles.addSection}>
            {screenState === 'error' && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="What are you working on?"
              placeholderTextColor="#A5ABB6"
              value={goalText}
              onChangeText={setGoalText}
              editable={screenState !== 'loading'}
            />

            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.85}
              onPress={screenState === 'error' ? handleRetry : handleBreakdown}
              disabled={screenState === 'loading'}
            >
              {screenState === 'loading' ? (
                <ActivityIndicator color="#F5F5F7" />
              ) : (
                <Text style={styles.ctaText}>
                  {screenState === 'error' ? 'Retry' : '+ Break down a new goal'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  appName: { color: '#F5F5F7', fontSize: 22, fontWeight: '600' },
  iconPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16161D' },
  card: { backgroundColor: '#16161D', borderRadius: 12, padding: 16, marginTop: 24 },
  cardTitle: { color: '#F5F5F7', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  cardBody: { color: '#A5ABB6', fontSize: 15 },
  addSection: { marginBottom: 24, marginTop: 16 },
  input: {
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 14,
    color: '#F5F5F7',
    fontSize: 15,
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#F5F5F7', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#F87171', fontSize: 14, marginBottom: 8 },
  reviewSection: { flex: 1, marginTop: 16 },
  reviewTitle: { color: '#F5F5F7', fontSize: 18, fontWeight: '600' },
  reviewSubtitle: { color: '#A5ABB6', fontSize: 13, marginBottom: 12, marginTop: 4 },
  subtaskPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  reorderColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  subtaskContent: { flex: 1 },
  subtaskTitleInput: {
    color: '#F5F5F7',
    fontSize: 15,
    paddingVertical: 2,
  },
  subtaskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  difficultyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillEasy: { backgroundColor: '#10B98133' },
  pillMedium: { backgroundColor: '#F59E0B33' },
  pillHard: { backgroundColor: '#F8717133' },
  difficultyPillText: { color: '#F5F5F7', fontSize: 12, fontWeight: '600' },
  minutesInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  minutesInput: {
    color: '#F5F5F7',
    fontSize: 13,
    backgroundColor: '#1F1F29',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 36,
    textAlign: 'center',
  },
  minutesLabel: { color: '#A5ABB6', fontSize: 13 },
  reviewActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#16161D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#A5ABB6', fontSize: 15, fontWeight: '600' },
  confirmButton: {
    flex: 2,
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});