import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllProjects } from '../db/database';

type Project = {
  id: string;
  name: string;
  color: string;
  due_date: string | null;
  status: string;
  created_at: string;
};

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      setProjects(getAllProjects());
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Projects</Text>

      {projects.length === 0 ? (
        <Text style={styles.subtitle}>No projects yet</Text>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ marginTop: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ProjectDetail', {
                  projectId: item.id,
                  projectName: item.name,
                })
              }
            >
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.cardTitle}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  title: { color: '#F5F5F7', fontSize: 22, fontWeight: '600', marginTop: 16 },
  subtitle: { color: '#A5ABB6', fontSize: 15, marginTop: 8 },
  card: {
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  cardTitle: { color: '#F5F5F7', fontSize: 16, fontWeight: '600' },
});