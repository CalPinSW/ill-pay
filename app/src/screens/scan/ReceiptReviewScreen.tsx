import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParsedReceipt, ReceiptItem } from '@/types/receipt';

interface ReceiptReviewScreenProps {
  parsedReceipt: ParsedReceipt;
  onConfirm: (receipt: ParsedReceipt) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ReceiptReviewScreen({
  parsedReceipt,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ReceiptReviewScreenProps) {
  const [restaurantName, setRestaurantName] = useState(parsedReceipt.restaurant_name || '');
  const [date, setDate] = useState(parsedReceipt.date || '');
  const [items, setItems] = useState<ReceiptItem[]>(parsedReceipt.items || []);
  const [subtotal, setSubtotal] = useState(parsedReceipt.subtotal?.toString() || '');
  const [tax, setTax] = useState(parsedReceipt.tax?.toString() || '');
  const [tip, setTip] = useState(parsedReceipt.tip?.toString() || '');
  const [total, setTotal] = useState(parsedReceipt.total?.toString() || '');

  const updateItem = (index: number, field: keyof ReceiptItem, value: string) => {
    const newItems = [...items];
    if (field === 'name') {
      newItems[index] = { ...newItems[index], name: value };
    } else {
      const numValue = parseFloat(value) || 0;
      newItems[index] = { ...newItems[index], [field]: numValue };
      
      if (field === 'quantity' || field === 'unit_price') {
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
      }
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleConfirm = () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the receipt');
      return;
    }

    const updatedReceipt: ParsedReceipt = {
      restaurant_name: restaurantName || undefined,
      date: date || undefined,
      items,
      subtotal: parseFloat(subtotal) || calculateSubtotal(),
      tax: parseFloat(tax) || undefined,
      tip: parseFloat(tip) || undefined,
      total: parseFloat(total) || undefined,
    };

    onConfirm(updatedReceipt);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} disabled={isSubmitting}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Review Receipt</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Restaurant</Text>
              <TextInput
                style={styles.input}
                value={restaurantName}
                onChangeText={setRestaurantName}
                placeholder="Restaurant name"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity onPress={addItem}>
                <Text style={styles.addButton}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <TextInput
                    style={styles.itemNameInput}
                    value={item.name}
                    onChangeText={(v) => updateItem(index, 'name', v)}
                    placeholder="Item name"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemField}>
                    <Text style={styles.itemLabel}>Qty</Text>
                    <TextInput
                      style={styles.itemInput}
                      value={item.quantity.toString()}
                      onChangeText={(v) => updateItem(index, 'quantity', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.itemLabel}>Unit $</Text>
                    <TextInput
                      style={styles.itemInput}
                      value={item.unit_price.toFixed(2)}
                      onChangeText={(v) => updateItem(index, 'unit_price', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.itemLabel}>Total</Text>
                    <Text style={styles.itemTotal}>${item.total_price.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))}

            {items.length === 0 && (
              <Text style={styles.emptyText}>No items. Tap "+ Add Item" to add one.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Totals</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <TextInput
                style={styles.totalInput}
                value={subtotal}
                onChangeText={setSubtotal}
                placeholder={calculateSubtotal().toFixed(2)}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <TextInput
                style={styles.totalInput}
                value={tax}
                onChangeText={setTax}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tip</Text>
              <TextInput
                style={styles.totalInput}
                value={tip}
                onChangeText={setTip}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <TextInput
                style={[styles.totalInput, styles.grandTotalInput]}
                value={total}
                onChangeText={setTotal}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Create Receipt</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    fontSize: 16,
    color: '#4F46E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  addButton: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  removeButton: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  itemField: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    width: 100,
    textAlign: 'right',
    fontSize: 16,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  grandTotalInput: {
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
