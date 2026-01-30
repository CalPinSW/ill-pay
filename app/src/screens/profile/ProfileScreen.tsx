import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Switch,
  Linking,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/theme';

interface ProfileScreenProps {
  onEditProfile?: () => void;
  onAbout?: () => void;
}

export function ProfileScreen({ onEditProfile, onAbout }: ProfileScreenProps) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { colors, themeMode, setThemeMode } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check if user signed up with email (not OAuth)
  const isEmailUser = user?.app_metadata?.provider === 'email' || !user?.app_metadata?.provider;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.username?.slice(0, 2).toUpperCase() || '??';
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  };

  const handleThemePress = () => {
    Alert.alert(
      'Appearance',
      'Choose your preferred theme',
      [
        { text: 'System', onPress: () => setThemeMode('system') },
        { text: 'Light', onPress: () => setThemeMode('light') },
        { text: 'Dark', onPress: () => setThemeMode('dark') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
          <Text style={[styles.displayName, { color: colors.text }]}>
            {profile?.display_name || profile?.username || 'User'}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile?.username}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Account</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onEditProfile}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Profile</Text>
            <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          {isEmailUser && (
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => setPasswordModalVisible(true)}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Change Password</Text>
              <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleThemePress}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Appearance</Text>
            <View style={styles.menuItemRight}>
              <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>{getThemeLabel()}</Text>
              <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (value) => {
                setNotificationsEnabled(value);
                if (!value) {
                  await Notifications.setBadgeCountAsync(0);
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]} 
            onPress={() => Linking.openURL('https://github.com/CalPinSW/ill-pay/blob/main/PRIVACY_POLICY.md')}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy Policy</Text>
            <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Support</Text>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => Linking.openURL('mailto:support@illpay.app?subject=Help%20Request')}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>Contact Support</Text>
            <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onAbout}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>About</Text>
            <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.error }]} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.inputPlaceholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.inputPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.backgroundTertiary }]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }, isChangingPassword && styles.modalConfirmDisabled]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Change</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemValue: {
    fontSize: 16,
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#999',
  },
  signOutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.7,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
