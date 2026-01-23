import { supabase } from './supabase';

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function activateAndShareReceipt(receiptId: string): Promise<string> {
  const shareCode = generateShareCode();
  
  const { data, error } = await supabase
    .from('receipts')
    .update({ 
      share_code: shareCode,
      status: 'active'
    })
    .eq('id', receiptId)
    .select('share_code')
    .single();

  if (error) throw error;
  return data.share_code;
}

export async function getReceiptByShareCode(shareCode: string) {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      owner:profiles!receipts_owner_id_fkey(id, username, display_name, avatar_url),
      receipt_items(*),
      receipt_participants(
        user_id,
        joined_at,
        profile:profiles(id, username, display_name, avatar_url)
      )
    `)
    .eq('share_code', shareCode.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}

export async function joinReceipt(receiptId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('receipt_participants')
    .upsert({
      receipt_id: receiptId,
      user_id: userData.user.id,
    }, {
      onConflict: 'receipt_id,user_id'
    });

  if (error) throw error;
}

export async function inviteFriendToReceipt(receiptId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('receipt_participants')
    .upsert({
      receipt_id: receiptId,
      user_id: friendId,
    }, {
      onConflict: 'receipt_id,user_id'
    });

  if (error) throw error;
}

export async function getReceiptParticipants(receiptId: string) {
  const { data, error } = await supabase
    .from('receipt_participants')
    .select(`
      user_id,
      joined_at,
      profile:profiles(id, username, display_name, avatar_url)
    `)
    .eq('receipt_id', receiptId);

  if (error) throw error;
  return data;
}

export async function leaveReceipt(receiptId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('receipt_participants')
    .delete()
    .eq('receipt_id', receiptId)
    .eq('user_id', userData.user.id);

  if (error) throw error;
}
