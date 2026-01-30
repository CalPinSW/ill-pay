import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface UsernameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  editable?: boolean;
}

export function UsernameInput({
  value,
  onChangeText,
  error,
  label = 'Username',
  required = false,
  editable = true,
}: UsernameInputProps) {
  const handleChange = (text: string) => {
    // Auto-format: lowercase and filter invalid characters
    const formatted = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    onChangeText(formatted);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && ' *'}
      </Text>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        placeholder="e.g. the_batman"
        placeholderTextColor="#999"
        editable={editable}
        autoComplete="username"
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.hint}>Used by friends to find you</Text>
      )}
    </View>
  );
}

export function validateUsername(username: string): string | null {
  if (!username.trim()) {
    return 'Username cannot be empty';
  }

  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }

  return null;
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
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputDisabled: {
    backgroundColor: '#eee',
    color: '#666',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});
