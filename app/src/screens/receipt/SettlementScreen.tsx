import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { 
  calculateBillBreakdown, 
  BillBreakdown, 
  DistributionType,
  DistributionOptions,
} from '@/services/billCalculationService';

interface SettlementScreenProps {
  receiptId: string;
  onBack: () => void;
}

export function SettlementScreen({ receiptId, onBack }: SettlementScreenProps) {
  const [breakdown, setBreakdown] = useState<BillBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [distribution, setDistribution] = useState<DistributionOptions>({ 
    tip: 'proportional', 
    tax: 'proportional' 
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string>('Receipt');
  const [isSettling, setIsSettling] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<string>('draft');

  const handleMarkSettled = async () => {
    setIsSettling(true);
    try {
      await supabase
        .from('receipts')
        .update({ status: 'settled' })
        .eq('id', receiptId);
      
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
      await supabase
        .from('receipts')
        .update({ status: 'active' })
        .eq('id', receiptId);
      
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!breakdown) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load bill breakdown</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBreakdown}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Settlement</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchBreakdown} />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.restaurantName}>{receiptName}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(breakdown.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(breakdown.tax)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip</Text>
            <Text style={styles.summaryValue}>{formatCurrency(breakdown.tip)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(breakdown.total)}</Text>
          </View>
        </View>

        {breakdown.unclaimed_total > 0 && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ {formatCurrency(breakdown.unclaimed_total)} in unclaimed items
            </Text>
            <Text style={styles.warningSubtext}>
              Unclaimed items will be split equally among all participants
            </Text>
          </View>
        )}

        {(breakdown.tax > 0 || breakdown.tip > 0) && (
          <View style={styles.distributionSection}>
            {breakdown.tax > 0 && (
              <View style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>Tax:</Text>
                <View style={styles.toggleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      distribution.tax === 'proportional' && styles.toggleButtonActive
                    ]}
                    onPress={() => setDistribution(d => ({ ...d, tax: 'proportional' }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      distribution.tax === 'proportional' && styles.toggleButtonTextActive
                    ]}>Proportional</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      distribution.tax === 'equal' && styles.toggleButtonActive
                    ]}
                    onPress={() => setDistribution(d => ({ ...d, tax: 'equal' }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      distribution.tax === 'equal' && styles.toggleButtonTextActive
                    ]}>Equal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {breakdown.tip > 0 && (
              <View style={[styles.distributionRow, breakdown.tax === 0 && { marginBottom: 0 }]}>
                <Text style={styles.distributionLabel}>Tip:</Text>
                <View style={styles.toggleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      distribution.tip === 'proportional' && styles.toggleButtonActive
                    ]}
                    onPress={() => setDistribution(d => ({ ...d, tip: 'proportional' }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      distribution.tip === 'proportional' && styles.toggleButtonTextActive
                    ]}>Proportional</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      distribution.tip === 'equal' && styles.toggleButtonActive
                    ]}
                    onPress={() => setDistribution(d => ({ ...d, tip: 'equal' }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      distribution.tip === 'equal' && styles.toggleButtonTextActive
                    ]}>Equal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.participantsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Who Owes What</Text>
            {isRefreshing && <ActivityIndicator size="small" color="#007AFF" />}
          </View>
          
          {breakdown.participants.map((participant) => (
            <View 
              key={participant.user_id} 
              style={[
                styles.participantCard,
                participant.user_id === currentUserId && styles.participantCardHighlight
              ]}
            >
              <View style={styles.participantHeader}>
                {participant.avatar_url ? (
                  <Image 
                    source={{ uri: participant.avatar_url }} 
                    style={styles.participantAvatar} 
                  />
                ) : (
                  <View style={styles.participantAvatarPlaceholder}>
                    <Text style={styles.participantAvatarText}>
                      {(participant.display_name || participant.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {participant.display_name || participant.username}
                    {participant.user_id === currentUserId && ' (You)'}
                  </Text>
                </View>
                <Text style={styles.participantTotal}>
                  {formatCurrency(participant.total_owed)}
                </Text>
              </View>

              <View style={styles.participantBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Items</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(participant.items_total)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(participant.tax_portion)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tip</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(participant.tip_portion)}
                  </Text>
                </View>
              </View>

              {participant.claimed_items.length > 0 && (
                <View style={styles.claimedItems}>
                  {participant.claimed_items.map((item, idx) => (
                    <Text key={idx} style={styles.claimedItem}>
                      • {item.name} × {item.quantity}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}

          {breakdown.participants.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items claimed yet</Text>
            </View>
          )}
        </View>

        {isOwner && (
          <View style={styles.actionsSection}>
            {isSettled ? (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isSettling}
              >
                {isSettling ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Text style={styles.restoreButtonText}>Restore Receipt</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.settleButton}
                onPress={handleMarkSettled}
                disabled={isSettling}
              >
                {isSettling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.settleButtonText}>Mark as Settled</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {isSettled && (
          <View style={styles.settledBanner}>
            <Text style={styles.settledBannerText}>✓ This receipt has been settled</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
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
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    marginTop: 4,
  },
  distributionSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  distributionLabel: {
    fontSize: 14,
    color: '#666',
    width: 40,
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: '#eee',
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
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
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
    color: '#1a1a1a',
  },
  participantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  participantCardHighlight: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  participantTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  participantBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  claimedItems: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  claimedItem: {
    fontSize: 13,
    color: '#666',
    paddingVertical: 2,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  actionsSection: {
    padding: 16,
    paddingTop: 0,
  },
  settleButton: {
    backgroundColor: '#34c759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  settleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  restoreButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  settledBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    alignItems: 'center',
  },
  settledBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
});
