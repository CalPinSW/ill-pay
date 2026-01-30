import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { inviteFriendToReceipt, getReceiptParticipants } from '@/services/sharingService';
import { useTheme } from '@/theme';

interface InviteFriendsScreenProps {
  receiptId: string;
  onBack: () => void;
}

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  isInvited: boolean;
}

export function InviteFriendsScreen({ receiptId, onBack }: InviteFriendsScreenProps) {
  const { colors } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFriendsAndParticipants();
  }, []);

  const fetchFriendsAndParticipants = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select(
          `
          user_id,
          friend_id,
          user:profiles!friendships_user_id_fkey(id, username, display_name, avatar_url),
          friend:profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url)
        `
        )
        .eq('status', 'accepted')
        .or(`user_id.eq.${userData.user.id},friend_id.eq.${userData.user.id}`);

      if (friendsError) throw friendsError;

      const participants = await getReceiptParticipants(receiptId);
      const participantIds = new Set((participants || []).map((p: any) => p.user_id));

      const friendsList: Friend[] = (friendships || []).map((f: any) => {
        const friendProfile =
          f.user_id === userData.user?.id
            ? Array.isArray(f.friend)
              ? f.friend[0]
              : f.friend
            : Array.isArray(f.user)
              ? f.user[0]
              : f.user;

        return {
          id: friendProfile.id,
          username: friendProfile.username,
          display_name: friendProfile.display_name,
          avatar_url: friendProfile.avatar_url,
          isInvited: participantIds.has(friendProfile.id),
        };
      });

      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (friendId: string) => {
    setInvitingId(friendId);
    try {
      await inviteFriendToReceipt(receiptId, friendId);
      setFriends(friends.map((f) => (f.id === friendId ? { ...f, isInvited: true } : f)));
    } catch (error) {
      console.error('Error inviting friend:', error);
      Alert.alert('Error', 'Failed to invite friend');
    } finally {
      setInvitingId(null);
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={[styles.friendRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>
          {(item.display_name || item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: colors.text }]}>
          {item.display_name || item.username}
        </Text>
        <Text style={[styles.friendUsername, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>
      {item.isInvited ? (
        <View style={[styles.invitedBadge, { backgroundColor: colors.backgroundTertiary }]}>
          <Text style={[styles.invitedText, { color: colors.textSecondary }]}>Invited</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: colors.primary }]}
          onPress={() => handleInvite(item.id)}
          disabled={invitingId === item.id}
        >
          {invitingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.inviteButtonText}>Invite</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.text }]}>No friends yet</Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Add friends to invite them to split receipts
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invite Friends</Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={friends.length === 0 ? styles.emptyList : styles.list}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  invitedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  invitedText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
});
