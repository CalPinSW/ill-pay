import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { activateAndShareReceipt, getReceiptParticipants } from '@/services/sharingService';
import { QRCodeShare } from '@/components/QRCodeShare';
import { getItemClaims } from '@/services/claimService';

interface ReceiptDetailScreenProps {
  receiptId: string;
  onBack: () => void;
  onInviteFriends: (receiptId: string) => void;
  onClaimItems: (receiptId: string) => void;
  onViewSettlement: (receiptId: string) => void;
}

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ItemClaim {
  item_id: string;
  quantity: number;
}

interface Participant {
  user_id: string;
  joined_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  isOwner?: boolean;
}

interface Receipt {
  id: string;
  restaurant_name: string | null;
  receipt_date: string | null;
  subtotal: number | null;
  tax: number | null;
  tip_amount: number | null;
  total: number | null;
  share_code: string | null;
  status: string;
  owner_id: string;
  image_url?: string | null;
}

export function ReceiptDetailScreen({ receiptId, onBack, onInviteFriends, onClaimItems, onViewSettlement }: ReceiptDetailScreenProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const pinchInProgressRef = useRef(false);

  const fetchReceipt = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id || null);

      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (receiptError) throw receiptError;
      setReceipt(receiptData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receiptId)
        .order('created_at');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      const claimsData = await getItemClaims(receiptId);
      setClaims((claimsData || []).map((claim: any) => ({ item_id: claim.item_id, quantity: claim.quantity })));

      // Get owner profile
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', receiptData.owner_id)
        .single();

      const participantsData = await getReceiptParticipants(receiptId);
      const mappedParticipants = (participantsData || []).map((p: any) => ({
        user_id: p.user_id,
        joined_at: p.joined_at,
        profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
        isOwner: false,
      }));

      // Add owner as first participant
      const allParticipants = [
        {
          user_id: receiptData.owner_id,
          joined_at: receiptData.created_at,
          profile: ownerProfile,
          isOwner: true,
        },
        ...mappedParticipants.filter((p: any) => p.user_id !== receiptData.owner_id),
      ];
      setParticipants(allParticipants);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      Alert.alert('Error', 'Failed to load receipt');
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  const handleShare = async () => {
    if (!receipt) return;

    setIsSharing(true);
    try {
      let shareCode = receipt.share_code;
      
      if (!shareCode) {
        shareCode = await activateAndShareReceipt(receiptId);
        setReceipt({ ...receipt, share_code: shareCode, status: 'active' });
      }

      setShowQRCode(true);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share receipt');
    } finally {
      setIsSharing(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return `£${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isOwner = currentUserId === receipt?.owner_id;
  const allItemsClaimed =
    items.length > 0 &&
    items.every((item) => {
      const claimedQty = claims
        .filter((claim) => claim.item_id === item.id)
        .reduce((sum, claim) => sum + claim.quantity, 0);
      return claimedQty >= item.quantity;
    });

  const claimButtonStyles = allItemsClaimed ? styles.secondaryButton : styles.primaryButton;
  const claimButtonTextStyles = allItemsClaimed ? styles.secondaryButtonText : styles.primaryButtonText;
  const settlementButtonStyles = allItemsClaimed ? styles.primaryButton : styles.secondaryButton;
  const settlementButtonTextStyles = allItemsClaimed ? styles.primaryButtonText : styles.secondaryButtonText;

  const handleReceiptModalPress = () => {
    if (!pinchInProgressRef.current) {
      setIsImageModalVisible(false);
    }
  };

  const handleOverlayTouchStart = (event: any) => {
    if (event.nativeEvent.touches?.length > 1) {
      pinchInProgressRef.current = true;
    }
  };

  const handleOverlayTouchEnd = (event: any) => {
    if (!event.nativeEvent.touches || event.nativeEvent.touches.length <= 1) {
      pinchInProgressRef.current = false;
    }
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

  if (!receipt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Receipt not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {receipt.restaurant_name || 'Receipt'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchReceipt} />
        }
      >
        <View style={styles.receiptHeader}>
          <View style={styles.receiptHeaderTop}>
            <View style={styles.receiptHeaderInfo}>
              <Text style={styles.restaurantName}>
                {receipt.restaurant_name || 'Unknown Restaurant'}
              </Text>
              <Text style={styles.receiptDate}>{formatDate(receipt.receipt_date)}</Text>
            </View>

            {receipt.image_url && (
              <TouchableOpacity
                style={styles.receiptImagePreview}
                activeOpacity={0.8}
                onPress={() => setIsImageModalVisible(true)}
              >
                <Image source={{ uri: receipt.image_url }} style={styles.receiptImage} />
                <View style={styles.receiptImageOverlay}>
                  <Text style={styles.receiptImageOverlayText}>Tap to view</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {receipt.share_code && (
            <View style={styles.shareCodeContainer}>
              <Text style={styles.shareCodeLabel}>Share Code</Text>
              <Text style={styles.shareCode}>{receipt.share_code}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} × {formatCurrency(item.unit_price)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          {receipt.subtotal && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(receipt.subtotal)}</Text>
            </View>
          )}
          {receipt.tax && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(receipt.tax)}</Text>
            </View>
          )}
          {receipt.tip_amount && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tip</Text>
              <Text style={styles.totalValue}>{formatCurrency(receipt.tip_amount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(receipt.total)}</Text>
          </View>
        </View>

        {participants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {participants.map((p) => (
              <View key={p.user_id} style={styles.participantRow}>
                {p.profile?.avatar_url ? (
                  <Image 
                    source={{ uri: p.profile.avatar_url }} 
                    style={[styles.avatarImage, p.isOwner && styles.ownerAvatarBorder]} 
                  />
                ) : (
                  <View style={[styles.avatar, p.isOwner && styles.ownerAvatar]}>
                    <Text style={styles.avatarText}>
                      {(p.profile?.display_name || p.profile?.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {p.profile?.display_name || p.profile?.username || 'Unknown'}
                  </Text>
                  {p.isOwner && <Text style={styles.ownerBadge}>Owner</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.actionsSection}>
          <TouchableOpacity
            style={claimButtonStyles}
            onPress={() => onClaimItems(receiptId)}
          >
            <Text style={claimButtonTextStyles}>{allItemsClaimed ? 'Edit Claimed Items' : 'Claim Items'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={settlementButtonStyles}
            onPress={() => onViewSettlement(receiptId)}
          >
            <Text style={settlementButtonTextStyles}>View Settlement</Text>
          </TouchableOpacity>

          {isOwner && (
            <View style={styles.ownerActionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleShare}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Feather name="share" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButtonGrow}
                onPress={() => onInviteFriends(receiptId)}
              >
                <Text style={styles.secondaryButtonText}>Invite Friends</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      {showQRCode && receipt?.share_code && (
        <QRCodeShare
          shareCode={receipt.share_code}
          onClose={() => setShowQRCode(false)}
        />
      )}

      {receipt.image_url && (
        <Modal
          visible={isImageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImageModalVisible(false)}
        >
          <Pressable
            style={styles.imageModalOverlay}
            onPress={handleReceiptModalPress}
            onTouchStart={handleOverlayTouchStart}
            onTouchEnd={handleOverlayTouchEnd}
          >
            <ScrollView
              style={styles.fullReceiptScroll}
              contentContainerStyle={styles.fullReceiptScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: receipt.image_url }}
                style={styles.fullReceiptImage}
                resizeMode="contain"
              />
            </ScrollView>
            <TouchableOpacity
              style={styles.imageModalCloseButton}
              onPress={() => {
                pinchInProgressRef.current = false;
                setIsImageModalVisible(false);
              }}
            >
              <Text style={styles.imageModalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Modal>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
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
  receiptHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  receiptHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  receiptHeaderInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 16,
    color: '#666',
  },
  shareCodeContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  shareCodeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  shareCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
  },
  receiptImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  receiptImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptImageOverlayText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ownerAvatarBorder: {
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  ownerAvatar: {
    backgroundColor: '#4caf50',
  },
  ownerBadge: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonGrow: {
        backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullReceiptScroll: {
    width: '90%',
    height: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  fullReceiptScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullReceiptImage: {
    width: '100%',
    height: '100%',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 32,
    right: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  imageModalCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
});
