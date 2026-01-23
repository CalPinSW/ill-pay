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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { claimItem, unclaimItem, getItemClaims, splitItemBetweenUsers } from '@/services/claimService';

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

interface Participant {
  user_id: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
}

export function ParticipantReceiptScreen({ receiptId, onBack }: ParticipantReceiptScreenProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitItem, setSplitItem] = useState<ReceiptItem | null>(null);
  const [selectedSplitUsers, setSelectedSplitUsers] = useState<string[]>([]);

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

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('receipt_participants')
        .select(`
          user_id,
          profile:profiles(id, username, display_name)
        `)
        .eq('receipt_id', receiptId);
      
      // Also include the owner
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', receiptData?.owner_id)
        .single();

      const allParticipants: Participant[] = [];
      if (ownerData) {
        allParticipants.push({ user_id: ownerData.id, profile: ownerData });
      }
      (participantsData || []).forEach((p: any) => {
        const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
        if (profile && !allParticipants.find(ap => ap.user_id === p.user_id)) {
          allParticipants.push({ user_id: p.user_id, profile });
        }
      });
      setParticipants(allParticipants);
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

  const getUnclaimedItems = () => {
    return items.filter(item => {
      const totalClaimed = getTotalClaimedForItem(item.id);
      return totalClaimed < item.quantity;
    });
  };

  const handleClaimTheRest = async () => {
    const unclaimedItems = getUnclaimedItems();
    if (unclaimedItems.length === 0) {
      Alert.alert('All Claimed', 'All items have already been claimed.');
      return;
    }

    setClaimingItemId('all');
    try {
      for (const item of unclaimedItems) {
        const totalClaimed = getTotalClaimedForItem(item.id);
        const myClaim = getMyClaimForItem(item.id);
        const remaining = item.quantity - totalClaimed;
        
        if (remaining > 0) {
          const newQuantity = (myClaim?.quantity || 0) + remaining;
          await claimItem(item.id, newQuantity);
        }
      }
      await fetchData();
    } catch (error) {
      console.error('Error claiming items:', error);
      Alert.alert('Error', 'Failed to claim items');
    } finally {
      setClaimingItemId(null);
    }
  };

  const openSplitModal = (item: ReceiptItem) => {
    setSplitItem(item);
    // Pre-select users who already have claims on this item
    const existingClaimUserIds = getClaimsForItem(item.id).map(c => c.user_id);
    if (existingClaimUserIds.length > 0) {
      setSelectedSplitUsers(existingClaimUserIds);
    } else {
      // Default to current user if no existing claims
      setSelectedSplitUsers(currentUserId ? [currentUserId] : []);
    }
    setSplitModalVisible(true);
  };

  const handleSplit = async () => {
    if (!splitItem || selectedSplitUsers.length < 2) {
      Alert.alert('Select Friends', 'Please select at least 2 people to split with.');
      return;
    }

    setClaimingItemId(splitItem.id);
    setSplitModalVisible(false);
    
    try {
      await splitItemBetweenUsers(splitItem.id, selectedSplitUsers);
      await fetchData();
    } catch (error) {
      console.error('Error splitting item:', error);
      Alert.alert('Error', 'Failed to split item');
    } finally {
      setClaimingItemId(null);
      setSplitItem(null);
      setSelectedSplitUsers([]);
    }
  };

  const toggleSplitUser = (userId: string) => {
    setSelectedSplitUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatQuantity = (qty: number) => {
    if (qty === 1) return '';
    if (qty === 0.5) return '½';
    if (qty === 0.25) return '¼';
    if (qty === 0.333 || qty.toFixed(2) === '0.33') return '⅓';
    if (Number.isInteger(qty)) return `(${qty})`;
    return `(${(qty * 100).toFixed(0)}%)`;
  };

  const renderItem = (item: ReceiptItem) => {
    const itemClaims = getClaimsForItem(item.id);
    const myClaim = getMyClaimForItem(item.id);
    const totalClaimed = getTotalClaimedForItem(item.id);
    const isFullyClaimed = totalClaimed >= item.quantity;
    const isClaiming = claimingItemId === item.id;
    const isClaimedByOthersOnly = isFullyClaimed && !myClaim;

    return (
      <View key={item.id} style={[styles.itemCard, isClaimedByOthersOnly && styles.itemCardDimmed]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, isClaimedByOthersOnly && styles.itemNameDimmed]}>{item.name}</Text>
            <Text style={[styles.itemPrice, isClaimedByOthersOnly && styles.itemPriceDimmed]}>
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
                  {claim.quantity !== 1 && ` ${formatQuantity(claim.quantity)}`}
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
            style={styles.splitButton}
            onPress={() => openSplitModal(item)}
            disabled={isClaiming}
          >
            <Text style={styles.splitButtonText}>Split</Text>
          </TouchableOpacity>
          
          {!isFullyClaimed && (
            <TouchableOpacity
              style={[
                styles.claimButton,
                myClaim && styles.claimButtonActive,
              ]}
              onPress={() => handleClaim(item)}
              disabled={isClaiming}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.claimButtonText}>
                  {myClaim ? `+` : 'Claim'}
                </Text>
              )}
            </TouchableOpacity>
          )}
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
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
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

        {getUnclaimedItems().length > 0 && (
          <TouchableOpacity
            style={styles.claimRestButton}
            onPress={handleClaimTheRest}
            disabled={claimingItemId === 'all'}
          >
            {claimingItemId === 'all' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.claimRestButtonText}>Claim All Remaining Items</Text>
            )}
          </TouchableOpacity>
        )}

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

      <Modal
        visible={splitModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSplitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Split Item</Text>
            <Text style={styles.modalSubtitle}>
              {splitItem?.name} - {splitItem && formatCurrency(splitItem.unit_price)}
            </Text>
            
            <Text style={styles.modalLabel}>Select who to split with:</Text>
            
            <ScrollView style={styles.participantList}>
              {participants.map(p => (
                <TouchableOpacity
                  key={p.user_id}
                  style={[
                    styles.participantItem,
                    selectedSplitUsers.includes(p.user_id) && styles.participantItemSelected
                  ]}
                  onPress={() => toggleSplitUser(p.user_id)}
                >
                  <Text style={[
                    styles.participantName,
                    selectedSplitUsers.includes(p.user_id) && styles.participantNameSelected
                  ]}>
                    {p.profile?.display_name || p.profile?.username}
                    {p.user_id === currentUserId && ' (You)'}
                  </Text>
                  {selectedSplitUsers.includes(p.user_id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedSplitUsers.length >= 2 && splitItem && (
              <Text style={styles.splitPreview}>
                Each person pays: {formatCurrency(splitItem.unit_price / selectedSplitUsers.length)}
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSplitModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  selectedSplitUsers.length < 2 && styles.modalConfirmDisabled
                ]}
                onPress={handleSplit}
                disabled={selectedSplitUsers.length < 2}
              >
                <Text style={styles.modalConfirmText}>Split</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
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
  claimRestButton: {
    backgroundColor: '#4caf50',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimRestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  itemCardDimmed: {
    opacity: 0.5,
    backgroundColor: '#f8f8f8',
  },
  itemNameDimmed: {
    color: '#999',
  },
  itemPriceDimmed: {
    color: '#bbb',
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
  splitButton: {
    backgroundColor: '#9c27b0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  splitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  participantList: {
    maxHeight: 200,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  participantItemSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  participantName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  participantNameSelected: {
    fontWeight: '600',
    color: '#2e7d32',
  },
  checkmark: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  splitPreview: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9c27b0',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#9c27b0',
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    backgroundColor: '#ccc',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
