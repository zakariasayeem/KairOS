import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRankProgress, getRecentXPEvents } from '../db/database';
import { colors, radius } from '../theme/tokens';

const RANK_COLORS: Record<string, string> = {
  D: '#9CA3AF',
  C: '#CD7F32',
  B: '#C0C0C0',
  A: '#FFD700',
  S: '#8B5CF6',
  SS: '#EC4899',
  Legend: '#F59E0B',
};

function describeSource(source: string): string {
  if (source.startsWith('subtask_complete')) return 'Subtask completed';
  if (source === 'focus_session') return 'Focus session';
  return source;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [rankProgress, setRankProgress] = useState(getRankProgress());
  const [events, setEvents] = useState(getRecentXPEvents());

  useFocusEffect(
    useCallback(() => {
      setRankProgress(getRankProgress());
      setEvents(getRecentXPEvents());
    }, [])
  );

  const progress = Math.min(1, rankProgress.currentXp / rankProgress.xpRequired);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.rankCard}>
        <View
          style={[
            styles.rankCircle,
            { borderColor: RANK_COLORS[rankProgress.rank] ?? colors.accentPrimary },
          ]}
        >
          <Text
            style={[
              styles.rankLetter,
              { color: RANK_COLORS[rankProgress.rank] ?? colors.accentPrimary },
            ]}
          >
            {rankProgress.rank}
          </Text>
        </View>
        <Text style={styles.levelText}>Level {rankProgress.level}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.xpText}>
          {rankProgress.currentXp} / {rankProgress.xpRequired} XP to next level
        </Text>
        <Text style={styles.lifetimeText}>
          {rankProgress.totalLifetimeXp} total lifetime XP
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Recent Activity</Text>
      {events.length === 0 ? (
        <Text style={styles.emptyText}>Complete a focus session or subtask to see activity here</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.eventRow}>
              <Text style={styles.eventSource}>{describeSource(item.source)}</Text>
              <Text style={styles.eventAmount}>+{item.amount} XP</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  rankCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  rankCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  rankLetter: { fontSize: 24, fontWeight: '700' },
  levelText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurfaceRaised,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: { height: '100%', backgroundColor: colors.accentPrimary, borderRadius: radius.pill },
  xpText: { color: colors.textSecondary, fontSize: 13 },
  lifetimeText: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  sectionLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  eventSource: { color: colors.textPrimary, fontSize: 14 },
  eventAmount: { color: colors.progressHigh, fontSize: 14, fontWeight: '600' },
});