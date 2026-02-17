import React from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const pad =
    size === "small"
      ? { paddingVertical: 10, paddingHorizontal: 14 }
      : size === "large"
      ? { paddingVertical: 16, paddingHorizontal: 20 }
      : { paddingVertical: 13, paddingHorizontal: 18 };

  const fontSize = size === "small" ? 13 : size === "large" ? 16 : 14;

  const radius = colors.tokens.radius.md;

  const isSolid = variant === "primary" || variant === "danger" || variant === "success";

  const textColor =
    disabled
      ? colors.textMuted
      : variant === "secondary"
      ? colors.primary
      : "#fff";

  const borderColor =
    variant === "secondary" ? colors.border : "transparent";

  const bgSecondary = colors.surfaceSecondary;

  const solidGradient =
    variant === "danger"
      ? ["#EF4444", "#B91C1C"]
      : variant === "success"
      ? ["#10B981", "#059669"]
      : [colors.primary, colors.primaryDark];

  return (
    <Pressable
      onPress={() => {
        if (!disabled && !loading) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { borderRadius: radius, borderColor },
        pad,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isSolid ? (
        <LinearGradient
          colors={disabled ? [colors.border, colors.border] : (solidGradient as any)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: bgSecondary, borderRadius: radius },
          ]}
        />
      )}

      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.85,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});

