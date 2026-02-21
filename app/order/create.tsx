import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, Pressable, Dimensions, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { Order, User, USER_ROLE_LABELS, PaymentStatus, ClientSource, PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS } from '@/lib/types';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { validatePhone, formatPhoneNumber } from '@/lib/validation';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export default function CreateOrderScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { users, createOrder, addAttachment } = useData();
  const { colors } = useTheme();
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryTimeEnd, setDeliveryTimeEnd] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [floristId, setFloristId] = useState<string | null>(null);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [useExternalFlorist, setUseExternalFlorist] = useState(false);
  const [useExternalCourier, setUseExternalCourier] = useState(false);
  const [externalFloristName, setExternalFloristName] = useState('');
  const [externalFloristPhone, setExternalFloristPhone] = useState('');
  const [externalCourierName, setExternalCourierName] = useState('');
  const [externalCourierPhone, setExternalCourierPhone] = useState('');
  const [showFloristPicker, setShowFloristPicker] = useState(false);
  const [showCourierPicker, setShowCourierPicker] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('NOT_PAID');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [clientSource, setClientSource] = useState<ClientSource>('PHONE');
  const [clientSourceId, setClientSourceId] = useState('');
  const [showPaymentStatusPicker, setShowPaymentStatusPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [clarifyWithRecipient, setClarifyWithRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingPhotos, setPendingPhotos] = useState<{uri: string; base64: string; mimeType: string}[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  interface PendingPhoto { uri: string; base64: string; mimeType: string; }

  const compressImageWeb = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return new Promise<string>((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const MAX = 1200;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.floor(w * r);
          h = Math.floor(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.6);
        resolve(compressed.split(',')[1]);
      };
      img.onerror = () => reject(new Error('Image compression failed'));
      img.src = dataUrl;
    });
  };

  const handlePickPhoto = async () => {
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

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const asset = result.assets[0];
      try {
        let base64Data: string;
        const mimeType = 'image/jpeg';
        if (Platform.OS === 'web') {
          base64Data = await compressImageWeb(asset.uri);
        } else {
          if (asset.base64) {
            base64Data = asset.base64;
          } else {
            const FileSystem = require('expo-file-system');
            base64Data = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        }
        setPendingPhotos(prev => [...prev, { uri: asset.uri, base64: base64Data, mimeType }]);
      } catch (error) {
        console.error('Photo pick error:', error);
        Alert.alert('Ошибка', 'Не удалось выбрать фото');
      }
    }
  };

  const handleRemovePendingPhoto = (index: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const florists = users.filter(u => u.role === 'FLORIST');
  const couriers = users.filter(u => u.role === 'COURIER');
  const selectedFlorist = florists.find(f => f.id === floristId);
  const selectedCourier = couriers.find(c => c.id === courierId);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setClientPhone(formatted);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!clientName.trim()) newErrors.clientName = 'Введите имя клиента';
    
    if (!clientPhone.trim()) {
      newErrors.clientPhone = 'Введите телефон';
    } else {
      const phoneResult = validatePhone(clientPhone);
      if (!phoneResult.isValid) {
        newErrors.clientPhone = phoneResult.error!;
      }
    }
    
    if (!address.trim()) newErrors.address = 'Введите адрес';
    if (!clarifyWithRecipient) {
      if (!deliveryDate.trim()) newErrors.deliveryDate = 'Введите дату (ДД.ММ.ГГГГ)';
      if (!deliveryTime.trim()) newErrors.deliveryTime = 'Введите время (ЧЧ:ММ)';
    }
    if (!amount.trim() || isNaN(Number(amount))) newErrors.amount = 'Введите сумму';
    
    const dateMatch = deliveryDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (deliveryDate && !dateMatch) {
      newErrors.deliveryDate = 'Формат: ДД.ММ.ГГГГ';
    }
    
    const timeMatch = deliveryTime.match(/^(\d{2}):(\d{2})$/);
    if (deliveryTime && !timeMatch) {
      newErrors.deliveryTime = 'Формат: ЧЧ:ММ';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const dateMatch = deliveryDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)!;
    const timeMatch = deliveryTime.match(/^(\d{2}):(\d{2})$/)!;
    
    const deliveryDateTime = new Date(
      parseInt(dateMatch[3]),
      parseInt(dateMatch[2]) - 1,
      parseInt(dateMatch[1]),
      parseInt(timeMatch[1]),
      parseInt(timeMatch[2])
    ).getTime();

    let deliveryDateTimeEnd = null;
    if (deliveryTimeEnd) {
      const timeEndMatch = deliveryTimeEnd.match(/^(\d{2}):(\d{2})$/);
      if (timeEndMatch) {
        deliveryDateTimeEnd = new Date(
          parseInt(dateMatch[3]),
          parseInt(dateMatch[2]) - 1,
          parseInt(dateMatch[1]),
          parseInt(timeEndMatch[1]),
          parseInt(timeEndMatch[2])
        ).getTime();
      }
    }

    setIsSubmitting(true);

    const result = await createOrder({
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      address: address.trim(),
      deliveryDateTime,
      deliveryDateTimeEnd,
      amount: Number(amount),
      floristId: useExternalFlorist ? null : floristId,
      courierId: useExternalCourier ? null : courierId,
      externalFloristName: useExternalFlorist ? externalFloristName.trim() || null : null,
      externalFloristPhone: useExternalFlorist ? externalFloristPhone.trim() || null : null,
      externalCourierName: useExternalCourier ? externalCourierName.trim() || null : null,
      externalCourierPhone: useExternalCourier ? externalCourierPhone.trim() || null : null,
      comment: (isUrgent ? 'СРОЧНО! ' : '') + (comment.trim() || '') || null,
      paymentStatus,
      paymentMethod: paymentMethod.trim() || null,
      paymentDetails: paymentDetails.trim() || null,
      clientSource,
      clientSourceId: clientSourceId.trim() || null,
    });

    if (!result.success && result.duplicates) {
      setIsSubmitting(false);
      const dupsText = result.duplicates.length > 0
        ? result.duplicates.map(d => `#${(d as any).orderNumber} ${d.clientName}`).join(', ')
        : 'Похожие заказы найдены';

      const doForceCreate = async () => {
        setIsSubmitting(true);
        const forceResult = await createOrder({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          address: address.trim(),
          deliveryDateTime,
          deliveryDateTimeEnd,
          amount: Number(amount),
          floristId: useExternalFlorist ? null : floristId,
          courierId: useExternalCourier ? null : courierId,
          externalFloristName: useExternalFlorist ? externalFloristName.trim() || null : null,
          externalFloristPhone: useExternalFlorist ? externalFloristPhone.trim() || null : null,
          externalCourierName: useExternalCourier ? externalCourierName.trim() || null : null,
          externalCourierPhone: useExternalCourier ? externalCourierPhone.trim() || null : null,
          comment: (isUrgent ? 'СРОЧНО! ' : '') + (comment.trim() || '') || null,
          paymentStatus,
          paymentMethod: paymentMethod.trim() || null,
          paymentDetails: paymentDetails.trim() || null,
          clientSource,
          clientSourceId: clientSourceId.trim() || null,
          force: true,
        });
        if (forceResult.success && forceResult.orderId && pendingPhotos.length > 0) {
          for (const photo of pendingPhotos) {
            try { await addAttachment(forceResult.orderId, photo.base64, photo.mimeType); } catch {}
          }
        }
        setIsSubmitting(false);
        if (forceResult.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } else {
          Alert.alert('Ошибка', forceResult.error || 'Не удалось создать заказ. Попробуйте ещё раз.');
        }
      };

      if (Platform.OS === 'web') {
        const createAnyway = window.confirm(`Возможный дубль\n\n${dupsText}\n\nСоздать заказ все равно?`);
        if (createAnyway) {
          await doForceCreate();
        }
      } else {
        Alert.alert(
          'Возможный дубль',
          `Найдены похожие заказы: ${dupsText}`,
          [
            { text: 'Отмена', style: 'cancel' },
            ...(result.duplicates.length > 0 ? [{
              text: 'Открыть',
              onPress: () => router.push(`/order/${result.duplicates![0].id}`),
            }] : []),
            {
              text: 'Создать все равно',
              onPress: doForceCreate,
            },
          ]
        );
      }
      return;
    }

    if (!result.success) {
      setIsSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Ошибка', result.error || 'Не удалось создать заказ. Попробуйте ещё раз.');
      return;
    }

    if (result.orderId && pendingPhotos.length > 0) {
      for (const photo of pendingPhotos) {
        try {
          await addAttachment(result.orderId, photo.base64, photo.mimeType);
        } catch (e) {
          console.error('Failed to upload photo during creation:', e);
        }
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(false);
    router.back();
  };

  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const styles = createStyles(colors);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[
        { paddingBottom: insets.bottom + webBottomInset + 24 },
        isDesktop && styles.contentDesktop,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.form, isDesktop && styles.formDesktop]}>
        {Object.keys(errors).length > 0 && (
          <View style={styles.errorSummary}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorSummaryText}>
              Исправьте выделенные поля перед сохранением
            </Text>
          </View>
        )}
        <InputField
          label="Имя клиента *"
          value={clientName}
          onChangeText={setClientName}
          placeholder="Иванова Мария"
          error={errors.clientName}
        />

        <InputField
          label="Телефон *"
          value={clientPhone}
          onChangeText={handlePhoneChange}
          placeholder="+7 999 123 45 67"
          keyboardType="phone-pad"
          error={errors.clientPhone}
        />

        <InputField
          label="Адрес доставки *"
          value={address}
          onChangeText={setAddress}
          placeholder="ул. Ленина, 15, кв. 42"
          multiline
          error={errors.address}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField
              label="Дата *"
              value={deliveryDate}
              onChangeText={setDeliveryDate}
              placeholder="25.12.2024"
              keyboardType="numbers-and-punctuation"
              error={errors.deliveryDate}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="Время с *"
              value={deliveryTime}
              onChangeText={setDeliveryTime}
              placeholder="14:00"
              keyboardType="numbers-and-punctuation"
              error={errors.deliveryTime}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="до"
              value={deliveryTimeEnd}
              onChangeText={setDeliveryTimeEnd}
              placeholder="16:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickTimeContainer}
        >
          <Pressable
            style={[styles.quickTimeChip, isUrgent && styles.quickTimeChipActive]}
            onPress={() => {
              const now = new Date();
              const dd = String(now.getDate()).padStart(2, '0');
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const yyyy = now.getFullYear();
              const hh = String(now.getHours()).padStart(2, '0');
              const min = String(now.getMinutes()).padStart(2, '0');
              setDeliveryDate(`${dd}.${mm}.${yyyy}`);
              setDeliveryTime(`${hh}:${min}`);
              setDeliveryTimeEnd('');
              setIsUrgent(true);
              setClarifyWithRecipient(false);
              setErrors(prev => { const next = { ...prev }; delete next.deliveryDate; delete next.deliveryTime; return next; });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="flash" size={14} color={isUrgent ? '#fff' : colors.error} />
            <Text style={[styles.quickTimeText, isUrgent && styles.quickTimeTextActive]}>Срочно сейчас</Text>
          </Pressable>

          <Pressable
            style={[styles.quickTimeChip, !isUrgent && !clarifyWithRecipient && deliveryTime === '09:00' && deliveryTimeEnd === '21:00' && styles.quickTimeChipActive]}
            onPress={() => {
              const now = new Date();
              const dd = String(now.getDate()).padStart(2, '0');
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const yyyy = now.getFullYear();
              setDeliveryDate(`${dd}.${mm}.${yyyy}`);
              setDeliveryTime('09:00');
              setDeliveryTimeEnd('21:00');
              setIsUrgent(false);
              setClarifyWithRecipient(false);
              setErrors(prev => { const next = { ...prev }; delete next.deliveryDate; delete next.deliveryTime; return next; });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="sunny" size={14} color={!isUrgent && !clarifyWithRecipient && deliveryTime === '09:00' && deliveryTimeEnd === '21:00' ? '#fff' : colors.warning} />
            <Text style={[styles.quickTimeText, !isUrgent && !clarifyWithRecipient && deliveryTime === '09:00' && deliveryTimeEnd === '21:00' && styles.quickTimeTextActive]}>В течение дня</Text>
          </Pressable>

          <Pressable
            style={[styles.quickTimeChip, clarifyWithRecipient && styles.quickTimeChipActive]}
            onPress={() => {
              const now = new Date();
              const dd = String(now.getDate()).padStart(2, '0');
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const yyyy = now.getFullYear();
              setDeliveryDate(`${dd}.${mm}.${yyyy}`);
              setDeliveryTime('00:00');
              setDeliveryTimeEnd('');
              setClarifyWithRecipient(true);
              setIsUrgent(false);
              if (!comment.includes('[Уточнить у получателя]')) {
                setComment(prev => (prev ? prev + '\n' : '') + '[Уточнить у получателя]');
              }
              setErrors(prev => { const next = { ...prev }; delete next.deliveryDate; delete next.deliveryTime; return next; });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="help-circle" size={14} color={clarifyWithRecipient ? '#fff' : colors.primary} />
            <Text style={[styles.quickTimeText, clarifyWithRecipient && styles.quickTimeTextActive]}>Уточнить у получателя</Text>
          </Pressable>
        </ScrollView>

        <InputField
          label="Сумма заказа *"
          value={amount}
          onChangeText={setAmount}
          placeholder="5000"
          keyboardType="numeric"
          error={errors.amount}
        />

        <Text style={styles.sectionTitle}>Оплата</Text>

        <Text style={styles.label}>Статус оплаты</Text>
        <Pressable
          style={styles.picker}
          onPress={() => setShowPaymentStatusPicker(!showPaymentStatusPicker)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusDot, { backgroundColor: paymentStatus === 'PAID' ? '#4CAF50' : paymentStatus === 'ADVANCE' ? '#FF9800' : '#F44336' }]} />
            <Text style={styles.pickerText}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>

        {showPaymentStatusPicker && (
          <View style={styles.pickerList}>
            {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(status => (
              <Pressable
                key={status}
                style={[styles.pickerOption, paymentStatus === status && styles.pickerOptionSelected]}
                onPress={() => {
                  setPaymentStatus(status);
                  setShowPaymentStatusPicker(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: status === 'PAID' ? '#4CAF50' : status === 'ADVANCE' ? '#FF9800' : '#F44336' }]} />
                  <Text style={styles.pickerOptionText}>{PAYMENT_STATUS_LABELS[status]}</Text>
                </View>
                {paymentStatus === status && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        <InputField
          label="Способ оплаты"
          value={paymentMethod}
          onChangeText={setPaymentMethod}
          placeholder="Наличные, карта, перевод..."
        />

        <InputField
          label="Детали оплаты"
          value={paymentDetails}
          onChangeText={setPaymentDetails}
          placeholder="Номер чека, заметки..."
        />

        <Text style={styles.sectionTitle}>Источник заказа</Text>

        <Text style={styles.label}>Откуда клиент</Text>
        <Pressable
          style={styles.picker}
          onPress={() => setShowSourcePicker(!showSourcePicker)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={clientSource === 'WHATSAPP' ? 'logo-whatsapp' : clientSource === 'TELEGRAM' ? 'paper-plane' : clientSource === 'INSTAGRAM' ? 'logo-instagram' : clientSource === 'WEBSITE' ? 'globe-outline' : clientSource === 'PHONE' ? 'call-outline' : 'ellipsis-horizontal'}
              size={20}
              color={clientSource === 'WHATSAPP' ? '#25D366' : clientSource === 'TELEGRAM' ? '#0088CC' : clientSource === 'INSTAGRAM' ? '#E4405F' : colors.primary}
            />
            <Text style={styles.pickerText}>{CLIENT_SOURCE_LABELS[clientSource]}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>

        {showSourcePicker && (
          <View style={styles.pickerList}>
            {(Object.keys(CLIENT_SOURCE_LABELS) as ClientSource[]).map(source => (
              <Pressable
                key={source}
                style={[styles.pickerOption, clientSource === source && styles.pickerOptionSelected]}
                onPress={() => {
                  setClientSource(source);
                  setShowSourcePicker(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={source === 'WHATSAPP' ? 'logo-whatsapp' : source === 'TELEGRAM' ? 'paper-plane' : source === 'INSTAGRAM' ? 'logo-instagram' : source === 'WEBSITE' ? 'globe-outline' : source === 'PHONE' ? 'call-outline' : 'ellipsis-horizontal'}
                    size={20}
                    color={source === 'WHATSAPP' ? '#25D366' : source === 'TELEGRAM' ? '#0088CC' : source === 'INSTAGRAM' ? '#E4405F' : colors.primary}
                  />
                  <Text style={styles.pickerOptionText}>{CLIENT_SOURCE_LABELS[source]}</Text>
                </View>
                {clientSource === source && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {(clientSource === 'WHATSAPP' || clientSource === 'TELEGRAM' || clientSource === 'INSTAGRAM') && (
          <InputField
            label={`${CLIENT_SOURCE_LABELS[clientSource]} ID / Ник`}
            value={clientSourceId}
            onChangeText={setClientSourceId}
            placeholder={clientSource === 'INSTAGRAM' ? '@username' : 'ID или имя пользователя'}
          />
        )}

        <InputField
          label="Комментарий"
          value={comment}
          onChangeText={setComment}
          placeholder="Дополнительная информация..."
          multiline
          numberOfLines={3}
        />

        <Text style={styles.sectionTitle}>Назначить исполнителей</Text>

        <Text style={styles.label}>Флорист</Text>
        <Pressable
          style={styles.picker}
          onPress={() => setShowFloristPicker(!showFloristPicker)}
        >
          <Text style={useExternalFlorist ? styles.pickerText : (selectedFlorist ? styles.pickerText : styles.pickerPlaceholder)}>
            {useExternalFlorist ? 'Внештатный' : (selectedFlorist?.name || 'Не назначен')}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>

        {showFloristPicker && (
          <View style={styles.pickerList}>
            <Pressable
              style={styles.pickerOption}
              onPress={() => {
                setFloristId(null);
                setUseExternalFlorist(false);
                setExternalFloristName('');
                setExternalFloristPhone('');
                setShowFloristPicker(false);
              }}
            >
              <Text style={styles.pickerOptionText}>Не назначен</Text>
            </Pressable>
            {florists.map(user => (
              <Pressable
                key={user.id}
                style={[
                  styles.pickerOption,
                  !useExternalFlorist && floristId === user.id && styles.pickerOptionSelected
                ]}
                onPress={() => {
                  setFloristId(user.id);
                  setUseExternalFlorist(false);
                  setExternalFloristName('');
                  setExternalFloristPhone('');
                  setShowFloristPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{user.name}</Text>
                {!useExternalFlorist && floristId === user.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
            <Pressable
              style={[styles.pickerOption, useExternalFlorist && styles.pickerOptionSelected]}
              onPress={() => {
                setFloristId(null);
                setUseExternalFlorist(true);
                setShowFloristPicker(false);
              }}
            >
              <Text style={[styles.pickerOptionText, { color: colors.warning }]}>Внештатный</Text>
              {useExternalFlorist && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          </View>
        )}

        {useExternalFlorist && (
          <View style={styles.externalFields}>
            <InputField
              label="Имя внештатного флориста"
              value={externalFloristName}
              onChangeText={setExternalFloristName}
              placeholder="Имя флориста"
            />
            <InputField
              label="Телефон внештатного флориста"
              value={externalFloristPhone}
              onChangeText={(text) => setExternalFloristPhone(formatPhoneNumber(text))}
              placeholder="+7 999 123 45 67"
              keyboardType="phone-pad"
            />
          </View>
        )}

        <Text style={styles.label}>Курьер</Text>
        <Pressable
          style={styles.picker}
          onPress={() => setShowCourierPicker(!showCourierPicker)}
        >
          <Text style={useExternalCourier ? styles.pickerText : (selectedCourier ? styles.pickerText : styles.pickerPlaceholder)}>
            {useExternalCourier ? 'Внештатный' : (selectedCourier?.name || 'Не назначен')}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>

        {showCourierPicker && (
          <View style={styles.pickerList}>
            <Pressable
              style={styles.pickerOption}
              onPress={() => {
                setCourierId(null);
                setUseExternalCourier(false);
                setExternalCourierName('');
                setExternalCourierPhone('');
                setShowCourierPicker(false);
              }}
            >
              <Text style={styles.pickerOptionText}>Не назначен</Text>
            </Pressable>
            {couriers.map(user => (
              <Pressable
                key={user.id}
                style={[
                  styles.pickerOption,
                  !useExternalCourier && courierId === user.id && styles.pickerOptionSelected
                ]}
                onPress={() => {
                  setCourierId(user.id);
                  setUseExternalCourier(false);
                  setExternalCourierName('');
                  setExternalCourierPhone('');
                  setShowCourierPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{user.name}</Text>
                {!useExternalCourier && courierId === user.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
            <Pressable
              style={[styles.pickerOption, useExternalCourier && styles.pickerOptionSelected]}
              onPress={() => {
                setCourierId(null);
                setUseExternalCourier(true);
                setShowCourierPicker(false);
              }}
            >
              <Text style={[styles.pickerOptionText, { color: colors.warning }]}>Внештатный</Text>
              {useExternalCourier && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          </View>
        )}

        {useExternalCourier && (
          <View style={styles.externalFields}>
            <InputField
              label="Имя внештатного курьера"
              value={externalCourierName}
              onChangeText={setExternalCourierName}
              placeholder="Имя курьера"
            />
            <InputField
              label="Телефон внештатного курьера"
              value={externalCourierPhone}
              onChangeText={(text) => setExternalCourierPhone(formatPhoneNumber(text))}
              placeholder="+7 999 123 45 67"
              keyboardType="phone-pad"
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Фото</Text>
        <View style={styles.photoSection}>
          <View style={styles.photoGrid}>
            {pendingPhotos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <Pressable
                  style={styles.photoDeleteButton}
                  onPress={() => handleRemovePendingPhoto(index)}
                >
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable style={styles.addPhotoButton} onPress={handlePickPhoto}>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Text style={[styles.addPhotoText, { color: colors.primary }]}>Добавить фото</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 24 }}>
          <Button
            title="Создать заказ"
            onPress={handleSubmit}
            loading={isSubmitting}
            size="large"
          />
        </View>
      </View>
    </ScrollView>
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
  form: {
    padding: 16,
    width: '100%',
  },
  formDesktop: {
    maxWidth: 600,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  pickerPlaceholder: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  pickerList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: -12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '15',
  },
  pickerOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  externalFields: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning + '50',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickTimeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingBottom: 16,
  },
  quickTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTimeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickTimeText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  quickTimeTextActive: {
    color: '#fff',
  },
  photoSection: {
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoDeleteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 11,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  errorSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error + '18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  errorSummaryText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.error,
    flex: 1,
  },
});
