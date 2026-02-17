import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";

interface DashboardCardProps {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

export function DashboardCard({ title, value, icon, color, onPress }: DashboardCardProps) {
  const { colors } = useTheme();
  const r = colors.tokens.radius.md;

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={!onPress}
      style={({ pressed }) => [
        { flex: 1 },
        pressed && onPress ? { opacity: 0.94, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <GlassCard style={[styles.card, { borderRadius: r }]} padding={16}>
        <View style={[styles.icon, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        <View style={[styles.leftAccent, { backgroundColor: color }]} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  leftAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 4,
    opacity: 0.9,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    textAlign: "center",
  },
});

