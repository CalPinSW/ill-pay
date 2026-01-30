import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReceiptByShareCode, joinReceipt } from '@/services/sharingService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/theme';

interface JoinReceiptScreenProps {
  onBack: () => void;
  onJoinSuccess: (receiptId: string) => void;
  onScanQR?: () => void;
  initialCode?: string;
}

export function JoinReceiptScreen({
  onBack,
  onJoinSuccess,
  onScanQR,
  initialCode = '',
}: JoinReceiptScreenProps) {
  const { colors } = useTheme();
  const [shareCode, setShareCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (shareCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-character share code.');
      return;
    }

    setIsLoading(true);
    try {
      const receipt = await getReceiptByShareCode(shareCode);

      if (!receipt) {
        Alert.alert('Not Found', 'No receipt found with that share code.');
        return;
      }

      await joinReceipt(receipt.id);
      onJoinSuccess(receipt.id);
    } catch (error: any) {
      console.error('Error joining receipt:', error);
      if (error.code === 'PGRST116') {
        Alert.alert('Not Found', 'No receipt found with that share code.');
      } else {
        Alert.alert('Error', 'Failed to join receipt. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Join Receipt</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Enter Share Code</Text>
          <TextInput
            style={[
              styles.codeInput,
              {
                backgroundColor: colors.input,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
            value={shareCode}
            onChangeText={(text) => setShareCode(text.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Ask your friend for their 6-character share code
          </Text>

          <TouchableOpacity
            style={[
              styles.joinButton,
              { backgroundColor: colors.primary },
              shareCode.length !== 6 && styles.joinButtonDisabled,
            ]}
            onPress={handleJoin}
            disabled={isLoading || shareCode.length !== 6}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Join Receipt</Text>
            )}
          </TouchableOpacity>

          {onScanQR && (
            <>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: colors.backgroundTertiary }]}
                onPress={onScanQR}
              >
                <MaterialIcons
                  style={styles.scanButtonIcon}
                  name="document-scanner"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.scanButtonText, { color: colors.primary }]}>Scan QR Code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    width: 70,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    padding: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  codeInput: {
    width: '100%',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    color: '#1a1a1a',
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  joinButton: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  scanButtonIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
