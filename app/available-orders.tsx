import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export default function AvailableOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { orders, refreshOrders } = useData();
  const { colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const role = currentUser?.role;
  const isFlorist = role === 'FLORIST';
  const isCourier = role === 'COURIER';

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [availableLoading, setAvailableLoading] = useState(true);

  const loadAvailable = useCallback(async () => {
    try {
      const data = await api.orders.listAvailable();
      setAvailableOrders(data.sort((a: Order, b: Order) => a.deliveryDateTime - b.deliveryDateTime));
    } catch (error) {
      console.error('Error loading available orders:', error);
    }
    setAvailableLoading(false);
  }, []);

  useEffect(() => {
    loadAvailable();
    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    const connectSSE = async () => {
      try {
        const { getToken } = require('@/lib/api');
        const { getApiUrl } = require('@/lib/query-client');
        const token = await getToken();
        if (!token || typeof EventSource === 'undefined') {
          fallbackInterval = setInterval(loadAvailable, 5000);
          return;
        }
        const url = new URL('/api/events', getApiUrl());
        url.searchParams.set('token', token);
        eventSource = new EventSource(url.toString());
        eventSource.onmessage = () => loadAvailable();
        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (!fallbackInterval) fallbackInterval = setInterval(loadAvailable, 10000);
          setTimeout(connectSSE, 5000);
        };
      } catch {
        fallbackInterval = setInterval(loadAvailable, 5000);
      }
    };
    connectSSE();
    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [loadAvailable]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshOrders(), loadAvailable()]);
    setRefreshing(false);
  }, [refreshOrders, loadAvailable]);

  const handleAssignSelf = useCallback(async (orderId: string) => {
    try {
      setAssigningId(orderId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.orders.assignSelf(orderId);
      await Promise.all([refreshOrders(), loadAvailable()]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Готово', isFlorist ? 'Заказ взят в работу' : 'Заказ взят на доставку');
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось назначить заказ');
    } finally {
      setAssigningId(null);
    }
  }, [refreshOrders, isFlorist]);

  const toggleSelection = useCallback((orderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const handleBatchAssign = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      setBatchAssigning(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await api.orders.batchAssign(Array.from(selectedIds));
      await Promise.all([refreshOrders(), loadAvailable()]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Готово', `Назначено заказов: ${result.assigned}`);
      setSelectedIds(new Set());
      setBatchMode(false);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось назначить заказы');
    } finally {
      setBatchAssigning(false);
    }
  }, [selectedIds, refreshOrders]);

  const toggleBatchMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBatchMode(prev => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const styles = createStyles(colors);

  const renderHeader = () => (
    <View>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {isFlorist ? 'Доступные заказы' : 'Доступные доставки'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {availableOrders.length > 0
              ? `${availableOrders.length} ${getOrderWord(availableOrders.length)}`
              : 'Нет доступных'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isCourier && availableOrders.length > 0 && (
            <Pressable
              style={[styles.batchToggle, showMap && { backgroundColor: colors.primary + '20' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMap(v => !v);
              }}
            >
              <Ionicons
                name={showMap ? 'list' : 'map-outline'}
                size={20}
                color={showMap ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          )}
          {isCourier && availableOrders.length > 1 && !showMap && (
            <Pressable
              style={[styles.batchToggle, batchMode && { backgroundColor: colors.primary + '20' }]}
              onPress={toggleBatchMode}
            >
              <Ionicons
                name={batchMode ? 'checkbox' : 'checkbox-outline'}
                size={20}
                color={batchMode ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.batchToggleText, batchMode && { color: colors.primary }]}>
                Пакетный
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: Order }) => (
    <AvailableOrderCard
      order={item}
      colors={colors}
      isFlorist={isFlorist}
      batchMode={batchMode}
      isSelected={selectedIds.has(item.id)}
      isAssigning={assigningId === item.id}
      onAssign={() => handleAssignSelf(item.id)}
      onToggle={() => toggleSelection(item.id)}
    />
  ), [colors, isFlorist, batchMode, selectedIds, assigningId, handleAssignSelf, toggleSelection]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={isFlorist ? 'flower-outline' : 'bicycle-outline'}
        size={64}
        color={colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {isFlorist ? 'Нет доступных заказов' : 'Нет доступных доставок'}
      </Text>
      <Text style={styles.emptyText}>
        {isFlorist
          ? 'Новые заказы без назначенного флориста появятся здесь'
          : 'Собранные заказы без назначенного курьера появятся здесь'}
      </Text>
    </View>
  );

  const ordersWithCoords = useMemo(() => {
    return availableOrders.filter(o => o.latitude && o.longitude);
  }, [availableOrders]);

  const mapHtml = useMemo(() => {
    const markers = ordersWithCoords.map(o => ({
      id: o.id,
      name: o.clientName,
      addr: o.address,
      lat: parseFloat(String(o.latitude)),
      lon: parseFloat(String(o.longitude)),
      time: o.deliveryDateTime,
      amount: o.amount,
    }));
    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0}html,body,#map{width:100%;height:100%}
.order-marker{width:32px;height:32px;border-radius:50%;background:#4CAF7A;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:bold;cursor:pointer}
.popup-content{font-family:-apple-system,sans-serif;font-size:13px;line-height:1.6;min-width:200px}
.popup-content .name{font-weight:600;font-size:15px;color:#1a1a1a;margin-bottom:4px}
.popup-content .addr{color:#666;font-size:12px}
.popup-content .info{color:#444;font-size:12px;margin-top:4px}
.popup-content .amount{color:#4CAF7A;font-weight:600;font-size:14px;margin-top:4px}
.popup-content .open-btn{display:block;margin-top:8px;padding:6px 12px;background:#4CAF7A;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-align:center;text-decoration:none}
.popup-content .open-btn:hover{background:#3d9d6a}
</style></head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true}).setView([55.75,37.62],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OSM',maxZoom:19}).addTo(map);
var markers=${JSON.stringify(markers)};
var allPoints=[];
markers.forEach(function(m){
allPoints.push([m.lat,m.lon]);
var icon=L.divIcon({className:'',html:'<div class="order-marker">'+m.name.charAt(0)+'</div>',iconSize:[32,32],iconAnchor:[16,16]});
var marker=L.marker([m.lat,m.lon],{icon:icon}).addTo(map);
var dateStr='';
try{var d=new Date(m.time);dateStr=d.toLocaleDateString('ru-RU')+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}catch(e){}
marker.bindPopup('<div class="popup-content"><div class="name">'+m.name+'</div><div class="addr">'+m.addr+'</div><div class="info">'+dateStr+'</div><div class="amount">'+m.amount.toLocaleString()+' \\u20BD</div><button class="open-btn" onclick="window.parent.postMessage({type:\\'openOrder\\',orderId:\\''+m.id+'\\'},\\'*\\')">Открыть заказ</button></div>');
});
if(allPoints.length>0)map.fitBounds(L.latLngBounds(allPoints).pad(0.15));
<\/script></body></html>`;
  }, [ordersWithCoords]);

  const iframeRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !showMap) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'openOrder' && event.data?.orderId) {
        router.push(`/order/${event.data.orderId}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showMap]);

  if (!isFlorist && !isCourier) {
    return (
      <View style={styles.container}>
        <View style={[styles.emptyContainer, { paddingTop: insets.top + webTopInset + 60 }]}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Доступ ограничен</Text>
          <Text style={styles.emptyText}>
            Эта страница доступна только для флористов и курьеров
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showMap ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          {ordersWithCoords.length > 0 ? (
            <View style={{ flex: 1 }}>
              {Platform.OS === 'web' ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={mapHtml}
                  style={{ width: '100%', height: '100%', border: 'none' } as any}
                />
              ) : (
                <FlatList
                  data={ordersWithCoords}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + webBottomInset + 24 }}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.card, { marginHorizontal: 0, marginTop: 8 }]}
                      onPress={() => router.push(`/order/${item.id}`)}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.clientName}>{item.clientName}</Text>
                        <Text style={styles.amount}>{item.amount.toLocaleString()} ₽</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText} numberOfLines={2}>{item.address}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>
                          {format(new Date(item.deliveryDateTime), 'dd MMM, HH:mm', { locale: ru })}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Ionicons name="open-outline" size={16} color={colors.primary} />
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Открыть заказ</Text>
                      </View>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <Ionicons name="location-outline" size={48} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>Нет заказов с координатами</Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
              <View style={[styles.mapStatusBar, { paddingBottom: insets.bottom + webBottomInset + 8 }]}>
                <Text style={[styles.mapStatusText, { color: colors.textSecondary }]}>
                  {ordersWithCoords.length} из {availableOrders.length} на карте
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Нет заказов с координатами</Text>
              <Text style={styles.emptyText}>Адреса заказов пока не определены на карте</Text>
            </View>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={availableOrders}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              paddingBottom: insets.bottom + webBottomInset + (batchMode && selectedIds.size > 0 ? 100 : 24),
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />

          {batchMode && selectedIds.size > 0 && (
            <View style={[styles.batchFab, { bottom: insets.bottom + webBottomInset + 24 }]}>
              <Button
                title={`Назначить выбранные (${selectedIds.size})`}
                onPress={handleBatchAssign}
                loading={batchAssigning}
                size="large"
                style={{ flex: 1 }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function AvailableOrderCard({
  order,
  colors,
  isFlorist,
  batchMode,
  isSelected,
  isAssigning,
  onAssign,
  onToggle,
}: {
  order: Order;
  colors: any;
  isFlorist: boolean;
  batchMode: boolean;
  isSelected: boolean;
  isAssigning: boolean;
  onAssign: () => void;
  onToggle: () => void;
}) {
  const styles = createStyles(colors);

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{order.clientName}</Text>
        <Text style={styles.amount}>{order.amount.toLocaleString()} ₽</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText} numberOfLines={2}>{order.address}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          {format(new Date(order.deliveryDateTime), 'dd MMM, HH:mm', { locale: ru })}
        </Text>
      </View>

      {order.comment ? (
        <View style={styles.infoRow}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={2}>{order.comment}</Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        {batchMode ? (
          <Pressable
            style={[styles.checkboxRow]}
            onPress={onToggle}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={26}
              color={isSelected ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.checkboxLabel, isSelected && { color: colors.primary }]}>
              {isSelected ? 'Выбран' : 'Выбрать'}
            </Text>
          </Pressable>
        ) : (
          <Button
            title={isFlorist ? 'Взять в работу' : 'Взять на доставку'}
            onPress={onAssign}
            loading={isAssigning}
            variant="primary"
            size="medium"
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

function getOrderWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return 'заказов';
  if (lastOne === 1) return 'заказ';
  if (lastOne >= 2 && lastOne <= 4) return 'заказа';
  return 'заказов';
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  batchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
  },
  batchToggleText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  batchFab: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
  },
  mapStatusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapStatusText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
