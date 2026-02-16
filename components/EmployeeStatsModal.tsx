import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { User, Order, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS, PaymentStatus, ClientSource } from '@/lib/types';
import { RoleBadge } from '@/components/RoleBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';

interface EmployeeStatsModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

type OrderListType = 'created' | 'assembled' | 'delivered' | 'canceled' | 'assigned_florist' | 'assigned_courier' | 'active_florist' | 'active_courier';

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  NOT_PAID: '#F44336',
  ADVANCE: '#FF9800',
  PAID: '#4CAF50',
};

const SOURCE_ICONS: Record<ClientSource, { name: string; family: 'ionicons' | 'mci'; color: string }> = {
  PHONE: { name: 'call-outline', family: 'ionicons', color: '#607D8B' },
  WHATSAPP: { name: 'whatsapp', family: 'mci', color: '#25D366' },
  TELEGRAM: { name: 'send', family: 'mci', color: '#0088cc' },
  INSTAGRAM: { name: 'instagram', family: 'mci', color: '#E1306C' },
  WEBSITE: { name: 'web', family: 'mci', color: '#2196F3' },
  OTHER: { name: 'dots-horizontal', family: 'mci', color: '#9E9E9E' },
};

const ORDER_TYPE_TITLES: Record<OrderListType, string> = {
  created: 'Созданные заказы',
  assembled: 'Собранные заказы',
  delivered: 'Доставленные заказы',
  canceled: 'Отмененные заказы',
  assigned_florist: 'Назначенные заказы',
  assigned_courier: 'Назначенные доставки',
  active_florist: 'Активные заказы',
  active_courier: 'Активные доставки',
};

export function EmployeeStatsModal({ visible, user, onClose }: EmployeeStatsModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [view, setView] = useState<'stats' | 'orders'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [orders, setOrders] = useState<(Order & { actionTimestamp: number })[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderListTitle, setOrderListTitle] = useState('');

  useEffect(() => {
    if (visible && user) {
      setView('stats');
      setStats(null);
      setOrders([]);
      setStatsLoading(true);
      api.stats.employee(user.id)
        .then(setStats)
        .catch((err) => console.error('Error loading employee stats:', err))
        .finally(() => setStatsLoading(false));
    }
  }, [visible, user?.id]);

  const handleOpenOrders = useCallback(async (type: OrderListType, count: number) => {
    if (count === 0 || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOrderListTitle(ORDER_TYPE_TITLES[type]);
    setView('orders');
    setOrdersLoading(true);
    try {
      const result = await api.stats.employeeOrders(user.id, type);
      setOrders(result);
    } catch (error) {
      console.error('Error loading employee orders:', error);
      setOrders([]);
    }
    setOrdersLoading(false);
  }, [user]);

  const handleOrderPress = useCallback((orderId: string) => {
    onClose();
    router.push(`/order/${orderId}`);
  }, [onClose]);

  const handleEditProfile = useCallback(() => {
    if (!user) return;
    onClose();
    router.push(`/user/edit/${user.id}`);
  }, [user, onClose]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    setView('stats');
  }, []);

  const renderStatCard = (
    icon: string,
    iconColor: string,
    label: string,
    value: number,
    type: OrderListType,
    iconFamily: 'ionicons' | 'mci' = 'ionicons'
  ) => {
    const tappable = value > 0;
    return (
      <Pressable
        key={label}
        style={[styles.statCard, tappable && styles.statCardTappable]}
        onPress={() => tappable && handleOpenOrders(type, value)}
        disabled={!tappable}
      >
        <View style={[styles.statIconContainer, { backgroundColor: iconColor + '15' }]}>
          {iconFamily === 'mci' ? (
            <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
          ) : (
            <Ionicons name={icon as any} size={22} color={iconColor} />
          )}
        </View>
        <Text style={[styles.statValue, { color: tappable ? iconColor : colors.textMuted }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {tappable && (
          <Ionicons name="chevron-forward" size={14} color={iconColor} style={styles.statChevron} />
        )}
      </Pressable>
    );
  };

  const renderStatsView = () => {
    if (statsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Загрузка статистики...</Text>
        </View>
      );
    }

    if (!stats || !user) return null;

    const role = user.role;
    const statCards: React.ReactNode[] = [];

    if (role === 'MANAGER' || role === 'OWNER') {
      statCards.push(renderStatCard('add-circle-outline', colors.primary, 'Создано заказов', stats.ordersCreated, 'created'));
      const revTappable = stats.ordersCreated > 0;
      statCards.push(
        <Pressable
          key="revenue"
          style={[styles.statCard, revTappable && styles.statCardTappable]}
          onPress={() => revTappable && handleOpenOrders('created', stats.ordersCreated)}
          disabled={!revTappable}
        >
          <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="cash-outline" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {(stats.totalRevenueAsManager / 1000).toFixed(0)}к
          </Text>
          <Text style={styles.statLabel}>Выручка</Text>
          {revTappable && (
            <Ionicons name="chevron-forward" size={14} color={colors.primary} style={styles.statChevron} />
          )}
        </Pressable>
      );
    }

    if (role === 'FLORIST') {
      statCards.push(renderStatCard('flower-outline', '#E91E63', 'Собрано заказов', stats.ordersAssembled, 'assembled'));
      statCards.push(renderStatCard('bookmark-outline', '#E91E63', 'Назначено', stats.assignedAsFlorist, 'assigned_florist'));
      statCards.push(renderStatCard('flash-outline', '#FF9800', 'Активных', stats.activeAsFlorist, 'active_florist'));
    }

    if (role === 'COURIER') {
      statCards.push(renderStatCard('car-outline', '#2196F3', 'Доставлено', stats.ordersDelivered, 'delivered'));
      statCards.push(renderStatCard('bookmark-outline', '#2196F3', 'Назначено', stats.assignedAsCourier, 'assigned_courier'));
      statCards.push(renderStatCard('flash-outline', '#FF9800', 'Активных', stats.activeAsCourier, 'active_courier'));
    }

    if (stats.canceledByUser > 0) {
      statCards.push(renderStatCard('close-circle-outline', colors.error, 'Отменено', stats.canceledByUser, 'canceled'));
    }

    return (
      <View style={styles.statsContent}>
        <View style={styles.statsGrid}>
          {statCards}
        </View>

        <Pressable style={styles.editButton} onPress={handleEditProfile}>
          <Ionicons name="pencil" size={18} color={colors.primary} />
          <Text style={styles.editButtonText}>Редактировать профиль</Text>
        </Pressable>
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: Order & { actionTimestamp: number } }) => {
    const sourceInfo = item.clientSource ? SOURCE_ICONS[item.clientSource] : null;

    return (
      <Pressable
        style={styles.orderItem}
        onPress={() => handleOrderPress(item.id)}
      >
        <View style={styles.orderItemHeader}>
          <StatusBadge status={item.status} size="small" />
          {item.paymentStatus && (
            <View style={[styles.paymentBadge, { backgroundColor: PAYMENT_STATUS_COLORS[item.paymentStatus] + '20' }]}>
              <View style={[styles.paymentDot, { backgroundColor: PAYMENT_STATUS_COLORS[item.paymentStatus] }]} />
              <Text style={[styles.paymentBadgeText, { color: PAYMENT_STATUS_COLORS[item.paymentStatus] }]}>
                {PAYMENT_STATUS_LABELS[item.paymentStatus]}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.orderClientName}>{item.clientName}</Text>

        <View style={styles.orderInfoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.orderInfoText} numberOfLines={1}>{item.address}</Text>
        </View>

        <View style={styles.orderInfoRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.orderInfoText}>
            {format(new Date(item.deliveryDateTime), 'dd MMM yyyy, HH:mm', { locale: ru })}
          </Text>
        </View>

        <View style={styles.orderInfoRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.orderInfoText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {item.amount.toLocaleString()} ₽
          </Text>
        </View>

        {sourceInfo && (
          <View style={styles.orderInfoRow}>
            {sourceInfo.family === 'mci' ? (
              <MaterialCommunityIcons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
            ) : (
              <Ionicons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
            )}
            <Text style={styles.orderInfoText}>{CLIENT_SOURCE_LABELS[item.clientSource!]}</Text>
          </View>
        )}

        <View style={styles.orderActionTime}>
          <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
          <Text style={[styles.orderInfoText, { color: colors.primary }]}>
            {format(new Date(item.actionTimestamp), 'dd MMM yyyy, HH:mm', { locale: ru })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderOrdersView = () => {
    if (ordersLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Загрузка заказов...</Text>
        </View>
      );
    }

    if (orders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Нет заказов</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.orderCount}>
            {orders.length} {orders.length === 1 ? 'заказ' : orders.length < 5 ? 'заказа' : 'заказов'}
          </Text>
        }
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'web' ? 20 : insets.top }]}>
        <View style={styles.modalHeader}>
          <Pressable
            onPress={view === 'orders' ? handleBack : onClose}
            style={styles.modalCloseBtn}
          >
            <Ionicons
              name={view === 'orders' ? 'arrow-back' : 'close'}
              size={24}
              color={colors.text}
            />
          </Pressable>
          <View style={styles.modalTitleContainer}>
            {view === 'stats' && user ? (
              <>
                <Text style={styles.modalTitle}>{user.name}</Text>
                <View style={styles.modalRoleBadge}>
                  <RoleBadge role={user.role} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{orderListTitle}</Text>
                {user && <Text style={styles.modalSubtitle}>{user.name}</Text>}
              </>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {view === 'stats' ? renderStatsView() : renderOrdersView()}
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  modalRoleBadge: {
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
  },
  statsContent: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: '45%',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  statCardTappable: {
    borderColor: colors.primary + '30',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
  },
  statChevron: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
  },
  editButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  orderCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: 8,
  },
  orderItem: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  paymentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  orderClientName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 6,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
  },
  orderActionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
