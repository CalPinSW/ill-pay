import { readAsStringAsync } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { ParsedReceipt, Receipt, ReceiptItem } from '@/types/receipt';

export class RateLimitExceededError extends Error {
  limit: number;
  count: number;

  constructor(message: string, limit: number, count: number) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.limit = limit;
    this.count = count;
  }
}

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return result.base64 || '';
}

export async function uploadReceiptImage(imageUri: string): Promise<string> {
  const fileName = `receipt_${Date.now()}.jpg`;
  
  const base64 = await readAsStringAsync(imageUri, {
    encoding: 'base64',
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
  const base64 = await compressImage(imageUri);
  
  const sizeMB = (base64.length * 0.75) / (1024 * 1024);
  if (sizeMB > 4) {
    throw new Error('Image too large. Please take a closer photo of the receipt.');
  }

  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: { image_base64: base64 },
  });

  if (error) {
    const maybeContext = (error as any)?.context;
    const status = maybeContext?.status;
    const body = maybeContext?.body;

    if (status === 429 && body?.code === 'RATE_LIMIT_EXCEEDED') {
      throw new RateLimitExceededError(
        body?.error || 'Daily receipt parsing limit reached',
        Number(body?.limit) || 2,
        Number(body?.count) || 0
      );
    }

    throw error;
  }
  
  if (data?.error) {
    throw new Error(data.error);
  }
  
  // Combine items with the same name and unit price
  const parsedData = data as ParsedReceipt;
  if (parsedData.items && parsedData.items.length > 0) {
    const itemMap = new Map<string, typeof parsedData.items[0]>();
    
    for (const item of parsedData.items) {
      const key = `${item.name.toLowerCase().trim()}|${item.unit_price}`;
      const existing = itemMap.get(key);
      
      if (existing) {
        existing.quantity += item.quantity;
        existing.total_price += item.total_price;
      } else {
        itemMap.set(key, { ...item });
      }
    }
    
    parsedData.items = Array.from(itemMap.values());
  }
  
  return parsedData;
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
