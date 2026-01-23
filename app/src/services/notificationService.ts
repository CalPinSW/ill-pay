import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  return {
    token: tokenData.data,
    platform,
  };
}

/**
 * Save push token to user's profile
 */
export async function savePushToken(token: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userData.user.id);
}

/**
 * Remove push token from user's profile (on logout)
 */
export async function removePushToken(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userData.user.id);
}

/**
 * Send a local notification (for testing)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // immediate
  });
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export type NotificationType = 
  | 'friend_request'
  | 'friend_accepted'
  | 'receipt_invitation'
  | 'settlement_reminder';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Create notification payloads for different events
 */
export const NotificationTemplates = {
  friendRequest: (fromUsername: string): NotificationPayload => ({
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${fromUsername} wants to be your friend`,
    data: { screen: 'FriendRequests' },
  }),

  friendAccepted: (username: string): NotificationPayload => ({
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    body: `${username} accepted your friend request`,
    data: { screen: 'Friends' },
  }),

  receiptInvitation: (fromUsername: string, restaurantName: string): NotificationPayload => ({
    type: 'receipt_invitation',
    title: 'Receipt Shared With You',
    body: `${fromUsername} shared a receipt from ${restaurantName}`,
    data: { screen: 'Home' },
  }),

  settlementReminder: (restaurantName: string, amount: string): NotificationPayload => ({
    type: 'settlement_reminder',
    title: 'Settlement Reminder',
    body: `You owe ${amount} for ${restaurantName}`,
    data: { screen: 'Home' },
  }),
};
