import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './query-client';
import { Order } from './types';

export function resolvePhotoUri(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return '';
  }
  if (uri.startsWith('/api/uploads/') || uri.startsWith('/uploads/')) {
    try {
      const base = getApiUrl().replace(/\/$/, '');
      return `${base}${uri}`;
    } catch {
      return uri;
    }
  }
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    return uri;
  }
  try {
    const base = getApiUrl().replace(/\/$/, '');
    return `${base}${uri.startsWith('/') ? uri : '/' + uri}`;
  } catch {
    return uri;
  }
}

const TOKEN_KEY = '@flora_auth_token';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = new URL(endpoint, getApiUrl()).toString();
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string; organizationName: string; devPassword: string }) =>
      request<{ user: any; organization: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    login: (data: { email: string; password: string }) =>
      request<{ user: any; organization: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    
    me: () => request<{ user: any; organization: any }>('/api/auth/me'),
  },
  
  users: {
    list: () => request<any[]>('/api/users'),
    
    create: (data: { email: string; password: string; name: string; phone?: string; role: string }) =>
      request<any>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<{ name: string; phone: string; role: string; isActive: boolean; password: string }>) =>
      request<any>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),
  },
  
  orders: {
    list: () => request<any[]>('/api/orders'),
    
    get: (id: string) => request<any>(`/api/orders/${id}`),
    
    create: (data: {
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
    }) =>
      request<any>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<{
      clientName: string;
      clientPhone: string;
      address: string;
      deliveryDateTime: number;
      amount: number;
      status: string;
      statusNote: string;
      comment: string;
      floristId: string | null;
      courierId: string | null;
      externalFloristName: string | null;
      externalFloristPhone: string | null;
      externalCourierName: string | null;
      externalCourierPhone: string | null;
      paymentStatus: string;
      paymentMethod: string | null;
      paymentDetails: string | null;
      clientSource: string;
      clientSourceId: string | null;
    }>) =>
      request<any>(`/api/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/orders/${id}`, { method: 'DELETE' }),
    
    addAttachment: (orderId: string, base64: string, mimeType: string, type: string = 'PHOTO') =>
      request<any>(`/api/orders/${orderId}/attachments`, {
        method: 'POST',
        body: JSON.stringify({ base64, type, mimeType }),
      }),
    
    assignSelf: (orderId: string) =>
      request<any>(`/api/orders/${orderId}/assign-self`, {
        method: 'POST',
      }),
    
    batchAssign: (orderIds: string[]) =>
      request<{ assigned: number; orders: any[] }>('/api/orders/batch-assign', {
        method: 'POST',
        body: JSON.stringify({ orderIds }),
      }),

    listAvailable: () =>
      request<Order[]>('/api/orders/available'),
  },
  
  attachments: {
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/attachments/${id}`, { method: 'DELETE' }),
  },

  assistants: {
    list: (orderId: string) => request<any[]>(`/api/orders/${orderId}/assistants`),

    add: (orderId: string, data: { userId: string; role: 'FLORIST' | 'COURIER' }) =>
      request<any>(`/api/orders/${orderId}/assistants`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    remove: (orderId: string, assistantId: string) =>
      request<{ success: boolean }>(`/api/orders/${orderId}/assistants/${assistantId}`, { method: 'DELETE' }),
  },
  
  stats: {
    get: () => request<{
      total: number;
      byStatus: Record<string, number>;
      overdue: number;
      weeklyDelivered: number;
      weeklyRevenue: number;
    }>('/api/stats'),
    
    employee: (userId: string) => request<{
      ordersCreated: number;
      ordersAssembled: number;
      ordersDelivered: number;
      statusChanges: number;
      assignedAsFlorist: number;
      assignedAsCourier: number;
      activeAsFlorist: number;
      activeAsCourier: number;
      today: { ordersCreated: number; ordersAssembled: number; ordersDelivered: number };
      week: { ordersCreated: number; ordersAssembled: number; ordersDelivered: number };
      month: { ordersCreated: number; ordersAssembled: number; ordersDelivered: number };
      totalRevenueAsManager: number;
      canceledByUser: number;
      role: string;
    }>(`/api/stats/employee/${userId}`),

    employeeOrders: (userId: string, type: 'created' | 'assembled' | 'delivered' | 'canceled' | 'assigned_florist' | 'assigned_courier' | 'active_florist' | 'active_courier', period?: 'today' | 'week' | 'month') => {
      const params = new URLSearchParams({ type });
      if (period) params.set('period', period);
      return request<(Order & { actionTimestamp: number })[]>(`/api/stats/employee/${userId}/orders?${params.toString()}`);
    },
  },

  expenses: {
    list: (orderId: string) => request<any[]>(`/api/orders/${orderId}/expenses`),
    
    add: (orderId: string, data: { amount: number; comment: string }) =>
      request<any>(`/api/orders/${orderId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    delete: (expenseId: string) =>
      request<any>(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      }),
    
    allForOrg: () => request<any[]>('/api/all-order-expenses'),
  },

  businessExpenses: {
    list: () => request<any[]>('/api/business-expenses'),
    
    add: (data: { category: string; amount: number; comment: string; date?: number }) =>
      request<any>('/api/business-expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/business-expenses/${id}`, {
        method: 'DELETE',
      }),
  },

  geocodeOrder: (orderId: string) =>
    request<{ success: boolean; lat?: number; lon?: number; error?: string }>(`/api/orders/${orderId}/geocode`, {
      method: 'POST',
    }),

  courierLocation: {
    send: (data: { lat: number; lon: number; accuracy?: number; activeOrderId?: string }) =>
      request<{ success: boolean }>('/api/courier/location', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getLatest: () =>
      request<any>('/api/courier/location/latest'),
  },

  reports: {
    financial: (from?: number, to?: number) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from.toString());
      if (to) params.set('to', to.toString());
      const query = params.toString();
      return request<any>(`/api/reports/financial${query ? `?${query}` : ''}`);
    },

    orders: (filters: { from?: number; to?: number; status?: string; paymentStatus?: string; source?: string; paymentMethod?: string }) => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from.toString());
      if (filters.to) params.set('to', filters.to.toString());
      if (filters.status) params.set('status', filters.status);
      if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
      if (filters.source) params.set('source', filters.source);
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
      const query = params.toString();
      return request<any[]>(`/api/reports/orders${query ? `?${query}` : ''}`);
    },
  },
};
