import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, Alert, ActivityIndicator, View, StyleSheet } from 'react-native';

import { HomeScreen } from '@/screens/home';
import { ScanScreen, ReceiptReviewScreen } from '@/screens/scan';
import { FriendsScreen, SearchUsersScreen, FriendRequestsScreen } from '@/screens/friends';
import { ProfileScreen, EditProfileScreen } from '@/screens/profile';
import { ReceiptDetailScreen, InviteFriendsScreen, JoinReceiptScreen, ParticipantReceiptScreen, QRScannerScreen, SettlementScreen } from '@/screens/receipt';
import { parseReceiptImage, createReceipt, uploadReceiptImage } from '@/services/receiptService';
import { ParsedReceipt } from '@/types/receipt';

export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  FriendsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function HomeStack() {
  const [screen, setScreen] = useState<'list' | 'detail' | 'invite' | 'join' | 'scan' | 'participant' | 'settlement'>('list');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const handleSelectReceipt = (receiptId: string, isShared?: boolean) => {
    setSelectedReceiptId(receiptId);
    setScreen('detail');
  };

  const handleClaimItems = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    setScreen('participant');
  };

  const handleInviteFriends = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    setScreen('invite');
  };

  const handleViewSettlement = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    setScreen('settlement');
  };

  const handleBack = () => {
    setScreen('list');
    setSelectedReceiptId(null);
  };

  const handleBackToDetail = () => {
    setScreen('detail');
  };

  const handleJoinSuccess = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    setScreen('detail');
  };

  if (screen === 'scan') {
    return (
      <QRScannerScreen
        onBack={handleBack}
        onJoinSuccess={handleJoinSuccess}
      />
    );
  }

  if (screen === 'join') {
    return (
      <JoinReceiptScreen
        onBack={handleBack}
        onJoinSuccess={handleJoinSuccess}
      />
    );
  }

  if (screen === 'settlement' && selectedReceiptId) {
    return (
      <SettlementScreen
        receiptId={selectedReceiptId}
        onBack={handleBackToDetail}
      />
    );
  }

  if (screen === 'participant' && selectedReceiptId) {
    return (
      <ParticipantReceiptScreen
        receiptId={selectedReceiptId}
        onBack={handleBackToDetail}
      />
    );
  }

  if (screen === 'invite' && selectedReceiptId) {
    return (
      <InviteFriendsScreen
        receiptId={selectedReceiptId}
        onBack={handleBackToDetail}
      />
    );
  }

  if (screen === 'detail' && selectedReceiptId) {
    return (
      <ReceiptDetailScreen
        receiptId={selectedReceiptId}
        onBack={handleBack}
        onInviteFriends={handleInviteFriends}
        onClaimItems={handleClaimItems}
        onViewSettlement={handleViewSettlement}
      />
    );
  }

  return (
    <HomeScreen 
      onSelectReceipt={handleSelectReceipt}
      onJoinReceipt={() => setScreen('join')}
      onScanQR={() => setScreen('scan')}
    />
  );
}

function ScanStack() {
  const [screen, setScreen] = useState<'camera' | 'parsing' | 'review'>('camera');
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageCaptured = async (uri: string) => {
    setCapturedImageUri(uri);
    setScreen('parsing');

    try {
      const parsed = await parseReceiptImage(uri);
      setParsedReceipt(parsed);
      setScreen('review');
    } catch (error) {
      console.error('Error parsing receipt:', error);
      Alert.alert(
        'Parsing Failed',
        'Could not parse the receipt. You can add items manually.',
        [
          {
            text: 'Add Manually',
            onPress: () => {
              setParsedReceipt({ items: [] });
              setScreen('review');
            },
          },
          {
            text: 'Retake Photo',
            onPress: () => {
              setCapturedImageUri(null);
              setScreen('camera');
            },
          },
        ]
      );
    }
  };

  const handleConfirmReceipt = async (receipt: ParsedReceipt) => {
    setIsSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (capturedImageUri) {
        try {
          imageUrl = await uploadReceiptImage(capturedImageUri);
        } catch (uploadError) {
          console.warn('Image upload failed, continuing without image:', uploadError);
        }
      }

      await createReceipt(receipt, imageUrl);
      Alert.alert('Success', 'Receipt created successfully!');
      
      setCapturedImageUri(null);
      setParsedReceipt(null);
      setScreen('camera');
    } catch (error) {
      console.error('Error creating receipt:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCapturedImageUri(null);
    setParsedReceipt(null);
    setScreen('camera');
  };

  if (screen === 'parsing') {
    return (
      <View style={scanStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={scanStyles.loadingText}>Analyzing receipt...</Text>
        <Text style={scanStyles.loadingSubtext}>This may take a few seconds</Text>
      </View>
    );
  }

  if (screen === 'review' && parsedReceipt) {
    return (
      <ReceiptReviewScreen
        parsedReceipt={parsedReceipt}
        onConfirm={handleConfirmReceipt}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    );
  }

  return <ScanScreen onImageCaptured={handleImageCaptured} />;
}

const scanStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

function FriendsStack() {
  const [screen, setScreen] = useState<'list' | 'search' | 'requests'>('list');

  if (screen === 'search') {
    return <SearchUsersScreen onGoBack={() => setScreen('list')} />;
  }

  if (screen === 'requests') {
    return <FriendRequestsScreen onGoBack={() => setScreen('list')} />;
  }

  return (
    <FriendsScreen
      onNavigateToSearch={() => setScreen('search')}
      onNavigateToRequests={() => setScreen('requests')}
    />
  );
}

function ProfileStack() {
  const [screen, setScreen] = useState<'profile' | 'edit'>('profile');

  if (screen === 'edit') {
    return <EditProfileScreen onGoBack={() => setScreen('profile')} />;
  }

  return <ProfileScreen />;
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStack}
        options={{
          tabBarLabel: 'Friends',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
