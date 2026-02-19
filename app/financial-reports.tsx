import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Pressable, ActivityIndicator, Alert, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS, BUSINESS_EXPENSE_CATEGORY_LABELS, ORDER_STATUS_LABELS, Order } from '@/lib/types';
import { format, subDays, startOfDay, endOfDay, subMonths, parse, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { StatusBadge } from '@/components/StatusBadge';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

type Period = 'week' | 'month' | '3months' | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  '3months': '3 мес.',
  custom: 'Период',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  NOT_PAID: '#F44336',
  ADVANCE: '#FF9800',
  PAID: '#4CAF50',
};

const SOURCE_ICONS: Record<string, string> = {
  PHONE: 'call-outline',
  WHATSAPP: 'logo-whatsapp',
  TELEGRAM: 'paper-plane-outline',
  INSTAGRAM: 'logo-instagram',
  WEBSITE: 'globe-outline',
  OTHER: 'ellipsis-horizontal-outline',
};

const SOURCE_COLORS: Record<string, string> = {
  PHONE: '#2196F3',
  WHATSAPP: '#25D366',
  TELEGRAM: '#0088CC',
  INSTAGRAM: '#E1306C',
  WEBSITE: '#FF9800',
  OTHER: '#9E9E9E',
};

const CATEGORY_ICONS: Record<string, string> = {
  TAXES: 'receipt-outline',
  RENT: 'home-outline',
  SALARY: 'people-outline',
  SUPPLIES: 'cube-outline',
  MARKETING: 'megaphone-outline',
  TRANSPORT: 'car-outline',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  IN_WORK: 'В работе',
  ASSEMBLED: 'Собран',
  ON_DELIVERY: 'В доставке',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#2196F3',
  IN_WORK: '#FF9800',
  ASSEMBLED: '#9C27B0',
  ON_DELIVERY: '#00BCD4',
  DELIVERED: '#4CAF50',
  CANCELED: '#F44336',
};

interface FinancialReport {
  totalIncome: number;
  totalOrderExpenses: number;
  totalBizExpenses: number;
  totalExpenses: number;
  netProfit: number;
  ordersCount: number;
  deliveredCount: number;
  canceledCount: number;
  incomeByPaymentStatus: Record<string, number>;
  incomeByPaymentMethod: Record<string, number>;
  bizExpensesByCategory: Record<string, number>;
  incomeBySource: Record<string, { count: number; amount: number }>;
  ordersByStatus: Record<string, number>;
}

function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
}

function parseDateString(str: string): Date | null {
  if (!str || str.length < 10) return null;
  const parsed = parse(str, 'dd.MM.yyyy', new Date());
  if (isValid(parsed) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    return parsed;
  }
  return null;
}

export default function FinancialReportsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  const [customFromText, setCustomFromText] = useState('');
  const [customToText, setCustomToText] = useState('');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  const [drilldownVisible, setDrilldownVisible] = useState(false);
  const [drilldownOrders, setDrilldownOrders] = useState<Order[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');

  const dateRange = useMemo(() => {
    if (period === 'custom' && customFrom && customTo) {
      return {
        from: startOfDay(customFrom).getTime(),
        to: endOfDay(customTo).getTime(),
      };
    }
    const now = new Date();
    let from: Date;
    switch (period) {
      case 'week':
        from = subDays(now, 7);
        break;
      case 'month':
        from = subMonths(now, 1);
        break;
      case '3months':
        from = subMonths(now, 3);
        break;
      default:
        from = subMonths(now, 1);
        break;
    }
    return {
      from: startOfDay(from).getTime(),
      to: endOfDay(now).getTime(),
    };
  }, [period, customFrom, customTo]);

  const loadReport = useCallback(async () => {
    if (period === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    try {
      const data = await api.reports.financial(dateRange.from, dateRange.to);
      setReport(data);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, period, customFrom, customTo]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleCustomFromChange = (text: string) => {
    const formatted = formatDateInput(text);
    setCustomFromText(formatted);
    const parsed = parseDateString(formatted);
    if (parsed) setCustomFrom(parsed);
  };

  const handleCustomToChange = (text: string) => {
    const formatted = formatDateInput(text);
    setCustomToText(formatted);
    const parsed = parseDateString(formatted);
    if (parsed) setCustomTo(parsed);
  };

  const handlePeriodChange = (p: Period) => {
    Haptics.selectionAsync();
    setPeriod(p);
    if (p === 'custom') {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      setCustomFromText(format(weekAgo, 'dd.MM.yyyy'));
      setCustomToText(format(now, 'dd.MM.yyyy'));
      setCustomFrom(weekAgo);
      setCustomTo(now);
    }
  };

  const handleDrilldown = async (title: string, filters: { status?: string; paymentStatus?: string; source?: string; paymentMethod?: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrilldownTitle(title);
    setDrilldownVisible(true);
    setDrilldownLoading(true);
    try {
      const result = await api.reports.orders({
        from: dateRange.from,
        to: dateRange.to,
        ...filters,
      });
      setDrilldownOrders(result);
    } catch (error) {
      console.error('Error loading drilldown orders:', error);
      setDrilldownOrders([]);
    }
    setDrilldownLoading(false);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const styles = createStyles(colors);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}М ₽`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}к ₽`;
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  const formatAmountFull = (amount: number) => {
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  const isOwner = currentUser?.role === 'OWNER';

  useEffect(() => {
    if (currentUser && currentUser.role !== 'OWNER') {
      router.back();
    }
  }, [currentUser]);

  const renderDrilldownItem = ({ item }: { item: Order }) => (
    <Pressable
      style={styles.drilldownItem}
      onPress={() => {
        setDrilldownVisible(false);
        router.push(`/order/${item.id}`);
      }}
    >
      <View style={styles.drilldownItemHeader}>
        <StatusBadge status={item.status} size="small" />
        {item.paymentStatus && (
          <View style={[styles.paymentBadge, { backgroundColor: PAYMENT_STATUS_COLORS[item.paymentStatus] + '20' }]}>
            <View style={[styles.paymentDot, { backgroundColor: PAYMENT_STATUS_COLORS[item.paymentStatus] }]} />
            <Text style={[styles.paymentBadgeText, { color: PAYMENT_STATUS_COLORS[item.paymentStatus] }]}>
              {PAYMENT_STATUS_LABELS[item.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS]}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.drilldownClientName}>{item.clientName}</Text>
      <View style={styles.drilldownInfoRow}>
        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.drilldownInfoText} numberOfLines={1}>{item.address}</Text>
      </View>
      <View style={styles.drilldownInfoRow}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.drilldownInfoText}>
          {format(new Date(item.deliveryDateTime), 'dd MMM yyyy, HH:mm', { locale: ru })}
        </Text>
      </View>
      <View style={styles.drilldownInfoRow}>
        <Ionicons name="cash-outline" size={14} color={colors.primary} />
        <Text style={[styles.drilldownInfoText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
          {item.amount.toLocaleString()} ₽
        </Text>
      </View>
    </Pressable>
  );

  if (loading && !report) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Финансовый отчёт</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Загрузка отчёта...</Text>
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Финансовый отчёт</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.emptyText}>Не удалось загрузить отчёт</Text>
      </View>
    );
  }

  const profitColor = report.netProfit >= 0 ? colors.primary : colors.error;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Финансовый отчёт</Text>
        <Pressable onPress={loadReport} style={styles.backButton}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.periodSelector}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && { backgroundColor: colors.primary }]}
            onPress={() => handlePeriodChange(p)}
          >
            <Text style={[styles.periodBtnText, period === p && { color: '#fff' }]}>
              {PERIOD_LABELS[p]}
            </Text>
          </Pressable>
        ))}
      </View>

      {period === 'custom' && (
        <View style={styles.customDateRow}>
          <View style={styles.dateInputWrapper}>
            <Text style={styles.dateInputLabel}>С</Text>
            <TextInput
              style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={customFromText}
              onChangeText={handleCustomFromChange}
              placeholder="дд.мм.гггг"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <View style={styles.dateInputWrapper}>
            <Text style={styles.dateInputLabel}>По</Text>
            <TextInput
              style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={customToText}
              onChangeText={handleCustomToChange}
              placeholder="дд.мм.гггг"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          { paddingBottom: insets.bottom + webBottomInset + 24 },
          isDesktop && styles.contentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isDesktop && styles.contentInnerDesktop]}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Доход</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  {formatAmount(report.totalIncome)}
                </Text>
              </View>
              <View style={[styles.summaryDivider]} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Расходы</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatAmount(report.totalExpenses)}
                </Text>
              </View>
              <View style={[styles.summaryDivider]} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Прибыль</Text>
                <Text style={[styles.summaryValue, { color: profitColor }]}>
                  {report.netProfit >= 0 ? '+' : ''}{formatAmount(report.netProfit)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <Pressable
              style={[styles.metricCard, { borderLeftColor: colors.primary }]}
              onPress={() => handleDrilldown('Все заказы', {})}
            >
              <Ionicons name="cart-outline" size={20} color={colors.primary} />
              <Text style={styles.metricValue}>{report.ordersCount}</Text>
              <Text style={styles.metricLabel}>Заказов</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.metricCard, { borderLeftColor: '#4CAF50' }]}
              onPress={() => handleDrilldown('Доставлено', { status: 'DELIVERED' })}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.metricValue}>{report.deliveredCount}</Text>
              <Text style={styles.metricLabel}>Доставлено</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.metricCard, { borderLeftColor: colors.error }]}
              onPress={() => handleDrilldown('Отменено', { status: 'CANCELED' })}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={styles.metricValue}>{report.canceledCount}</Text>
              <Text style={styles.metricLabel}>Отменено</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Заказы по статусу</Text>
            <View style={styles.breakdownCard}>
              {Object.entries(report.ordersByStatus).map(([status, count]) => (
                <Pressable
                  key={status}
                  style={styles.breakdownRow}
                  onPress={() => handleDrilldown(STATUS_LABELS[status] || status, { status })}
                >
                  <View style={styles.breakdownLabelRow}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.textMuted }]} />
                    <Text style={styles.breakdownLabel}>
                      {STATUS_LABELS[status] || status}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={styles.breakdownValue}>{count}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Оплата по статусу</Text>
            <View style={styles.breakdownCard}>
              {Object.entries(report.incomeByPaymentStatus).map(([status, amount]) => (
                <Pressable
                  key={status}
                  style={styles.breakdownRow}
                  onPress={() => handleDrilldown(
                    PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] || status,
                    { paymentStatus: status }
                  )}
                >
                  <View style={styles.breakdownLabelRow}>
                    <View style={[styles.statusDot, { backgroundColor: PAYMENT_STATUS_COLORS[status] || colors.textMuted }]} />
                    <Text style={styles.breakdownLabel}>
                      {PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] || status}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={styles.breakdownValue}>{formatAmountFull(amount)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {Object.keys(report.incomeByPaymentMethod).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>По способу оплаты</Text>
              <View style={styles.breakdownCard}>
                {Object.entries(report.incomeByPaymentMethod).map(([method, amount]) => (
                  <Pressable
                    key={method}
                    style={styles.breakdownRow}
                    onPress={() => handleDrilldown(method, { paymentMethod: method })}
                  >
                    <Text style={styles.breakdownLabel}>{method}</Text>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.breakdownValue}>{formatAmountFull(amount)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Источники заказов</Text>
            <View style={styles.breakdownCard}>
              {Object.entries(report.incomeBySource).map(([source, data]) => (
                <Pressable
                  key={source}
                  style={styles.breakdownRow}
                  onPress={() => handleDrilldown(
                    CLIENT_SOURCE_LABELS[source as keyof typeof CLIENT_SOURCE_LABELS] || source,
                    { source }
                  )}
                >
                  <View style={styles.breakdownLabelRow}>
                    <Ionicons
                      name={SOURCE_ICONS[source] as any || 'help-outline'}
                      size={18}
                      color={SOURCE_COLORS[source] || colors.textMuted}
                    />
                    <Text style={styles.breakdownLabel}>
                      {CLIENT_SOURCE_LABELS[source as keyof typeof CLIENT_SOURCE_LABELS] || source}
                    </Text>
                    <View style={styles.sourceCountBadge}>
                      <Text style={styles.sourceCountText}>{data.count}</Text>
                    </View>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={styles.breakdownValue}>{formatAmountFull(data.amount)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {isOwner && Object.keys(report.bizExpensesByCategory).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Бизнес-расходы по категориям</Text>
              <View style={styles.breakdownCard}>
                {Object.entries(report.bizExpensesByCategory).map(([category, amount]) => (
                  <Pressable
                    key={category}
                    style={styles.breakdownRow}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/expenses');
                    }}
                  >
                    <View style={styles.breakdownLabelRow}>
                      <Ionicons
                        name={CATEGORY_ICONS[category] as any || 'help-outline'}
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.breakdownLabel}>
                        {BUSINESS_EXPENSE_CATEGORY_LABELS[category as keyof typeof BUSINESS_EXPENSE_CATEGORY_LABELS] || category}
                      </Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={[styles.breakdownValue, { color: colors.error }]}>
                        -{formatAmountFull(amount)}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                  </Pressable>
                ))}
                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={[styles.breakdownLabel, { fontFamily: 'Inter_600SemiBold' }]}>Итого расходов</Text>
                  <Text style={[styles.breakdownValue, { color: colors.error, fontFamily: 'Inter_700Bold' }]}>
                    -{formatAmountFull(report.totalBizExpenses)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isOwner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Расходы на заказы</Text>
              <View style={styles.breakdownCard}>
                <Pressable
                  style={styles.breakdownRow}
                  onPress={() => handleDrilldown('Заказы с расходами', {})}
                >
                  <Text style={styles.breakdownLabel}>Расходы по заказам</Text>
                  <View style={styles.breakdownRight}>
                    <Text style={[styles.breakdownValue, { color: colors.error }]}>
                      -{formatAmountFull(report.totalOrderExpenses)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.profitCard}>
              <Text style={styles.profitLabel}>Чистая прибыль за период</Text>
              <Text style={[styles.profitValue, { color: profitColor }]}>
                {report.netProfit >= 0 ? '+' : ''}{formatAmountFull(report.netProfit)}
              </Text>
              <Text style={styles.profitPeriod}>
                {format(new Date(dateRange.from), 'd MMM', { locale: ru })} — {format(new Date(dateRange.to), 'd MMM yyyy', { locale: ru })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={drilldownVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDrilldownVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'web' ? 20 : insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setDrilldownVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{drilldownTitle}</Text>
              <Text style={styles.modalSubtitle}>
                {format(new Date(dateRange.from), 'd MMM', { locale: ru })} — {format(new Date(dateRange.to), 'd MMM yyyy', { locale: ru })}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {drilldownLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Загрузка заказов...</Text>
            </View>
          ) : drilldownOrders.length === 0 ? (
            <View style={styles.modalEmptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Нет заказов</Text>
            </View>
          ) : (
            <FlatList
              data={drilldownOrders}
              keyExtractor={item => item.id}
              renderItem={renderDrilldownItem}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.drilldownSummaryRow}>
                  <Text style={styles.modalCount}>
                    {drilldownOrders.length} {drilldownOrders.length === 1 ? 'заказ' : drilldownOrders.length < 5 ? 'заказа' : 'заказов'}
                  </Text>
                  <Text style={[styles.modalCount, { color: colors.primary }]}>
                    {drilldownOrders.reduce((s, o) => s + o.amount, 0).toLocaleString()} ₽
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  contentDesktop: {
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 16,
  },
  contentInnerDesktop: {
    maxWidth: 600,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary || colors.surface,
    alignItems: 'center',
  },
  periodBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dateInputWrapper: {
    flex: 1,
    gap: 4,
  },
  dateInputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  inlineLoading: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 10,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRow: {
    backgroundColor: colors.background,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sourceCountBadge: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourceCountText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  profitCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  profitLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  profitValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  profitPeriod: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
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
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    padding: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  modalLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalCount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  drilldownSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  drilldownItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  drilldownItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  drilldownClientName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  drilldownInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drilldownInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  paymentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
