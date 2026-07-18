import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
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
  visible: boolean;
  rank: string;
  onDismiss: () => void;
};

export default function RankUpModal({ visible, rank, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.7);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    }
  }, [visible]);

  const rankColor = RANK_COLORS[rank] ?? colors.accentPrimary;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.badge, { borderColor: rankColor }]}>
            <Text style={[styles.badgeText, { color: rankColor }]}>{rank}</Text>
          </View>
          <Text style={styles.title}>{rank} RANK</Text>
          <Text style={styles.subtitle}>You've reached a new rank. Keep going.</Text>
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sheet,
    padding: 32,
    alignItems: 'center',
    width: '80%',
  },
  badge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeText: { fontSize: 36, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: colors.accentPrimary,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});