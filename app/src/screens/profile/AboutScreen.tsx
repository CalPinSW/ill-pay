import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';

interface AboutScreenProps {
  onGoBack: () => void;
}

export function AboutScreen({ onGoBack }: AboutScreenProps) {
  const { colors } = useTheme();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || '1';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onGoBack} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <Text style={styles.appIcon}>🧾</Text>
          <Text style={[styles.appName, { color: colors.text }]}>I'll Pay</Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>Split bills with friends, effortlessly</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{appVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Build</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{buildNumber}</Text>
          </View>
        </View>

        <View style={styles.linksSection}>
          <TouchableOpacity 
            style={[styles.linkItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => Linking.openURL('https://github.com/CalPinSW/ill-pay')}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>View on GitHub</Text>
            <Text style={[styles.linkArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.copyright, { color: colors.textTertiary }]}>
          © {new Date().getFullYear()} I'll Pay. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    width: 70,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  linksSection: {
    width: '100%',
    marginBottom: 32,
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
  },
  linkArrow: {
    fontSize: 20,
    color: '#999',
  },
  copyright: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
