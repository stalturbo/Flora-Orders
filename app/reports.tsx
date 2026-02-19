import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Pressable, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { User, UserRole, USER_ROLE_LABELS, Order, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, CLIENT_SOURCE_LABELS, PaymentStatus, ClientSource } from '@/lib/types';
import { RoleBadge } from '@/components/RoleBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { DashboardCard } from '@/components/DashboardCard';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

interface EmployeeReport {
  user: User;
  stats: any;
}

type FilterRole = 'ALL' | 'FLORIST' | 'COURIER' | 'MANAGER';
type Period = 'today' | 'week' | 'month';
type OrderListType = 'created' | 'assembled' | 'delivered' | 'canceled' | 'assigned_florist' | 'assigned_courier' | 'active_florist' | 'active_courier';

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  NOT_PAID: '#F44336',
  ADVANCE: '#FF9800',
  PAID: '#4CAF50',
};

const SOURCE_ICONS: Record<ClientSource, { name: string; family: 'ionicons' | 'mci'; color: string }> = {
  PHONE: { name: 'call-outline', family: 'ionicons', color: '#607D8B' },
  WHATSAPP: { name: 'whatsapp', family: 'mci', color: '#25D366' },
  TELEGRAM: { name: 'send', family: 'mci', color: '#0088cc' },
  INSTAGRAM: { name: 'instagram', family: 'mci', color: '#E1306C' },
  WEBSITE: { name: 'web', family: 'mci', color: '#2196F3' },
  OTHER: { name: 'dots-horizontal', family: 'mci', color: '#9E9E9E' },
};

const ORDER_TYPE_TITLES: Record<OrderListType, string> = {
  created: 'Созданные заказы',
  assembled: 'Собранные заказы',
  delivered: 'Доставленные заказы',
  canceled: 'Отмененные заказы',
  assigned_florist: 'Назначенные заказы (флорист)',
  assigned_courier: 'Назначенные заказы (курьер)',
  active_florist: 'Активные заказы (флорист)',
  active_courier: 'Активные заказы (курьер)',
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { users, orders, getEmployeeStats } = useData();
  const { colors } = useTheme();
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<FilterRole>('ALL');
  const [period, setPeriod] = useState<Period>('week');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalOrders, setModalOrders] = useState<(Order & { actionTimestamp: number })[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalEmployeeName, setModalEmployeeName] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    const employeeReports: EmployeeReport[] = [];
    for (const user of users) {
      const stats = await getEmployeeStats(user.id);
      employeeReports.push({ user, stats });
    }
    setReports(employeeReports);
    setLoading(false);
  }, [users, getEmployeeStats]);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 60000);
    return () => clearInterval(interval);
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    if (filterRole === 'ALL') return reports;
    return reports.filter(r => r.user.role === filterRole);
  }, [reports, filterRole]);

  const overallStats = useMemo(() => {
    const now = Date.now();
    const today = startOfDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime();
    
    const ordersToday = orders.filter(o => 
      o.createdAt >= today && o.createdAt <= todayEnd
    ).length;
    
    const deliveredToday = orders.filter(o =>
      o.status === 'DELIVERED' &&
      o.updatedAt >= today && o.updatedAt <= todayEnd
    ).length;
    
    const overdue = orders.filter(o =>
      o.status !== 'DELIVERED' &&
      o.status !== 'CANCELED' &&
      o.deliveryDateTime < now
    ).length;
    
    const totalRevenue = orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.amount, 0);
    
    return { ordersToday, deliveredToday, overdue, totalRevenue };
  }, [orders]);

  const last7DaysStats = useMemo(() => {
    const stats: { date: string; count: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).getTime();
      const dayEnd = endOfDay(date).getTime();
      
      const count = orders.filter(o =>
        o.status === 'DELIVERED' &&
        o.updatedAt >= dayStart && o.updatedAt <= dayEnd
      ).length;
      
      stats.push({
        date: format(date, 'd MMM', { locale: ru }),
        count,
      });
    }
    
    return stats;
  }, [orders]);

  const maxCount = Math.max(...last7DaysStats.map(s => s.count), 1);

  const getRoleMainStat = (report: EmployeeReport) => {
    const periodData = report.stats[period];
    if (!periodData) return { value: 0, label: '', icon: 'help-outline' as any, color: colors.textMuted, type: 'created' as OrderListType };
    
    switch (report.user.role) {
      case 'MANAGER':
      case 'OWNER':
        return { value: periodData.ordersCreated, label: 'создано', icon: 'add-circle-outline' as any, color: colors.primary, type: 'created' as OrderListType };
      case 'FLORIST':
        return { value: periodData.ordersAssembled, label: 'собрано', icon: 'flower-outline' as any, color: '#E91E63', type: 'assembled' as OrderListType };
      case 'COURIER':
        return { value: periodData.ordersDelivered, label: 'доставлено', icon: 'car-outline' as any, color: '#2196F3', type: 'delivered' as OrderListType };
      default:
        return { value: 0, label: '', icon: 'help-outline' as any, color: colors.textMuted, type: 'created' as OrderListType };
    }
  };

  const handleOpenOrderList = async (userId: string, userName: string, type: OrderListType, count: number, usePeriod?: boolean) => {
    if (count === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalTitle(ORDER_TYPE_TITLES[type]);
    setModalEmployeeName(userName);
    setModalVisible(true);
    setModalLoading(true);
    try {
      const result = await api.stats.employeeOrders(userId, type, usePeriod ? period : undefined);
      setModalOrders(result);
    } catch (error) {
      console.error('Error loading employee orders:', error);
      setModalOrders([]);
    }
    setModalLoading(false);
  };

  const handleOpenOverallOrders = (title: string, filterFn: (o: Order) => boolean) => {
    const filtered = orders.filter(filterFn);
    if (filtered.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalTitle(title);
    setModalEmployeeName('Все сотрудники');
    setModalVisible(true);
    setModalLoading(false);
    setModalOrders(filtered.map(o => ({ ...o, actionTimestamp: o.updatedAt })));
  };

  const handleEmployeePress = (userId: string) => {
    Haptics.selectionAsync();
    router.push(`/user/edit/${userId}`);
  };

  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const styles = createStyles(colors);

  const ROLE_FILTERS: { key: FilterRole; label: string }[] = [
    { key: 'ALL', label: 'Все' },
    { key: 'FLORIST', label: 'Флористы' },
    { key: 'COURIER', label: 'Курьеры' },
    { key: 'MANAGER', label: 'Менеджеры' },
  ];

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
  ];

  const renderOrderItem = ({ item }: { item: Order & { actionTimestamp: number } }) => {
    const sourceInfo = item.clientSource ? SOURCE_ICONS[item.clientSource] : null;

    return (
      <Pressable
        style={styles.orderItem}
        onPress={() => {
          setModalVisible(false);
          router.push(`/order/${item.id}`);
        }}
      >
        <View style={styles.orderItemHeader}>
          <StatusBadge status={item.status} size="small" />
          {item.paymentStatus && (
            <View style={[styles.paymentBadge, { backgroundColor: PAYMENT_STATUS_COLORS[item.paymentStatus] + '20' }]}>
              <View style={[styles.paymentDot, { backgroundColor: PAYMENT_STATUS_COLORS[item.paymentStatus] }]} />
              <Text style={[styles.paymentBadgeText, { color: PAYMENT_STATUS_COLORS[item.paymentStatus] }]}>
                {PAYMENT_STATUS_LABELS[item.paymentStatus]}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.orderClientName}>{item.clientName}</Text>

        <View style={styles.orderInfoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.orderInfoText} numberOfLines={1}>{item.address}</Text>
        </View>

        <View style={styles.orderInfoRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.orderInfoText}>
            {format(new Date(item.deliveryDateTime), 'dd MMM yyyy, HH:mm', { locale: ru })}
          </Text>
        </View>

        <View style={styles.orderInfoRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.orderInfoText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {item.amount.toLocaleString()} ₽
          </Text>
        </View>

        {sourceInfo && (
          <View style={styles.orderInfoRow}>
            {sourceInfo.family === 'mci' ? (
              <MaterialCommunityIcons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
            ) : (
              <Ionicons name={sourceInfo.name as any} size={14} color={sourceInfo.color} />
            )}
            <Text style={styles.orderInfoText}>{CLIENT_SOURCE_LABELS[item.clientSource!]}</Text>
          </View>
        )}

        <View style={styles.orderActionTime}>
          <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
          <Text style={[styles.orderInfoText, { color: colors.primary }]}>
            {format(new Date(item.actionTimestamp), 'dd MMM yyyy, HH:mm', { locale: ru })}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + webBottomInset + 24 },
          isDesktop && styles.contentDesktop,
        ]}
      >
        <View style={[styles.content, isDesktop && styles.contentInnerDesktop]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Общая статистика</Text>
            <View style={styles.statsGridOverall}>
              <View style={styles.statsRow}>
                <DashboardCard
                  title="Создано сегодня"
                  value={overallStats.ordersToday}
                  icon="add-circle"
                  color={colors.statusNew}
                  onPress={() => {
                    const today = startOfDay(new Date()).getTime();
                    const todayEnd = endOfDay(new Date()).getTime();
                    handleOpenOverallOrders('Создано сегодня', o => o.createdAt >= today && o.createdAt <= todayEnd);
                  }}
                />
                <DashboardCard
                  title="Доставлено сегодня"
                  value={overallStats.deliveredToday}
                  icon="checkmark-circle"
                  color={colors.statusDelivered}
                  onPress={() => {
                    const today = startOfDay(new Date()).getTime();
                    const todayEnd = endOfDay(new Date()).getTime();
                    handleOpenOverallOrders('Доставлено сегодня', o => o.status === 'DELIVERED' && o.updatedAt >= today && o.updatedAt <= todayEnd);
                  }}
                />
              </View>
              <View style={styles.statsRow}>
                <DashboardCard
                  title="Просрочено"
                  value={overallStats.overdue}
                  icon="alert-circle"
                  color={colors.error}
                  onPress={() => {
                    const now = Date.now();
                    handleOpenOverallOrders('Просроченные заказы', o => o.status !== 'DELIVERED' && o.status !== 'CANCELED' && o.deliveryDateTime < now);
                  }}
                />
                <DashboardCard
                  title="Выручка (тыс.)"
                  value={Math.round(overallStats.totalRevenue / 1000)}
                  icon="cash"
                  color={colors.primary}
                  onPress={() => {
                    handleOpenOverallOrders('Доставленные заказы (выручка)', o => o.status === 'DELIVERED');
                  }}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Доставки за неделю</Text>
            <View style={styles.chartCard}>
              <View style={styles.chartContainer}>
                {last7DaysStats.map((stat, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View style={styles.barContainer}>
                      <View 
                        style={[
                          styles.bar,
                          { height: `${(stat.count / maxCount) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barLabel}>{stat.date}</Text>
                    <Text style={styles.barValue}>{stat.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Статистика сотрудников</Text>
            
            <View style={styles.periodSelector}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p.key}
                  style={[styles.periodBtn, period === p.key && { backgroundColor: colors.primary }]}
                  onPress={() => { Haptics.selectionAsync(); setPeriod(p.key); }}
                >
                  <Text style={[styles.periodBtnText, period === p.key && { color: '#fff' }]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilters}>
              {ROLE_FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[styles.roleFilterBtn, filterRole === f.key && styles.roleFilterBtnActive]}
                  onPress={() => { Haptics.selectionAsync(); setFilterRole(f.key); }}
                >
                  <Text style={[styles.roleFilterText, filterRole === f.key && styles.roleFilterTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Загрузка...</Text>
              </View>
            ) : filteredReports.length === 0 ? (
              <Text style={styles.emptyText}>Нет сотрудников для отображения</Text>
            ) : (
              filteredReports.map(report => {
                const mainStat = getRoleMainStat(report);
                const periodData = report.stats[period] || { ordersCreated: 0, ordersAssembled: 0, ordersDelivered: 0 };
                
                return (
                  <View 
                    key={report.user.id} 
                    style={styles.employeeCard}
                  >
                    <Pressable
                      style={styles.employeeHeader}
                      onPress={() => handleEmployeePress(report.user.id)}
                    >
                      <View style={[styles.employeeAvatar, { backgroundColor: mainStat.color + '20' }]}>
                        <Ionicons name="person" size={22} color={mainStat.color} />
                      </View>
                      <View style={styles.employeeInfo}>
                        <Text style={styles.employeeName}>{report.user.name}</Text>
                        <RoleBadge role={report.user.role} />
                      </View>
                    </Pressable>
                    <Pressable
                      style={styles.mainStatBadgeAbsolute}
                      onPress={() => {
                        handleOpenOrderList(report.user.id, report.user.name, mainStat.type, mainStat.value, true);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.mainStatValue, { color: mainStat.color }]}>{mainStat.value}</Text>
                      <Text style={styles.mainStatLabel}>{mainStat.label}</Text>
                      {mainStat.value > 0 && (
                        <Ionicons name="chevron-forward" size={12} color={mainStat.color} style={{ marginTop: 2 }} />
                      )}
                    </Pressable>
                    
                    <View style={styles.employeeStatsRow}>
                      {(report.user.role === 'MANAGER' || report.user.role === 'OWNER') && (
                        <>
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'created', periodData.ordersCreated, true)}
                          >
                            <Text style={[styles.miniStatValue, periodData.ordersCreated > 0 && styles.miniStatTappable]}>{periodData.ordersCreated}</Text>
                            <Text style={styles.miniStatLabel}>создано</Text>
                          </Pressable>
                          <View style={styles.miniStatDivider} />
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'delivered', periodData.revenue || 0, true)}
                          >
                            <Text style={[styles.miniStatValue, { color: colors.primary }, (periodData.revenue || 0) > 0 && styles.miniStatTappable]}>
                              {((periodData.revenue || 0) / 1000).toFixed(0)}к
                            </Text>
                            <Text style={styles.miniStatLabel}>выручка</Text>
                          </Pressable>
                        </>
                      )}
                      {report.user.role === 'FLORIST' && (
                        <>
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'assembled', periodData.ordersAssembled, true)}
                          >
                            <Text style={[styles.miniStatValue, periodData.ordersAssembled > 0 && styles.miniStatTappable]}>{periodData.ordersAssembled}</Text>
                            <Text style={styles.miniStatLabel}>собрано</Text>
                          </Pressable>
                          <View style={styles.miniStatDivider} />
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'assigned_florist', report.stats.assignedAsFlorist)}
                          >
                            <Text style={[styles.miniStatValue, report.stats.assignedAsFlorist > 0 && styles.miniStatTappable]}>{report.stats.assignedAsFlorist}</Text>
                            <Text style={styles.miniStatLabel}>назначено</Text>
                          </Pressable>
                          <View style={styles.miniStatDivider} />
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'active_florist', report.stats.activeAsFlorist)}
                          >
                            <Text style={[styles.miniStatValue, { color: '#FF9800' }, report.stats.activeAsFlorist > 0 && styles.miniStatTappable]}>{report.stats.activeAsFlorist}</Text>
                            <Text style={styles.miniStatLabel}>активных</Text>
                          </Pressable>
                        </>
                      )}
                      {report.user.role === 'COURIER' && (
                        <>
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'delivered', periodData.ordersDelivered, true)}
                          >
                            <Text style={[styles.miniStatValue, periodData.ordersDelivered > 0 && styles.miniStatTappable]}>{periodData.ordersDelivered}</Text>
                            <Text style={styles.miniStatLabel}>доставок</Text>
                          </Pressable>
                          <View style={styles.miniStatDivider} />
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'assigned_courier', report.stats.assignedAsCourier)}
                          >
                            <Text style={[styles.miniStatValue, report.stats.assignedAsCourier > 0 && styles.miniStatTappable]}>{report.stats.assignedAsCourier}</Text>
                            <Text style={styles.miniStatLabel}>назначено</Text>
                          </Pressable>
                          <View style={styles.miniStatDivider} />
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'active_courier', report.stats.activeAsCourier)}
                          >
                            <Text style={[styles.miniStatValue, { color: '#FF9800' }, report.stats.activeAsCourier > 0 && styles.miniStatTappable]}>{report.stats.activeAsCourier}</Text>
                            <Text style={styles.miniStatLabel}>в процессе</Text>
                          </Pressable>
                        </>
                      )}
                      {(periodData.canceled || 0) > 0 && (
                        <>
                          <View style={styles.miniStatDivider} />
                          <Pressable
                            style={({ pressed }) => [styles.miniStat, pressed && styles.miniStatPressed]}
                            onPress={() => handleOpenOrderList(report.user.id, report.user.name, 'canceled', periodData.canceled || 0, true)}
                          >
                            <Text style={[styles.miniStatValue, { color: colors.error }, styles.miniStatTappable]}>{periodData.canceled}</Text>
                            <Text style={styles.miniStatLabel}>отменено</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'web' ? 20 : insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalSubtitle}>{modalEmployeeName}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {modalLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Загрузка заказов...</Text>
            </View>
          ) : modalOrders.length === 0 ? (
            <View style={styles.modalEmptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Нет заказов</Text>
            </View>
          ) : (
            <FlatList
              data={modalOrders}
              keyExtractor={item => item.id}
              renderItem={renderOrderItem}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={styles.modalCount}>{modalOrders.length} {modalOrders.length === 1 ? 'заказ' : modalOrders.length < 5 ? 'заказа' : 'заказов'}</Text>
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
  contentDesktop: {
    alignItems: 'center',
  },
  content: {
    width: '100%',
  },
  contentInnerDesktop: {
    maxWidth: 800,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 16,
  },
  statsGridOverall: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
    alignItems: 'flex-end',
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
    width: '100%',
  },
  barLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  barValue: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  periodBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  roleFilters: {
    marginBottom: 16,
    flexGrow: 0,
  },
  roleFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  roleFilterBtnActive: {
    backgroundColor: colors.primary + '25',
  },
  roleFilterText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  roleFilterTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
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
    padding: 24,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative' as const,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  employeeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
    gap: 4,
  },
  employeeName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  mainStatBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mainStatBadgeAbsolute: {
    position: 'absolute',
    top: 14,
    right: 14,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  mainStatValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  mainStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  employeeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 0,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  miniStatValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  miniStatTappable: {
    textDecorationLine: 'underline' as const,
  },
  miniStatPressed: {
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  miniStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  miniStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
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
    backgroundColor: colors.surface,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
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
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: 8,
  },
  orderItem: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  orderClientName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 6,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
  },
  orderActionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
