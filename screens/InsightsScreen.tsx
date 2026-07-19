import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getFocusStats } from '../db/database';
import { colors, radius } from '../theme/tokens';

type Range = 'day' | 'week';

function getRangeStart(range: Range): string {
  const now = new Date();
  if (range === 'day') {
    now.setHours(0, 0, 0, 0);
  } else {
    now.setDate(now.getDate() - 7);
  }
  return now.toISOString();
}

export default function InsightsScreen() {
  const [range, setRange] = useState<Range>('day');
  const [stats, setStats] = useState(getFocusStats(getRangeStart('day')));

  useFocusEffect(
    useCallback(() => {
      setStats(getFocusStats(getRangeStart(range)));
    }, [range])
  );

  const hasData = stats.totalSessions > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Insights</Text>

      <View style={styles.rangeRow}>
        <TouchableOpacity
          style={[styles.rangeButton, range === 'day' && styles.rangeButtonActive]}
          onPress={() => setRange('day')}
        >
          <Text style={styles.rangeText}>Day</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeButton, range === 'week' && styles.rangeButtonActive]}
          onPress={() => setRange('week')}
        >
          <Text style={styles.rangeText}>Week</Text>
        </TouchableOpacity>
      </View>

      {!hasData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Complete your first Focus session to see insights here
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{stats.totalSessions}</Text>
            <Text style={styles.cardLabel}>Total Sessions</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{stats.totalMinutes}m</Text>
            <Text style={styles.cardLabel}>Total Time</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{stats.avgMinutes}m</Text>
            <Text style={styles.cardLabel}>Avg. Per Session</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{stats.bestMinutes}m</Text>
            <Text style={styles.cardLabel}>Best Session</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: 16 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '600', marginTop: 16, marginBottom: 16 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  rangeButton: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  rangeButtonActive: { backgroundColor: colors.accentPrimary },
  rangeText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    padding: 16,
    width: '47%',
  },
  cardValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  cardLabel: { color: colors.textSecondary, fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
});