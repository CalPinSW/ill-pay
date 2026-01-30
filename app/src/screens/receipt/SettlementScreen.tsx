import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import {
  calculateBillBreakdown,
  BillBreakdown,
  DistributionOptions,
} from '@/services/billCalculationService';
import { useTheme } from '@/theme';
import { DistributionToggle, ParticipantCard } from '@/components/settlement';

interface SettlementScreenProps {
  receiptId: string;
  onBack: () => void;
}

export function SettlementScreen({ receiptId, onBack }: SettlementScreenProps) {
  const { colors } = useTheme();
  const [breakdown, setBreakdown] = useState<BillBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [distribution, setDistribution] = useState<DistributionOptions>({
    tip: 'proportional',
    tax: 'proportional',
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string>('Receipt');
  const [isSettling, setIsSettling] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<string>('draft');

  const handleMarkSettled = async () => {
    setIsSettling(true);
    try {
      await supabase.from('receipts').update({ status: 'settled' }).eq('id', receiptId);

      setReceiptStatus('settled');
    } catch (error) {
      console.error('Error settling receipt:', error);
    } finally {
      setIsSettling(false);
    }
  };

  const handleRestore = async () => {
    setIsSettling(true);
    try {
      await supabase.from('receipts').update({ status: 'active' }).eq('id', receiptId);

      setReceiptStatus('active');
    } catch (error) {
      console.error('Error restoring receipt:', error);
    } finally {
      setIsSettling(false);
    }
  };

  const isOwner = currentUserId === ownerId;
  const isSettled = receiptStatus === 'settled';

  const fetchBreakdown = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id || null);

      const { data: receipt } = await supabase
        .from('receipts')
        .select('restaurant_name, owner_id, status')
        .eq('id', receiptId)
        .single();

      setReceiptName(receipt?.restaurant_name || 'Receipt');
      setOwnerId(receipt?.owner_id || null);
      setReceiptStatus(receipt?.status || 'draft');

      const data = await calculateBillBreakdown(receiptId, distribution);
      setBreakdown(data);
    } catch (error) {
      console.error('Error fetching breakdown:', error);
    } finally {
      setIsLoading(false);
    }
  }, [receiptId, distribution]);

  useEffect(() => {
    if (breakdown) {
      setIsRefreshing(true);
    }
    fetchBreakdown().finally(() => setIsRefreshing(false));
  }, [fetchBreakdown]);

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!breakdown) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Failed to load bill breakdown
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchBreakdown}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Settlement
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchBreakdown}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.restaurantName, { color: colors.text }]}>{receiptName}</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(breakdown.subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tax</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(breakdown.tax)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tip</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(breakdown.tip)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatCurrency(breakdown.total)}
            </Text>
          </View>
        </View>

        {breakdown.unclaimed_total > 0 && (
          <View style={[styles.warningCard, { backgroundColor: colors.errorBackground }]}>
            <Text style={[styles.warningText, { color: colors.error }]}>
              ⚠️ {formatCurrency(breakdown.unclaimed_total)} in unclaimed items
            </Text>
            <Text style={[styles.warningSubtext, { color: colors.error }]}>
              Unclaimed items will be split equally among all participants
            </Text>
          </View>
        )}

        {(breakdown.tax > 0 || breakdown.tip > 0) && (
          <View
            style={[
              styles.distributionSection,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {breakdown.tax > 0 && (
              <DistributionToggle
                label="Tax:"
                value={distribution.tax}
                onChange={(value) => setDistribution((d) => ({ ...d, tax: value }))}
              />
            )}
            {breakdown.tip > 0 && (
              <View style={breakdown.tax === 0 && { marginBottom: 0 }}>
                <DistributionToggle
                  label="Tip:"
                  value={distribution.tip}
                  onChange={(value) => setDistribution((d) => ({ ...d, tip: value }))}
                />
              </View>
            )}
          </View>
        )}

        <View style={styles.participantsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Who Owes What</Text>
            {isRefreshing && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {breakdown.participants.map((participant) => (
            <ParticipantCard
              key={participant.user_id}
              displayName={participant.display_name}
              username={participant.username}
              avatarUrl={participant.avatar_url}
              isCurrentUser={participant.user_id === currentUserId}
              totalOwed={participant.total_owed}
              itemsTotal={participant.items_total}
              taxPortion={participant.tax_portion}
              tipPortion={participant.tip_portion}
              claimedItems={participant.claimed_items}
              formatCurrency={formatCurrency}
            />
          ))}

          {breakdown.participants.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items claimed yet
              </Text>
            </View>
          )}
        </View>

        {isOwner && (
          <View style={styles.actionsSection}>
            {isSettled ? (
              <TouchableOpacity
                style={[
                  styles.restoreButton,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
                onPress={handleRestore}
                disabled={isSettling}
              >
                {isSettling ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                    Restore Receipt
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.settleButton, { backgroundColor: colors.success }]}
                onPress={handleMarkSettled}
                disabled={isSettling}
              >
                {isSettling ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={[styles.settleButtonText, { color: colors.textInverse }]}>
                    Mark as Settled
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {isSettled && (
          <View style={[styles.settledBanner, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.settledBannerText, { color: colors.success }]}>
              ✓ This receipt has been settled
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 70,
  },
  headerButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  totalRow: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  distributionSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  participantsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  actionsSection: {
    padding: 16,
    paddingTop: 0,
  },
  settleButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  settleButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  restoreButton: {
    borderWidth: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  settledBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  settledBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
