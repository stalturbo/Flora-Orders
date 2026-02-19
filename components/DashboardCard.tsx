import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius, fontSize } from '@/lib/tokens';
import * as Haptics from 'expo-haptics';

interface DashboardCardProps {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

export function DashboardCard({ title, value, icon, color, onPress }: DashboardCardProps) {
  const { colors, isDark } = useTheme();

  const glassBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.82)';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: glassBg,
          borderColor: colors.borderLight,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
        },
        pressed && onPress && styles.cardPressed,
      ]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg - 2,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: 26,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
    textAlign: 'center',
  },
});
