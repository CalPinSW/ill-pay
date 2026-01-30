import { supabase } from './supabase';

export interface ItemClaim {
  item_id: string;
  user_id: string;
  quantity: number;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ParticipantTotal {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  items_total: number;
  tax_portion: number;
  tip_portion: number;
  total_owed: number;
  claimed_items: {
    name: string;
    quantity: number;
    amount: number;
  }[];
}

export interface BillBreakdown {
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  participants: ParticipantTotal[];
  unclaimed_total: number;
  tip_distribution: 'proportional' | 'equal';
  tax_distribution: 'proportional' | 'equal';
}

export type DistributionType = 'proportional' | 'equal';

export interface DistributionOptions {
  tip: DistributionType;
  tax: DistributionType;
}

export async function calculateBillBreakdown(
  receiptId: string,
  distribution: DistributionOptions = { tip: 'proportional', tax: 'proportional' }
): Promise<BillBreakdown> {
  // Fetch receipt details
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('subtotal, tax, tip_amount, total, owner_id')
    .eq('id', receiptId)
    .single();

  if (receiptError) throw receiptError;

  // Fetch receipt items
  const { data: items, error: itemsError } = await supabase
    .from('receipt_items')
    .select('id, name, quantity, unit_price, total_price')
    .eq('receipt_id', receiptId);

  if (itemsError) throw itemsError;

  // Fetch claims with user profiles
  const itemIds = (items || []).map((i) => i.id);
  const { data: claims, error: claimsError } = await supabase
    .from('item_claims')
    .select(
      `
      item_id,
      user_id,
      quantity,
      profile:profiles(id, username, display_name, avatar_url)
    `
    )
    .in('item_id', itemIds);

  if (claimsError) throw claimsError;

  // Fetch owner profile
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', receipt.owner_id)
    .single();

  // Calculate totals
  const subtotal = receipt.subtotal || 0;
  const tax = receipt.tax || 0;
  const tip = receipt.tip_amount || 0;
  const total = receipt.total || subtotal + tax + tip;

  // Build item map
  const itemMap = new Map<string, ReceiptItem>();
  for (const item of items || []) {
    itemMap.set(item.id, item);
  }

  // Calculate per-user item totals
  const userTotals = new Map<
    string,
    {
      items_total: number;
      claimed_items: { name: string; quantity: number; amount: number }[];
      profile: {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
    }
  >();

  // Process claims
  for (const claim of claims || []) {
    const item = itemMap.get(claim.item_id);
    if (!item) continue;

    const claimAmount = item.unit_price * claim.quantity;
    const profile = Array.isArray(claim.profile) ? claim.profile[0] : claim.profile;

    if (!userTotals.has(claim.user_id)) {
      userTotals.set(claim.user_id, {
        items_total: 0,
        claimed_items: [],
        profile,
      });
    }

    const userTotal = userTotals.get(claim.user_id)!;
    userTotal.items_total += claimAmount;
    userTotal.claimed_items.push({
      name: item.name,
      quantity: claim.quantity,
      amount: claimAmount,
    });
  }

  // Calculate unclaimed items
  let unclaimedTotal = 0;
  for (const item of items || []) {
    const claimedQty = (claims || [])
      .filter((c) => c.item_id === item.id)
      .reduce((sum, c) => sum + c.quantity, 0);
    const unclaimedQty = item.quantity - claimedQty;
    if (unclaimedQty > 0) {
      unclaimedTotal += item.unit_price * unclaimedQty;
    }
  }

  // Calculate total claimed amount
  const totalClaimedAmount = Array.from(userTotals.values()).reduce(
    (sum, u) => sum + u.items_total,
    0
  );

  // Calculate participant totals with tax and tip
  const participants: ParticipantTotal[] = [];
  const participantCount = userTotals.size || 1;

  // Split unclaimed items equally among participants
  const unclaimedPerPerson = participantCount > 0 ? unclaimedTotal / participantCount : 0;

  for (const [userId, data] of userTotals) {
    const itemsProportion = subtotal > 0 ? data.items_total / subtotal : 0;

    // Tax can be proportional or equal
    let taxPortion: number;
    if (distribution.tax === 'equal') {
      taxPortion = tax / participantCount;
    } else {
      taxPortion = tax * itemsProportion;
    }

    // Tip can be proportional or equal
    let tipPortion: number;
    if (distribution.tip === 'equal') {
      tipPortion = tip / participantCount;
    } else {
      tipPortion = tip * itemsProportion;
    }

    // Include share of unclaimed items
    const itemsWithUnclaimed = data.items_total + unclaimedPerPerson;

    participants.push({
      user_id: userId,
      username: data.profile?.username || 'Unknown',
      display_name: data.profile?.display_name || null,
      avatar_url: data.profile?.avatar_url || null,
      items_total: itemsWithUnclaimed,
      tax_portion: taxPortion,
      tip_portion: tipPortion,
      total_owed: itemsWithUnclaimed + taxPortion + tipPortion,
      claimed_items: data.claimed_items,
    });
  }

  // Sort by total owed descending
  participants.sort((a, b) => b.total_owed - a.total_owed);

  return {
    subtotal,
    tax,
    tip,
    total,
    participants,
    unclaimed_total: unclaimedTotal,
    tip_distribution: distribution.tip,
    tax_distribution: distribution.tax,
  };
}

export async function getMyTotal(receiptId: string): Promise<ParticipantTotal | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const breakdown = await calculateBillBreakdown(receiptId);
  return breakdown.participants.find((p) => p.user_id === userData.user!.id) || null;
}
