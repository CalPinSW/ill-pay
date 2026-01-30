import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/theme';

interface ClaimedItem {
  name: string;
  quantity: number;
}

interface ParticipantCardProps {
  displayName: string | null;
  username: string | null;
  avatarUrl?: string | null;
  isCurrentUser: boolean;
  totalOwed: number;
  itemsTotal: number;
  taxPortion: number;
  tipPortion: number;
  claimedItems: ClaimedItem[];
  formatCurrency: (amount: number) => string;
}

export function ParticipantCard({
  displayName,
  username,
  avatarUrl,
  isCurrentUser,
  totalOwed,
  itemsTotal,
  taxPortion,
  tipPortion,
  claimedItems,
  formatCurrency,
}: ParticipantCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        isCurrentUser && { borderWidth: 2, borderColor: colors.primary },
      ]}
    >
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.textInverse }]}>
              {(displayName || username || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>
            {displayName || username}
            {isCurrentUser && ' (You)'}
          </Text>
        </View>
        <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(totalOwed)}</Text>
      </View>

      <View style={[styles.breakdown, { borderTopColor: colors.border }]}>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Items</Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {formatCurrency(itemsTotal)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Tax</Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {formatCurrency(taxPortion)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Tip</Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {formatCurrency(tipPortion)}
          </Text>
        </View>
      </View>

      {claimedItems.length > 0 && (
        <View style={[styles.claimedItems, { borderTopColor: colors.border }]}>
          {claimedItems.map((item, idx) => (
            <Text key={idx} style={[styles.claimedItem, { color: colors.textSecondary }]}>
              • {item.name} × {item.quantity}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  breakdown: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 14,
  },
  claimedItems: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  claimedItem: {
    fontSize: 13,
    paddingVertical: 2,
  },
});
