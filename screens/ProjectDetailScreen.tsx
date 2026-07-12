import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

export default function ProjectDetailScreen() {
  const route = useRoute<any>();
  const { projectId, projectName } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{projectName}</Text>
      <Text style={styles.subtitle}>Project ID: {projectId}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  title: { color: '#F5F5F7', fontSize: 22, fontWeight: '600', marginTop: 16 },
  subtitle: { color: '#A5ABB6', fontSize: 15, marginTop: 8 },
});