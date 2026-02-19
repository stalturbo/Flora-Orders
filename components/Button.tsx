import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radius } from '@/lib/tokens';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'secondary': return colors.primary + '12';
      case 'danger': return colors.error;
      case 'success': return colors.success;
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'secondary': return colors.primary;
      default: return '#fff';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 13, paddingHorizontal: 20 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 13;
      case 'large': return 17;
      default: return 15;
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getPadding(),
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={() => {
        if (!disabled && !loading) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[
          styles.text,
          { color: getTextColor(), fontSize: getFontSize() },
        ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
  },
});
