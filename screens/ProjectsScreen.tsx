import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProjectsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Projects</Text>
      <Text style={styles.subtitle}>No projects yet</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  title: { color: '#F5F5F7', fontSize: 22, fontWeight: '600', marginTop: 16 },
  subtitle: { color: '#A5ABB6', fontSize: 15, marginTop: 8 },
});