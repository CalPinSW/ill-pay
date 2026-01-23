import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useFocusEffect } from '@react-navigation/native';

interface Receipt {
  id: string;
  restaurant_name: string | null;
  receipt_date: string | null;
  total: number | null;
  image_url: string | null;
  created_at: string;
  owner_id: string;
  item_count?: number;
  isShared?: boolean;
  ownerName?: string;
}

interface HomeScreenProps {
  onSelectReceipt?: (receiptId: string, isShared?: boolean) => void;
  onJoinReceipt?: () => void;
  onScanQR?: () => void;
}

export function HomeScreen({ onSelectReceipt, onJoinReceipt, onScanQR }: HomeScreenProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReceipts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get receipts user owns
      const { data: ownedReceipts, error: ownedError } = await supabase
        .from('receipts')
        .select(`
          id,
          restaurant_name,
          receipt_date,
          total,
          image_url,
          created_at,
          owner_id,
          receipt_items(count)
        `)
        .eq('owner_id', userData.user.id);

      if (ownedError) throw ownedError;

      // Get receipts user participates in
      const { data: participations } = await supabase
        .from('receipt_participants')
        .select('receipt_id')
        .eq('user_id', userData.user.id);

      const participantReceiptIds = (participations || []).map(p => p.receipt_id);
      
      let sharedReceipts: any[] = [];
      if (participantReceiptIds.length > 0) {
        const { data: shared } = await supabase
          .from('receipts')
          .select(`
            id,
            restaurant_name,
            receipt_date,
            total,
            image_url,
            created_at,
            owner_id,
            receipt_items(count),
            owner:profiles!receipts_owner_id_fkey(display_name, username)
          `)
          .in('id', participantReceiptIds)
          .neq('owner_id', userData.user.id);
        
        sharedReceipts = (shared || []).map((r: any) => ({
          ...r,
          isShared: true,
          ownerName: r.owner?.display_name || r.owner?.username || 'Someone',
        }));
      }

      // Mark owned receipts
      const ownedWithFlag = (ownedReceipts || []).map((r: any) => ({
        ...r,
        isShared: false,
      }));

      // Combine and sort
      const allReceipts = [...ownedWithFlag, ...sharedReceipts];
      allReceipts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const receiptsWithCount = allReceipts.map((r: any) => ({
        ...r,
        item_count: r.receipt_items?.[0]?.count || 0,
      }));

      setReceipts(receiptsWithCount);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReceipts();
    }, [])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReceipts();
    setIsRefreshing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return `£${amount.toFixed(2)}`;
  };

  const renderReceipt = ({ item }: { item: Receipt }) => (
    <TouchableOpacity 
      style={styles.receiptCard}
      onPress={() => onSelectReceipt?.(item.id, item.isShared)}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.receiptImage} />
      )}
      <View style={styles.receiptInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {item.restaurant_name || 'Unknown Restaurant'}
        </Text>
        <Text style={styles.receiptDate}>{formatDate(item.receipt_date)}</Text>
        {item.isShared ? (
          <Text style={styles.sharedBy}>Shared by {item.ownerName}</Text>
        ) : (
          <Text style={styles.itemCount}>
            {item.item_count} item{item.item_count !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <View style={styles.receiptTotal}>
        <Text style={styles.totalAmount}>{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🧾</Text>
      <Text style={styles.emptyText}>No receipts yet</Text>
      <Text style={styles.emptySubtext}>
        Scan a receipt to get started splitting bills with friends
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipts</Text>
        <View style={styles.headerActions}>
          {onScanQR && (
            <TouchableOpacity style={styles.scanButton} onPress={onScanQR}>
              <Text style={styles.scanButtonText}>📷</Text>
            </TouchableOpacity>
          )}
          {onJoinReceipt && (
            <TouchableOpacity style={styles.joinButton} onPress={onJoinReceipt}>
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        renderItem={renderReceipt}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={receipts.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scanButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    fontSize: 16,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  receiptCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  receiptImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  receiptInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: '#999',
  },
  sharedBy: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  receiptTotal: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
});
