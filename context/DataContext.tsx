import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Order, User, OrderStatus, OrderWithDetails } from '@/lib/types';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

interface PeriodStats {
  ordersCreated: number;
  ordersAssembled: number;
  ordersDelivered: number;
}

interface EmployeeStats {
  ordersCreated: number;
  ordersAssembled: number;
  ordersDelivered: number;
  statusChanges: number;
  assignedAsFlorist: number;
  assignedAsCourier: number;
  activeAsFlorist: number;
  activeAsCourier: number;
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  totalRevenueAsManager: number;
  canceledByUser: number;
  role: string;
}

interface DataContextValue {
  orders: Order[];
  users: User[];
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  getOrderWithDetails: (orderId: string) => Promise<OrderWithDetails | null>;
  createOrder: (order: {
    clientName: string;
    clientPhone: string;
    address: string;
    deliveryDateTime: number;
    amount: number;
    comment?: string;
    floristId?: string | null;
    courierId?: string | null;
    externalFloristName?: string | null;
    externalFloristPhone?: string | null;
    externalCourierName?: string | null;
    externalCourierPhone?: string | null;
    paymentStatus?: string;
    paymentMethod?: string | null;
    paymentDetails?: string | null;
    clientSource?: string;
    clientSourceId?: string | null;
  }) => Promise<{ success: boolean; error?: string; duplicates?: Order[]; orderId?: string }>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string) => Promise<void>;
  addAttachment: (orderId: string, uri: string) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  createUser: (user: { email: string; password: string; name: string; phone?: string; role: string }) => Promise<void>;
  updateUser: (id: string, data: Partial<User & { password?: string }>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  getEmployeeStats: (userId: string) => Promise<EmployeeStats>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshOrders = useCallback(async () => {
    try {
      const data = await api.orders.list();
      setOrders(data);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      const load = async () => {
        setIsLoading(true);
        await Promise.all([refreshOrders(), refreshUsers()]);
        setIsLoading(false);
      };
      load();
    } else {
      setOrders([]);
      setUsers([]);
      setIsLoading(false);
    }
  }, [currentUser, refreshOrders, refreshUsers]);

  const getOrderWithDetails = useCallback(async (orderId: string): Promise<OrderWithDetails | null> => {
    try {
      return await api.orders.get(orderId);
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  }, []);

  const createOrder = useCallback(async (orderData: {
    clientName: string;
    clientPhone: string;
    address: string;
    deliveryDateTime: number;
    amount: number;
    comment?: string;
    floristId?: string | null;
    courierId?: string | null;
    externalFloristName?: string | null;
    externalFloristPhone?: string | null;
    externalCourierName?: string | null;
    externalCourierPhone?: string | null;
    paymentStatus?: string;
    paymentMethod?: string | null;
    paymentDetails?: string | null;
    clientSource?: string;
    clientSourceId?: string | null;
  }): Promise<{ success: boolean; error?: string; duplicates?: Order[]; orderId?: string }> => {
    try {
      const order = await api.orders.create(orderData);
      await refreshOrders();
      return { success: true, orderId: order.id };
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        return { success: false, error: 'Duplicate order', duplicates: [] };
      }
      return { success: false, error: error.message };
    }
  }, [refreshOrders]);

  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    await api.orders.update(id, data as any);
    await refreshOrders();
  }, [refreshOrders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    await api.orders.delete(orderId);
    await refreshOrders();
  }, [refreshOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus, note?: string) => {
    await api.orders.update(orderId, { status: newStatus, statusNote: note });
    await refreshOrders();
  }, [refreshOrders]);

  const addAttachment = useCallback(async (orderId: string, uri: string) => {
    await api.orders.addAttachment(orderId, uri);
  }, []);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    await api.attachments.delete(attachmentId);
  }, []);

  const createUser = useCallback(async (userData: { email: string; password: string; name: string; phone?: string; role: string }) => {
    await api.users.create(userData);
    await refreshUsers();
  }, [refreshUsers]);

  const updateUser = useCallback(async (id: string, data: Partial<User & { password?: string }>) => {
    await api.users.update(id, data);
    await refreshUsers();
  }, [refreshUsers]);

  const deleteUser = useCallback(async (userId: string) => {
    await api.users.delete(userId);
    await refreshUsers();
  }, [refreshUsers]);

  const getEmployeeStats = useCallback(async (userId: string): Promise<EmployeeStats> => {
    try {
      return await api.stats.employee(userId);
    } catch (error) {
      console.error('Error getting employee stats:', error);
      return {
        ordersCreated: 0, ordersAssembled: 0, ordersDelivered: 0, statusChanges: 0,
        assignedAsFlorist: 0, assignedAsCourier: 0, activeAsFlorist: 0, activeAsCourier: 0,
        today: { ordersCreated: 0, ordersAssembled: 0, ordersDelivered: 0 },
        week: { ordersCreated: 0, ordersAssembled: 0, ordersDelivered: 0 },
        month: { ordersCreated: 0, ordersAssembled: 0, ordersDelivered: 0 },
        totalRevenueAsManager: 0, canceledByUser: 0, role: '',
      };
    }
  }, []);

  const value = useMemo(() => ({
    orders,
    users,
    isLoading,
    refreshOrders,
    refreshUsers,
    getOrderWithDetails,
    createOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    addAttachment,
    deleteAttachment,
    createUser,
    updateUser,
    deleteUser,
    getEmployeeStats,
  }), [
    orders, users, isLoading, refreshOrders, refreshUsers, getOrderWithDetails,
    createOrder, updateOrder, deleteOrder, updateOrderStatus, addAttachment,
    deleteAttachment, createUser, updateUser, deleteUser, getEmployeeStats
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
