import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "surface" | "primary";
  size?: number; // px
  style?: ViewStyle;
};

export function IconButton({
  icon,
  onPress,
  variant = "surface",
  size = 42,
  style,
}: Props) {
  const { colors } = useTheme();
  const r = size / 2;

  const bg =
    variant === "primary" ? colors.primary : colors.surfaceSecondary;

  const iconColor =
    variant === "primary" ? "#fff" : colors.textSecondary;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: bg,
          borderColor: colors.borderLight,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
