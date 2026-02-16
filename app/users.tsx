import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { User } from '@/lib/types';
import { UserCard } from '@/components/UserCard';
import { EmployeeStatsModal } from '@/components/EmployeeStatsModal';
import * as Haptics from 'expo-haptics';
import { confirmAction } from '@/lib/confirm';

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { users, refreshUsers, deleteUser } = useData();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUsers();
    setRefreshing(false);
  }, [refreshUsers]);

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Ошибка', 'Нельзя удалить самого себя');
      return;
    }
    
    confirmAction('Удалить сотрудника?', `${user.name} будет удален из системы`, async () => {
      await deleteUser(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  const renderItem = useCallback(({ item }: { item: User }) => (
    <UserCard
      user={item}
      onPress={() => setSelectedUser(item)}
      onEdit={() => router.push(`/user/edit/${item.id}`)}
      onDelete={() => handleDelete(item)}
    />
  ), []);

  const styles = createStyles(colors);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>Нет сотрудников</Text>
      <Text style={styles.emptyText}>Добавьте первого сотрудника</Text>
    </View>
  );

  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + webBottomInset + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + webBottomInset + 24 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/user/create');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <EmployeeStatsModal
        visible={!!selectedUser}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
