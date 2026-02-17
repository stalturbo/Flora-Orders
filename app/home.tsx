import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { Order, OrderStatus } from '@/lib/types';
import { OrderCard } from '@/components/OrderCard';
import { StatusFilter } from '@/components/StatusFilter';
import { SearchBar } from '@/components/SearchBar';
import { DashboardCard } from '@/components/DashboardCard';
import * as Haptics from 'expo-haptics';
import { IconButton } from "@/components/IconButton";

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, organization, logout, isLoading: authLoading } = useAuth();
  const { orders, refreshOrders, isLoading } = useData();
  const { colors } = useTheme();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser]);

  if (authLoading || !currentUser) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const role = currentUser?.role;
  const isManager = role === 'MANAGER';
  const isFlorist = role === 'FLORIST';
  const isCourier = role === 'COURIER';
  const isOwner = role === 'OWNER';

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (selectedStatus !== 'ALL') {
      result = result.filter(o => o.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      const orderNumberMatch = query.match(/^#(\d+)$/);
      if (orderNumberMatch) {
        const num = parseInt(orderNumberMatch[1], 10);
        result = result.filter(order => order.orderNumber === num);
        return result;
      }

      const queryWords = query.split(/\s+/);

      const scored = result.map(order => {
        const fields = [
          order.clientName.toLowerCase(),
          order.clientPhone,
          order.address.toLowerCase(),
          (order.comment || '').toLowerCase(),
          String(order.orderNumber || ''),
        ];
        const combined = fields.join(' ');

        let exactMatch = queryWords.every(w => combined.includes(w));
        if (exactMatch) return { order, score: 100 };

        let fuzzyScore = 0;
        for (const word of queryWords) {
          for (const field of fields) {
            if (field.includes(word)) {
              fuzzyScore += 50;
              break;
            }
            const fieldWords = field.split(/[\s,.-]+/);
            for (const fw of fieldWords) {
              const dist = levenshtein(word, fw);
              const maxLen = Math.max(word.length, fw.length);
              if (maxLen > 0 && dist <= Math.max(1, Math.floor(maxLen * 0.35))) {
                fuzzyScore += Math.max(1, 30 - dist * 10);
                break;
              }
            }
          }
        }

        return { order, score: fuzzyScore };
      });

      result = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.order);
    } else {
      result = result.sort((a, b) => a.deliveryDateTime - b.deliveryDateTime);
    }

    return result;
  }, [orders, selectedStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | 'ALL', number> = {
      ALL: orders.length,
      NEW: 0,
      IN_WORK: 0,
      ASSEMBLED: 0,
      ON_DELIVERY: 0,
      DELIVERED: 0,
      CANCELED: 0,
    };

    orders.forEach(o => {
      counts[o.status]++;
    });

    return counts;
  }, [orders]);

  const overdueOrders = useMemo(() => {
    return orders.filter(o =>
      o.status !== 'DELIVERED' &&
      o.status !== 'CANCELED' &&
      o.deliveryDateTime < Date.now()
    );
  }, [orders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  }, [refreshOrders]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const styles = createStyles(colors);

  const headerButtons = useMemo(() => {
    const buttons: Array<{ icon: string; color: string; route: string }> = [];
    if (isFlorist || isCourier) buttons.push({ icon: 'hand-left-outline', color: colors.primary, route: '/available-orders' });
    if (isOwner) buttons.push({ icon: 'wallet-outline', color: colors.primary, route: '/financial-reports' });
    if (isOwner) buttons.push({ icon: 'receipt-outline', color: colors.primary, route: '/expenses' });
    if (isOwner || isManager) buttons.push({ icon: 'map-outline', color: colors.primary, route: '/delivery-map' });
    if (isOwner || isManager) buttons.push({ icon: 'stats-chart', color: colors.primary, route: '/reports' });
    if (isOwner) buttons.push({ icon: 'people', color: colors.primary, route: '/users' });
    buttons.push({ icon: 'settings-outline', color: colors.textSecondary, route: '/settings' });
    return buttons;
  }, [isOwner, isManager, isFlorist, isCourier, colors]);

  const renderHeader = () => (
  <View>
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + webTopInset + 16 },
      ]}
    >
      {/* ===== Верхняя строка ===== */}
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={styles.orgName} numberOfLines={1}>
            {organization?.name}
          </Text>
          <Text style={styles.userName} numberOfLines={1}>
            {currentUser?.name}
          </Text>
        </View>

        {/* Settings — делаем акцентной */}
        <IconButton
          icon="settings-outline"
          size={44}
          variant="primary"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings");
          }}
        />
      </View>

      {/* ===== Горизонтальные действия ===== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.headerActions}
      >
        {headerButtons
          .filter((b) => b.route !== "/settings")
          .map((btn) => (
            <IconButton
              key={btn.route}
              icon={btn.icon as any}
              size={42}
              variant="surface"
              onPress={() => {
                Haptics.impactAsync(
                  Haptics.ImpactFeedbackStyle.Light
                );
                router.push(btn.route as any);
              }}
              style={{ marginRight: 10 }}
            />
          ))}
      </ScrollView>
    </View>

    {/* ===== Dashboard ===== */}
    {isOwner && (
      <View style={styles.dashboard}>
        <View style={styles.dashboardRow}>
          <DashboardCard
            title="Новых"
            value={statusCounts.NEW}
            icon="add-circle"
            color={colors.statusNew}
            onPress={() => setSelectedStatus("NEW")}
          />
          <DashboardCard
            title="В работе"
            value={statusCounts.IN_WORK}
            icon="construct"
            color={colors.statusInWork}
            onPress={() => setSelectedStatus("IN_WORK")}
          />
        </View>
        <View style={styles.dashboardRow}>
          <DashboardCard
            title="В доставке"
            value={statusCounts.ON_DELIVERY}
            icon="car"
            color={colors.statusOnDelivery}
            onPress={() => setSelectedStatus("ON_DELIVERY")}
          />
          <DashboardCard
            title="Просрочено"
            value={overdueOrders.length}
            icon="alert-circle"
            color={colors.error}
          />
        </View>
      </View>
    )}

    {/* ===== Поиск ===== */}
    {(isManager || isOwner) && (
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Поиск по имени, телефону, адресу..."
        />
      </View>
    )}

    {/* ===== Фильтр статусов ===== */}
    <StatusFilter
      selectedStatus={selectedStatus}
      onSelect={setSelectedStatus}
      counts={statusCounts}
    />
  </View>
);


  const renderItem = useCallback(({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      userRole={currentUser?.role || 'MANAGER'}
      onPress={() => router.push(`/order/${item.id}`)}
    />
  ), [currentUser?.role]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>Нет заказов</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Заказы появятся здесь'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: insets.bottom + webBottomInset + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {(isManager || isOwner) && (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + webBottomInset + 24 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/order/create');
          }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.surface,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  orgName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchContainer: {
    paddingTop: 8,
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
