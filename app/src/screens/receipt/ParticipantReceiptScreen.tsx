import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { claimItem, unclaimItem, getItemClaims } from '@/services/claimService';

interface ParticipantReceiptScreenProps {
  receiptId: string;
  onBack: () => void;
}

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Claim {
  id: string;
  item_id: string;
  user_id: string;
  quantity: number;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Receipt {
  id: string;
  restaurant_name: string | null;
  receipt_date: string | null;
  total: number | null;
  owner_id: string;
}

export function ParticipantReceiptScreen({ receiptId, onBack }: ParticipantReceiptScreenProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id || null);

      const { data: receiptData } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();
      setReceipt(receiptData);

      const { data: itemsData } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receiptId)
        .order('created_at');
      setItems(itemsData || []);

      const claimsData = await getItemClaims(receiptId);
      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`claims:${receiptId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'item_claims' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [receiptId, fetchData]);

  const getClaimsForItem = (itemId: string) => {
    return claims.filter(c => c.item_id === itemId);
  };

  const getMyClaimForItem = (itemId: string) => {
    return claims.find(c => c.item_id === itemId && c.user_id === currentUserId);
  };

  const getTotalClaimedForItem = (itemId: string) => {
    return claims
      .filter(c => c.item_id === itemId)
      .reduce((sum, c) => sum + c.quantity, 0);
  };

  const handleClaim = async (item: ReceiptItem) => {
    const myClaim = getMyClaimForItem(item.id);
    const totalClaimed = getTotalClaimedForItem(item.id);
    const myQuantity = myClaim?.quantity || 0;
    const availableForMe = item.quantity - totalClaimed + myQuantity;

    if (availableForMe <= 0 && !myClaim) {
      Alert.alert('Fully Claimed', 'This item has been fully claimed by others.');
      return;
    }

    setClaimingItemId(item.id);
    try {
      if (myClaim) {
        if (myClaim.quantity >= availableForMe) {
          await unclaimItem(item.id);
        } else {
          await claimItem(item.id, myClaim.quantity + 1);
        }
      } else {
        await claimItem(item.id, 1);
      }
      await fetchData();
    } catch (error) {
      console.error('Error claiming item:', error);
      Alert.alert('Error', 'Failed to update claim');
    } finally {
      setClaimingItemId(null);
    }
  };

  const handleUnclaim = async (itemId: string) => {
    const myClaim = getMyClaimForItem(itemId);
    if (!myClaim) return;

    setClaimingItemId(itemId);
    try {
      if (myClaim.quantity > 1) {
        await claimItem(itemId, myClaim.quantity - 1);
      } else {
        await unclaimItem(itemId);
      }
      await fetchData();
    } catch (error) {
      console.error('Error unclaiming:', error);
      Alert.alert('Error', 'Failed to update claim');
    } finally {
      setClaimingItemId(null);
    }
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const renderItem = (item: ReceiptItem) => {
    const itemClaims = getClaimsForItem(item.id);
    const myClaim = getMyClaimForItem(item.id);
    const totalClaimed = getTotalClaimedForItem(item.id);
    const isFullyClaimed = totalClaimed >= item.quantity;
    const isClaiming = claimingItemId === item.id;

    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>
              {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
            </Text>
          </View>
          <View style={styles.claimStatus}>
            <Text style={[
              styles.claimCount,
              isFullyClaimed && styles.claimCountFull
            ]}>
              {totalClaimed}/{item.quantity}
            </Text>
          </View>
        </View>

        {itemClaims.length > 0 && (
          <View style={styles.claimsList}>
            {itemClaims.map(claim => (
              <View key={claim.id} style={styles.claimBadge}>
                <Text style={[
                  styles.claimBadgeText,
                  claim.user_id === currentUserId && styles.myClaimBadgeText
                ]}>
                  {claim.profile?.display_name || claim.profile?.username || 'Unknown'}
                  {claim.quantity > 1 && ` (${claim.quantity})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.claimActions}>
          {myClaim && (
            <TouchableOpacity
              style={styles.unclaimButton}
              onPress={() => handleUnclaim(item.id)}
              disabled={isClaiming}
            >
              <Text style={styles.unclaimButtonText}>−</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.claimButton,
              myClaim && styles.claimButtonActive,
              isFullyClaimed && !myClaim && styles.claimButtonDisabled,
            ]}
            onPress={() => handleClaim(item)}
            disabled={isClaiming || (isFullyClaimed && !myClaim)}
          >
            {isClaiming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.claimButtonText}>
                {myClaim ? `+` : 'Claim'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {receipt?.restaurant_name || 'Receipt'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchData} />
        }
      >
        <Text style={styles.instructions}>
          Tap items to claim what you ordered
        </Text>

        {items.map(renderItem)}

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Your Claims</Text>
          {claims.filter(c => c.user_id === currentUserId).length === 0 ? (
            <Text style={styles.noClaims}>You haven't claimed any items yet</Text>
          ) : (
            <View style={styles.myClaimsList}>
              {items
                .filter(item => getMyClaimForItem(item.id))
                .map(item => {
                  const myClaim = getMyClaimForItem(item.id)!;
                  const myTotal = (item.unit_price * myClaim.quantity);
                  return (
                    <View key={item.id} style={styles.myClaimRow}>
                      <Text style={styles.myClaimName}>
                        {item.name} × {myClaim.quantity}
                      </Text>
                      <Text style={styles.myClaimTotal}>
                        {formatCurrency(myTotal)}
                      </Text>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
  },
  instructions: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f8f9fa',
  },
  itemCard: {
    margin: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  claimStatus: {
    marginLeft: 12,
  },
  claimCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  claimCountFull: {
    color: '#4caf50',
  },
  claimsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  claimBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  claimBadgeText: {
    fontSize: 12,
    color: '#1976d2',
  },
  myClaimBadgeText: {
    fontWeight: '600',
  },
  claimActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  claimButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  claimButtonActive: {
    backgroundColor: '#4caf50',
  },
  claimButtonDisabled: {
    backgroundColor: '#ccc',
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  unclaimButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  unclaimButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  summarySection: {
    margin: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  noClaims: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  myClaimsList: {
    gap: 8,
  },
  myClaimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  myClaimName: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  myClaimTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
