import React from 'react';
import { Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { OrderStatus, ORDER_STATUS_LABELS } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius, fontSize } from '@/lib/tokens';
import * as Haptics from 'expo-haptics';

interface StatusFilterProps {
  selectedStatus: OrderStatus | 'ALL';
  onSelect: (status: OrderStatus | 'ALL') => void;
  counts?: Record<OrderStatus | 'ALL', number>;
}

export function StatusFilter({ selectedStatus, onSelect, counts }: StatusFilterProps) {
  const { colors } = useTheme();

  const statusColors: Record<OrderStatus | 'ALL', string> = {
    ALL: colors.primary,
    NEW: colors.statusNew,
    IN_WORK: colors.statusInWork,
    ASSEMBLED: colors.statusAssembled,
    ON_DELIVERY: colors.statusOnDelivery,
    DELIVERED: colors.statusDelivered,
    CANCELED: colors.statusCanceled,
  };

  const statuses: (OrderStatus | 'ALL')[] = [
    'ALL', 'NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED',
  ];

  const labels: Record<OrderStatus | 'ALL', string> = {
    ALL: 'Все',
    ...ORDER_STATUS_LABELS,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {statuses.map(status => {
        const isSelected = selectedStatus === status;
        const color = statusColors[status];
        const count = counts?.[status];

        return (
          <Pressable
            key={status}
            style={[
              styles.chip,
              isSelected
                ? { backgroundColor: color }
                : { backgroundColor: color + '12' },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(status);
            }}
          >
            <Text style={[
              styles.chipText,
              { color: isSelected ? '#fff' : color },
            ]}>
              {labels[status]}
              {count !== undefined ? ` (${count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_600SemiBold',
  },
});
