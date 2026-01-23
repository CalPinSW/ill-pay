import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export type NotificationScreen = 'FriendRequests' | 'Friends' | 'Home';

export function navigateFromNotification(screen: NotificationScreen) {
  if (!navigationRef.isReady()) return;

  switch (screen) {
    case 'FriendRequests':
      navigationRef.navigate('FriendsTab', { screen: 'requests' });
      break;
    case 'Friends':
      navigationRef.navigate('FriendsTab');
      break;
    case 'Home':
    default:
      navigationRef.navigate('HomeTab');
      break;
  }
}
