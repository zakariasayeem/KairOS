import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  addSubtask,
  getSubtasksForProject,
  toggleSubtaskComplete,
  updateSubtask,
  deleteSubtask,
  updateSubtaskOrder,
} from '../db/database';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/tokens';

type Subtask = {
  id: string;
  project_id: string;
  parent_subtask_id: string | null;
  title: string;
  is_complete: number;
  order_index: number;
  difficulty: string | null;
  est_minutes: number | null;
  source: string;
  created_at: string;
};

type Difficulty = 'easy' | 'medium' | 'hard';

export default function ProjectDetailScreen() {
  const route = useRoute<any>();
  const { projectId, projectName } = route.params;

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [childTitle, setChildTitle] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  const loadSubtasks = useCallback(() => {
    setSubtasks(getSubtasksForProject(projectId));
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      loadSubtasks();
    }, [loadSubtasks])
  );

  const navigation = useNavigation<any>();

  const goToFocus = (subtaskId: string, subtaskTitle: string, estMinutes: number | null) => {
  navigation.navigate('Focus', { subtaskId, subtaskTitle, estMinutes });
  };

  const handleAddSubtask = () => {
    if (subtaskTitle.trim().length === 0) return;
    addSubtask(projectId, subtaskTitle.trim());
    setSubtaskTitle('');
    Keyboard.dismiss();
    loadSubtasks();
  };

  const handleAddChild = (parentId: string) => {
    if (childTitle.trim().length === 0) return;
    addSubtask(projectId, childTitle.trim(), parentId);
    setChildTitle('');
    setAddingChildFor(null);
    Keyboard.dismiss();
    loadSubtasks();
  };

  const handleToggleChild = (subtask: Subtask) => {
    toggleSubtaskComplete(subtask.id, subtask.is_complete === 0);
    loadSubtasks();
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setAddingChildFor(null);
  };

  const handleSplitPress = (itemId: string) => {
    if (addingChildFor === itemId) {
      setAddingChildFor(null);
    } else {
      setAddingChildFor(itemId);
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleEditTitle = (id: string, title: string, difficulty: string | null, estMinutes: number | null) => {
    updateSubtask(id, title, difficulty, estMinutes);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const handleEditMinutes = (id: string, minutesText: string, title: string, difficulty: string | null) => {
    const minutes = parseInt(minutesText, 10);
    const estMinutes = isNaN(minutes) ? null : minutes;
    updateSubtask(id, title, difficulty, estMinutes);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, est_minutes: estMinutes } : s)));
  };

  const handleCycleDifficulty = (id: string, title: string, currentDifficulty: string | null, estMinutes: number | null) => {
    const order: Difficulty[] = ['easy', 'medium', 'hard'];
    const currentIndex = order.indexOf((currentDifficulty as Difficulty) ?? 'medium');
    const nextDifficulty = order[(currentIndex + 1) % order.length];
    updateSubtask(id, title, nextDifficulty, estMinutes);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, difficulty: nextDifficulty } : s)));
  };

  const handleDelete = (id: string) => {
    deleteSubtask(id);
    loadSubtasks();
  };

  const handleMove = (list: Subtask[], index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;

    const a = list[index];
    const b = list[newIndex];
    updateSubtaskOrder(a.id, b.order_index);
    updateSubtaskOrder(b.id, a.order_index);
    loadSubtasks();
  };

  const topLevelSubtasks = subtasks
    .filter((s) => s.parent_subtask_id === null)
    .sort((a, b) => a.order_index - b.order_index);

  const getChildren = (parentId: string) =>
    subtasks
      .filter((s) => s.parent_subtask_id === parentId)
      .sort((a, b) => a.order_index - b.order_index);

  const isParentComplete = (children: Subtask[]) => {
    if (children.length === 0) return null;
    return children.every((c) => c.is_complete === 1);
  };

  const renderEditableRow = (item: Subtask, list: Subtask[], index: number, isChild: boolean) => (
    <View key={item.id} style={[styles.subtaskPreview, isChild && styles.childRow]}>
      <View style={styles.reorderColumn}>
        <TouchableOpacity onPress={() => handleMove(list, index, -1)} disabled={index === 0}>
          <Ionicons name="chevron-up" size={16} color={index === 0 ? '#3A3A45' : '#A5ABB6'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleMove(list, index, 1)} disabled={index === list.length - 1}>
          <Ionicons
            name="chevron-down"
            size={16}
            color={index === list.length - 1 ? '#3A3A45' : '#A5ABB6'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.subtaskContent}>
        <TextInput
          style={styles.subtaskTitleInput}
          value={item.title}
          onChangeText={(text) => handleEditTitle(item.id, text, item.difficulty, item.est_minutes)}
          multiline
        />
        <View style={styles.subtaskMetaRow}>
          <TouchableOpacity
            style={[
              styles.difficultyPill,
              item.difficulty === 'easy' && styles.pillEasy,
              item.difficulty === 'medium' && styles.pillMedium,
              item.difficulty === 'hard' && styles.pillHard,
            ]}
            onPress={() => handleCycleDifficulty(item.id, item.title, item.difficulty, item.est_minutes)}
          >
            <Text style={styles.difficultyPillText}>{item.difficulty ?? 'medium'}</Text>
          </TouchableOpacity>
          <View style={styles.minutesInputRow}>
            <TextInput
              style={styles.minutesInput}
              value={String(item.est_minutes ?? '')}
              onChangeText={(text) => handleEditMinutes(item.id, text, item.title, item.difficulty)}
              keyboardType="number-pad"
            />
            <Text style={styles.minutesLabel}>min</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Ionicons name="close-circle" size={20} color="#A5ABB6" />
      </TouchableOpacity>
    </View>
  );

  const renderMetaBadges = (item: Subtask) =>
    (item.difficulty || item.est_minutes) && (
      <View style={styles.metaRow}>
        {item.difficulty && (
          <View
            style={[
              styles.difficultyBadge,
              item.difficulty === 'easy' && styles.badgeEasy,
              item.difficulty === 'medium' && styles.badgeMedium,
              item.difficulty === 'hard' && styles.badgeHard,
            ]}
          >
            <Text style={styles.badgeText}>{item.difficulty}</Text>
          </View>
        )}
        {item.est_minutes && <Text style={styles.metaTime}>{item.est_minutes}m</Text>}
      </View>
    );

  const renderTopLevelRow = (item: Subtask) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const parentComplete = isParentComplete(children);
    const isComplete = hasChildren ? parentComplete : item.is_complete === 1;
    const isCollapsed = collapsed.has(item.id);
    const isAddingChild = addingChildFor === item.id;

    if (editMode) {
      return (
        <View key={item.id}>
          {renderEditableRow(item, topLevelSubtasks, topLevelSubtasks.indexOf(item), false)}
          {children.map((child, idx) => renderEditableRow(child, children, idx, true))}
        </View>
      );
    }

    return (
      <View key={item.id}>
        <TouchableOpacity
          style={styles.subtaskRow}
          activeOpacity={0.7}
          onPress={() => {
            if (hasChildren) {
              toggleCollapse(item.id);
            } else {
              handleToggleChild(item);
            }
          }}
        >
          {hasChildren ? (
            <Ionicons
              name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
              size={20}
              color="#A5ABB6"
              style={{ marginRight: 8 }}
            />
          ) : (
            <View style={[styles.checkbox, isComplete && styles.checkboxChecked]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.subtaskText, isComplete && styles.subtaskTextComplete]}>
              {item.title}
            </Text>
            {renderMetaBadges(item)}
          </View>
          <TouchableOpacity style={styles.splitButton} onPress={() => handleSplitPress(item.id)}>
            <Text style={styles.splitButtonText}>{isAddingChild ? '×' : '+'}</Text>
          </TouchableOpacity>
          {!hasChildren && (
          <TouchableOpacity
              style={styles.timerButton}
               onPress={() => goToFocus(item.id, item.title, item.est_minutes)}
  >
            <Ionicons name="timer-outline" size={18} color={colors.textPrimary} />
           </TouchableOpacity>
)}
        </TouchableOpacity>

        {isAddingChild && (
          <View style={styles.childAddRow}>
            <TextInput
              style={styles.childInput}
              placeholder="Break this down further..."
              placeholderTextColor="#A5ABB6"
              value={childTitle}
              onChangeText={setChildTitle}
              autoFocus
            />
            <TouchableOpacity style={styles.childAddButton} onPress={() => handleAddChild(item.id)}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasChildren &&
          !isCollapsed &&
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.subtaskRow, styles.childRow]}
              activeOpacity={0.7}
              onPress={() => handleToggleChild(child)}
            >
              <View style={[styles.checkbox, child.is_complete === 1 && styles.checkboxChecked]} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.subtaskText, child.is_complete === 1 && styles.subtaskTextComplete]}
                >
                  {child.title}
                </Text>
                {renderMetaBadges(child)}
              </View>
              <TouchableOpacity
                style={styles.timerButton}
                onPress={() => goToFocus(child.id, child.title, child.est_minutes)}
>
                <Ionicons name="timer-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{projectName}</Text>
          <TouchableOpacity onPress={() => setEditMode((prev) => !prev)}>
            <Ionicons
              name={editMode ? 'checkmark-circle' : 'ellipsis-horizontal'}
              size={24}
              color="#F5F5F7"
            />
          </TouchableOpacity>
        </View>

        {topLevelSubtasks.length === 0 ? (
          <Text style={styles.subtitle}>No subtasks yet</Text>
        ) : (
          <FlatList
            data={topLevelSubtasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ marginTop: 16 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => renderTopLevelRow(item)}
          />
        )}

        {!editMode && (
          <View style={styles.addSection}>
            <TextInput
              style={styles.input}
              placeholder="Add a subtask..."
              placeholderTextColor="#A5ABB6"
              value={subtaskTitle}
              onChangeText={setSubtaskTitle}
            />
            <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={handleAddSubtask}>
              <Text style={styles.addButtonText}>+ Add Subtask</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  title: { color: '#F5F5F7', fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#A5ABB6', fontSize: 15, marginTop: 8 },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  childRow: { marginLeft: 24, backgroundColor: '#1F1F29' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  subtaskText: { color: '#F5F5F7', fontSize: 15 },
  subtaskTextComplete: { color: '#A5ABB6', textDecorationLine: 'line-through' },
  splitButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  splitButtonText: { color: '#F5F5F7', fontSize: 16, fontWeight: '600' },
  childAddRow: { flexDirection: 'row', marginLeft: 24, marginBottom: 10, gap: 8 },
  childInput: {
    flex: 1,
    backgroundColor: '#1F1F29',
    borderRadius: 10,
    padding: 10,
    color: '#F5F5F7',
    fontSize: 14,
  },
  childAddButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addSection: { marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 14,
    color: '#F5F5F7',
    fontSize: 15,
    marginBottom: 12,
  },
  addButton: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#F5F5F7', fontSize: 15, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeEasy: { backgroundColor: '#10B98133' },
  badgeMedium: { backgroundColor: '#F59E0B33' },
  badgeHard: { backgroundColor: '#F8717133' },
  badgeText: { color: '#F5F5F7', fontSize: 11, fontWeight: '600' },
  metaTime: { color: '#A5ABB6', fontSize: 12 },
  subtaskPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  reorderColumn: { justifyContent: 'center', alignItems: 'center', gap: 2, paddingTop: 4 },
  subtaskContent: { flex: 1 },
  subtaskTitleInput: { color: '#F5F5F7', fontSize: 15, paddingVertical: 2 },
  subtaskMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  difficultyPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
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
  timerButton: {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: colors.bgSurfaceRaised,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},
});