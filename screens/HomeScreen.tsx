import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addProject } from '../db/database';

export default function HomeScreen() {
  const [projectName, setProjectName] = useState('');

  const handleAddProject = () => {
    if (projectName.trim().length === 0) return;
    addProject(projectName.trim(), '#6C5CE7');
    setProjectName('');
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What's Next</Text>
          <Text style={styles.cardBody}>No tasks yet</Text>
        </View>

        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            placeholder="Name your goal..."
            placeholderTextColor="#A5ABB6"
            value={projectName}
            onChangeText={setProjectName}
          />
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={handleAddProject}
          >
            <Text style={styles.ctaText}>+ Break down a new goal</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', paddingHorizontal: 16, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  appName: { color: '#F5F5F7', fontSize: 22, fontWeight: '600' },
  iconPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16161D' },
  card: { backgroundColor: '#16161D', borderRadius: 12, padding: 16, marginTop: 24 },
  cardTitle: { color: '#F5F5F7', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  cardBody: { color: '#A5ABB6', fontSize: 15 },
  addSection: { marginBottom: 24 },
  input: {
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 14,
    color: '#F5F5F7',
    fontSize: 15,
    marginBottom: 12,
  },
  ctaButton: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#F5F5F7', fontSize: 15, fontWeight: '600' },
});