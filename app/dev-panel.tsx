import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { setToken as saveToken } from '@/lib/api';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { getApiUrl } from '@/lib/query-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const DEV_CREDENTIALS_KEY = '@flora_dev_credentials';

interface Organization {
  id: string;
  name: string;
  createdAt: number;
}

interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: number;
  testPassword?: string;
}

interface Order {
  id: string;
  organizationId: string;
  clientName: string;
  status: string;
  amount: number;
  createdAt: number;
}

interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  totalOrders: number;
  activeSessions: number;
  ordersByStatus: Record<string, number>;
  totalRevenue: number;
}

export default function DevPanelScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devLogin, setDevLogin] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'stats' | 'orgs' | 'users' | 'orders' | 'sessions' | 'settings'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [devSessions, setDevSessions] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [isLoggingInAsUser, setIsLoggingInAsUser] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 20 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const savedCredentials = await AsyncStorage.getItem(DEV_CREDENTIALS_KEY);
    if (savedCredentials) {
      const { login, password } = JSON.parse(savedCredentials);
      const verified = await verifyCredentials(login, password);
      if (verified) {
        setDevLogin(login);
        setDevPassword(password);
        setIsAuthenticated(true);
      }
    }
    setIsLoading(false);
  };

  const verifyCredentials = async (login: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(new URL('/api/dev/verify', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin: login, devPassword: password }),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    
    if (!devLogin.trim()) {
      setError('Введите логин');
      setIsSubmitting(false);
      return;
    }
    
    const verified = await verifyCredentials(devLogin, devPassword);
    if (verified) {
      await AsyncStorage.setItem(DEV_CREDENTIALS_KEY, JSON.stringify({ login: devLogin, password: devPassword }));
      setIsAuthenticated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setError('Неверный логин или пароль разработчика');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    setIsSubmitting(false);
  };

  const handleChangeCredentials = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!newLogin && !newPassword) {
      setPasswordError('Введите новый логин или пароль');
      return;
    }
    
    try {
      const response = await fetch(new URL('/api/dev/change-credentials', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          devLogin, 
          devPassword, 
          newLogin: newLogin || undefined, 
          newPassword: newPassword || undefined 
        }),
      });
      
      if (response.ok) {
        const updatedLogin = newLogin || devLogin;
        const updatedPassword = newPassword || devPassword;
        
        await AsyncStorage.setItem(DEV_CREDENTIALS_KEY, JSON.stringify({
          login: updatedLogin,
          password: updatedPassword,
        }));
        
        setDevLogin(updatedLogin);
        setDevPassword(updatedPassword);
        setNewLogin('');
        setNewPassword('');
        setPasswordSuccess('Учетные данные успешно изменены');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const data = await response.json();
        setPasswordError(data.error || 'Ошибка при смене учетных данных');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setPasswordError('Ошибка сети');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(DEV_CREDENTIALS_KEY);
    setIsAuthenticated(false);
    setDevLogin('');
    setDevPassword('');
    router.back();
  };

  const fetchData = async () => {
    if (!devLogin || !devPassword) return;
    
    try {
      const baseUrl = getApiUrl();
      
      const [statsRes, orgsRes, usersRes, ordersRes, sessionsRes] = await Promise.all([
        fetch(new URL('/api/dev/stats', baseUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devLogin, devPassword }),
        }),
        fetch(new URL('/api/dev/organizations', baseUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devLogin, devPassword }),
        }),
        fetch(new URL('/api/dev/users', baseUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devLogin, devPassword, organizationId: selectedOrg }),
        }),
        fetch(new URL('/api/dev/orders', baseUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devLogin, devPassword, organizationId: selectedOrg }),
        }),
        fetch(new URL('/api/dev/sessions', baseUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devLogin, devPassword }),
        }),
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (orgsRes.ok) setOrganizations(await orgsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (sessionsRes.ok) setDevSessions(await sessionsRes.json());
    } catch (err) {
      console.error('Failed to fetch dev data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, selectedOrg]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    setActionMessage('');
    
    try {
      const response = await fetch(new URL('/api/dev/generate-test-data', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setActionMessage(`Создано: ${data.created.organizations} орг., ${data.created.users} польз., ${data.created.orders} заказов. Пароль: ${data.credentials.password}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      } else {
        const data = await response.json();
        setActionMessage(`Ошибка: ${data.error}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setActionMessage('Ошибка сети');
    }
    
    setIsGenerating(false);
  };

  const handleDeleteOrganization = async (orgId: string) => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(new URL('/api/dev/organizations/delete', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, organizationId: orgId }),
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      console.error('Delete org failed');
    }
    
    setIsDeleting(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(new URL('/api/dev/users/delete', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, userId }),
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      console.error('Delete user failed');
    }
    
    setIsDeleting(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(new URL('/api/dev/orders/delete', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, orderId }),
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      console.error('Delete order failed');
    }
    
    setIsDeleting(false);
  };

  const handleClearAllData = async () => {
    setIsDeleting(true);
    setActionMessage('');
    
    try {
      const response = await fetch(new URL('/api/dev/clear-all-data', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, confirmClear: 'DELETE_ALL' }),
      });
      
      if (response.ok) {
        setActionMessage('Все данные удалены');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      } else {
        const data = await response.json();
        setActionMessage(`Ошибка: ${data.error}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setActionMessage('Ошибка сети');
    }
    
    setIsDeleting(false);
  };

  const handleLoginAsOwner = async (orgId: string) => {
    setIsLoggingInAsUser(true);
    
    try {
      // Find owner of this organization
      const owner = users.find(u => u.organizationId === orgId && u.role === 'OWNER');
      if (!owner) {
        setActionMessage('Владелец организации не найден');
        setIsLoggingInAsUser(false);
        return;
      }
      
      await handleLoginAsUser(owner.id);
    } catch {
      setActionMessage('Ошибка входа в аккаунт');
    }
    
    setIsLoggingInAsUser(false);
  };

  const handleLoginAsUser = async (userId: string) => {
    setIsLoggingInAsUser(true);
    
    try {
      const response = await fetch(new URL('/api/dev/login-as-user', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, userId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        await saveToken(data.token);
        await refreshUser();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/home');
      } else {
        const data = await response.json();
        setActionMessage(`Ошибка: ${data.error}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setActionMessage('Ошибка сети');
    }
    
    setIsLoggingInAsUser(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(new URL('/api/dev/sessions/delete', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, sessionId }),
      });
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      }
    } catch {
      console.error('Delete session failed');
    }
    setIsDeleting(false);
  };

  const handleDeleteUserSessions = async (userId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(new URL('/api/dev/sessions/delete-user', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword, userId }),
      });
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      }
    } catch {
      console.error('Delete user sessions failed');
    }
    setIsDeleting(false);
  };

  const handleCleanupSessions = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(new URL('/api/dev/sessions/cleanup', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devLogin, devPassword }),
      });
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActionMessage('Просроченные сессии удалены');
        fetchData();
      }
    } catch {
      console.error('Cleanup sessions failed');
    }
    setIsDeleting(false);
  };

  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Панель разработчика</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={[styles.loginContainer, isDesktop && styles.loginContainerDesktop]}>
          <View style={styles.iconContainer}>
            <Ionicons name="code-slash" size={48} color={colors.primary} />
          </View>
          
          <Text style={styles.loginTitle}>Доступ к панели</Text>
          <Text style={styles.loginSubtitle}>
            Введите логин и пароль разработчика для доступа к управлению системой
          </Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          <InputField
            label="Логин разработчика"
            value={devLogin}
            onChangeText={setDevLogin}
            placeholder="Введите логин"
            autoCapitalize="none"
          />
          
          <InputField
            label="Пароль разработчика"
            value={devPassword}
            onChangeText={setDevPassword}
            placeholder="Введите пароль"
            secureTextEntry
          />
          
          
          <Button
            title="Войти"
            onPress={handleLogin}
            loading={isSubmitting}
            disabled={!devLogin || !devPassword}
            size="large"
            style={styles.loginButton}
          />
        </View>
      </View>
    );
  }

  const renderTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {[
        { key: 'stats', icon: 'stats-chart', label: 'Статистика' },
        { key: 'orgs', icon: 'business', label: 'Организации' },
        { key: 'users', icon: 'people', label: 'Пользователи' },
        { key: 'orders', icon: 'receipt', label: 'Заказы' },
        { key: 'sessions', icon: 'key', label: 'Сессии' },
        { key: 'settings', icon: 'settings', label: 'Настройки' },
      ].map((tab) => (
        <Pressable
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => {
            setActiveTab(tab.key as any);
            Haptics.selectionAsync();
          }}
        >
          <Ionicons 
            name={tab.icon as any} 
            size={20} 
            color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Общая статистика</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="business" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats?.totalOrganizations || 0}</Text>
          <Text style={styles.statLabel}>Организаций</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
          <Text style={styles.statLabel}>Пользователей</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="receipt" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{stats?.totalOrders || 0}</Text>
          <Text style={styles.statLabel}>Заказов</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="wifi" size={24} color="#10B981" />
          <Text style={styles.statValue}>{stats?.activeSessions || 0}</Text>
          <Text style={styles.statLabel}>Активных сессий</Text>
        </View>
      </View>
      
      <View style={styles.revenueCard}>
        <Ionicons name="cash" size={32} color={colors.primary} />
        <View>
          <Text style={styles.revenueValue}>
            {(stats?.totalRevenue || 0).toLocaleString('ru-RU')} ₽
          </Text>
          <Text style={styles.revenueLabel}>Общая выручка (доставлено)</Text>
        </View>
      </View>
      
      {stats?.ordersByStatus && (
        <View style={styles.statusBreakdown}>
          <Text style={styles.subsectionTitle}>Заказы по статусам</Text>
          {Object.entries(stats.ordersByStatus).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <Text style={styles.statusName}>{status}</Text>
              <Text style={styles.statusCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.actionsSection}>
        <Text style={styles.subsectionTitle}>Действия</Text>
        
        {actionMessage ? (
          <View style={styles.actionMessageContainer}>
            <Text style={styles.actionMessageText}>{actionMessage}</Text>
          </View>
        ) : null}
        
        <Button
          title="Сгенерировать тестовые данные"
          onPress={handleGenerateTestData}
          loading={isGenerating}
          disabled={isGenerating}
          style={styles.actionButton}
        />
        
        <Button
          title="Удалить все данные"
          onPress={handleClearAllData}
          variant="danger"
          loading={isDeleting}
          disabled={isDeleting}
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const renderOrganizations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Организации ({organizations.length})
      </Text>
      
      <Pressable
        style={[styles.filterChip, !selectedOrg && styles.filterChipActive]}
        onPress={() => setSelectedOrg(null)}
      >
        <Text style={[styles.filterChipText, !selectedOrg && styles.filterChipTextActive]}>
          Все организации
        </Text>
      </Pressable>
      
      {organizations.map((org) => (
        <View key={org.id} style={[styles.card, selectedOrg === org.id && styles.cardSelected]}>
          <Pressable onPress={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{org.name}</Text>
            </View>
            <Text style={styles.cardMeta}>
              ID: {org.id.substring(0, 8)}...
            </Text>
            <Text style={styles.cardMeta}>
              Создана: {new Date(org.createdAt).toLocaleDateString('ru-RU')}
            </Text>
          </Pressable>
          <View style={styles.cardActions}>
            <Pressable 
              style={styles.loginAsButton}
              onPress={() => handleLoginAsOwner(org.id)}
              disabled={isLoggingInAsUser}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.primary} />
              <Text style={styles.loginAsButtonText}>Войти как владелец</Text>
            </Pressable>
            <Pressable 
              style={styles.deleteButton}
              onPress={() => handleDeleteOrganization(org.id)}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );

  const renderUsers = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Пользователи ({users.length})
        {selectedOrg && ' (фильтр по организации)'}
      </Text>
      
      {users.map((user) => (
        <View key={user.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={user.role === 'OWNER' ? 'star' : 'person'} 
              size={20} 
              color={user.role === 'OWNER' ? '#F59E0B' : colors.primary} 
            />
            <Text style={styles.cardTitle}>{user.name}</Text>
            <View style={[styles.badge, !user.isActive && styles.badgeInactive]}>
              <Text style={styles.badgeText}>
                {user.isActive ? user.role : 'Неактивен'}
              </Text>
            </View>
          </View>
          
          <View style={styles.credentialsBox}>
            <Text style={styles.credentialLabel}>Логин:</Text>
            <Text style={styles.credentialValue}>{user.email}</Text>
          </View>
          <View style={styles.credentialsBox}>
            <Text style={styles.credentialLabel}>Пароль:</Text>
            <Text style={styles.credentialValue}>{user.testPassword || 'Неизвестен'}</Text>
          </View>
          
          <Text style={styles.cardMeta}>
            Орг: {organizations.find(o => o.id === user.organizationId)?.name || user.organizationId.substring(0, 8)}
          </Text>
          
          <View style={styles.cardActions}>
            <Pressable 
              style={styles.loginAsButton}
              onPress={() => handleLoginAsUser(user.id)}
              disabled={isLoggingInAsUser}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.primary} />
              <Text style={styles.loginAsButtonText}>Войти</Text>
            </Pressable>
            <Pressable 
              style={styles.deleteButton}
              onPress={() => handleDeleteUser(user.id)}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );

  const renderOrders = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Заказы ({orders.length})
        {selectedOrg && ' (фильтр по организации)'}
      </Text>
      
      {orders.slice(0, 50).map((order) => (
        <View key={order.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{order.clientName}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {order.amount.toLocaleString('ru-RU')} ₽
          </Text>
          <Text style={styles.cardMeta}>
            {new Date(order.createdAt).toLocaleDateString('ru-RU')}
          </Text>
          <Pressable 
            style={styles.deleteButton}
            onPress={() => handleDeleteOrder(order.id)}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>Удалить</Text>
          </Pressable>
        </View>
      ))}
      
      {orders.length > 50 && (
        <Text style={styles.moreText}>
          Показаны первые 50 из {orders.length} заказов
        </Text>
      )}
    </View>
  );

  const roleLabels: Record<string, string> = {
    OWNER: 'Владелец',
    MANAGER: 'Менеджер',
    FLORIST: 'Флорист',
    COURIER: 'Курьер',
  };

  const roleColors: Record<string, string> = {
    OWNER: '#F59E0B',
    MANAGER: '#3B82F6',
    FLORIST: '#10B981',
    COURIER: '#8B5CF6',
  };

  const activeSessions = devSessions.filter(s => s.isActive);
  const expiredSessions = devSessions.filter(s => !s.isActive);

  const renderSessions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Сессии ({devSessions.length})
      </Text>

      <View style={styles.sessionSummary}>
        <View style={styles.sessionSummaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={[styles.sessionSummaryText, { color: '#10B981' }]}>
            Активных: {activeSessions.length}
          </Text>
        </View>
        <View style={styles.sessionSummaryItem}>
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.sessionSummaryText, { color: colors.textSecondary }]}>
            Просроченных: {expiredSessions.length}
          </Text>
        </View>
      </View>

      {expiredSessions.length > 0 && (
        <Pressable
          style={styles.cleanupButton}
          onPress={handleCleanupSessions}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={18} color="#F59E0B" />
          <Text style={styles.cleanupButtonText}>
            Удалить просроченные ({expiredSessions.length})
          </Text>
        </Pressable>
      )}

      {devSessions.map((session) => (
        <View key={session.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={session.isActive ? 'radio-button-on' : 'radio-button-off'} 
              size={16} 
              color={session.isActive ? '#10B981' : colors.textSecondary} 
            />
            <Text style={styles.cardTitle}>{session.userName}</Text>
            <View style={[styles.badge, { backgroundColor: (roleColors[session.userRole] || colors.primary) + '20' }]}>
              <Text style={[styles.badgeText, { color: roleColors[session.userRole] || colors.primary }]}>
                {roleLabels[session.userRole] || session.userRole}
              </Text>
            </View>
          </View>

          <Text style={styles.cardMeta}>
            {session.userEmail}
          </Text>
          {session.organizationName ? (
            <Text style={styles.cardMeta}>
              Орг: {session.organizationName}
            </Text>
          ) : null}
          <Text style={styles.cardMeta}>
            Создана: {new Date(session.createdAt).toLocaleString('ru-RU')}
          </Text>
          <Text style={styles.cardMeta}>
            Истекает: {new Date(session.expiresAt).toLocaleString('ru-RU')}
          </Text>
          <Text style={[styles.cardMeta, { color: session.isActive ? '#10B981' : colors.error }]}>
            {session.isActive ? 'Активна' : 'Просрочена'}
          </Text>

          <View style={styles.cardActions}>
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteSession(session.id)}
              disabled={isDeleting}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              <Text style={styles.deleteButtonText}>Завершить</Text>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteUserSessions(session.userId)}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteButtonText}>Все сессии юзера</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Смена учетных данных разработчика</Text>
      
      {passwordError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{passwordError}</Text>
        </View>
      ) : null}
      
      {passwordSuccess ? (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={styles.successText}>{passwordSuccess}</Text>
        </View>
      ) : null}
      
      <View style={styles.settingsInfo}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.settingsInfoText}>
          Текущий логин: {devLogin}
        </Text>
      </View>
      
      <InputField
        label="Новый логин (оставьте пустым, чтобы не менять)"
        value={newLogin}
        onChangeText={setNewLogin}
        placeholder="Введите новый логин"
        autoCapitalize="none"
      />
      
      <InputField
        label="Новый пароль (оставьте пустым, чтобы не менять)"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Введите новый пароль"
        secureTextEntry
      />
      
      <Button
        title="Сохранить изменения"
        onPress={handleChangeCredentials}
        disabled={(!newLogin && !newPassword)}
        style={styles.changePasswordButton}
      />
      
      <View style={styles.divider} />
      
      <Button
        title="Выйти из панели"
        onPress={handleLogout}
        variant="secondary"
        style={styles.logoutButton}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Панель разработчика</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {renderTabs()}
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + webBottomInset + 20 },
          isDesktop && styles.scrollContentDesktop,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'orgs' && renderOrganizations()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'sessions' && renderSessions()}
        {activeTab === 'settings' && renderSettings()}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  loginContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  loginContainerDesktop: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.error,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '20',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.primary,
  },
  loginButton: {
    marginTop: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...(isDesktop ? { justifyContent: 'center' as const, minWidth: '100%' as any } : {}),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentDesktop: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center' as any,
    marginHorizontal: 'auto' as any,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    marginBottom: 16,
  },
  revenueValue: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  revenueLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  statusBreakdown: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  statusCount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  filterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
  },
  badgeInactive: {
    backgroundColor: colors.error + '20',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  moreText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  changePasswordButton: {
    marginTop: 16,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.error,
  },
  sessionSummary: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionSummaryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F59E0B' + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B' + '30',
    marginBottom: 12,
  },
  cleanupButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#F59E0B',
  },
  actionsSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    marginTop: 12,
  },
  actionMessageContainer: {
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionMessageText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loginAsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loginAsButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
  },
  credentialsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderRadius: 6,
  },
  credentialLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    minWidth: 50,
  },
  credentialValue: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  settingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  settingsInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
});
