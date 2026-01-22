import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Friends: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
      <Text style={styles.placeholderSubtext}>Coming soon</Text>
    </View>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          title: 'Receipts',
          tabBarLabel: 'Home',
        }}
      >
        {() => <PlaceholderScreen title="Receipts" />}
      </Tab.Screen>
      <Tab.Screen
        name="Scan"
        options={{
          title: 'Scan Receipt',
          tabBarLabel: 'Scan',
        }}
      >
        {() => <PlaceholderScreen title="Scan Receipt" />}
      </Tab.Screen>
      <Tab.Screen
        name="Friends"
        options={{
          title: 'Friends',
          tabBarLabel: 'Friends',
        }}
      >
        {() => <PlaceholderScreen title="Friends" />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      >
        {() => <PlaceholderScreen title="Profile" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#999',
  },
});
