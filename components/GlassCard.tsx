import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radius } from '@/lib/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, padding = 16, style }: GlassCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.82)',
          borderColor: colors.borderLight,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg - 2,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
});
