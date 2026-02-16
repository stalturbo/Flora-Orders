import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Order, UserRole, PaymentStatus, ClientSource, PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '@/context/ThemeContext';
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
  const { colors } = useTheme();
  
  const isOverdue = order.status !== 'DELIVERED' && 
                    order.status !== 'CANCELED' && 
                    order.deliveryDateTime < Date.now();
  
  const showClientData = userRole === 'MANAGER' || userRole === 'OWNER';
  const showAmount = userRole === 'MANAGER' || userRole === 'OWNER';
  const showPhone = userRole !== 'FLORIST';
  
  const hasChatSource = order.clientSource && CHAT_SOURCES.includes(order.clientSource);
  const chatUrl = order.clientSource ? getChatUrl(order.clientSource, order) : null;

  const showSourceChat = hasChatSource && chatUrl && (
    showClientData ||
    (order.clientSource === 'WHATSAPP' && showPhone)
  );

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
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://yandex.ru/maps/?text=${query}`,
    });
    Linking.openURL(url);
    onNavigate?.();
  };

  const handleOpenChat = () => {
    if (!chatUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(chatUrl);
  };

  const styles = createStyles(colors);

  const showActions = showPhone || userRole === 'COURIER' || showSourceChat;
  
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isOverdue && styles.cardOverdue
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {order.orderNumber && (
            <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>#{order.orderNumber}</Text>
          )}
          <StatusBadge status={order.status} size="small" />
        </View>
        {isOverdue && (
          <View style={styles.overdueIndicator}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.overdueText, { color: colors.error }]}>Просрочен</Text>
          </View>
        )}
      </View>
      
      {showClientData && (
        <Text style={styles.clientName}>{order.clientName}</Text>
      )}
      
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText} numberOfLines={1}>{order.address}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, isOverdue && { color: colors.error }]}>
          {format(new Date(order.deliveryDateTime), 'dd MMM, HH:mm', { locale: ru })}
        </Text>
      </View>
      
      {showAmount && (
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.amountText}>{order.amount.toLocaleString()} ₽</Text>
          {order.paymentStatus && (
            <View style={[styles.paymentBadge, { backgroundColor: PAYMENT_STATUS_COLORS[order.paymentStatus] + '20' }]}>
              <View style={[styles.paymentDot, { backgroundColor: PAYMENT_STATUS_COLORS[order.paymentStatus] }]} />
              <Text style={[styles.paymentText, { color: PAYMENT_STATUS_COLORS[order.paymentStatus] }]}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </Text>
            </View>
          )}
        </View>
      )}

      {order.clientSource && (
        showSourceChat ? (
          <Pressable
            style={({ pressed }) => [styles.infoRow, pressed && styles.actionPressed]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleOpenChat();
            }}
          >
            {SOURCE_ICONS[order.clientSource].family === 'mci' ? (
              <MaterialCommunityIcons
                name={SOURCE_ICONS[order.clientSource].name as any}
                size={16}
                color={SOURCE_ICONS[order.clientSource].color}
              />
            ) : (
              <Ionicons
                name={SOURCE_ICONS[order.clientSource].name as any}
                size={16}
                color={SOURCE_ICONS[order.clientSource].color}
              />
            )}
            <Text style={[styles.infoText, { color: SOURCE_ICONS[order.clientSource].color }]}>
              {CLIENT_SOURCE_LABELS[order.clientSource]}
            </Text>
            <Ionicons name="open-outline" size={14} color={SOURCE_ICONS[order.clientSource].color} />
          </Pressable>
        ) : (
          <View style={styles.infoRow}>
            {SOURCE_ICONS[order.clientSource].family === 'mci' ? (
              <MaterialCommunityIcons
                name={SOURCE_ICONS[order.clientSource].name as any}
                size={16}
                color={SOURCE_ICONS[order.clientSource].color}
              />
            ) : (
              <Ionicons
                name={SOURCE_ICONS[order.clientSource].name as any}
                size={16}
                color={SOURCE_ICONS[order.clientSource].color}
              />
            )}
            <Text style={styles.infoText}>{CLIENT_SOURCE_LABELS[order.clientSource]}</Text>
          </View>
        )
      )}
      
      {showActions && (
        <View style={styles.actions}>
          {showPhone && order.clientPhone && (
            <Pressable 
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
            </Pressable>
          )}
          {userRole === 'COURIER' && (
            <Pressable 
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
              onPress={handleNavigate}
            >
              <Ionicons name="navigate" size={18} color={colors.primary} />
            </Pressable>
          )}
          {showSourceChat && order.clientSource === 'WHATSAPP' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: '#25D366' + '15' },
                pressed && styles.actionPressed,
              ]}
              onPress={handleOpenChat}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            </Pressable>
          )}
          {showSourceChat && order.clientSource === 'TELEGRAM' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: '#0088cc' + '15' },
                pressed && styles.actionPressed,
              ]}
              onPress={handleOpenChat}
            >
              <MaterialCommunityIcons name="send" size={18} color="#0088cc" />
            </Pressable>
          )}
          {showSourceChat && order.clientSource === 'INSTAGRAM' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: '#E1306C' + '15' },
                pressed && styles.actionPressed,
              ]}
              onPress={handleOpenChat}
            >
              <MaterialCommunityIcons name="instagram" size={18} color="#E1306C" />
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  clientName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  amountText: {
    fontSize: 15,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    marginLeft: 'auto' as any,
  },
  paymentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
});
