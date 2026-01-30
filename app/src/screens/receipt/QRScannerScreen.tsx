import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getReceiptByShareCode, joinReceipt } from '@/services/sharingService';
import { useTheme } from '@/theme';

interface QRScannerScreenProps {
  onBack: () => void;
  onJoinSuccess: (receiptId: string) => void;
}

export function QRScannerScreen({ onBack, onJoinSuccess }: QRScannerScreenProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);

    try {
      let shareCode = data.trim();

      // Extract share code from deep link
      if (shareCode.includes('illpay://join/')) {
        shareCode = shareCode.split('illpay://join/')[1];
      }

      // Clean up share code - remove any trailing slashes or whitespace
      shareCode = shareCode.replace(/[\/\s]/g, '').toUpperCase();

      if (!shareCode || shareCode.length < 4 || shareCode.length > 10) {
        Alert.alert('Invalid Code', 'This QR code is not a valid receipt share code.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        setIsProcessing(false);
        return;
      }

      const receipt = await getReceiptByShareCode(shareCode);

      if (!receipt) {
        Alert.alert('Not Found', 'No receipt found with that share code.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        setIsProcessing(false);
        return;
      }

      await joinReceipt(receipt.id);
      onJoinSuccess(receipt.id);
    } catch (error: any) {
      console.error('Error joining receipt:', error);
      const message =
        error.code === 'PGRST116'
          ? 'No receipt found with that share code.'
          : 'Failed to join receipt. Please try again.';
      Alert.alert('Error', message, [{ text: 'OK', onPress: () => setScanned(false) }]);
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: colors.text }]}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scan QR Code</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: colors.text }]}>
            Camera permission is required to scan QR codes
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Scan QR Code</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.hint}>Point camera at a receipt QR code</Text>
        </View>
      </View>

      {scanned && (
        <View style={styles.scannedContainer}>
          <TouchableOpacity
            style={[styles.scanAgainButton, { backgroundColor: colors.primary }]}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.scanAgainButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#000',
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
    color: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 24,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  scannedContainer: {
    padding: 20,
    backgroundColor: '#000',
  },
  scanAgainButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanAgainButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
