import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

type Props = {
  rank: string;
  level: number;
  currentXp: number;
  xpRequired: number;
};

export default function RankBadge({ rank, level, currentXp, xpRequired }: Props) {
  const progress = Math.min(1, currentXp / xpRequired);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { borderColor: RANK_COLORS[rank] ?? colors.accentPrimary }]}>
        <Text style={[styles.rankText, { color: RANK_COLORS[rank] ?? colors.accentPrimary }]}>
          {rank}
        </Text>
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.levelText}>Level {level}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
  },
  rankText: { fontSize: 13, fontWeight: '700' },
  progressInfo: { justifyContent: 'center' },
  levelText: { color: colors.textSecondary, fontSize: 11, marginBottom: 3 },
  progressBarBg: {
    width: 70,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentPrimary,
    borderRadius: radius.pill,
  },
});