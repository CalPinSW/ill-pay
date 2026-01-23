import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeShareProps {
  shareCode: string;
  onClose: () => void;
}

export function QRCodeShare({ shareCode, onClose }: QRCodeShareProps) {
  const deepLink = `illpay://join/${shareCode}`;

  const handleShare = async () => {
    await Share.share({
      message: `Join my receipt split!\n\nCode: ${shareCode}\n\nOr open: ${deepLink}`,
      title: 'Share Receipt',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Share Receipt</Text>
        
        <View style={styles.qrContainer}>
          <QRCode
            value={deepLink}
            size={200}
            backgroundColor="#fff"
            color="#000"
          />
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Share Code</Text>
          <Text style={styles.code}>{shareCode}</Text>
        </View>

        <Text style={styles.instructions}>
          Scan this QR code or enter the code to join
        </Text>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  codeContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  code: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
  },
  instructions: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
});
