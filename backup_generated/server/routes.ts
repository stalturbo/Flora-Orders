import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertOrderSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // === User Management ===
  
  app.get(api.users.me.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    // If user profile doesn't exist, create default
    if (!user?.role) {
       // First user is owner, others are guest/manager (logic can be improved)
       const allUsers = await storage.getAllUsers();
       const role = allUsers.length <= 1 ? 'OWNER' : 'MANAGER'; // <=1 because this user is already in authUsers but maybe not settings
       await storage.updateUserProfile(userId, { role });
       const updated = await storage.getUser(userId);
       return res.json(updated);
    }
    
    res.json(user);
  });

  app.get(api.users.list.path, isAuthenticated, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });
  
  app.put(api.users.updateProfile.path, isAuthenticated, async (req: any, res) => {
    try {
      const updates = api.users.updateProfile.input.parse(req.body);
      const updated = await storage.updateUserProfile(req.user.claims.sub, updates);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  });

  // === Orders ===

  app.get(api.orders.list.path, isAuthenticated, async (req: any, res) => {
    // Get user role to filter
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    const role = user?.role || 'MANAGER';
    
    // Parse query params
    const filters = {
      status: req.query.status as string,
      role: role,
      userId: userId
    };

    const orders = await storage.getOrders(filters);
    res.json(orders);
  });

  app.get(api.orders.get.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Fetch relations
    const attachments = await storage.getAttachments(id);
    const history = await storage.getOrderHistory(id);
    const expenses = await storage.getOrderExpenses(id);
    const assistants = await storage.getOrderAssistants(id);
    
    res.json({ ...order, attachments, history, expenses, assistants });
  });

  app.post(api.orders.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder(input);
      
      // Log history
      await storage.addOrderHistory({
        orderId: order.id,
        toStatus: 'NEW',
        changedByUserId: req.user.claims.sub,
        note: 'Order created'
      });
      
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  });

  app.put(api.orders.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.orders.update.input.parse(req.body);
      
      const existing = await storage.getOrder(id);
      if (!existing) return res.status(404).json({ message: 'Order not found' });
      
      const order = await storage.updateOrder(id, input);
      res.json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  });

  app.patch(api.orders.updateStatus.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      
      const existing = await storage.getOrder(id);
      if (!existing) return res.status(404).json({ message: 'Order not found' });
      
      const order = await storage.updateOrder(id, { status });
      
      // Log history
      await storage.addOrderHistory({
        orderId: id,
        fromStatus: existing.status,
        toStatus: status,
        changedByUserId: req.user.claims.sub,
        note: note
      });
      
      res.json(order);
    } catch (err) {
       res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
  app.patch(api.orders.assign.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role, userId } = req.body;
      
      const updates: any = {};
      if (role === 'FLORIST') updates.floristId = userId;
      if (role === 'COURIER') updates.courierId = userId;
      if (role === 'MANAGER') updates.managerId = userId;
      
      const order = await storage.updateOrder(id, updates);
      res.json(order);
    } catch (err) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.delete(api.orders.delete.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(req.user.claims.sub);
    
    if (user?.role !== 'OWNER' && user?.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Only managers/owners can delete orders' });
    }
    
    await storage.deleteOrder(id);
    res.status(204).send();
  });
  
  // Expenses
  app.post(api.expenses.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const input = api.expenses.create.input.parse(req.body);
      
      const expense = await storage.addOrderExpense({
        ...input,
        orderId,
        createdByUserId: req.user.claims.sub
      });
      
      res.status(201).json(expense);
    } catch (err) {
      res.status(400).json({ message: 'Validation Error' });
    }
  });

  // Seed database if empty
  await seedDatabase();

  return httpServer;
}

// Seed function
export async function seedDatabase() {
  const existing = await storage.getOrders();
  if (existing.length > 0) return;

  console.log("Seeding database...");
  
  // We can't easily seed users because they are auth-dependent (need real Replit IDs).
  // But we can seed orders if we make fields nullable or use placeholder IDs if foreign keys allow.
  // Our schema allows null staff IDs.

  await storage.createOrder({
    clientName: "Alice Smith",
    clientPhone: "+15551234567",
    address: "123 Main St, New York, NY",
    deliveryDateTime: new Date(Date.now() + 86400000), // Tomorrow
    amount: 5500, // $55.00
    status: "NEW",
    comment: "Red roses, 12 count. Birthday."
  });
  
  await storage.createOrder({
    clientName: "Bob Jones",
    clientPhone: "+15559876543",
    address: "456 Park Ave, New York, NY",
    deliveryDateTime: new Date(Date.now() + 172800000), // Day after tomorrow
    amount: 12000, // $120.00
    status: "IN_WORK",
    comment: "Mixed spring bouquet. Anniversary."
  });
  
  await storage.createOrder({
    clientName: "Carol Williams",
    clientPhone: "+15555555555",
    address: "789 Broadway, New York, NY",
    deliveryDateTime: new Date(),
    amount: 7500, // $75.00
    status: "ASSEMBLED",
    comment: "White lilies. Sympathy."
  });
  
  console.log("Seeding complete.");
}
