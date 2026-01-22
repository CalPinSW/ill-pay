import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { HomeScreen } from '@/screens/home';
import { ScanScreen } from '@/screens/scan';
import { FriendsScreen, SearchUsersScreen, FriendRequestsScreen } from '@/screens/friends';
import { ProfileScreen, EditProfileScreen } from '@/screens/profile';

export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  FriendsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function HomeStack() {
  return <HomeScreen />;
}

function ScanStack() {
  return <ScanScreen />;
}

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
