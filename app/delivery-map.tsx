import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getApiUrl } from '@/lib/query-client';
import { getToken } from '@/lib/api';
import WebView from 'react-native-webview';
import * as Haptics from 'expo-haptics';

interface CourierLocation {
  id: string;
  courierUserId: string;
  lat: number;
  lon: number;
  accuracy: number | null;
  recordedAt: number;
  activeOrderId: string | null;
  courierName: string;
  courierPhone: string | null;
}

interface OrderMarker {
  id: string;
  orderNumber: number | null;
  clientName: string;
  deliveryAddress: string;
  status: string;
  latitude: number;
  longitude: number;
  courierUserId: string | null;
  deliveryDateTime: string | null;
}

interface CourierUser {
  id: string;
  name: string;
  phone: string | null;
}

interface OrderData {
  id: string;
  clientName: string;
  address: string;
  status: string;
  courierId: string | null;
  latitude: number | null;
  longitude: number | null;
  geoStatus: string | null;
  deliveryDateTime: number | null;
  amount: number | null;
}

function WebMapIframe({ couriers, orders, selectedCourier }: { couriers: CourierLocation[]; orders: OrderMarker[]; selectedCourier: string | null }) {
  const iframeRef = useRef<any>(null);
  const loadedRef = useRef(false);
  const mapUrl = `${getApiUrl()}/api/map-page`;

  useEffect(() => {
    const sendData = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
          type: 'updateData',
          couriers,
          orders,
          selectedCourier,
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
  }, [couriers, orders, selectedCourier]);

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
              couriers,
              orders,
              selectedCourier,
            }), '*');
          } catch (e) {}
        }, 500);
      }}
    />
  );
}

export default function DeliveryMapScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { colors } = useTheme();
  const [couriers, setCouriers] = useState<CourierLocation[]>([]);
  const [orderMarkers, setOrderMarkers] = useState<OrderMarker[]>([]);
  const [allOrders, setAllOrders] = useState<OrderData[]>([]);
  const [courierUsers, setCourierUsers] = useState<CourierUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const intervalRef = useRef<any>(null);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [couriersRes, ordersRes, usersRes, allOrdersRes] = await Promise.all([
        fetch(new URL('/api/manager/couriers/locations', baseUrl).toString(), { headers }),
        fetch(new URL('/api/orders/with-coordinates?status=NEW,IN_WORK,ASSEMBLED,ON_DELIVERY', baseUrl).toString(), { headers }),
        fetch(new URL('/api/users', baseUrl).toString(), { headers }),
        fetch(new URL('/api/orders', baseUrl).toString(), { headers }),
      ]);

      if (couriersRes.ok) {
        const data = await couriersRes.json();
        setCouriers(data);
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrderMarkers(data);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setCourierUsers(data.filter((u: any) => u.role === 'COURIER' && u.isActive));
      }
      if (allOrdersRes.ok) {
        const data = await allOrdersRes.json();
        setAllOrders(data.filter((o: any) => ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY'].includes(o.status)));
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Map fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'openOrder' && data.orderId) {
          router.push(`/order/${data.orderId}`);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (webViewRef.current && !loading) {
      const msg = JSON.stringify({
        type: 'updateData',
        couriers,
        orders: orderMarkers,
        selectedCourier,
      });
      webViewRef.current.postMessage(msg);
    }
  }, [couriers, orderMarkers, selectedCourier, loading]);

  const geocodeAllOrders = async () => {
    setGeocoding(true);
    try {
      const token = await getToken();
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(new URL('/api/orders/geocode-all', baseUrl).toString(), {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        Alert.alert('Геокодирование', `Обработано: ${data.processed}, успешно: ${data.success}, ошибок: ${data.failed}`);
        fetchData();
      }
    } catch (e) {
      console.error('Geocode all error:', e);
    } finally {
      setGeocoding(false);
    }
  };

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

  const getCourierOrders = (courierId: string) => {
    return allOrders.filter(o => o.courierId === courierId);
  };

  const getCourierLocation = (courierId: string) => {
    return couriers.find(c => c.courierUserId === courierId);
  };

  const ordersWithoutCoords = allOrders.filter(o => o.address && (!o.latitude || !o.longitude));

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  * { margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #e8e8e8; }
  #map { width: 100%; height: 100%; }
  .courier-marker {
    background: #4CAF7A;
    color: #fff;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: bold;
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    cursor: pointer;
  }
  .courier-marker.selected {
    background: #FF5722;
    width: 46px;
    height: 46px;
    border: 3px solid #FFD54F;
    box-shadow: 0 3px 12px rgba(255,87,34,0.5);
  }
  .order-marker {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
  }
  .popup-content { font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; min-width: 180px; }
  .popup-content .name { font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a; }
  .popup-content .detail { color: #666; font-size: 12px; }
  .popup-content .status { display: inline-block; padding: 2px 8px; border-radius: 4px; color: #fff; font-size: 11px; font-weight: 500; }
  .popup-content .address { margin-top: 4px; color: #444; font-size: 12px; }
  .popup-content .time { color: #999; font-size: 11px; margin-top: 2px; }
  .route-line { stroke-dasharray: 8, 4; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function sendMsg(data) {
    var str = JSON.stringify(data);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(str);
    } else if (window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
  }

  var map = L.map('map', { zoomControl: true }).setView([55.75, 37.62], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM',
    maxZoom: 19,
  }).addTo(map);

  var courierMarkers = {};
  var orderMarkersLayer = L.layerGroup().addTo(map);
  var routeLayer = L.layerGroup().addTo(map);
  var firstLoad = true;

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2);
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return diff + ' сек назад';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    return Math.floor(diff / 3600) + ' ч назад';
  }

  var statusColors = ${JSON.stringify(statusColors)};
  var statusLabels = ${JSON.stringify(statusLabels)};

  function statusIcon(status) {
    switch(status) {
      case 'NEW': return 'H';
      case 'IN_WORK': return 'P';
      case 'ASSEMBLED': return 'C';
      case 'ON_DELIVERY': return 'D';
      default: return '';
    }
  }

  function updateData(data) {
    var couriers = data.couriers || [];
    var orders = data.orders || [];
    var selectedCourier = data.selectedCourier;

    routeLayer.clearLayers();

    var seenIds = {};
    couriers.forEach(function(c) {
      seenIds[c.courierUserId] = true;
      var isSelected = selectedCourier === c.courierUserId;
      var initials = getInitials(c.courierName);
      var className = 'courier-marker' + (isSelected ? ' selected' : '');
      var size = isSelected ? 46 : 40;

      var popupHtml = '<div class="popup-content">' +
        '<div class="name">' + c.courierName + '</div>' +
        '<div class="time">' + timeAgo(c.recordedAt) + '</div>' +
        (c.courierPhone ? '<div class="detail">' + c.courierPhone + '</div>' : '') +
        '</div>';

      if (courierMarkers[c.courierUserId]) {
        courierMarkers[c.courierUserId].setLatLng([c.lat, c.lon]);
        var icon = L.divIcon({ className: '', html: '<div class="' + className + '">' + initials + '</div>', iconSize: [size, size], iconAnchor: [size/2, size/2] });
        courierMarkers[c.courierUserId].setIcon(icon);
        courierMarkers[c.courierUserId].setPopupContent(popupHtml);
      } else {
        var icon = L.divIcon({ className: '', html: '<div class="' + className + '">' + initials + '</div>', iconSize: [size, size], iconAnchor: [size/2, size/2] });
        var marker = L.marker([c.lat, c.lon], { icon: icon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(popupHtml);
        courierMarkers[c.courierUserId] = marker;
      }

      if (isSelected) {
        var courierOrders = orders.filter(function(o) { return o.courierUserId === c.courierUserId; });
        if (courierOrders.length > 0) {
          var routePoints = [[c.lat, c.lon]];
          courierOrders.forEach(function(o) {
            routePoints.push([o.latitude, o.longitude]);
            L.polyline([[c.lat, c.lon], [o.latitude, o.longitude]], {
              color: '#FF5722',
              weight: 3,
              opacity: 0.7,
              dashArray: '8, 4'
            }).addTo(routeLayer);
          });
        }
      }
    });

    Object.keys(courierMarkers).forEach(function(id) {
      if (!seenIds[id]) {
        map.removeLayer(courierMarkers[id]);
        delete courierMarkers[id];
      }
    });

    orderMarkersLayer.clearLayers();
    orders.forEach(function(o) {
      var color = statusColors[o.status] || '#999';
      var letter = statusIcon(o.status);
      var icon = L.divIcon({
        className: '',
        html: '<div class="order-marker" style="background:' + color + '">' + letter + '</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      var marker = L.marker([o.latitude, o.longitude], { icon: icon }).addTo(orderMarkersLayer);
      var statusHtml = '<span class="status" style="background:' + color + '">' + (statusLabels[o.status] || o.status) + '</span>';
      var dateStr = '';
      if (o.deliveryDateTime) {
        try {
          var d = new Date(parseInt(o.deliveryDateTime));
          dateStr = '<div class="time">' + d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>';
        } catch(e) {}
      }
      var orderNum = o.orderNumber ? '#' + o.orderNumber + ' - ' : '';
      var openBtn = '<div style="margin-top:8px"><a href="#" onclick="sendMsg({type:\'openOrder\',orderId:\'' + o.id + '\'});return false;" style="display:inline-block;padding:6px 12px;background:#3B82F6;color:#fff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;">Открыть заказ</a></div>';
      marker.bindPopup('<div class="popup-content"><div class="name">' + orderNum + (o.clientName || 'Без имени') + '</div>' + statusHtml + '<div class="address">' + (o.deliveryAddress || '') + '</div>' + dateStr + openBtn + '</div>');

      if (selectedCourier && o.courierUserId === selectedCourier) {
        marker.openPopup();
      }
    });

    if (firstLoad) {
      firstLoad = false;
      var allPoints = [];
      couriers.forEach(function(c) { allPoints.push([c.lat, c.lon]); });
      orders.forEach(function(o) { allPoints.push([o.latitude, o.longitude]); });
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.15));
      }
    }

    if (selectedCourier) {
      var sc = couriers.find(function(c) { return c.courierUserId === selectedCourier; });
      if (sc) {
        map.setView([sc.lat, sc.lon], 14, { animate: true });
      }
    }
  }

  document.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'updateData') updateData(data);
    } catch(err) {}
  });
  window.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'updateData') updateData(data);
    } catch(err) {}
  });
</script>
</body>
</html>
  `;

  const styles = createStyles(colors);

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

  const activeCouriers = couriers.filter(c => {
    const age = Date.now() - c.recordedAt;
    return age < 30 * 60 * 1000;
  });

  const selectedCourierOrders = selectedCourier ? getCourierOrders(selectedCourier) : [];
  const selectedCourierLoc = selectedCourier ? getCourierLocation(selectedCourier) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Карта доставок</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPanel(!showPanel);
          }}
          style={styles.refreshButton}
        >
          <Ionicons name={showPanel ? 'close' : 'list'} size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            fetchData();
          }}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.mainContent}>
        {showPanel && (
          <ScrollView style={styles.panel} showsVerticalScrollIndicator={false}>
            <View style={styles.panelSection}>
              <Text style={[styles.panelSectionTitle, { color: colors.text }]}>
                Курьеры ({courierUsers.length})
              </Text>
              {courierUsers.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Нет курьеров в организации
                </Text>
              )}
              {courierUsers.map(cu => {
                const loc = getCourierLocation(cu.id);
                const courierOrders = getCourierOrders(cu.id);
                const isSelected = selectedCourier === cu.id;
                const hasLocation = !!loc;
                const timeSinceUpdate = loc ? Math.floor((Date.now() - loc.recordedAt) / 60000) : null;

                return (
                  <Pressable
                    key={cu.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCourier(isSelected ? null : cu.id);
                    }}
                    style={[
                      styles.courierCard,
                      { backgroundColor: isSelected ? colors.primary + '20' : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                    ]}
                  >
                    <View style={styles.courierCardHeader}>
                      <View style={[styles.onlineDot, { backgroundColor: hasLocation ? '#4CAF50' : '#9E9E9E' }]} />
                      <Text style={[styles.courierName, { color: colors.text }]} numberOfLines={1}>
                        {cu.name}
                      </Text>
                    </View>
                    {hasLocation && timeSinceUpdate !== null && (
                      <Text style={[styles.courierDetail, { color: colors.textSecondary }]}>
                        {timeSinceUpdate < 1 ? 'только что' : timeSinceUpdate < 60 ? `${timeSinceUpdate} мин назад` : `${Math.floor(timeSinceUpdate / 60)} ч назад`}
                      </Text>
                    )}
                    {!hasLocation && (
                      <Text style={[styles.courierDetail, { color: colors.textSecondary }]}>
                        Нет данных о местоположении
                      </Text>
                    )}
                    {courierOrders.length > 0 && (
                      <View style={styles.courierOrdersList}>
                        {courierOrders.map(o => (
                          <Pressable
                            key={o.id}
                            onPress={() => router.push(`/order/${o.id}`)}
                            style={styles.miniOrderCard}
                          >
                            <View style={[styles.miniStatusDot, { backgroundColor: statusColors[o.status] || '#999' }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.miniOrderText, { color: colors.text }]} numberOfLines={1}>
                                {o.clientName}
                              </Text>
                              <Text style={[styles.miniOrderAddr, { color: colors.textSecondary }]} numberOfLines={1}>
                                {o.address}
                              </Text>
                            </View>
                            <Text style={[styles.miniStatusLabel, { color: statusColors[o.status] || '#999' }]}>
                              {statusLabels[o.status]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {courierOrders.length === 0 && (
                      <Text style={[styles.courierDetail, { color: colors.textMuted }]}>
                        Нет активных заказов
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {ordersWithoutCoords.length > 0 && (
              <View style={styles.panelSection}>
                <Text style={[styles.panelSectionTitle, { color: colors.text }]}>
                  Геокодирование
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {ordersWithoutCoords.length} заказ(ов) без координат
                </Text>
                <Pressable
                  onPress={geocodeAllOrders}
                  disabled={geocoding}
                  style={[styles.geocodeButton, geocoding && { opacity: 0.5 }]}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="location" size={16} color="#fff" />
                  )}
                  <Text style={styles.geocodeButtonText}>
                    {geocoding ? 'Обработка...' : 'Определить координаты'}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.panelSection}>
              <Text style={[styles.panelSectionTitle, { color: colors.text }]}>
                Заказы на карте ({orderMarkers.length})
              </Text>
              {orderMarkers.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Нет заказов с координатами.{'\n'}Нажмите "Определить координаты" выше или откройте заказ и нажмите кнопку геокодирования.
                </Text>
              )}
              {orderMarkers.map(o => (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/order/${o.id}`)}
                  style={[styles.miniOrderCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10 }]}
                >
                  <View style={[styles.miniStatusDot, { backgroundColor: statusColors[o.status] || '#999' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniOrderText, { color: colors.text }]} numberOfLines={1}>
                      {o.clientName}
                    </Text>
                    <Text style={[styles.miniOrderAddr, { color: colors.textSecondary }]} numberOfLines={1}>
                      {o.deliveryAddress}
                    </Text>
                  </View>
                  <Text style={[styles.miniStatusLabel, { color: statusColors[o.status] || '#999' }]}>
                    {statusLabels[o.status]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <WebMapIframe
              couriers={couriers}
              orders={orderMarkers}
              selectedCourier={selectedCourier}
            />
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: `${getApiUrl()}/api/map-page` }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              setSupportMultipleWindows={false}
              startInLoadingState={true}
              cacheEnabled={false}
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'openOrder' && data.orderId) {
                    router.push(`/order/${data.orderId}`);
                  }
                } catch (e) {}
              }}
              onLoad={() => {
                setTimeout(() => {
                  webViewRef.current?.postMessage(JSON.stringify({
                    type: 'updateData',
                    couriers,
                    orders: orderMarkers,
                    selectedCourier,
                  }));
                }, 1500);
              }}
            />
          )}

          {!showPanel && activeCouriers.length === 0 && orderMarkers.length === 0 && (
            <View style={styles.emptyOverlay}>
              <View style={[styles.emptyCard, { backgroundColor: colors.surface + 'EE' }]}>
                <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyOverlayTitle, { color: colors.text }]}>
                  Карта пуста
                </Text>
                <Text style={[styles.emptyOverlayText, { color: colors.textSecondary }]}>
                  Нажмите кнопку списка вверху, чтобы увидеть курьеров и определить координаты заказов
                </Text>
                <Pressable
                  onPress={() => setShowPanel(true)}
                  style={styles.emptyPanelButton}
                >
                  <Ionicons name="list" size={16} color="#fff" />
                  <Text style={styles.geocodeButtonText}>Открыть панель</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.statusBar, { paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        <View style={styles.statusInfo}>
          <Ionicons name="navigate" size={14} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Курьеров: {activeCouriers.length}/{courierUsers.length}
          </Text>
        </View>
        <View style={styles.statusInfo}>
          <Ionicons name="location" size={14} color="#FF5722" />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Заказов: {orderMarkers.length}/{allOrders.length}
          </Text>
        </View>
        {lastUpdate && (
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    gap: 8,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    width: 300,
    maxWidth: '40%',
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  panelSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  courierCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  courierCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  courierName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  courierDetail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginLeft: 18,
    marginBottom: 4,
  },
  courierOrdersList: {
    marginTop: 6,
    gap: 4,
  },
  miniOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 2,
  },
  miniStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniOrderText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  miniOrderAddr: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  miniStatusLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  geocodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF7A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  geocodeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#e8e8e8',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    maxWidth: 280,
    gap: 8,
  },
  emptyOverlayTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyOverlayText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF7A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
