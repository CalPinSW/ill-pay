export interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ParsedReceipt {
  restaurant_name?: string;
  date?: string;
  items: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

export interface Receipt {
  id: string;
  owner_id: string;
  restaurant_name?: string;
  receipt_date?: string;
  subtotal?: number;
  tax?: number;
  tip_amount?: number;
  tip_type: 'proportional' | 'equal';
  total?: number;
  image_url?: string;
  share_code?: string;
  status: 'draft' | 'active' | 'settled';
  created_at: string;
  updated_at: string;
}

export interface ReceiptWithItems extends Receipt {
  items: ReceiptItem[];
}
