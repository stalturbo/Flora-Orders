import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
};

export function GlassCard({ children, style, padding = 16 }: Props) {
  const { colors } = useTheme();
  const r = colors.tokens.radius.md;

  const content = (
    <View style={[styles.inner, { padding }, { borderRadius: r }]}>
      {children}
    </View>
  );

  // Blur норм на iOS/Android, на web иногда выглядит странно — fallback на градиент.
  const useBlur = Platform.OS !== "web";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderRadius: r,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.cardGradientStart, colors.cardGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: r }]}
      />
      {useBlur ? (
        <BlurView
          intensity={18}
          tint={"default"}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />
      ) : null}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
    backgroundColor: "transparent",
  },
  inner: {
    backgroundColor: "transparent",
  },
});
