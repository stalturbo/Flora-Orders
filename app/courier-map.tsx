import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getApiUrl } from '@/lib/query-client';
import { getToken } from '@/lib/api';
import { spacing, radius, fontSize } from '@/lib/tokens';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CourierOrder {
  id: string;
  orderNumber: number | null;
  clientName: string;
  address: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  deliveryDateTime: number | null;
  amount: number | null;
  comment: string | null;
}

const statusColors: Record<string, string> = {
  NEW: '#2196F3',
  IN_WORK: '#FF9800',
  ASSEMBLED: '#9C27B0',
  ON_DELIVERY: '#FF5722',
  DELIVERED: '#4CAF50',
  CANCELED: '#757575',
};

const statusLabels: Record<string, string> = {
  NEW: 'Новый',
  IN_WORK: 'В работе',
  ASSEMBLED: 'Собран',
  ON_DELIVERY: 'Доставка',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменен',
};

function WebMapIframe({ orders, myLat, myLon }: { orders: CourierOrder[]; myLat: number | null; myLon: number | null }) {
  const iframeRef = useRef<any>(null);
  const loadedRef = useRef(false);
  const mapUrl = `${getApiUrl()}/api/courier-map-page`;

  useEffect(() => {
    const sendData = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
          type: 'updateData',
          orders,
          myLat,
          myLon,
        }), '*');
      } catch (e) {}
    };

    if (loadedRef.current) {
      sendData();
    }
    const timer = setTimeout(() => {
      loadedRef.current = true;
      sendData();
    }, 1500);
    return () => clearTimeout(timer);
  }, [orders, myLat, myLon]);

  return (
    <iframe
      ref={iframeRef}
      src={mapUrl}
      style={{ width: '100%', height: '100%', border: 'none' } as any}
      onLoad={() => {
        setTimeout(() => {
          loadedRef.current = true;
          try {
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
              type: 'updateData',
              orders,
              myLat,
              myLon,
            }), '*');
          } catch (e) {}
        }, 500);
      }}
    />
  );
}

export default function CourierMapScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLon, setMyLon] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);
  const intervalRef = useRef<any>(null);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const fetchOrders = useCallback(async () => {
    try {
      const token = await getToken();
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(new URL('/api/courier/my-orders', baseUrl).toString(), { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Courier map fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (Platform.OS === 'web' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLat(pos.coords.latitude);
          setMyLon(pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    getCurrentPosition();
    intervalRef.current = setInterval(() => {
      fetchOrders();
      getCurrentPosition();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders, getCurrentPosition]);

  useEffect(() => {
    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'openOrder' && data.orderId) {
          router.push(`/order/${data.orderId}`);
        }
      } catch (e) {}
    };
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const ordersWithCoords = orders.filter(o => o.latitude && o.longitude);
  const ordersWithoutCoords = orders.filter(o => !o.latitude || !o.longitude);

  const styles = createStyles(colors, isDark);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Загрузка карты...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Мои заказы на карте
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowList(!showList);
            }}
            style={styles.headerBtn}
          >
            <Ionicons name={showList ? 'map' : 'list'} size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLoading(true);
              fetchOrders().then(() => setLoading(false));
              getCurrentPosition();
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          Заказов: {orders.length}
          {ordersWithoutCoords.length > 0 && ` (${ordersWithoutCoords.length} без координат)`}
        </Text>
        {myLat && myLon && (
          <View style={styles.gpsIndicator}>
            <View style={[styles.gpsDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.gpsText, { color: colors.success }]}>GPS</Text>
          </View>
        )}
      </View>

      {showList ? (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {orders.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Нет назначенных заказов
              </Text>
            </View>
          )}
          {orders.map((order, idx) => (
            <Pressable
              key={order.id}
              style={({ pressed }) => [
                styles.orderCard,
                { backgroundColor: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.82)', borderColor: colors.borderLight },
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <View style={styles.orderCardHeader}>
                <View style={[styles.orderNumCircle, { backgroundColor: statusColors[order.status] || '#999' }]}>
                  <Text style={styles.orderNumText}>{order.orderNumber || (idx + 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderClientName, { color: colors.text }]} numberOfLines={1}>
                    {order.clientName}
                  </Text>
                  <Text style={[styles.orderAddress, { color: colors.textSecondary }]} numberOfLines={2}>
                    {order.address}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: (statusColors[order.status] || '#999') + '18' }]}>
                  <Text style={[styles.statusChipText, { color: statusColors[order.status] || '#999' }]}>
                    {statusLabels[order.status]}
                  </Text>
                </View>
              </View>
              {order.deliveryDateTime && (
                <View style={styles.orderTimeRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.orderTimeText, { color: colors.textMuted }]}>
                    {format(new Date(order.deliveryDateTime), 'dd MMM, HH:mm', { locale: ru })}
                  </Text>
                </View>
              )}
              {!order.latitude && (
                <View style={styles.noCoordsBadge}>
                  <Ionicons name="warning-outline" size={12} color={colors.warning} />
                  <Text style={[styles.noCoordsText, { color: colors.warning }]}>Нет координат</Text>
                </View>
              )}
            </Pressable>
          ))}
          <View style={{ height: insets.bottom + webBottomInset + 20 }} />
        </ScrollView>
      ) : (
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <WebMapIframe orders={orders} myLat={myLat} myLon={myLon} />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Карта доступна в веб-версии
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.header,
    fontFamily: 'Inter_600SemiBold',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statsText: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_400Regular',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsText: {
    fontSize: fontSize.badge,
    fontFamily: 'Inter_600SemiBold',
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: fontSize.body,
    fontFamily: 'Inter_400Regular',
  },
  listContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontFamily: 'Inter_400Regular',
  },
  orderCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumText: {
    color: '#fff',
    fontSize: fontSize.body,
    fontFamily: 'Inter_600SemiBold',
  },
  orderClientName: {
    fontSize: fontSize.body,
    fontFamily: 'Inter_600SemiBold',
  },
  orderAddress: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusChipText: {
    fontSize: fontSize.badge,
    fontFamily: 'Inter_600SemiBold',
  },
  orderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    marginLeft: 46,
  },
  orderTimeText: {
    fontSize: fontSize.secondary,
    fontFamily: 'Inter_400Regular',
  },
  noCoordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    marginLeft: 46,
  },
  noCoordsText: {
    fontSize: fontSize.badge,
    fontFamily: 'Inter_400Regular',
  },
});
