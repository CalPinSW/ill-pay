import { supabase } from './supabase';

export interface ItemClaim {
  id: string;
  item_id: string;
  user_id: string;
  quantity: number;
  created_at: string;
}

export async function claimItem(
  itemId: string,
  quantity: number
): Promise<ItemClaim> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('item_claims')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', userData.user.id)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('item_claims')
      .update({ quantity })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('item_claims')
      .insert({
        item_id: itemId,
        user_id: userData.user.id,
        quantity,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function unclaimItem(itemId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('item_claims')
    .delete()
    .eq('item_id', itemId)
    .eq('user_id', userData.user.id);

  if (error) throw error;
}

export async function getItemClaims(receiptId: string) {
  const { data: items } = await supabase
    .from('receipt_items')
    .select('id')
    .eq('receipt_id', receiptId);

  if (!items || items.length === 0) return [];

  const itemIds = items.map(i => i.id);

  const { data, error } = await supabase
    .from('item_claims')
    .select(`
      id,
      item_id,
      user_id,
      quantity,
      created_at,
      profile:profiles(id, username, display_name, avatar_url)
    `)
    .in('item_id', itemIds);

  if (error) throw error;

  return (data || []).map((claim: any) => ({
    ...claim,
    profile: Array.isArray(claim.profile) ? claim.profile[0] : claim.profile,
  }));
}

export async function getMyClaimsForReceipt(receiptId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data: items } = await supabase
    .from('receipt_items')
    .select('id')
    .eq('receipt_id', receiptId);

  if (!items || items.length === 0) return [];

  const itemIds = items.map(i => i.id);

  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .in('item_id', itemIds)
    .eq('user_id', userData.user.id);

  if (error) throw error;
  return data || [];
}
