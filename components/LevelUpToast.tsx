import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  level: number;
  onHide: () => void;
};

export default function LevelUpToast({ level, onHide }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onHide());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>Level {level}!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    zIndex: 100,
  },
  text: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});