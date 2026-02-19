export type UserRole = 'OWNER' | 'MANAGER' | 'FLORIST' | 'COURIER';
export type OrderStatus = 'NEW' | 'IN_WORK' | 'ASSEMBLED' | 'ON_DELIVERY' | 'DELIVERED' | 'CANCELED';
export type PaymentStatus = 'NOT_PAID' | 'ADVANCE' | 'PAID';
export type ClientSource = 'PHONE' | 'WHATSAPP' | 'TELEGRAM' | 'INSTAGRAM' | 'WEBSITE' | 'OTHER';
export type BusinessExpenseCategory = 'TAXES' | 'RENT' | 'SALARY' | 'SUPPLIES' | 'MARKETING' | 'TRANSPORT' | 'OTHER';

export interface Organization {
  id: string;
  name: string;
  createdAt: number;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
}

export interface Order {
  id: string;
  organizationId: string;
  orderNumber: number | null;
  clientName: string;
  clientPhone: string;
  address: string;
  deliveryDateTime: number;
  deliveryDateTimeEnd: number | null;
  amount: number;
  status: OrderStatus;
  managerId: string | null;
  floristId: string | null;
  courierId: string | null;
  externalFloristName: string | null;
  externalFloristPhone: string | null;
  externalCourierName: string | null;
  externalCourierPhone: string | null;
  comment: string | null;
  paymentStatus: PaymentStatus | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  clientSource: ClientSource | null;
  clientSourceId: string | null;
  latitude: number | null;
  longitude: number | null;
  geoStatus: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | null;
  createdAt: number;
  updatedAt: number;
}

export interface Attachment {
  id: string;
  orderId: string;
  type: string;
  uri: string;
  uploadedByUserId?: string | null;
  createdAt: number;
}

export interface OrderHistory {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId: string | null;
  changedAt: number;
  note: string | null;
  changedByName?: string | null;
}

export type AssistantRole = 'FLORIST' | 'COURIER';

export interface OrderAssistant {
  id: string;
  orderId: string;
  userId: string;
  role: AssistantRole;
  createdAt: number;
  userName?: string;
}

export interface OrderWithDetails extends Order {
  attachments: Attachment[];
  history: OrderHistory[];
  assistants?: OrderAssistant[];
}

export interface BusinessExpense {
  id: string;
  organizationId: string;
  category: BusinessExpenseCategory;
  amount: number;
  comment: string;
  date: number;
  createdByUserId: string | null;
  createdAt: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  IN_WORK: 'В работе',
  ASSEMBLED: 'Собран',
  ON_DELIVERY: 'В доставке',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменен',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Руководитель',
  MANAGER: 'Менеджер',
  FLORIST: 'Флорист',
  COURIER: 'Курьер',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_PAID: 'Не оплачено',
  ADVANCE: 'Аванс',
  PAID: 'Оплачено',
};

export const CLIENT_SOURCE_LABELS: Record<ClientSource, string> = {
  PHONE: 'Телефон',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  WEBSITE: 'Сайт',
  OTHER: 'Другое',
};

export const BUSINESS_EXPENSE_CATEGORY_LABELS: Record<BusinessExpenseCategory, string> = {
  TAXES: 'Налоги',
  RENT: 'Аренда',
  SALARY: 'Зарплата',
  SUPPLIES: 'Расходные материалы',
  MARKETING: 'Маркетинг',
  TRANSPORT: 'Транспорт',
  OTHER: 'Прочее',
};
