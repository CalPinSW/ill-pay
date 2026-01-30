import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Text, Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/theme';

import { HomeScreen } from '@/screens/home';
import { ScanScreen, ReceiptReviewScreen, RateLimitScreen } from '@/screens/scan';
import { FriendsScreen, SearchUsersScreen, FriendRequestsScreen } from '@/screens/friends';
import { ProfileScreen, EditProfileScreen, AboutScreen } from '@/screens/profile';
import {
  ReceiptDetailScreen,
  InviteFriendsScreen,
  JoinReceiptScreen,
  ParticipantReceiptScreen,
  QRScannerScreen,
  SettlementScreen,
} from '@/screens/receipt';
import {
  parseReceiptImage,
  createReceipt,
  uploadReceiptImage,
  RateLimitExceededError,
} from '@/services/receiptService';
import { ParsedReceipt } from '@/types/receipt';

export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  FriendsTab: { screen?: 'list' | 'search' | 'requests' } | undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Context to share newly created receipt ID between tabs
const NewReceiptContext = createContext<{
  newReceiptId: string | null;
  setNewReceiptId: (id: string | null) => void;
}>({ newReceiptId: null, setNewReceiptId: () => {} });

function HomeStack() {
  const [screen, setScreen] = useState<
    'list' | 'detail' | 'invite' | 'join' | 'scan' | 'participant' | 'settlement'
  >('list');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const { newReceiptId, setNewReceiptId } = useContext(NewReceiptContext);

  // Navigate to receipt detail when a new receipt is created from scan
  useEffect(() => {
    if (newReceiptId) {
      setSelectedReceiptId(newReceiptId);
      setScreen('detail');
      setNewReceiptId(null);
    }
  }, [newReceiptId, setNewReceiptId]);

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
    return <QRScannerScreen onBack={handleBack} onJoinSuccess={handleJoinSuccess} />;
  }

  if (screen === 'join') {
    return (
      <JoinReceiptScreen
        onBack={handleBack}
        onJoinSuccess={handleJoinSuccess}
        onScanQR={() => setScreen('scan')}
      />
    );
  }

  if (screen === 'settlement' && selectedReceiptId) {
    return <SettlementScreen receiptId={selectedReceiptId} onBack={handleBackToDetail} />;
  }

  if (screen === 'participant' && selectedReceiptId) {
    return <ParticipantReceiptScreen receiptId={selectedReceiptId} onBack={handleBackToDetail} />;
  }

  if (screen === 'invite' && selectedReceiptId) {
    return <InviteFriendsScreen receiptId={selectedReceiptId} onBack={handleBackToDetail} />;
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
  const { colors } = useTheme();
  const [screen, setScreen] = useState<'camera' | 'parsing' | 'review' | 'rate_limit'>('camera');
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit: number; count: number } | null>(null);
  const navigation = useNavigation<any>();
  const { setNewReceiptId } = useContext(NewReceiptContext);

  const handleImageCaptured = async (uri: string) => {
    setCapturedImageUri(uri);
    setScreen('parsing');

    try {
      const parsed = await parseReceiptImage(uri);
      setParsedReceipt(parsed);
      setScreen('review');
    } catch (error) {
      console.error('Error parsing receipt:', error);

      if (error instanceof RateLimitExceededError) {
        setRateLimitInfo({ limit: error.limit, count: error.count });
        setScreen('rate_limit');
        return;
      }

      Alert.alert('Parsing Failed', 'Could not parse the receipt. You can add items manually.', [
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
      ]);
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

      const createdReceipt = await createReceipt(receipt, imageUrl);

      setCapturedImageUri(null);
      setParsedReceipt(null);
      setScreen('camera');

      // Navigate to the receipt detail on the Home tab
      setNewReceiptId(createdReceipt.id);
      navigation.navigate('HomeTab');
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

  const handleRateLimitBack = () => {
    setCapturedImageUri(null);
    setParsedReceipt(null);
    setRateLimitInfo(null);
    setScreen('camera');
  };

  const handleManualEntry = () => {
    setParsedReceipt({ items: [] });
    setScreen('review');
  };

  if (screen === 'parsing') {
    return (
      <View style={[scanStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[scanStyles.loadingText, { color: colors.text }]}>Analyzing receipt...</Text>
        <Text style={[scanStyles.loadingSubtext, { color: colors.textSecondary }]}>
          This may take a few seconds
        </Text>
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

  if (screen === 'rate_limit' && rateLimitInfo) {
    return (
      <RateLimitScreen
        limit={rateLimitInfo.limit}
        count={rateLimitInfo.count}
        onBack={handleRateLimitBack}
      />
    );
  }

  return <ScanScreen onImageCaptured={handleImageCaptured} onManualEntry={handleManualEntry} />;
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

function FriendsStack({
  route,
}: {
  route?: { params?: { screen?: 'list' | 'search' | 'requests' } };
}) {
  const initialScreen = route?.params?.screen || 'list';
  const [screen, setScreen] = useState<'list' | 'search' | 'requests'>(initialScreen);

  // Update screen when route params change (e.g., from notification)
  useEffect(() => {
    if (route?.params?.screen) {
      setScreen(route.params.screen);
    }
  }, [route?.params?.screen]);

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
  const [screen, setScreen] = useState<'profile' | 'edit' | 'about'>('profile');

  if (screen === 'edit') {
    return <EditProfileScreen onGoBack={() => setScreen('profile')} />;
  }

  if (screen === 'about') {
    return <AboutScreen onGoBack={() => setScreen('profile')} />;
  }

  return (
    <ProfileScreen onEditProfile={() => setScreen('edit')} onAbout={() => setScreen('about')} />
  );
}

function FriendsTabIcon({ pendingCount, color }: { pendingCount: number; color: string }) {
  return (
    <View style={{ position: 'relative' }}>
      <MaterialIcons name="groups" size={24} color={color} />
      {pendingCount > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export function MainNavigator() {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [newReceiptId, setNewReceiptId] = useState<string | null>(null);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      setPendingRequestCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingCount();

    // Subscribe to friendship changes for real-time badge updates
    const channel = supabase
      .channel('friend-requests-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount]);

  return (
    <NewReceiptContext.Provider value={{ newReceiptId, setNewReceiptId }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="ScanTab"
          component={ScanStack}
          options={{
            tabBarLabel: 'Scan Receipt',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="document-scanner" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="FriendsTab"
          component={FriendsStack}
          options={{
            tabBarLabel: 'Friends',
            tabBarIcon: ({ color }) => (
              <FriendsTabIcon pendingCount={pendingRequestCount} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStack}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NewReceiptContext.Provider>
  );
}
