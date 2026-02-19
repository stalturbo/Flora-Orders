import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Order, UserRole, PaymentStatus, ClientSource, PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius, fontSize, touchTarget } from '@/lib/tokens';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

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

const CHAT_SOURCES: ClientSource[] = ['WHATSAPP', 'TELEGRAM', 'INSTAGRAM'];

function getChatUrl(source: ClientSource, order: Order): string | null {
  switch (source) {
    case 'WHATSAPP': {
      const phone = order.clientPhone?.replace(/\D/g, '');
      return phone ? `https://wa.me/${phone}` : null;
    }
    case 'TELEGRAM': {
      const id = order.clientSourceId;
      return id ? `https://t.me/${id}` : null;
    }
    case 'INSTAGRAM': {
      const id = order.clientSourceId?.replace(/^@/, '');
      return id ? `https://www.instagram.com/${id}` : null;
    }
    default:
      return null;
  }
}

interface OrderCardProps {
  order: Order;
  userRole: UserRole;
  onPress: () => void;
  onCall?: () => void;
  onNavigate?: () => void;
}

export function OrderCard({ order, userRole, onPress, onCall, onNavigate }: OrderCardProps) {
  const { colors, isDark } = useTheme();

  const isOverdue = order.status !== 'DELIVERED' &&
                    order.status !== 'CANCELED' &&
                    order.deliveryDateTime < Date.now();

  const showClientData = userRole === 'MANAGER' || userRole === 'OWNER';
  const showAmount = userRole === 'MANAGER' || userRole === 'OWNER';
  const showPhone = userRole !== 'FLORIST';

  const source = order.clientSource;
  const sourceInfo = source ? SOURCE_ICONS[source] : null;
  const hasChatSource = source != null && CHAT_SOURCES.includes(source);
  const chatUrl = source ? getChatUrl(source, order) : null;

  const showSourceChat = hasChatSource && chatUrl && (
    showClientData ||
    (source === 'WHATSAPP' && showPhone)
  );

  const showNavigate = true;
  const hasPhone = showPhone && !!order.clientPhone;
  const hasChat = !!showSourceChat;
  const showActions = hasPhone || hasChat || showNavigate;

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (order.clientPhone) {
      Linking.openURL(`tel:${order.clientPhone}`);
    }
    onCall?.();
  };

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = encodeURIComponent(order.address);
    let url: string;
    if (order.latitude && order.longitude) {
      url = Platform.select({
        ios: `maps:0,0?q=${query}&ll=${order.latitude},${order.longitude}`,
        android: `geo:${order.latitude},${order.longitude}?q=${query}`,
        default: `https://yandex.ru/maps/?pt=${order.longitude},${order.latitude}&z=16&text=${query}`,
      }) as string;
    } else {
      url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
        default: `https://yandex.ru/maps/?text=${query}`,
      }) as string;
    }
    Linking.openURL(url);
    onNavigate?.();
  };

  const handleOpenChat = () => {
    if (!chatUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(chatUrl);
  };

  const glassBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.82)';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: glassBg,
          borderColor: isOverdue ? colors.error + '55' : colors.borderLight,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
        },
        pressed && styles.cardPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {order.orderNumber != null && (
            <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>#{order.orderNumber}</Text>
          )}
          <StatusBadge status={order.status} size="small" />
        </View>
        {isOverdue && (
          <View style={[styles.overdueBadge, { backgroundColor: colors.error + '14' }]}>
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.overdueText, { color: colors.error }]}>Просрочен</Text>
          </View>
        )}
      </View>

      {/* Client name */}
      {showClientData && (
        <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
          {order.clientName}
        </Text>
      )}

      {/* Address */}
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={2}>
          {order.address}
        </Text>
      </View>

      {/* Date/time */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text
          style={[styles.infoText, { color: isOverdue ? colors.error : colors.textSecondary }]}
          numberOfLines={1}
        >
          {format(new Date(order.deliveryDateTime), 'dd MMM, HH:mm', { locale: ru })}
        </Text>
      </View>

      {/* Payment row */}
      {showAmount && (
        <View style={styles.paymentRow}>
          <Ionicons name="cash-outline" size={16} color={colors.primary} />
          <Text style={[styles.amountText, { color: colors.primary }]}>
            {order.amount.toLocaleString()} ₽
          </Text>
          {order.paymentStatus && (
            <View style={[styles.payBadge, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.payBadgeText, { color: colors.primary }]}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Source row */}
      {source && sourceInfo && (
        showSourceChat ? (
          <Pressable
            style={({ pressed }) => [styles.sourceRow, pressed && styles.sourcePressed]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleOpenChat();
            }}
          >
            <View style={[styles.sourceIcon, { backgroundColor: sourceInfo.color + '14' }]}>
              {sourceInfo.family === 'mci' ? (
                <MaterialCommunityIcons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
              ) : (
                <Ionicons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
              )}
            </View>
            <Text style={[styles.sourceText, { color: sourceInfo.color }]} numberOfLines={1}>
              {CLIENT_SOURCE_LABELS[source]}
            </Text>
            <Ionicons name="open-outline" size={13} color={sourceInfo.color} style={{ marginLeft: 'auto' }} />
          </Pressable>
        ) : (
          <View style={styles.sourceRow}>
            <View style={[styles.sourceIcon, { backgroundColor: sourceInfo.color + '14' }]}>
              {sourceInfo.family === 'mci' ? (
                <MaterialCommunityIcons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
              ) : (
                <Ionicons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
              )}
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]} numberOfLines={1}>
              {CLIENT_SOURCE_LABELS[source]}
            </Text>
          </View>
        )
      )}

      {/* Actions */}
      {showActions && (
        <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
          {hasPhone && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary + '12' },
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
            </Pressable>
          )}
          {showNavigate && (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                { backgroundColor: colors.primary + '14', borderColor: colors.primary + '25' },
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleNavigate}
            >
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={[styles.navBtnText, { color: colors.primary }]}>Маршрут</Text>
            </Pressable>
          )}
          {hasChat && source && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: SOURCE_ICONS[source].color + '12' },
                pressed && styles.actionBtnPressed,
              ]}
              onPress={handleOpenChat}
            >
              {SOURCE_ICONS[source].family === 'mci' ? (
                <MaterialCommunityIcons name={SOURCE_ICONS[source].name as any} size={18} color={SOURCE_ICONS[source].color} />
              ) : (
                <Ionicons name={SOURCE_ICONS[source].name as any} size={18} color={SOURCE_ICONS[source].color} />
              )}
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg - 2,
    borderWidth: 1,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_600SemiBold',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  overdueText: {
    fontSize: fontSize.badge,
    fontFamily: 'Inter_600SemiBold',
  },
  clientName: {
    fontSize: fontSize.title,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.body,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  amountText: {
    fontSize: fontSize.body + 1,
    fontFamily: 'Inter_600SemiBold',
  },
  payBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginLeft: 'auto' as any,
  },
  payBadgeText: {
    fontSize: fontSize.badge,
    fontFamily: 'Inter_600SemiBold',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  sourcePressed: {
    opacity: 0.7,
  },
  sourceIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceText: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: touchTarget.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: touchTarget.min,
    paddingHorizontal: 14,
    borderRadius: touchTarget.min / 2,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_600SemiBold',
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
});
