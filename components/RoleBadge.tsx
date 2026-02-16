import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserRole, USER_ROLE_LABELS } from '@/lib/types';
import colors from '@/constants/colors';

const ROLE_COLORS: Record<UserRole, string> = {
  MANAGER: colors.roleManager,
  FLORIST: colors.roleFlorist,
  COURIER: colors.roleCourier,
  OWNER: colors.roleOwner,
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const color = ROLE_COLORS[role];
  
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>
        {USER_ROLE_LABELS[role]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
