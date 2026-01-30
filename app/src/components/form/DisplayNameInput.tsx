import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface DisplayNameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  required?: boolean;
}

export function DisplayNameInput({
  value,
  onChangeText,
  label = 'Display Name',
  required = false,
}: DisplayNameInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && ' *'}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. Bruce Wayne"
        placeholderTextColor="#999"
        autoComplete="name"
      />
      <Text style={styles.hint}>How friends see you</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
