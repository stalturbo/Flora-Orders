import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatus, ORDER_STATUS_LABELS } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const { colors } = useTheme();
  
  const statusColors: Record<OrderStatus, string> = {
    NEW: colors.statusNew,
    IN_WORK: colors.statusInWork,
    ASSEMBLED: colors.statusAssembled,
    ON_DELIVERY: colors.statusOnDelivery,
    DELIVERED: colors.statusDelivered,
    CANCELED: colors.statusCanceled,
  };
  
  const color = statusColors[status];
  const isSmall = size === 'small';
  
  return (
    <View style={[
      styles.badge,
      { backgroundColor: color + '20' },
      isSmall && styles.badgeSmall
    ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[
        styles.text,
        { color },
        isSmall && styles.textSmall
      ]}>
        {ORDER_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  textSmall: {
    fontSize: 11,
  },
});
