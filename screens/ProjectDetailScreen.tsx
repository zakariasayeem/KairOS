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
import { addSubtask, getSubtasksForProject, toggleSubtaskComplete } from '../db/database';

type Subtask = {
    id: string;
    project_id: string;
    title: string;
    is_complete: number;
    order_index: number;
    created_at: string;
};

export default function ProjectDetailScreen() {
    const route = useRoute<any>();
    const { projectId, projectName } = route.params;

    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [subtaskTitle, setSubtaskTitle] = useState('');

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

    const handleToggle = (subtask: Subtask) => {
        toggleSubtaskComplete(subtask.id, subtask.is_complete === 0);
        loadSubtasks();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Text style={styles.title}>{projectName}</Text>

                {subtasks.length === 0 ? (
                    <Text style={styles.subtitle}>No subtasks yet</Text>
                ) : (
                    <FlatList
                        data={subtasks}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ marginTop: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.subtaskRow}
                                activeOpacity={0.7}
                                onPress={() => handleToggle(item)}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        item.is_complete === 1 && styles.checkboxChecked,
                                    ]}
                                />
                                <Text
                                    style={[
                                        styles.subtaskText,
                                        item.is_complete === 1 && styles.subtaskTextComplete,
                                    ]}
                                >
                                    {item.title}
                                </Text>
                            </TouchableOpacity>
                        )}
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
    subtaskText: { color: '#F5F5F7', fontSize: 15, flex: 1 },
    subtaskTextComplete: {
        color: '#A5ABB6',
        textDecorationLine: 'line-through',
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
});