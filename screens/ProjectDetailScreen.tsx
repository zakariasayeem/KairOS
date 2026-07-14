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
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addSubtask, getSubtasksForProject, toggleSubtaskComplete } from '../db/database';

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

export default function ProjectDetailScreen() {
  const route = useRoute<any>();
  const { projectId, projectName } = route.params;

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [childTitle, setChildTitle] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const loadSubtasks = useCallback(() => {
    setSubtasks(getSubtasksForProject(projectId));
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      loadSubtasks();
    }, [loadSubtasks])
  );

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
      // Make sure this subtask is expanded so the input is visible
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const topLevelSubtasks = subtasks.filter((s) => s.parent_subtask_id === null);
  const getChildren = (parentId: string) =>
    subtasks.filter((s) => s.parent_subtask_id === parentId);

  const isParentComplete = (children: Subtask[]) => {
    if (children.length === 0) return null;
    return children.every((c) => c.is_complete === 1);
  };

  const renderTopLevelRow = (item: Subtask) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const parentComplete = isParentComplete(children);
    const isComplete = hasChildren ? parentComplete : item.is_complete === 1;
    const isCollapsed = collapsed.has(item.id);
    const isAddingChild = addingChildFor === item.id;

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
  {(item.difficulty || item.est_minutes) && (
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
      {item.est_minutes && (
        <Text style={styles.metaTime}>{item.est_minutes}m</Text>
      )}
    </View>
  )}
</View>
          <TouchableOpacity
            style={styles.splitButton}
            onPress={() => handleSplitPress(item.id)}
          >
            <Text style={styles.splitButtonText}>{isAddingChild ? '×' : '+'}</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.childAddButton}
              onPress={() => handleAddChild(item.id)}
            >
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
              <View
                style={[styles.checkbox, child.is_complete === 1 && styles.checkboxChecked]}
              />
              <Text
                style={[
                  styles.subtaskText,
                  child.is_complete === 1 && styles.subtaskTextComplete,
                ]}
              >
                {child.title}
              </Text>
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
        <Text style={styles.title}>{projectName}</Text>

        {topLevelSubtasks.length === 0 ? (
          <Text style={styles.subtitle}>No subtasks yet</Text>
        ) : (
          <FlatList
            data={topLevelSubtasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ marginTop: 16 }}
            renderItem={({ item }) => renderTopLevelRow(item)}
          />
        )}

        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            placeholder="Add a subtask..."
            placeholderTextColor="#A5ABB6"
            value={subtaskTitle}
            onChangeText={setSubtaskTitle}
          />
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={handleAddSubtask}
          >
            <Text style={styles.addButtonText}>+ Add Subtask</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  title: { color: '#F5F5F7', fontSize: 22, fontWeight: '600', marginTop: 16 },
  subtitle: { color: '#A5ABB6', fontSize: 15, marginTop: 8 },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  childRow: {
    marginLeft: 24,
    backgroundColor: '#1F1F29',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  subtaskText: { color: '#F5F5F7', fontSize: 15 },
  subtaskTextComplete: {
    color: '#A5ABB6',
    textDecorationLine: 'line-through',
  },
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
  childAddRow: {
    flexDirection: 'row',
    marginLeft: 24,
    marginBottom: 10,
    gap: 8,
  },
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
  addButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: { color: '#F5F5F7', fontSize: 15, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
difficultyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
badgeEasy: { backgroundColor: '#10B98133' },
badgeMedium: { backgroundColor: '#F59E0B33' },
badgeHard: { backgroundColor: '#F8717133' },
badgeText: { color: '#F5F5F7', fontSize: 11, fontWeight: '600' },
metaTime: { color: '#A5ABB6', fontSize: 12 },
});