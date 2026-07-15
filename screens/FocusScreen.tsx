import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  getAllProjects,
  getSubtasksForProject,
  startFocusSession,
  endFocusSession,
  getCompletedSessionCount,
} from '../db/database';
import { colors, radius } from '../theme/tokens';

type Project = { id: string; name: string; color: string };
type Subtask = { id: string; title: string; is_complete: number; parent_subtask_id: string | null };
type CyclePhase = 'work' | 'break' | 'longBreak';

const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const DEFAULT_LONG_BREAK_MINUTES = 15;
const CYCLES_BEFORE_LONG_BREAK = 4;

export default function FocusScreen() {
  const route = useRoute<any>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [selectedSubtaskTitle, setSelectedSubtaskTitle] = useState<string | null>(null);

  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);
  const [longBreakMinutes, setLongBreakMinutes] = useState(DEFAULT_LONG_BREAK_MINUTES);

  const [phase, setPhase] = useState<CyclePhase>('work');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_WORK_MINUTES * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showBreakChoice, setShowBreakChoice] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle being navigated here directly from a subtask's timer button
  useEffect(() => {
    if (route.params?.subtaskId) {
      setSelectedSubtaskId(route.params.subtaskId);
      setSelectedSubtaskTitle(route.params.subtaskTitle ?? null);
      if (route.params.estMinutes) {
        const rounded = Math.max(5, Math.round(route.params.estMinutes / 5) * 5);
        setWorkMinutes(rounded);
        setSecondsLeft(rounded * 60);
      }
      setCompletedCount(getCompletedSessionCount(route.params.subtaskId));
    }
  }, [route.params]);

  useFocusEffect(
    useCallback(() => {
      setProjects(getAllProjects());
    }, [])
  );

  useEffect(() => {
    if (selectedProjectId) {
      const all = getSubtasksForProject(selectedProjectId);
      const childIds = new Set(all.filter((s) => s.parent_subtask_id).map((s) => s.parent_subtask_id));
      setSubtasks(all.filter((s) => s.is_complete === 0 && !childIds.has(s.id)));
    } else {
      setSubtasks([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = () => {
    if (phase === 'work') {
      const newSessionId = startFocusSession(selectedSubtaskId, 'pomodoro');
      setSessionId(newSessionId);
    }
    setSessionStarted(true);
    setIsRunning(true);
  };

  const handlePause = () => setIsRunning(false);
  const handleResume = () => setIsRunning(true);

  const handleReset = () => {
    setIsRunning(false);
    setSessionStarted(false);
    setSessionId(null);
    setPhase('work');
    setShowBreakChoice(false);
    setSecondsLeft(workMinutes * 60);
  };

  const handlePhaseComplete = async () => {
    setIsRunning(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (phase === 'work') {
      if (sessionId) {
        endFocusSession(sessionId, workMinutes);
        if (selectedSubtaskId) {
          setCompletedCount(getCompletedSessionCount(selectedSubtaskId));
        }
      }
      setSessionId(null);
      setShowBreakChoice(true);
      setIsRunning(false);
    } else {
      const newSessionId = startFocusSession(selectedSubtaskId, 'pomodoro');
      setSessionId(newSessionId);
      setPhase('work');
      setSecondsLeft(workMinutes * 60);
    }
  };

  const chooseBreak = (isLong: boolean) => {
    setShowBreakChoice(false);
    setPhase(isLong ? 'longBreak' : 'break');
    setSecondsLeft((isLong ? longBreakMinutes : breakMinutes) * 60);
    setIsRunning(true);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const adjustMinutes = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    current: number,
    delta: number,
    min: number,
    isWork: boolean
  ) => {
    const next = Math.max(min, current + delta);
    setter(next);
    if (isWork && phase === 'work' && !sessionStarted) setSecondsLeft(next * 60);
  };

  const isBreak = phase === 'break' || phase === 'longBreak';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Focus</Text>

      {!sessionStarted && !route.params?.subtaskId && (
        <View style={styles.pickerSection}>
          <Text style={styles.label}>Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.chip, selectedProjectId === project.id && styles.chipSelected]}
                onPress={() => {
                  setSelectedProjectId(project.id);
                  setSelectedSubtaskId(null);
                  setSelectedSubtaskTitle(null);
                }}
              >
                <Text style={styles.chipText}>{project.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedProjectId && (
            <>
              <Text style={styles.label}>Subtask</Text>
              <ScrollView style={{ maxHeight: 100 }}>
                {subtasks.length === 0 ? (
                  <Text style={styles.subtitle}>No open subtasks in this project</Text>
                ) : (
                  subtasks.map((subtask) => (
                    <TouchableOpacity
                      key={subtask.id}
                      style={[
                        styles.subtaskOption,
                        selectedSubtaskId === subtask.id && styles.subtaskOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedSubtaskId(subtask.id);
                        setSelectedSubtaskTitle(subtask.title);
                        setCompletedCount(getCompletedSessionCount(subtask.id));
                      }}
                    >
                      <Text style={styles.chipText}>{subtask.title}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Durations</Text>
          <View style={styles.durationRow}>
            <View style={styles.durationControl}>
              <Text style={styles.durationCaption}>Work</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity onPress={() => adjustMinutes(setWorkMinutes, workMinutes, -5, 5, true)} style={styles.stepperButton}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{workMinutes}m</Text>
                <TouchableOpacity onPress={() => adjustMinutes(setWorkMinutes, workMinutes, 5, 5, true)} style={styles.stepperButton}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.durationControl}>
              <Text style={styles.durationCaption}>Break</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity onPress={() => adjustMinutes(setBreakMinutes, breakMinutes, -1, 1, false)} style={styles.stepperButton}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{breakMinutes}m</Text>
                <TouchableOpacity onPress={() => adjustMinutes(setBreakMinutes, breakMinutes, 1, 1, false)} style={styles.stepperButton}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.durationControl}>
              <Text style={styles.durationCaption}>Long Break</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity onPress={() => adjustMinutes(setLongBreakMinutes, longBreakMinutes, -5, 5, false)} style={styles.stepperButton}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{longBreakMinutes}m</Text>
                <TouchableOpacity onPress={() => adjustMinutes(setLongBreakMinutes, longBreakMinutes, 5, 5, false)} style={styles.stepperButton}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.timerSection}>
        {showBreakChoice ? (
          <View style={styles.breakChoiceBox}>
            <Text style={styles.phaseLabel}>Nice work! Take a break?</Text>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.pauseButton} onPress={() => chooseBreak(false)}>
                <Text style={styles.controlButtonText}>Short Break</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.startButton} onPress={() => chooseBreak(true)}>
                <Text style={styles.startButtonText}>Long Break</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.phaseLabel}>
              {phase === 'work' ? 'Focus' : phase === 'longBreak' ? 'Long Break' : 'Break'}
            </Text>
            {selectedSubtaskTitle && phase === 'work' && (
              <Text style={styles.activeSubtaskLabel}>{selectedSubtaskTitle}</Text>
            )}
            <Text style={[styles.timerText, isBreak && styles.timerTextBreak]}>
              {formatTime(secondsLeft)}
            </Text>
            {selectedSubtaskId && (
              <Text style={styles.cycleLabel}>
                {completedCount} session{completedCount === 1 ? '' : 's'} completed
              </Text>
            )}

            <View style={styles.controlsRow}>
              {!sessionStarted ? (
                <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                  <Text style={styles.startButtonText}>Start Focus Session</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {isRunning ? (
                    <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
                      <Text style={styles.controlButtonText}>Pause</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.pauseButton} onPress={handleResume}>
                      <Text style={styles.controlButtonText}>Resume</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <Text style={styles.controlButtonText}>Reset</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: 16 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '600', marginTop: 16 },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  pickerSection: { marginTop: 12 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: 'row' },
  chip: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipSelected: { backgroundColor: colors.accentPrimary },
  chipText: { color: colors.textPrimary, fontSize: 14 },
  subtaskOption: { backgroundColor: colors.bgSurface, borderRadius: 10, padding: 10, marginBottom: 8 },
  subtaskOptionSelected: { backgroundColor: colors.accentPrimary },
  durationRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  durationControl: { alignItems: 'center' },
  durationCaption: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperButton: {
    backgroundColor: colors.bgSurface,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  stepperValue: { color: colors.textPrimary, fontSize: 14, minWidth: 34, textAlign: 'center' },
  timerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  breakChoiceBox: { alignItems: 'center', gap: 16 },
  phaseLabel: { color: colors.accentPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  activeSubtaskLabel: { color: colors.textSecondary, fontSize: 15, marginBottom: 16, textAlign: 'center' },
  timerText: { color: colors.textPrimary, fontSize: 64, fontWeight: '700' },
  timerTextBreak: { color: colors.progressHigh },
  cycleLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 8, marginBottom: 32 },
  controlsRow: { flexDirection: 'row', gap: 12 },
  startButton: { backgroundColor: colors.accentPrimary, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 24 },
  startButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  pauseButton: { backgroundColor: colors.bgSurface, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 24 },
  resetButton: { backgroundColor: colors.error, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 24 },
  controlButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});