import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image, Platform, Linking, Dimensions, TextInput, ActivityIndicator, KeyboardAvoidingView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { resolvePhotoUri, getToken } from '@/lib/api';
import { getApiUrl } from '@/lib/query-client';
import { OrderWithDetails, OrderStatus, ORDER_STATUS_LABELS, USER_ROLE_LABELS, PaymentStatus, PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS, OrderAssistant } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';

interface OrderExpense {
  id: string;
  orderId: string;
  amount: number;
  comment: string;
  createdByUserId: string | null;
  createdAt: number;
  createdByName: string | null;
}

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const STATUS_FLOW: Record<string, OrderStatus[]> = {
  MANAGER: ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED'],
  FLORIST: ['IN_WORK', 'ASSEMBLED'],
  COURIER: ['ON_DELIVERY', 'DELIVERED'],
  OWNER: ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED'],
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  NOT_PAID: '#F44336',
  ADVANCE: '#FF9800',
  PAID: '#4CAF50',
};

const CLIENT_SOURCE_ICONS: Record<string, { icon: string; family: 'ionicons' | 'material' }> = {
  WHATSAPP: { icon: 'whatsapp', family: 'material' },
  TELEGRAM: { icon: 'telegram', family: 'material' },
  INSTAGRAM: { icon: 'instagram', family: 'material' },
  PHONE: { icon: 'phone', family: 'material' },
  WEBSITE: { icon: 'web', family: 'material' },
  OTHER: { icon: 'dots-horizontal', family: 'material' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { getOrderWithDetails, updateOrderStatus, addAttachment, deleteAttachment, refreshOrders, users } = useData();
  const { colors } = useTheme();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseComment, setExpenseComment] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  const [assistants, setAssistants] = useState<OrderAssistant[]>([]);
  const [showAddAssistant, setShowAddAssistant] = useState(false);
  const [addAssistantRole, setAddAssistantRole] = useState<'FLORIST' | 'COURIER'>('FLORIST');

  const role = currentUser?.role;
  const isManager = role === 'MANAGER';
  const isFlorist = role === 'FLORIST';
  const isCourier = role === 'COURIER';
  const isOwner = role === 'OWNER';

  const showClientData = isManager || isOwner;
  const showAmount = isManager || isOwner;
  const showPhone = !isFlorist;

  const loadOrder = useCallback(async () => {
    if (id) {
      try {
        const data = await getOrderWithDetails(id);
        setOrder(data);
        if (data?.assistants) setAssistants(data.assistants);
      } catch (error) {
        console.error('Error loading order:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить заказ');
      }
      setLoading(false);
    }
  }, [id, getOrderWithDetails]);

  const loadExpenses = useCallback(async () => {
    if (!id) return;
    setExpensesLoading(true);
    try {
      const data = await api.expenses.list(id);
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
    setExpensesLoading(false);
  }, [id]);

  useEffect(() => {
    loadOrder();
    loadExpenses();

    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const connectSSE = async () => {
      try {
        const token = await getToken();
        if (!token || typeof EventSource === 'undefined') {
          fallbackInterval = setInterval(() => loadOrder(), 5000);
          return;
        }
        const baseUrl = getApiUrl();
        const url = new URL('/api/events', baseUrl);
        url.searchParams.set('token', token);
        eventSource = new EventSource(url.toString());
        eventSource.onmessage = () => {
          loadOrder();
          loadExpenses();
        };
        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (!fallbackInterval) fallbackInterval = setInterval(() => loadOrder(), 10000);
          setTimeout(connectSSE, 5000);
        };
      } catch {
        fallbackInterval = setInterval(() => loadOrder(), 5000);
      }
    };
    connectSSE();

    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [loadOrder, loadExpenses]);

  const handleAddExpense = async () => {
    if (!id) return;
    
    const amount = parseInt(expenseAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    
    if (!expenseComment.trim()) {
      Alert.alert('Ошибка', 'Комментарий обязателен');
      return;
    }
    
    setAddingExpense(true);
    try {
      const newExpense = await api.expenses.add(id, { amount, comment: expenseComment.trim() });
      setExpenses(prev => [newExpense, ...prev]);
      setExpenseAmount('');
      setExpenseComment('');
      setShowExpenseForm(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось добавить расход');
    }
    setAddingExpense(false);
  };

  const handleDeleteExpense = (expenseId: string) => {
    confirmAction('Удалить расход?', 'Это действие нельзя отменить', async () => {
      try {
        await api.expenses.delete(expenseId);
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        Alert.alert('Ошибка', error.message || 'Не удалось удалить расход');
      }
    });
  };

  const handleAddAssistant = async (userId: string, assistantRole: 'FLORIST' | 'COURIER') => {
    if (!order) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const newAssistant = await api.assistants.add(order.id, { userId, role: assistantRole });
      const user = users.find(u => u.id === userId);
      setAssistants(prev => [...prev, { ...newAssistant, userName: user?.name }]);
      setShowAddAssistant(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось добавить помощника');
    }
  };

  const handleRemoveAssistant = (assistantId: string) => {
    if (!order) return;
    confirmAction('Удалить помощника?', 'Помощник будет убран с этого заказа', async () => {
      try {
        await api.assistants.remove(order.id, assistantId);
        setAssistants(prev => prev.filter(a => a.id !== assistantId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        Alert.alert('Ошибка', error.message || 'Не удалось удалить помощника');
      }
    });
  };

  const getAvailableAssistantUsers = (assistantRole: 'FLORIST' | 'COURIER') => {
    const assistantUserIds = assistants.map(a => a.userId);
    const primaryId = assistantRole === 'FLORIST' ? order?.floristId : order?.courierId;
    return users.filter(u => 
      u.role === assistantRole && 
      u.isActive &&
      u.id !== primaryId &&
      !assistantUserIds.includes(u.id)
    );
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const isOverdue = order && 
    order.status !== 'DELIVERED' && 
    order.status !== 'CANCELED' && 
    order.deliveryDateTime < Date.now();

  const availableStatuses = role ? STATUS_FLOW[role] : [];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateOrderStatus(order.id, newStatus);
    await loadOrder();
    await refreshOrders();
  };

  const handlePaymentStatusChange = async (newStatus: PaymentStatus) => {
    if (!order) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.orders.update(order.id, { paymentStatus: newStatus });
      await loadOrder();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить статус оплаты');
    }
  };

  const [uploading, setUploading] = useState(false);

  const compressImage = async (uri: string, originalWidth?: number, originalHeight?: number): Promise<string> => {
    const MAX_DIMENSION = 2048;
    const actions: ImageManipulator.Action[] = [];

    if (originalWidth && originalHeight && (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION)) {
      const ratio = Math.min(MAX_DIMENSION / originalWidth, MAX_DIMENSION / originalHeight);
      actions.push({ resize: { width: Math.round(originalWidth * ratio), height: Math.round(originalHeight * ratio) } });
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return result.base64!;
  };

  const pickAndUploadPhoto = async (
    pickerResult: ImagePicker.ImagePickerResult,
    attachmentType: string = 'PHOTO'
  ) => {
    if (!pickerResult.canceled && pickerResult.assets[0] && order) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploading(true);
      try {
        const asset = pickerResult.assets[0];
        let base64Data: string;

        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(',')[1]);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(blob);
          });
        } else {
          base64Data = await compressImage(asset.uri, asset.width, asset.height);
        }

        await api.orders.addAttachment(order.id, base64Data, 'image/jpeg', attachmentType);
        await loadOrder();
      } catch (error: any) {
        console.error('Photo upload error:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить фото');
      } finally {
        setUploading(false);
      }
    }
  };

  const showPhotoPickerActionSheet = (attachmentType: string = 'PHOTO') => {
    const cameraOption = Platform.OS === 'web' ? [] : [{
      text: 'Камера',
      onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
        await pickAndUploadPhoto(result, attachmentType);
      },
    }];

    Alert.alert(
      'Добавить фото',
      'Выберите источник',
      [
        ...cameraOption,
        {
          text: 'Галерея',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках устройства');
                return;
              }
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.7,
              base64: Platform.OS !== 'web' ? true : undefined,
            });
            await pickAndUploadPhoto(result, attachmentType);
          },
        },
        {
          text: 'Отмена',
          onPress: () => {},
          style: 'cancel',
        },
      ]
    );
  };

  const handleAddPhoto = () => {
    showPhotoPickerActionSheet('PHOTO');
  };

  const handleAddPaymentProof = () => {
    showPhotoPickerActionSheet('PAYMENT_PROOF');
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    confirmAction('Удалить фото?', 'Это действие нельзя отменить', async () => {
      await deleteAttachment(attachmentId);
      await loadOrder();
    });
  };

  const handleCall = () => {
    if (order?.clientPhone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`tel:${order.clientPhone}`);
    }
  };

  const handleNavigate = () => {
    if (!order) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = encodeURIComponent(order.address);
    let url: string;
    if (order.latitude && order.longitude) {
      url = `https://yandex.ru/maps/?pt=${order.longitude},${order.latitude}&z=16&text=${query}`;
    } else {
      url = `https://yandex.ru/maps/?text=${query}`;
    }
    Linking.openURL(url);
  };

  const handleOpenClientSource = () => {
    if (!order) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const phone = order.clientPhone.replace(/\D/g, '');
    
    switch (order.clientSource) {
      case 'WHATSAPP':
        Linking.openURL(`https://wa.me/${phone}`);
        break;
      case 'TELEGRAM':
        if (order.clientSourceId) {
          Linking.openURL(`https://t.me/${order.clientSourceId}`);
        }
        break;
      case 'INSTAGRAM':
        if (order.clientSourceId) {
          const username = order.clientSourceId.replace(/^@/, '');
          Linking.openURL(`https://www.instagram.com/${username}`);
        }
        break;
      default:
        break;
    }
  };

  const styles = createStyles(colors);

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const canOpenChat = order.clientSource === 'WHATSAPP' || 
    (order.clientSource === 'TELEGRAM' && order.clientSourceId) ||
    (order.clientSource === 'INSTAGRAM' && order.clientSourceId);

  return (
    <>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + webBottomInset + 24 },
          isDesktop && styles.contentDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, isDesktop && styles.contentInnerDesktop]}>
          <View style={styles.section}>
            <View style={styles.statusHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {order.orderNumber && (
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.textSecondary }}>#{order.orderNumber}</Text>
                )}
                <StatusBadge status={order.status} />
              </View>
              {isOverdue && (
                <View style={styles.overdueIndicator}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.overdueText}>Просрочен</Text>
                </View>
              )}
            </View>

            {(isManager || isOwner) && (
              <Pressable
                style={styles.editButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/order/edit/${order.id}`);
                }}
              >
                <Ionicons name="pencil" size={18} color={colors.primary} />
                <Text style={styles.editButtonText}>Редактировать</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Информация о доставке</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                <View>
                  <Text style={styles.infoLabel}>Дата и время доставки</Text>
                  <Text style={[styles.infoValue, isOverdue && styles.overdueTime]}>
                    {format(new Date(order.deliveryDateTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                    {order.deliveryDateTimeEnd && ` — ${format(new Date(order.deliveryDateTimeEnd), "HH:mm", { locale: ru })}`}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Адрес</Text>
                  <Text style={styles.infoValue}>{order.address}</Text>
                  {(role === 'OWNER' || role === 'MANAGER') && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                      {order.geoStatus === 'SUCCESS' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                          <Text style={{ fontSize: 11, color: '#4CAF50', fontFamily: 'Inter_400Regular' }}>Координаты найдены</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={async () => {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              const result = await api.geocodeOrder(order.id);
                              if (result.success) {
                                Alert.alert('Готово', 'Координаты определены');
                                refreshOrders();
                              } else {
                                Alert.alert('Не удалось', result.error || 'Адрес не найден');
                              }
                            } catch (e: any) {
                              Alert.alert('Ошибка', e.message);
                            }
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Ionicons name="locate" size={14} color={colors.primary} />
                          <Text style={{ fontSize: 11, color: colors.primary, fontFamily: 'Inter_400Regular' }}>Геокодировать</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
                <Pressable
                  style={styles.iconButton}
                  onPress={handleNavigate}
                >
                  <Ionicons name="navigate" size={20} color={colors.primary} />
                </Pressable>
              </View>

              {showClientData && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                    <View>
                      <Text style={styles.infoLabel}>Клиент</Text>
                      <Text style={styles.infoValue}>{order.clientName}</Text>
                    </View>
                  </View>
                </>
              )}

              {showPhone && order.clientPhone && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={20} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Телефон</Text>
                      <Text style={styles.infoValue}>{order.clientPhone}</Text>
                    </View>
                    <Pressable
                      style={styles.iconButton}
                      onPress={handleCall}
                    >
                      <Ionicons name="call" size={20} color={colors.primary} />
                    </Pressable>
                  </View>
                </>
              )}

              {order.clientSource && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons 
                      name={(CLIENT_SOURCE_ICONS[order.clientSource]?.icon || 'dots-horizontal') as any} 
                      size={20} 
                      color={colors.textMuted} 
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Источник</Text>
                      <Text style={styles.infoValue}>
                        {CLIENT_SOURCE_LABELS[order.clientSource]}
                        {order.clientSourceId ? ` (${order.clientSourceId})` : ''}
                      </Text>
                    </View>
                    {canOpenChat && (
                      <Pressable
                        style={styles.iconButton}
                        onPress={handleOpenClientSource}
                      >
                        <MaterialCommunityIcons 
                          name={(CLIENT_SOURCE_ICONS[order.clientSource]?.icon || 'open-in-new') as any} 
                          size={20} 
                          color={colors.primary} 
                        />
                      </Pressable>
                    )}
                  </View>
                </>
              )}

              {showAmount && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
                    <View>
                      <Text style={styles.infoLabel}>Сумма заказа</Text>
                      <Text style={[styles.infoValue, styles.amountValue]}>
                        {order.amount.toLocaleString()} ₽
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {showAmount && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="card-outline" size={20} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Статус оплаты</Text>
                      <View style={styles.paymentStatusRow}>
                        <View style={[
                          styles.paymentBadge,
                          { backgroundColor: (order.paymentStatus ? PAYMENT_STATUS_COLORS[order.paymentStatus] : '#F44336') + '20' }
                        ]}>
                          <Text style={[
                            styles.paymentBadgeText,
                            { color: order.paymentStatus ? PAYMENT_STATUS_COLORS[order.paymentStatus] : '#F44336' }
                          ]}>
                            {order.paymentStatus ? PAYMENT_STATUS_LABELS[order.paymentStatus] : PAYMENT_STATUS_LABELS.NOT_PAID}
                          </Text>
                        </View>
                      </View>
                      {(isManager || isOwner) && (
                        <View style={styles.paymentQuickButtons}>
                          {(['NOT_PAID', 'ADVANCE', 'PAID'] as PaymentStatus[])
                            .filter(s => s !== order.paymentStatus)
                            .map(status => (
                              <Pressable
                                key={status}
                                style={[
                                  styles.paymentQuickButton,
                                  { borderColor: PAYMENT_STATUS_COLORS[status] + '40' }
                                ]}
                                onPress={() => handlePaymentStatusChange(status)}
                              >
                                <Text style={[styles.paymentQuickButtonText, { color: PAYMENT_STATUS_COLORS[status] }]}>
                                  {PAYMENT_STATUS_LABELS[status]}
                                </Text>
                              </Pressable>
                            ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {order.paymentMethod && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Ionicons name="wallet-outline" size={20} color={colors.textMuted} />
                        <View>
                          <Text style={styles.infoLabel}>Способ оплаты</Text>
                          <Text style={styles.infoValue}>{order.paymentMethod}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {order.paymentDetails && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Детали оплаты</Text>
                          <Text style={styles.infoValue}>{order.paymentDetails}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="receipt-outline" size={20} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Подтверждение оплаты</Text>
                      {order.attachments.filter(a => a.type === 'PAYMENT_PROOF').length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                          {order.attachments.filter(a => a.type === 'PAYMENT_PROOF').map(att => {
                            const photoUri = resolvePhotoUri(att.uri);
                            if (!photoUri) return null;
                            const canDelete = att.uploadedByUserId === currentUser?.id || isOwner || isManager;
                            return (
                              <Pressable
                                key={att.id}
                                style={styles.photoContainer}
                                onPress={() => setSelectedPhoto(photoUri)}
                              >
                                <Image source={{ uri: photoUri }} style={[styles.photo, { width: 80, height: 80 }]} />
                                {canDelete && (
                                  <Pressable
                                    style={styles.photoDeleteButton}
                                    onPress={() => handleDeleteAttachment(att.id)}
                                  >
                                    <Ionicons name="close-circle" size={18} color="#fff" />
                                  </Pressable>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={[styles.infoValue, { color: colors.textMuted }]}>Нет файлов</Text>
                      )}
                      {(isManager || isOwner) && (
                        <Pressable
                          style={[styles.addPhotoButton, { marginTop: 8 }]}
                          onPress={handleAddPaymentProof}
                        >
                          <Ionicons name="attach" size={18} color={colors.primary} />
                          <Text style={styles.addPhotoText}>Прикрепить</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </>
              )}

              {order.comment && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Комментарий</Text>
                      <Text style={styles.infoValue}>{order.comment}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {(order.manager || order.florist || order.courier || order.externalFloristName || order.externalCourierName) && (isManager || isOwner) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Исполнители</Text>
              <View style={styles.infoCard}>
                {order.manager && (
                  <View style={styles.infoRow}>
                    <View style={[styles.roleAvatar, { backgroundColor: colors.roleManager + '20' }]}>
                      <Ionicons name="person" size={16} color={colors.roleManager} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Менеджер</Text>
                      <Text style={styles.infoValue}>{order.manager.name}</Text>
                    </View>
                  </View>
                )}
                {order.florist && (
                  <>
                    {order.manager && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <View style={[styles.roleAvatar, { backgroundColor: colors.roleFlorist + '20' }]}>
                        <Ionicons name="flower" size={16} color={colors.roleFlorist} />
                      </View>
                      <View>
                        <Text style={styles.infoLabel}>Флорист</Text>
                        <Text style={styles.infoValue}>{order.florist.name}</Text>
                      </View>
                    </View>
                  </>
                )}
                {order.externalFloristName && !order.florist && (
                  <>
                    {order.manager && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <View style={[styles.roleAvatar, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="flower" size={16} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Внештатный флорист</Text>
                        <Text style={styles.infoValue}>{order.externalFloristName}</Text>
                        {order.externalFloristPhone && (
                          <Text style={styles.infoValueMuted}>{order.externalFloristPhone}</Text>
                        )}
                      </View>
                    </View>
                  </>
                )}
                {order.courier && (
                  <>
                    {(order.manager || order.florist || order.externalFloristName) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <View style={[styles.roleAvatar, { backgroundColor: colors.roleCourier + '20' }]}>
                        <Ionicons name="car" size={16} color={colors.roleCourier} />
                      </View>
                      <View>
                        <Text style={styles.infoLabel}>Курьер</Text>
                        <Text style={styles.infoValue}>{order.courier.name}</Text>
                      </View>
                    </View>
                  </>
                )}
                {order.externalCourierName && !order.courier && (
                  <>
                    {(order.manager || order.florist || order.externalFloristName) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <View style={[styles.roleAvatar, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="car" size={16} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Внештатный курьер</Text>
                        <Text style={styles.infoValue}>{order.externalCourierName}</Text>
                        {order.externalCourierPhone && (
                          <Text style={styles.infoValueMuted}>{order.externalCourierPhone}</Text>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {(isManager || isOwner) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Помощники {assistants.length > 0 && `(${assistants.length})`}</Text>
                <Pressable
                  style={styles.addPhotoButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddAssistant(!showAddAssistant);
                  }}
                >
                  <Ionicons name={showAddAssistant ? "close" : "add"} size={20} color={colors.primary} />
                  <Text style={styles.addPhotoText}>{showAddAssistant ? 'Отмена' : 'Добавить'}</Text>
                </Pressable>
              </View>

              {showAddAssistant && (
                <View style={styles.assistantPickerCard}>
                  <View style={styles.assistantRoleToggle}>
                    <Pressable
                      style={[
                        styles.assistantRoleButton,
                        addAssistantRole === 'FLORIST' && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAddAssistantRole('FLORIST');
                      }}
                    >
                      <Ionicons name="flower-outline" size={16} color={addAssistantRole === 'FLORIST' ? '#fff' : colors.text} />
                      <Text style={[styles.assistantRoleButtonText, addAssistantRole === 'FLORIST' && { color: '#fff' }]}>
                        Флорист
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.assistantRoleButton,
                        addAssistantRole === 'COURIER' && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAddAssistantRole('COURIER');
                      }}
                    >
                      <Ionicons name="car-outline" size={16} color={addAssistantRole === 'COURIER' ? '#fff' : colors.text} />
                      <Text style={[styles.assistantRoleButtonText, addAssistantRole === 'COURIER' && { color: '#fff' }]}>
                        Курьер
                      </Text>
                    </Pressable>
                  </View>

                  {getAvailableAssistantUsers(addAssistantRole).length > 0 ? (
                    <View style={styles.assistantUserList}>
                      {getAvailableAssistantUsers(addAssistantRole).map(user => (
                        <Pressable
                          key={user.id}
                          style={styles.assistantUserItem}
                          onPress={() => handleAddAssistant(user.id, addAssistantRole)}
                        >
                          <View style={[styles.roleAvatar, { backgroundColor: (addAssistantRole === 'FLORIST' ? colors.roleFlorist : colors.roleCourier) + '20' }]}>
                            <Ionicons
                              name={addAssistantRole === 'FLORIST' ? 'flower' : 'car'}
                              size={16}
                              color={addAssistantRole === 'FLORIST' ? colors.roleFlorist : colors.roleCourier}
                            />
                          </View>
                          <Text style={styles.assistantUserName}>{user.name}</Text>
                          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.assistantEmptyList}>
                      <Text style={styles.assistantEmptyText}>
                        Нет доступных {addAssistantRole === 'FLORIST' ? 'флористов' : 'курьеров'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {assistants.length > 0 ? (
                <View style={styles.infoCard}>
                  {assistants.map((assistant, index) => (
                    <React.Fragment key={assistant.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <View style={styles.infoRow}>
                        <View style={[styles.roleAvatar, { backgroundColor: (assistant.role === 'FLORIST' ? colors.roleFlorist : colors.roleCourier) + '20' }]}>
                          <Ionicons
                            name={assistant.role === 'FLORIST' ? 'flower-outline' : 'car-outline'}
                            size={16}
                            color={assistant.role === 'FLORIST' ? colors.roleFlorist : colors.roleCourier}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoValue}>{assistant.userName || 'Сотрудник'}</Text>
                          <View style={[styles.assistantRoleBadge, { backgroundColor: (assistant.role === 'FLORIST' ? colors.roleFlorist : colors.roleCourier) + '20' }]}>
                            <Text style={[styles.assistantRoleBadgeText, { color: assistant.role === 'FLORIST' ? colors.roleFlorist : colors.roleCourier }]}>
                              {assistant.role === 'FLORIST' ? 'Флорист' : 'Курьер'}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          style={({ pressed }) => [
                            styles.deleteButtonTouchable,
                            { backgroundColor: colors.error + '15' },
                            pressed && { opacity: 0.5, backgroundColor: colors.error + '30' },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            handleRemoveAssistant(assistant.id);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </Pressable>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              ) : !showAddAssistant ? (
                <View style={styles.emptyPhotos}>
                  <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyPhotosText}>Нет помощников</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Фото</Text>
              {(isFlorist || isCourier || isManager || isOwner) && (
                uploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Загрузка...</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addPhotoButton}
                    onPress={handleAddPhoto}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.addPhotoText}>Добавить</Text>
                  </Pressable>
                )
              )}
            </View>
            
            {order.attachments.filter(a => a.type !== 'PAYMENT_PROOF').length > 0 ? (
              <View style={styles.photoGrid}>
                {order.attachments.filter(a => a.type !== 'PAYMENT_PROOF').map(attachment => {
                  const photoUri = resolvePhotoUri(attachment.uri);
                  if (!photoUri) return null;
                  const canDelete = attachment.uploadedByUserId === currentUser?.id || currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';
                  return (
                    <Pressable
                      key={attachment.id}
                      style={styles.photoContainer}
                      onPress={() => setSelectedPhoto(photoUri)}
                      onLongPress={canDelete ? () => handleDeleteAttachment(attachment.id) : undefined}
                    >
                      <Image source={{ uri: photoUri }} style={styles.photo} />
                      {canDelete && (
                        <Pressable
                          style={styles.photoDeleteButton}
                          onPress={() => handleDeleteAttachment(attachment.id)}
                        >
                          <Ionicons name="close-circle" size={22} color="#fff" />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyPhotos}>
                <Ionicons name="images-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyPhotosText}>Нет фотографий</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Расходы {expenses.length > 0 && `(${expenses.length})`}
              </Text>
              <Pressable
                style={styles.addPhotoButton}
                onPress={() => setShowExpenseForm(!showExpenseForm)}
              >
                <Ionicons name={showExpenseForm ? "close" : "add"} size={20} color={colors.primary} />
                <Text style={styles.addPhotoText}>{showExpenseForm ? 'Отмена' : 'Добавить'}</Text>
              </Pressable>
            </View>
            
            {showExpenseForm && (
              <View style={styles.expenseForm}>
                <View style={styles.expenseFormRow}>
                  <View style={styles.expenseAmountContainer}>
                    <Text style={styles.expenseFormLabel}>Сумма</Text>
                    <TextInput
                      style={styles.expenseAmountInput}
                      value={expenseAmount}
                      onChangeText={setExpenseAmount}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                    <Text style={styles.expenseCurrency}>₽</Text>
                  </View>
                </View>
                <View style={styles.expenseFormRow}>
                  <Text style={styles.expenseFormLabel}>На что расход? *</Text>
                  <TextInput
                    style={styles.expenseCommentInput}
                    value={expenseComment}
                    onChangeText={setExpenseComment}
                    placeholder="Опишите расход (обязательно)"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />
                </View>
                <Button
                  title="Сохранить расход"
                  onPress={handleAddExpense}
                  loading={addingExpense}
                  disabled={!expenseAmount || !expenseComment.trim()}
                  size="medium"
                />
              </View>
            )}
            
            {expensesLoading ? (
              <View style={styles.expenseLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : expenses.length > 0 ? (
              <View style={styles.expensesList}>
                {expenses.map(expense => (
                  <View key={expense.id} style={styles.expenseItem}>
                    <View style={styles.expenseItemHeader}>
                      <View style={styles.expenseAmountBadge}>
                        <Text style={styles.expenseAmountText}>
                          {expense.amount.toLocaleString()} ₽
                        </Text>
                      </View>
                      {(isManager || isOwner || expense.createdByUserId === currentUser?.id) && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.deleteButtonTouchable,
                            pressed && { opacity: 0.5, backgroundColor: colors.error + '20' },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            handleDeleteExpense(expense.id);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                    <Text style={styles.expenseComment}>{expense.comment}</Text>
                    <View style={styles.expenseFooter}>
                      {expense.createdByName && (
                        <Text style={styles.expenseAuthor}>{expense.createdByName}</Text>
                      )}
                      <Text style={styles.expenseDate}>
                        {format(new Date(expense.createdAt), "d MMM, HH:mm", { locale: ru })}
                      </Text>
                    </View>
                  </View>
                ))}
                {totalExpenses > 0 && (
                  <View style={styles.expensesTotal}>
                    <Text style={styles.expensesTotalLabel}>Итого расходов:</Text>
                    <Text style={styles.expensesTotalValue}>{totalExpenses.toLocaleString()} ₽</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyPhotos}>
                <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyPhotosText}>Нет расходов</Text>
              </View>
            )}
          </View>

          {availableStatuses.length > 0 && order.status !== 'DELIVERED' && order.status !== 'CANCELED' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Изменить статус</Text>
              <View style={styles.statusButtons}>
                {availableStatuses
                  .filter(s => s !== order.status)
                  .map(status => (
                    <Button
                      key={status}
                      title={ORDER_STATUS_LABELS[status]}
                      onPress={() => handleStatusChange(status)}
                      variant={status === 'CANCELED' ? 'danger' : status === 'DELIVERED' ? 'success' : 'secondary'}
                      size="small"
                    />
                  ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>История изменений</Text>
            <View style={styles.historyList}>
              {order.history.map((entry, index) => (
                <View key={entry.id} style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  {index < order.history.length - 1 && <View style={styles.historyLine} />}
                  <View style={styles.historyContent}>
                    <Text style={styles.historyText}>
                      {entry.fromStatus 
                        ? `${ORDER_STATUS_LABELS[entry.fromStatus]} → ${ORDER_STATUS_LABELS[entry.toStatus]}`
                        : ORDER_STATUS_LABELS[entry.toStatus]}
                    </Text>
                    {entry.changedByName && (
                      <Text style={styles.historyAuthor}>{entry.changedByName}</Text>
                    )}
                    {entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                    <Text style={styles.historyTime}>
                      {format(new Date(entry.changedAt), "d MMM, HH:mm", { locale: ru })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedPhoto(null)}
        >
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.modalPhoto}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentDesktop: {
    alignItems: 'center',
  },
  content: {
    width: '100%',
  },
  contentInnerDesktop: {
    maxWidth: 700,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  section: {
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueText: {
    fontSize: 14,
    color: colors.error,
    fontFamily: 'Inter_600SemiBold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  editButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 2,
  },
  infoValueMuted: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  amountValue: {
    color: colors.primary,
  },
  overdueTime: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  paymentQuickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  paymentQuickButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentQuickButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoDeleteButton: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 11,
  },
  emptyPhotos: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyPhotosText: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItem: {
    flexDirection: 'row',
    paddingLeft: 4,
    minHeight: 60,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  historyLine: {
    position: 'absolute',
    left: 8,
    top: 14,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
  },
  historyContent: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 16,
  },
  historyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  historyAuthor: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  expenseForm: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  expenseFormRow: {
    gap: 6,
  },
  expenseFormLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  expenseAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseAmountInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expenseCurrency: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  expenseCommentInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  expenseLoading: {
    padding: 32,
    alignItems: 'center',
  },
  expensesList: {
    gap: 10,
  },
  expenseItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expenseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseAmountBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expenseAmountText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.error,
  },
  expenseDeleteButton: {
    padding: 4,
  },
  deleteButtonTouchable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  expenseComment: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    marginBottom: 8,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseAuthor: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  expenseDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  expensesTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  expensesTotalLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  expensesTotalValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.error,
  },
  assistantPickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  assistantRoleToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  assistantRoleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
  },
  assistantRoleButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  assistantUserList: {
    gap: 4,
  },
  assistantUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  assistantUserName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  assistantEmptyList: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  assistantEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  assistantRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  assistantRoleBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPhoto: {
    width: '92%',
    height: '80%',
  },
});
