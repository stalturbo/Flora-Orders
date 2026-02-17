import React from "react";
import { View, Text, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Order,
  UserRole,
  ClientSource,
  PAYMENT_STATUS_LABELS,
  CLIENT_SOURCE_LABELS,
} from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { useTheme } from "@/context/ThemeContext";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";

const SOURCE_ICONS: Record<
  ClientSource,
  { name: string; family: "ionicons" | "mci"; color: string }
> = {
  PHONE: { name: "call-outline", family: "ionicons", color: "#607D8B" },
  WHATSAPP: { name: "whatsapp", family: "mci", color: "#25D366" },
  TELEGRAM: { name: "send", family: "mci", color: "#0088cc" },
  INSTAGRAM: { name: "instagram", family: "mci", color: "#E1306C" },
  WEBSITE: { name: "web", family: "mci", color: "#2196F3" },
  OTHER: { name: "dots-horizontal", family: "mci", color: "#9E9E9E" },
};

const CHAT_SOURCES: ClientSource[] = ["WHATSAPP", "TELEGRAM", "INSTAGRAM"];

function getChatUrl(source: ClientSource, order: Order): string | null {
  switch (source) {
    case "WHATSAPP": {
      const phone = order.clientPhone?.replace(/\D/g, "");
      return phone ? `https://wa.me/${phone}` : null;
    }
    case "TELEGRAM": {
      const id = order.clientSourceId;
      return id ? `https://t.me/${id}` : null;
    }
    case "INSTAGRAM": {
      const id = order.clientSourceId?.replace(/^@/, "");
      return id ? `https://www.instagram.com/${id}` : null;
    }
    default:
      return null;
  }
}

interface OrderCardProps {
  order: Order;
  userRole: UserRole;
  onPress: () => void;
  onCall?: () => void;
  onNavigate?: () => void;
}

export function OrderCard({ order, userRole, onPress, onCall, onNavigate }: OrderCardProps) {
  const { colors } = useTheme();

  const isOverdue =
    order.status !== "DELIVERED" &&
    order.status !== "CANCELED" &&
    order.deliveryDateTime < Date.now();

  const showClientData = userRole === "MANAGER" || userRole === "OWNER";
  const showAmount = userRole === "MANAGER" || userRole === "OWNER";
  const showPhone = userRole !== "FLORIST";

  const hasChatSource = order.clientSource && CHAT_SOURCES.includes(order.clientSource);
  const chatUrl = order.clientSource ? getChatUrl(order.clientSource, order) : null;

  const showSourceChat =
    !!order.clientSource &&
    !!chatUrl &&
    hasChatSource &&
    (showClientData || (order.clientSource === "WHATSAPP" && showPhone));

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (order.clientPhone) Linking.openURL(`tel:${order.clientPhone}`);
    onCall?.();
  };

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = encodeURIComponent(order.address);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://yandex.ru/maps/?text=${query}`,
    }) as string;
    Linking.openURL(url);
    onNavigate?.();
  };

  const handleOpenChat = () => {
    if (!chatUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(chatUrl);
  };

  const showActions = showPhone || userRole === "COURIER" || showSourceChat;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.wrap,
        pressed && { opacity: 0.96, transform: [{ scale: 0.995 }] },
      ]}
    >
      <GlassCard style={[styles.card, isOverdue && { borderColor: colors.error + "55" }]} padding={16}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {order.orderNumber ? (
              <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>
                #{order.orderNumber}
              </Text>
            ) : null}
            <StatusBadge status={order.status} size="small" />
          </View>

          {isOverdue ? (
            <View style={[styles.overdue, { backgroundColor: colors.error + "12" }]}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.overdueText, { color: colors.error }]}>Просрочен</Text>
            </View>
          ) : null}
        </View>

        {/* Main */}
        {showClientData ? (
          <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
            {order.clientName}
          </Text>
        ) : null}

        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={2}>
            {order.address}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {format(new Date(order.deliveryDateTime), "dd MMM, HH:mm", { locale: ru })}
          </Text>
        </View>

        {showAmount ? (
          <View style={[styles.row, { marginTop: 2 }]}>
            <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.amount, { color: colors.primary }]}>
              {order.amount.toLocaleString()} ₽
            </Text>

            {order.paymentStatus ? (
              <View style={[styles.payBadge, { backgroundColor: colors.primary + "12" }]}>
                <Text style={[styles.payText, { color: colors.primary }]}>
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {order.clientSource ? (
          <Pressable
            onPress={(e) => {
              // @ts-ignore
              e.stopPropagation?.();
              if (showSourceChat) handleOpenChat();
            }}
            style={({ pressed }) => [
              styles.sourceRow,
              pressed && showSourceChat ? { opacity: 0.7 } : null,
            ]}
            disabled={!showSourceChat}
          >
            <View style={[styles.sourceIcon, { backgroundColor: SOURCE_ICONS[order.clientSource].color + "14" }]}>
              {SOURCE_ICONS[order.clientSource].family === "mci" ? (
                <MaterialCommunityIcons
                  name={SOURCE_ICONS[order.clientSource].name as any}
                  size={16}
                  color={SOURCE_ICONS[order.clientSource].color}
                />
              ) : (
                <Ionicons
                  name={SOURCE_ICONS[order.clientSource].name as any}
                  size={16}
                  color={SOURCE_ICONS[order.clientSource].color}
                />
              )}
            </View>
            <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
              {CLIENT_SOURCE_LABELS[order.clientSource]}
            </Text>
            {showSourceChat ? (
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            ) : null}
          </Pressable>
        ) : null}

        {showActions ? (
          <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
            {showPhone && order.clientPhone ? (
              <Pressable
                onPress={handleCall}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.primary + "12", borderColor: colors.borderLight },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
              </Pressable>
            ) : null}

            {userRole === "COURIER" ? (
              <Pressable
                onPress={handleNavigate}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.primary + "12", borderColor: colors.borderLight },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              </Pressable>
            ) : null}

            {showSourceChat && order.clientSource ? (
              <Pressable
                onPress={handleOpenChat}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: SOURCE_ICONS[order.clientSource].color + "14",
                    borderColor: colors.borderLight,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                {SOURCE_ICONS[order.clientSource].family === "mci" ? (
                  <MaterialCommunityIcons
                    name={SOURCE_ICONS[order.clientSource].name as any}
                    size={18}
                    color={SOURCE_ICONS[order.clientSource].color}
                  />
                ) : (
                  <Ionicons
                    name={SOURCE_ICONS[order.clientSource].name as any}
                    size={18}
                    color={SOURCE_ICONS[order.clientSource].color}
                  />
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderNumber: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  overdue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  overdueText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  clientName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  amount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  payBadge: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  payText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  sourceRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});

