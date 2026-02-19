import { db } from "./db";
import { 
  orders, 
  userSettings, 
  authUsers, 
  attachments, 
  orderHistory, 
  orderExpenses,
  orderAssistants,
  type InsertOrder,
  type Order,
  type User,
  type Attachment,
  type OrderHistoryItem,
  type OrderExpense,
  type OrderAssistant
} from "@shared/schema";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // Orders
  getOrders(filters?: { status?: string; role?: string; userId?: string }): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  
  // Order Relations
  getAttachments(orderId: number): Promise<Attachment[]>;
  createAttachment(attachment: any): Promise<Attachment>; // simplified
  getOrderHistory(orderId: number): Promise<OrderHistoryItem[]>;
  addOrderHistory(entry: any): Promise<OrderHistoryItem>;
  getOrderExpenses(orderId: number): Promise<OrderExpense[]>;
  addOrderExpense(entry: any): Promise<OrderExpense>;
  getOrderAssistants(orderId: number): Promise<OrderAssistant[]>;
  assignAssistant(entry: any): Promise<OrderAssistant>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  updateUserProfile(id: string, updates: Partial<any>): Promise<any>;
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getOrders(filters?: { status?: string; role?: string; userId?: string }): Promise<Order[]> {
    let query = db.select().from(orders).orderBy(desc(orders.deliveryDateTime));
    
    // Apply filters logic
    const conditions = [];
    if (filters?.status) {
      const statuses = filters.status.split(',');
      conditions.push(sql`${orders.status} IN ${statuses}`);
    }
    
    if (filters?.role && filters?.userId) {
      if (filters.role === 'FLORIST') {
        conditions.push(or(
          eq(orders.floristId, filters.userId),
          and(eq(orders.status, 'NEW'), sql`${orders.floristId} IS NULL`)
        ));
      } else if (filters.role === 'COURIER') {
        conditions.push(or(
          eq(orders.courierId, filters.userId),
          and(eq(orders.status, 'ASSEMBLED'), sql`${orders.courierId} IS NULL`)
        ));
      } else if (filters.role === 'MANAGER' || filters.role === 'OWNER') {
        // Managers see everything, but if they want to filter by "their" orders (which doesn't make much sense for managers usually, but let's say assigned to them)
        // For now, no extra filter for managers unless explicitly requested
      }
    }

    if (conditions.length > 0) {
      // @ts-ignore
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // Generate order number
    // In a real app, this should be atomic/locked or a sequence.
    // Drizzle serial 'id' is good, but for 'orderNumber' we might want a separate counter per organization or global.
    // For simplicity, we'll just use the ID as the order number or a random number for now if it's not provided (but schema says it is NOT NULL).
    // Actually, let's auto-generate it based on count or max.
    
    const [lastOrder] = await db.select().from(orders).orderBy(desc(orders.orderNumber)).limit(1);
    const nextOrderNumber = (lastOrder?.orderNumber || 1000) + 1;
    
    const [order] = await db
      .insert(orders)
      .values({ ...insertOrder, orderNumber: nextOrderNumber })
      .returning();
    return order;
  }

  async updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }
  
  // Relations
  async getAttachments(orderId: number): Promise<Attachment[]> {
    return await db.select().from(attachments).where(eq(attachments.orderId, orderId));
  }
  
  async createAttachment(entry: any): Promise<Attachment> {
    const [att] = await db.insert(attachments).values(entry).returning();
    return att;
  }
  
  async getOrderHistory(orderId: number): Promise<OrderHistoryItem[]> {
    return await db.select().from(orderHistory).where(eq(orderHistory.orderId, orderId)).orderBy(desc(orderHistory.changedAt));
  }
  
  async addOrderHistory(entry: any): Promise<OrderHistoryItem> {
    const [hist] = await db.insert(orderHistory).values(entry).returning();
    return hist;
  }
  
  async getOrderExpenses(orderId: number): Promise<OrderExpense[]> {
    return await db.select().from(orderExpenses).where(eq(orderExpenses.orderId, orderId));
  }
  
  async addOrderExpense(entry: any): Promise<OrderExpense> {
    const [exp] = await db.insert(orderExpenses).values(entry).returning();
    return exp;
  }
  
  async getOrderAssistants(orderId: number): Promise<OrderAssistant[]> {
    return await db.select().from(orderAssistants).where(eq(orderAssistants.orderId, orderId));
  }
  
  async assignAssistant(entry: any): Promise<OrderAssistant> {
    const [asst] = await db.insert(orderAssistants).values(entry).returning();
    return asst;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    // Join authUsers and userSettings
    const result = await db
      .select()
      .from(authUsers)
      .leftJoin(userSettings, eq(authUsers.id, userSettings.userId))
      .where(eq(authUsers.id, id));
      
    if (result.length === 0) return undefined;
    
    const { users: authUser, user_settings: settings } = result[0];
    return { ...authUser, ...settings };
  }
  
  async updateUserProfile(id: string, updates: Partial<any>): Promise<any> {
    // Upsert user settings
    const [settings] = await db
      .insert(userSettings)
      .values({ userId: id, ...updates })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...updates, updatedAt: new Date() }
      })
      .returning();
    return settings;
  }
  
  async getAllUsers(): Promise<User[]> {
    const rows = await db
      .select()
      .from(authUsers)
      .leftJoin(userSettings, eq(authUsers.id, userSettings.userId));
      
    return rows.map(({ users: authUser, user_settings: settings }) => ({
      ...authUser,
      ...settings
    }));
  }
}

export const storage = new DatabaseStorage();
