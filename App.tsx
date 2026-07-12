import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>KairOS</Text>
        <View style={styles.iconPlaceholder} />
      </View>

      {/* What's Next Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What's Next</Text>
        <Text style={styles.cardBody}>No tasks yet</Text>
      </View>

      {/* Bottom CTA */}
      <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
        <Text style={styles.ctaText}>+ Break down a new goal</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  appName: {
    color: '#F5F5F7',
    fontSize: 22,
    fontWeight: '600',
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16161D',
  },
  card: {
    backgroundColor: '#16161D',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  cardTitle: {
    color: '#F5F5F7',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    color: '#A5ABB6',
    fontSize: 15,
  },
  ctaButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaText: {
    color: '#F5F5F7',
    fontSize: 15,
    fontWeight: '600',
  },
});