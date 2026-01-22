import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { ParsedReceipt, Receipt, ReceiptItem } from '@/types/receipt';

export async function uploadReceiptImage(imageUri: string): Promise<string> {
  const fileName = `receipt_${Date.now()}.jpg`;
  
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, decode(base64), {
      contentType: 'image/jpeg',
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function parseReceiptImage(imageUri: string): Promise<ParsedReceipt> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: { image_base64: base64 },
  });

  if (error) throw error;
  
  return data as ParsedReceipt;
}

export async function createReceipt(
  parsedReceipt: ParsedReceipt,
  imageUrl?: string
): Promise<Receipt> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      owner_id: userData.user.id,
      restaurant_name: parsedReceipt.restaurant_name,
      receipt_date: parsedReceipt.date,
      subtotal: parsedReceipt.subtotal,
      tax: parsedReceipt.tax,
      tip_amount: parsedReceipt.tip,
      total: parsedReceipt.total,
      image_url: imageUrl,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  if (parsedReceipt.items.length > 0) {
    const itemsToInsert = parsedReceipt.items.map((item) => ({
      receipt_id: data.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase
      .from('receipt_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  return data as Receipt;
}

export async function getReceiptWithItems(receiptId: string) {
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (receiptError) throw receiptError;

  const { data: items, error: itemsError } = await supabase
    .from('receipt_items')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at');

  if (itemsError) throw itemsError;

  return { ...receipt, items } as Receipt & { items: ReceiptItem[] };
}

export async function updateReceiptItems(
  receiptId: string,
  items: ReceiptItem[]
): Promise<void> {
  await supabase
    .from('receipt_items')
    .delete()
    .eq('receipt_id', receiptId);

  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      receipt_id: receiptId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error } = await supabase
      .from('receipt_items')
      .insert(itemsToInsert);

    if (error) throw error;
  }
}

export async function activateReceipt(receiptId: string): Promise<Receipt> {
  const { data, error } = await supabase
    .from('receipts')
    .update({ status: 'active' })
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data as Receipt;
}

export async function getUserReceipts(): Promise<Receipt[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .or(`owner_id.eq.${userData.user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Receipt[];
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
