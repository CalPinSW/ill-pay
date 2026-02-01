import React, { useEffect, useState } from 'react';
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
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme';

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
  const { colors, theme } = useTheme();
  const [restaurantName, setRestaurantName] = useState(parsedReceipt.restaurant_name || '');
  const [date, setDate] = useState<Date>(() => {
    const candidate = parsedReceipt.date ? new Date(parsedReceipt.date) : new Date();
    return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  });
  const [items, setItems] = useState<ReceiptItem[]>(
    (parsedReceipt.items || []).map((item) => ({
      ...item,
      quantity: Math.ceil(item.quantity || 1),
      total_price: Math.ceil(item.quantity || 1) * (item.unit_price || 0),
    }))
  );
  const [itemDrafts, setItemDrafts] = useState<{ quantity: string; unit_price: string }[]>(
    (parsedReceipt.items || []).map((item) => ({
      quantity: Math.ceil(item.quantity || 1).toString(),
      unit_price:
        typeof item.unit_price === 'number' && Number.isFinite(item.unit_price)
          ? item.unit_price.toFixed(2)
          : '0.00',
    }))
  );
  const [tax, setTax] = useState(parsedReceipt.tax?.toString() || '');
  const [tip, setTip] = useState(parsedReceipt.tip?.toString() || '');

  useEffect(() => {
    if (itemDrafts.length === items.length) return;

    setItemDrafts(
      items.map((item, index) =>
        itemDrafts[index]
          ? itemDrafts[index]
          : {
              quantity: item.quantity?.toString?.() ?? '0',
              unit_price:
                typeof item.unit_price === 'number' && Number.isFinite(item.unit_price)
                  ? item.unit_price.toFixed(2)
                  : '0.00',
            }
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const sanitizeQuantity = (value: string) => value.replace(/[^0-9]/g, '');

  const sanitizeDecimal = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  };

  const updateItemName = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name: value };
    setItems(newItems);
  };

  const updateItemQuantityText = (index: number, value: string) => {
    const nextText = sanitizeQuantity(value);
    const nextDrafts = [...itemDrafts];
    nextDrafts[index] = { ...nextDrafts[index], quantity: nextText };
    setItemDrafts(nextDrafts);

    const qty = nextText === '' ? 0 : parseInt(nextText, 10);
    const unitText = nextDrafts[index]?.unit_price ?? '0';
    const unit = parseFloat(unitText);

    const newItems = [...items];
    const safeUnit = Number.isFinite(unit) ? unit : 0;
    newItems[index] = {
      ...newItems[index],
      quantity: Number.isFinite(qty) ? qty : 0,
      unit_price: safeUnit,
      total_price: (Number.isFinite(qty) ? qty : 0) * safeUnit,
    };
    setItems(newItems);
  };

  const blurItemQuantity = (index: number) => {
    const nextDrafts = [...itemDrafts];
    const current = nextDrafts[index]?.quantity ?? '';
    const qty = current === '' ? 0 : parseInt(current, 10);
    nextDrafts[index] = {
      ...nextDrafts[index],
      quantity: (Number.isFinite(qty) ? qty : 0).toString(),
    };
    setItemDrafts(nextDrafts);
  };

  const updateItemUnitPriceText = (index: number, value: string) => {
    const nextText = sanitizeDecimal(value);
    const nextDrafts = [...itemDrafts];
    nextDrafts[index] = { ...nextDrafts[index], unit_price: nextText };
    setItemDrafts(nextDrafts);

    const qtyText = nextDrafts[index]?.quantity ?? '0';
    const qty = parseInt(qtyText === '' ? '0' : qtyText, 10);
    const unit = parseFloat(nextText);

    const safeQty = Number.isFinite(qty) ? qty : 0;
    const safeUnit = Number.isFinite(unit) ? unit : 0;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      quantity: safeQty,
      unit_price: safeUnit,
      total_price: safeQty * safeUnit,
    };
    setItems(newItems);
  };

  const blurItemUnitPrice = (index: number) => {
    const nextDrafts = [...itemDrafts];
    const current = nextDrafts[index]?.unit_price ?? '';
    const unit = parseFloat(current);
    nextDrafts[index] = {
      ...nextDrafts[index],
      unit_price: Number.isFinite(unit) ? unit.toFixed(2) : '0.00',
    };
    setItemDrafts(nextDrafts);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, total_price: 0 }]);
    setItemDrafts([...itemDrafts, { quantity: '1', unit_price: '0.00' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setItemDrafts(itemDrafts.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const computedSubtotal = calculateSubtotal();
  const parsedTax = parseFloat(tax);
  const parsedTip = parseFloat(tip);
  const computedTax = Number.isFinite(parsedTax) ? parsedTax : 0;
  const computedTip = Number.isFinite(parsedTip) ? parsedTip : 0;
  const computedTotal = computedSubtotal + computedTax + computedTip;

  const handleConfirm = () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the receipt');
      return;
    }

    // Ensure all quantities are integers
    const validatedItems = items.map((item) => ({
      ...item,
      quantity: Math.ceil(item.quantity),
      total_price: Math.ceil(item.quantity) * item.unit_price,
    }));

    const updatedReceipt: ParsedReceipt = {
      restaurant_name: restaurantName || undefined,
      date: date.toISOString().split('T')[0] || undefined,
      items: validatedItems,
      subtotal: computedSubtotal,
      tax: Number.isFinite(parsedTax) ? parsedTax : undefined,
      tip: Number.isFinite(parsedTip) ? parsedTip : undefined,
      total: computedTotal,
    };

    onConfirm(updatedReceipt);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} disabled={isSubmitting}>
            <Text style={[styles.cancelButton, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Review Receipt</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Restaurant</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={restaurantName}
                onChangeText={setRestaurantName}
                placeholder="Restaurant name"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                <RNDateTimePicker
                  value={date}
                  mode="date"
                  themeVariant={theme}
                  display={'default'}
                  onChange={(event, nextDate) => {
                    if (event.type === 'dismissed' || !nextDate) return;
                    setDate(nextDate);
                  }}
                />
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Items</Text>
              <TouchableOpacity onPress={addItem}>
                <Text style={[styles.addButton, { color: colors.primary }]}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.itemHeader}>
                  <TextInput
                    style={[
                      styles.itemNameInput,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      },
                    ]}
                    value={item.name}
                    onChangeText={(v) => updateItemName(index, v)}
                    placeholder="Item name"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Text style={[styles.removeButton, { color: colors.error }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemField}>
                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Qty</Text>
                    <TextInput
                      style={[
                        styles.itemInput,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      value={itemDrafts[index]?.quantity ?? item.quantity.toString()}
                      onChangeText={(v) => updateItemQuantityText(index, v)}
                      onBlur={() => blurItemQuantity(index)}
                      keyboardType="numeric"
                      placeholderTextColor={colors.inputPlaceholder}
                    />
                  </View>
                  <View style={styles.itemField}>
                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Unit $</Text>
                    <TextInput
                      style={[
                        styles.itemInput,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      value={itemDrafts[index]?.unit_price ?? item.unit_price.toFixed(2)}
                      onChangeText={(v) => updateItemUnitPriceText(index, v)}
                      onBlur={() => blurItemUnitPrice(index)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.inputPlaceholder}
                    />
                  </View>
                  <View style={styles.itemField}>
                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Total</Text>
                    <Text style={[styles.itemTotal, { color: colors.text }]}>
                      ${item.total_price.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {items.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items. Tap "+ Add Item" to add one.
              </Text>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Totals</Text>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {computedSubtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tax</Text>
              <TextInput
                style={[
                  styles.totalInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={tax}
                onChangeText={setTax}
                placeholder="0.00"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tip</Text>
              <TextInput
                style={[
                  styles.totalInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={tip}
                onChangeText={setTip}
                placeholder="0.00"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="decimal-pad"
              />
            </View>
            <View
              style={[styles.totalRow, styles.grandTotalRow, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, styles.grandTotalValue, { color: colors.text }]}>
                {computedTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: colors.primary },
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>Create Receipt</Text>
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
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  section: {
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
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  addButton: {
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
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  datePickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  itemCard: {
    borderWidth: 1,
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  removeButton: {
    fontSize: 18,
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
    marginBottom: 4,
  },
  itemInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
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
  },
  totalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    width: 100,
    textAlign: 'right',
    fontSize: 16,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 16,
    paddingVertical: 12,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  grandTotalInput: {
    fontWeight: '600',
  },
  grandTotalValue: {
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
