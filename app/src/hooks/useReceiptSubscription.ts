import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
}

interface ItemClaim {
  id: string;
  item_id: string;
  user_id: string;
  quantity: number;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
}

export function useReceiptSubscription(receiptId: string) {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [itemsResult, participantsResult, claimsResult] = await Promise.all([
        supabase.from('receipt_items').select('*').eq('receipt_id', receiptId).order('created_at'),
        supabase
          .from('receipt_participants')
          .select(
            `
            user_id,
            joined_at,
            profile:profiles(id, username, display_name, avatar_url)
          `
          )
          .eq('receipt_id', receiptId),
        supabase
          .from('item_claims')
          .select(
            `
            id,
            item_id,
            user_id,
            quantity,
            profile:profiles(id, username, display_name)
          `
          )
          .in(
            'item_id',
            items.map((i) => i.id)
          ),
      ]);

      if (itemsResult.data) setItems(itemsResult.data);
      if (participantsResult.data) {
        const mapped = participantsResult.data.map((p: any) => ({
          ...p,
          profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
        }));
        setParticipants(mapped);
      }
      if (claimsResult.data) {
        const mapped = claimsResult.data.map((c: any) => ({
          ...c,
          profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
        }));
        setClaims(mapped);
      }
    } catch (error) {
      console.error('Error fetching receipt data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    fetchData();

    const itemsChannel = supabase
      .channel(`receipt_items:${receiptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipt_items',
          filter: `receipt_id=eq.${receiptId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel(`receipt_participants:${receiptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipt_participants',
          filter: `receipt_id=eq.${receiptId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const claimsChannel = supabase
      .channel(`item_claims:${receiptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_claims',
        },
        (payload) => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(claimsChannel);
    };
  }, [receiptId, fetchData]);

  return {
    items,
    participants,
    claims,
    isLoading,
    refresh: fetchData,
  };
}
