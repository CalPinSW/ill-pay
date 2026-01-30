import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface DistributionToggleProps {
  label: string;
  value: 'proportional' | 'equal';
  onChange: (value: 'proportional' | 'equal') => void;
}

export function DistributionToggle({ label, value, onChange }: DistributionToggleProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.toggleButtons, { backgroundColor: colors.backgroundTertiary }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            value === 'proportional' && { backgroundColor: colors.surface },
          ]}
          onPress={() => onChange('proportional')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleButtonText,
              { color: colors.textSecondary },
              value === 'proportional' && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            Proportional
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, value === 'equal' && { backgroundColor: colors.surface }]}
          onPress={() => onChange('equal')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleButtonText,
              { color: colors.textSecondary },
              value === 'equal' && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            Equal
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    width: 40,
  },
  toggleButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    flex: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonText: {
    fontSize: 14,
  },
});
