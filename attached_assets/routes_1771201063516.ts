import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { users, orders, attachments, orderHistory, organizations, devSettings, sessions, orderExpenses, businessExpenses, orderAssistants, courierLocationLatest, courierLocations } from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count, sum, isNull, inArray, or, max } from "drizzle-orm";
import { register, login, validateSession, deleteSession, hashPassword } from "./auth";
import type { User, Organization } from "@shared/schema";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface AuthRequest extends Request {
  user?: User;
  organization?: Organization;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const session = await validateSession(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  req.user = session.user;
  req.organization = session.organization;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize dev settings if not exists
  const existingDevSettings = await db.select().from(devSettings).where(eq(devSettings.id, 'default'));
  if (existingDevSettings.length === 0) {
    await db.insert(devSettings).values({ id: 'default', devPassword: '20242024' });
  }

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name, organizationName, devPassword } = req.body;
      
      if (!email || !password || !name || !organizationName) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      if (!devPassword) {
        return res.status(400).json({ error: 'Пароль разработчика обязателен' });
      }
      
      // Verify dev password
      const settings = await db.select().from(devSettings).where(eq(devSettings.id, 'default'));
      const currentDevPassword = settings[0]?.devPassword || '20242024';
      
      if (devPassword !== currentDevPassword) {
        return res.status(403).json({ error: 'Неверный пароль разработчика' });
      }
      
      const result = await register(email, password, name, organizationName);
      
      res.json({
        user: { ...result.user, password: undefined },
        organization: result.organization,
        token: result.token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      const result = await login(email, password);
      
      res.json({
        user: { ...result.user, password: undefined },
        organization: result.organization,
        token: result.token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });
  
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await deleteSession(token);
    }
    res.json({ success: true });
  });
  
  app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    res.json({
      user: { ...req.user, password: undefined },
      organization: req.organization,
    });
  });
  
  app.get('/api/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    const orgUsers = await db
      .select()
      .from(users)
      .where(eq(users.organizationId, req.organization!.id));
    
    res.json(orgUsers.map(u => ({ ...u, password: undefined })));
  });
  
  app.post('/api/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only owner can create users' });
    }
    
    const { email, password, name, phone, role } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name required' });
    }
    
    try {
      const [user] = await db
        .insert(users)
        .values({
          organizationId: req.organization!.id,
          email: email.toLowerCase(),
          password: hashPassword(password),
          plainPassword: password,
          name,
          phone: phone || null,
          role: role || 'MANAGER',
        })
        .returning();
      
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });
  
  app.put('/api/users/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'OWNER' && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { name, phone, role, isActive, password } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role && req.user!.role === 'OWNER') updateData.role = role;
    if (isActive !== undefined && req.user!.role === 'OWNER') updateData.isActive = isActive;
    if (password) {
      updateData.password = hashPassword(password);
      updateData.plainPassword = password;
    }
    
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(and(
        eq(users.id, req.params.id),
        eq(users.organizationId, req.organization!.id)
      ))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ ...updated, password: undefined });
  });
  
  app.delete('/api/users/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only owner can delete users' });
    }
    
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    const userId = req.params.id;
    const orgId = req.organization!.id;
    
    try {
      await db.delete(sessions).where(eq(sessions.userId, userId));
      
      await db.delete(courierLocationLatest).where(eq(courierLocationLatest.courierUserId, userId));
      await db.delete(courierLocations).where(eq(courierLocations.courierUserId, userId));
      
      await db.delete(orderAssistants).where(eq(orderAssistants.userId, userId));
      
      await db.update(orders).set({ managerId: null }).where(eq(orders.managerId, userId));
      await db.update(orders).set({ floristId: null }).where(eq(orders.floristId, userId));
      await db.update(orders).set({ courierId: null }).where(eq(orders.courierId, userId));
      
      await db.update(orderHistory).set({ changedByUserId: null }).where(eq(orderHistory.changedByUserId, userId));
      await db.update(orderExpenses).set({ createdByUserId: null }).where(eq(orderExpenses.createdByUserId, userId));
      await db.update(businessExpenses).set({ createdByUserId: null }).where(eq(businessExpenses.createdByUserId, userId));
      
      await db
        .delete(users)
        .where(and(
          eq(users.id, userId),
          eq(users.organizationId, orgId)
        ));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  });
  
  app.get('/api/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
    let query = db
      .select()
      .from(orders)
      .where(eq(orders.organizationId, req.organization!.id))
      .orderBy(desc(orders.deliveryDateTime));
    
    const allOrders = await query;
    
    let filteredOrders = allOrders;
    if (req.user!.role === 'FLORIST') {
      filteredOrders = allOrders.filter(o => 
        o.floristId === req.user!.id || 
        (o.status === 'NEW' && !o.floristId)
      );
    } else if (req.user!.role === 'COURIER') {
      filteredOrders = allOrders.filter(o => 
        o.courierId === req.user!.id || 
        (o.status === 'ASSEMBLED' && !o.courierId)
      );
    }
    
    res.json(filteredOrders);
  });
  
  // GET /api/orders/with-coordinates - get all orders with coordinates for map display (owner/manager)
  app.get('/api/orders/with-coordinates', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const orgId = req.user!.organizationId;
      const statusFilter = req.query.status as string | undefined;

      let conditions: any[] = [
        eq(orders.organizationId, orgId),
        sql`${orders.latitude} IS NOT NULL`,
        sql`${orders.longitude} IS NOT NULL`,
      ];

      if (statusFilter) {
        const statuses = statusFilter.split(',') as any[];
        conditions.push(inArray(orders.status, statuses));
      }

      const result = await db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        clientName: orders.clientName,
        deliveryAddress: orders.address,
        status: orders.status,
        latitude: orders.latitude,
        longitude: orders.longitude,
        courierUserId: orders.courierId,
        deliveryDateTime: orders.deliveryDateTime,
      }).from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.deliveryDateTime));

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, req.params.id),
        eq(orders.organizationId, req.organization!.id)
      ));
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.orderId, order.id));
    
    const historyRaw = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, order.id))
      .orderBy(desc(orderHistory.changedAt));

    const historyWithNames = await Promise.all(
      historyRaw.map(async (h) => {
        let changedByName = null;
        if (h.changedByUserId) {
          const [user] = await db.select().from(users).where(eq(users.id, h.changedByUserId));
          changedByName = user?.name || null;
        }
        return { ...h, changedByName };
      })
    );
    
    const assistants = await db
      .select()
      .from(orderAssistants)
      .where(eq(orderAssistants.orderId, order.id));
    
    const assistantsWithNames = await Promise.all(
      assistants.map(async (a) => {
        const [user] = await db.select().from(users).where(eq(users.id, a.userId));
        return { ...a, userName: user?.name || 'Неизвестный' };
      })
    );
    
    res.json({ ...order, attachments: orderAttachments, history: historyWithNames, assistants: assistantsWithNames });
  });
  
  app.post('/api/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'MANAGER' && req.user!.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only managers can create orders' });
    }
    
    const { clientName, clientPhone, address, deliveryDateTime, deliveryDateTimeEnd, amount, comment, floristId, courierId, externalFloristName, externalFloristPhone, externalCourierName, externalCourierPhone, paymentStatus, paymentMethod, paymentDetails, clientSource, clientSourceId } = req.body;
    
    if (!clientName || !clientPhone || !address || !deliveryDateTime || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const dayStart = new Date(deliveryDateTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(deliveryDateTime);
    dayEnd.setHours(23, 59, 59, 999);
    
    const duplicates = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.organizationId, req.organization!.id),
        eq(orders.clientPhone, clientPhone),
        eq(orders.amount, amount),
        gte(orders.deliveryDateTime, dayStart.getTime()),
        lte(orders.deliveryDateTime, dayEnd.getTime())
      ));
    
    if (duplicates.length > 0) {
      return res.status(409).json({ 
        error: 'Possible duplicate order found',
        duplicates 
      });
    }
    
    const now = Date.now();
    
    const [maxResult] = await db
      .select({ maxNum: max(orders.orderNumber) })
      .from(orders)
      .where(eq(orders.organizationId, req.organization!.id));
    const nextOrderNumber = (maxResult?.maxNum || 0) + 1;
    
    const [order] = await db
      .insert(orders)
      .values({
        organizationId: req.organization!.id,
        orderNumber: nextOrderNumber,
        clientName,
        clientPhone,
        address,
        deliveryDateTime,
        deliveryDateTimeEnd: deliveryDateTimeEnd || null,
        amount,
        status: 'NEW',
        managerId: req.user!.id,
        floristId: floristId || null,
        courierId: courierId || null,
        externalFloristName: externalFloristName || null,
        externalFloristPhone: externalFloristPhone || null,
        externalCourierName: externalCourierName || null,
        externalCourierPhone: externalCourierPhone || null,
        comment: comment || null,
        paymentStatus: paymentStatus || 'NOT_PAID',
        paymentMethod: paymentMethod || null,
        paymentDetails: paymentDetails || null,
        clientSource: clientSource || 'PHONE',
        clientSourceId: clientSourceId || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    
    await db.insert(orderHistory).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'NEW',
      changedByUserId: req.user!.id,
      changedAt: now,
      note: 'Заказ создан',
    });
    
    res.json(order);
  });
  
  app.put('/api/orders/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    const [existing] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, req.params.id),
        eq(orders.organizationId, req.organization!.id)
      ));
    
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const { clientName, clientPhone, address, deliveryDateTime, deliveryDateTimeEnd, amount, status, comment, floristId, courierId, externalFloristName, externalFloristPhone, externalCourierName, externalCourierPhone, paymentStatus, paymentMethod, paymentDetails, clientSource, clientSourceId } = req.body;
    
    const updateData: any = { updatedAt: Date.now() };
    if (clientName) updateData.clientName = clientName;
    if (clientPhone) updateData.clientPhone = clientPhone;
    if (address) updateData.address = address;
    if (deliveryDateTime) updateData.deliveryDateTime = deliveryDateTime;
    if (deliveryDateTimeEnd !== undefined) updateData.deliveryDateTimeEnd = deliveryDateTimeEnd;
    if (amount !== undefined) updateData.amount = amount;
    if (status) updateData.status = status;
    if (comment !== undefined) updateData.comment = comment;
    if (floristId !== undefined) updateData.floristId = floristId;
    if (courierId !== undefined) updateData.courierId = courierId;
    if (externalFloristName !== undefined) updateData.externalFloristName = externalFloristName;
    if (externalFloristPhone !== undefined) updateData.externalFloristPhone = externalFloristPhone;
    if (externalCourierName !== undefined) updateData.externalCourierName = externalCourierName;
    if (externalCourierPhone !== undefined) updateData.externalCourierPhone = externalCourierPhone;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentDetails !== undefined) updateData.paymentDetails = paymentDetails;
    if (clientSource !== undefined) updateData.clientSource = clientSource;
    if (clientSourceId !== undefined) updateData.clientSourceId = clientSourceId;
    
    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, req.params.id))
      .returning();
    
    if (status && status !== existing.status) {
      await db.insert(orderHistory).values({
        orderId: updated.id,
        fromStatus: existing.status,
        toStatus: status,
        changedByUserId: req.user!.id,
        changedAt: Date.now(),
        note: req.body.statusNote || null,
      });
    }
    
    res.json(updated);
  });
  
  app.delete('/api/orders/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'MANAGER' && req.user!.role !== 'OWNER') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await db
      .delete(orders)
      .where(and(
        eq(orders.id, req.params.id),
        eq(orders.organizationId, req.organization!.id)
      ));
    
    res.json({ success: true });
  });
  
  app.post('/api/orders/:id/attachments', authMiddleware, async (req: AuthRequest, res: Response) => {
    const { base64, type, mimeType } = req.body;
    
    if (!base64) {
      return res.status(400).json({ error: 'Photo data required' });
    }
    
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, req.params.id),
        eq(orders.organizationId, req.organization!.id)
      ));
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const ext = (mimeType === 'image/png') ? '.png' : '.jpg';
    const filename = crypto.randomUUID() + ext;
    const filepath = path.join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filepath, buffer);

    const uri = `/api/uploads/${filename}`;
    
    const [attachment] = await db
      .insert(attachments)
      .values({
        orderId: order.id,
        type: type || 'PHOTO',
        uri,
      })
      .returning();
    
    res.json(attachment);
  });

  app.get('/api/uploads/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Invalid filename');
    }
    const filepath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).send('Not found');
    }
    const ext = path.extname(filename).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(filepath).pipe(res);
  });
  
  app.delete('/api/attachments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, req.params.id));
    if (attachment && attachment.uri.startsWith('/api/uploads/')) {
      const filename = attachment.uri.replace('/api/uploads/', '');
      const filepath = path.join(UPLOADS_DIR, filename);
      try { fs.unlinkSync(filepath); } catch {}
    }
    await db.delete(attachments).where(eq(attachments.id, req.params.id));
    res.json({ success: true });
  });

  app.get('/api/orders/:id/assistants', authMiddleware, async (req: AuthRequest, res: Response) => {
    const [order] = await db.select().from(orders).where(
      and(eq(orders.id, req.params.id), eq(orders.organizationId, req.organization!.id))
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const assistants = await db.select().from(orderAssistants).where(eq(orderAssistants.orderId, order.id));
    const assistantsWithNames = await Promise.all(
      assistants.map(async (a) => {
        const [user] = await db.select().from(users).where(eq(users.id, a.userId));
        return { ...a, userName: user?.name || 'Неизвестный' };
      })
    );
    res.json(assistantsWithNames);
  });

  app.post('/api/orders/:id/assistants', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'MANAGER' && req.user!.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only managers can add assistants' });
    }

    const [order] = await db.select().from(orders).where(
      and(eq(orders.id, req.params.id), eq(orders.organizationId, req.organization!.id))
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId and role are required' });
    if (role !== 'FLORIST' && role !== 'COURIER') return res.status(400).json({ error: 'Role must be FLORIST or COURIER' });

    const existing = await db.select().from(orderAssistants).where(
      and(eq(orderAssistants.orderId, order.id), eq(orderAssistants.userId, userId))
    );
    if (existing.length > 0) return res.status(400).json({ error: 'User is already an assistant on this order' });

    const [assistant] = await db.insert(orderAssistants).values({
      orderId: order.id,
      userId,
      role: role as any,
    }).returning();

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    res.json({ ...assistant, userName: user?.name || 'Неизвестный' });
  });

  app.delete('/api/orders/:id/assistants/:assistantId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'MANAGER' && req.user!.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only managers can remove assistants' });
    }

    await db.delete(orderAssistants).where(eq(orderAssistants.id, req.params.assistantId));
    res.json({ success: true });
  });

  // Order expenses API - all employees can add expenses
  app.get('/api/orders/:id/expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const orderId = req.params.id;
      
      // Verify order belongs to user's organization
      const [order] = await db.select().from(orders).where(
        and(eq(orders.id, orderId), eq(orders.organizationId, req.organization!.id))
      );
      
      if (!order) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }
      
      const expenses = await db
        .select({
          id: orderExpenses.id,
          orderId: orderExpenses.orderId,
          amount: orderExpenses.amount,
          comment: orderExpenses.comment,
          createdByUserId: orderExpenses.createdByUserId,
          createdAt: orderExpenses.createdAt,
          createdByName: users.name,
        })
        .from(orderExpenses)
        .leftJoin(users, eq(orderExpenses.createdByUserId, users.id))
        .where(eq(orderExpenses.orderId, orderId))
        .orderBy(desc(orderExpenses.createdAt));
      
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders/:id/expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const orderId = req.params.id;
      const { amount, comment } = req.body;
      
      // Validate required fields
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Сумма расхода обязательна и должна быть больше 0' });
      }
      
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ error: 'Комментарий обязателен' });
      }
      
      // Verify order belongs to user's organization
      const [order] = await db.select().from(orders).where(
        and(eq(orders.id, orderId), eq(orders.organizationId, req.organization!.id))
      );
      
      if (!order) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }
      
      // Create expense
      const [expense] = await db.insert(orderExpenses).values({
        orderId,
        amount: Math.floor(amount),
        comment: comment.trim(),
        createdByUserId: req.user!.id,
      }).returning();
      
      res.json({ 
        ...expense, 
        createdByName: req.user!.name 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/expenses/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const expenseId = req.params.id;
      
      // Get expense to check order ownership
      const [expense] = await db.select().from(orderExpenses).where(eq(orderExpenses.id, expenseId));
      
      if (!expense) {
        return res.status(404).json({ error: 'Расход не найден' });
      }
      
      // Verify order belongs to user's organization
      const [order] = await db.select().from(orders).where(
        and(eq(orders.id, expense.orderId), eq(orders.organizationId, req.organization!.id))
      );
      
      if (!order) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
      
      // Only owner/manager or creator can delete
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER' && expense.createdByUserId !== req.user!.id) {
        return res.status(403).json({ error: 'Нет прав на удаление' });
      }
      
      await db.delete(orderExpenses).where(eq(orderExpenses.id, expenseId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Business expenses CRUD (Owner only)
  app.get('/api/business-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owner can view business expenses' });
      }
      
      const expenses = await db
        .select()
        .from(businessExpenses)
        .where(eq(businessExpenses.organizationId, req.organization!.id))
        .orderBy(desc(businessExpenses.date));
      
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/business-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owner can add business expenses' });
      }
      
      const { category, amount, comment, date } = req.body;
      
      if (!category || !amount || !comment) {
        return res.status(400).json({ error: 'Category, amount and comment are required' });
      }
      
      const [expense] = await db
        .insert(businessExpenses)
        .values({
          organizationId: req.organization!.id,
          category,
          amount,
          comment,
          date: date || Date.now(),
          createdByUserId: req.user!.id,
        })
        .returning();
      
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/business-expenses/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owner can delete business expenses' });
      }
      
      const [expense] = await db
        .select()
        .from(businessExpenses)
        .where(and(
          eq(businessExpenses.id, req.params.id),
          eq(businessExpenses.organizationId, req.organization!.id)
        ));
      
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      
      await db.delete(businessExpenses).where(eq(businessExpenses.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Financial reports endpoint (Owner/Manager)
  app.get('/api/reports/financial', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      const { from, to } = req.query;
      const fromDate = from ? Number(from) : Date.now() - 30 * 24 * 60 * 60 * 1000;
      const toDate = to ? Number(to) : Date.now();
      
      const orgOrders = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.organizationId, req.organization!.id),
          gte(orders.createdAt, fromDate),
          lte(orders.createdAt, toDate)
        ));
      
      const orgOrderExpenses = await db
        .select({
          id: orderExpenses.id,
          orderId: orderExpenses.orderId,
          amount: orderExpenses.amount,
          comment: orderExpenses.comment,
          createdByUserId: orderExpenses.createdByUserId,
          createdAt: orderExpenses.createdAt,
        })
        .from(orderExpenses)
        .innerJoin(orders, eq(orderExpenses.orderId, orders.id))
        .where(and(
          eq(orders.organizationId, req.organization!.id),
          gte(orderExpenses.createdAt, fromDate),
          lte(orderExpenses.createdAt, toDate)
        ));
      
      let bizExpenses: any[] = [];
      if (req.user!.role === 'OWNER') {
        bizExpenses = await db
          .select()
          .from(businessExpenses)
          .where(and(
            eq(businessExpenses.organizationId, req.organization!.id),
            gte(businessExpenses.date, fromDate),
            lte(businessExpenses.date, toDate)
          ));
      }
      
      const totalIncome = orgOrders
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + o.amount, 0);
      
      const totalOrderExpenses = orgOrderExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalBizExpenses = bizExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      const incomeByPaymentStatus: Record<string, number> = {};
      orgOrders.forEach(o => {
        const ps = o.paymentStatus || 'NOT_PAID';
        incomeByPaymentStatus[ps] = (incomeByPaymentStatus[ps] || 0) + o.amount;
      });
      
      const incomeByPaymentMethod: Record<string, number> = {};
      orgOrders.filter(o => o.paymentMethod).forEach(o => {
        incomeByPaymentMethod[o.paymentMethod!] = (incomeByPaymentMethod[o.paymentMethod!] || 0) + o.amount;
      });
      
      const bizExpensesByCategory: Record<string, number> = {};
      bizExpenses.forEach(e => {
        bizExpensesByCategory[e.category] = (bizExpensesByCategory[e.category] || 0) + e.amount;
      });
      
      const incomeBySource: Record<string, { count: number; amount: number }> = {};
      orgOrders.forEach(o => {
        const src = o.clientSource || 'PHONE';
        if (!incomeBySource[src]) incomeBySource[src] = { count: 0, amount: 0 };
        incomeBySource[src].count++;
        incomeBySource[src].amount += o.amount;
      });

      const ordersByStatus: Record<string, number> = {};
      orgOrders.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      });
      
      res.json({
        totalIncome,
        totalOrderExpenses,
        totalBizExpenses,
        totalExpenses: totalOrderExpenses + totalBizExpenses,
        netProfit: totalIncome - totalOrderExpenses - totalBizExpenses,
        ordersCount: orgOrders.length,
        deliveredCount: orgOrders.filter(o => o.status === 'DELIVERED').length,
        canceledCount: orgOrders.filter(o => o.status === 'CANCELED').length,
        incomeByPaymentStatus,
        incomeByPaymentMethod,
        bizExpensesByCategory,
        incomeBySource,
        ordersByStatus,
        orderExpensesList: orgOrderExpenses,
        bizExpensesList: bizExpenses,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { from, to, status, paymentStatus, source, paymentMethod } = req.query;
      const fromDate = from ? Number(from) : Date.now() - 30 * 24 * 60 * 60 * 1000;
      const toDate = to ? Number(to) : Date.now();

      let orgOrders = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.organizationId, req.organization!.id),
          gte(orders.createdAt, fromDate),
          lte(orders.createdAt, toDate)
        ))
        .orderBy(desc(orders.createdAt));

      if (status) {
        orgOrders = orgOrders.filter(o => o.status === status);
      }
      if (paymentStatus) {
        orgOrders = orgOrders.filter(o => (o.paymentStatus || 'NOT_PAID') === paymentStatus);
      }
      if (source) {
        orgOrders = orgOrders.filter(o => (o.clientSource || 'PHONE') === source);
      }
      if (paymentMethod) {
        orgOrders = orgOrders.filter(o => o.paymentMethod === paymentMethod);
      }

      res.json(orgOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Order self-assignment for florists and couriers
  app.post('/api/orders/:id/assign-self', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const role = req.user!.role;
      if (role !== 'FLORIST' && role !== 'COURIER') {
        return res.status(403).json({ error: 'Only florists and couriers can self-assign' });
      }
      
      const [order] = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, req.params.id),
          eq(orders.organizationId, req.organization!.id)
        ));
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const updateData: any = { updatedAt: Date.now() };
      
      if (role === 'FLORIST') {
        if (order.floristId) {
          return res.status(400).json({ error: 'Order already has a florist assigned' });
        }
        if (order.status !== 'NEW') {
          return res.status(400).json({ error: 'Can only assign to NEW orders' });
        }
        updateData.floristId = req.user!.id;
        updateData.status = 'IN_WORK';
        
        await db.insert(orderHistory).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'IN_WORK',
          changedByUserId: req.user!.id,
          changedAt: Date.now(),
          note: `Флорист ${req.user!.name} взял заказ в работу`,
        });
      } else {
        if (order.courierId) {
          return res.status(400).json({ error: 'Order already has a courier assigned' });
        }
        if (order.status !== 'ASSEMBLED') {
          return res.status(400).json({ error: 'Can only assign to ASSEMBLED orders' });
        }
        updateData.courierId = req.user!.id;
        updateData.status = 'ON_DELIVERY';
        
        await db.insert(orderHistory).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'ON_DELIVERY',
          changedByUserId: req.user!.id,
          changedAt: Date.now(),
          note: `Курьер ${req.user!.name} взял заказ на доставку`,
        });
      }
      
      const [updated] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Batch assign orders for courier
  app.post('/api/orders/batch-assign', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'COURIER') {
        return res.status(403).json({ error: 'Only couriers can batch assign' });
      }
      
      const { orderIds } = req.body;
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Order IDs required' });
      }
      
      const results = [];
      const now = Date.now();
      
      for (const orderId of orderIds) {
        const [order] = await db
          .select()
          .from(orders)
          .where(and(
            eq(orders.id, orderId),
            eq(orders.organizationId, req.organization!.id),
            eq(orders.status, 'ASSEMBLED'),
            isNull(orders.courierId)
          ));
        
        if (order) {
          const [updated] = await db
            .update(orders)
            .set({
              courierId: req.user!.id,
              status: 'ON_DELIVERY' as any,
              updatedAt: now,
            })
            .where(eq(orders.id, orderId))
            .returning();
          
          await db.insert(orderHistory).values({
            orderId: order.id,
            fromStatus: order.status,
            toStatus: 'ON_DELIVERY',
            changedByUserId: req.user!.id,
            changedAt: now,
            note: `Курьер ${req.user!.name} взял заказ на доставку (пакетное назначение)`,
          });
          
          results.push(updated);
        }
      }
      
      res.json({ assigned: results.length, orders: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all order expenses for organization (owner view)
  app.get('/api/all-order-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owner can view all expenses' });
      }
      
      const expenses = await db
        .select({
          id: orderExpenses.id,
          orderId: orderExpenses.orderId,
          amount: orderExpenses.amount,
          comment: orderExpenses.comment,
          createdByUserId: orderExpenses.createdByUserId,
          createdAt: orderExpenses.createdAt,
          orderClientName: orders.clientName,
          orderAmount: orders.amount,
        })
        .from(orderExpenses)
        .innerJoin(orders, eq(orderExpenses.orderId, orders.id))
        .where(eq(orders.organizationId, req.organization!.id))
        .orderBy(desc(orderExpenses.createdAt));
      
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.organizationId, req.organization!.id));
    
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const stats = {
      total: allOrders.length,
      byStatus: {} as Record<string, number>,
      overdue: 0,
      weeklyDelivered: 0,
      weeklyRevenue: 0,
    };
    
    allOrders.forEach(order => {
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;
      
      if (order.status !== 'DELIVERED' && order.status !== 'CANCELED' && order.deliveryDateTime < now) {
        stats.overdue++;
      }
      
      if (order.status === 'DELIVERED' && order.updatedAt >= weekAgo) {
        stats.weeklyDelivered++;
        stats.weeklyRevenue += order.amount;
      }
    });
    
    res.json(stats);
  });
  
  app.get('/api/stats/employee/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestingUser = req.user!;
    const userId = req.params.userId;
    
    if (requestingUser.role !== 'OWNER' && requestingUser.role !== 'MANAGER' && requestingUser.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const targetUser = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
    if (!targetUser || targetUser.organizationId !== req.organization!.id) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.organizationId, req.organization!.id));
    
    const userHistory = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.changedByUserId, userId));
    
    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const ordersCreated = allOrders.filter(o => o.managerId === userId).length;
    const ordersAssembled = userHistory.filter(h => h.toStatus === 'ASSEMBLED').length;
    const ordersDelivered = userHistory.filter(h => h.toStatus === 'DELIVERED').length;
    const statusChanges = userHistory.length;
    
    const assignedAsFlorist = allOrders.filter(o => o.floristId === userId).length;
    const assignedAsCourier = allOrders.filter(o => o.courierId === userId).length;
    
    const activeAsFlorist = allOrders.filter(o => o.floristId === userId && (o.status === 'NEW' || o.status === 'IN_WORK')).length;
    const activeAsCourier = allOrders.filter(o => o.courierId === userId && (o.status === 'ASSEMBLED' || o.status === 'ON_DELIVERY')).length;
    
    const ordersCreatedToday = allOrders.filter(o => o.managerId === userId && o.createdAt >= todayStart.getTime()).length;
    const ordersAssembledToday = userHistory.filter(h => h.toStatus === 'ASSEMBLED' && h.changedAt >= todayStart.getTime()).length;
    const ordersDeliveredToday = userHistory.filter(h => h.toStatus === 'DELIVERED' && h.changedAt >= todayStart.getTime()).length;
    
    const ordersCreatedWeek = allOrders.filter(o => o.managerId === userId && o.createdAt >= weekAgo).length;
    const ordersAssembledWeek = userHistory.filter(h => h.toStatus === 'ASSEMBLED' && h.changedAt >= weekAgo).length;
    const ordersDeliveredWeek = userHistory.filter(h => h.toStatus === 'DELIVERED' && h.changedAt >= weekAgo).length;
    
    const ordersCreatedMonth = allOrders.filter(o => o.managerId === userId && o.createdAt >= monthAgo).length;
    const ordersAssembledMonth = userHistory.filter(h => h.toStatus === 'ASSEMBLED' && h.changedAt >= monthAgo).length;
    const ordersDeliveredMonth = userHistory.filter(h => h.toStatus === 'DELIVERED' && h.changedAt >= monthAgo).length;
    
    const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED');
    const totalRevenueAsManager = deliveredOrders.filter(o => o.managerId === userId).reduce((s, o) => s + o.amount, 0);
    
    const canceledByUser = userHistory.filter(h => h.toStatus === 'CANCELED').length;
    
    res.json({
      ordersCreated,
      ordersAssembled,
      ordersDelivered,
      statusChanges,
      assignedAsFlorist,
      assignedAsCourier,
      activeAsFlorist,
      activeAsCourier,
      today: {
        ordersCreated: ordersCreatedToday,
        ordersAssembled: ordersAssembledToday,
        ordersDelivered: ordersDeliveredToday,
      },
      week: {
        ordersCreated: ordersCreatedWeek,
        ordersAssembled: ordersAssembledWeek,
        ordersDelivered: ordersDeliveredWeek,
      },
      month: {
        ordersCreated: ordersCreatedMonth,
        ordersAssembled: ordersAssembledMonth,
        ordersDelivered: ordersDeliveredMonth,
      },
      totalRevenueAsManager,
      canceledByUser,
      role: targetUser.role,
    });
  });

  app.get('/api/stats/employee/:userId/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestingUser = req.user!;
    const userId = req.params.userId;
    const type = req.query.type as string;
    
    if (requestingUser.role !== 'OWNER' && requestingUser.role !== 'MANAGER' && requestingUser.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const validTypes = ['created', 'assembled', 'delivered', 'canceled', 'assigned_florist', 'assigned_courier', 'active_florist', 'active_courier'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type parameter. Must be one of: ' + validTypes.join(', ') });
    }
    
    const targetUser = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
    if (!targetUser || targetUser.organizationId !== req.organization!.id) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.organizationId, req.organization!.id));
    
    let result: any[] = [];
    
    if (type === 'created') {
      result = allOrders
        .filter(o => o.managerId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(o => ({
          ...o,
          actionTimestamp: o.createdAt,
        }));
    } else if (type === 'assigned_florist') {
      result = allOrders
        .filter(o => o.floristId === userId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(o => ({ ...o, actionTimestamp: o.updatedAt }));
    } else if (type === 'assigned_courier') {
      result = allOrders
        .filter(o => o.courierId === userId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(o => ({ ...o, actionTimestamp: o.updatedAt }));
    } else if (type === 'active_florist') {
      result = allOrders
        .filter(o => o.floristId === userId && (o.status === 'NEW' || o.status === 'IN_WORK'))
        .sort((a, b) => a.deliveryDateTime - b.deliveryDateTime)
        .map(o => ({ ...o, actionTimestamp: o.updatedAt }));
    } else if (type === 'active_courier') {
      result = allOrders
        .filter(o => o.courierId === userId && (o.status === 'ASSEMBLED' || o.status === 'ON_DELIVERY'))
        .sort((a, b) => a.deliveryDateTime - b.deliveryDateTime)
        .map(o => ({ ...o, actionTimestamp: o.updatedAt }));
    } else {
      const userHistory = await db
        .select()
        .from(orderHistory)
        .where(and(
          eq(orderHistory.changedByUserId, userId),
          eq(orderHistory.toStatus, type.toUpperCase() as any)
        ));
      
      const orderIds = userHistory.map(h => h.orderId);
      const relevantOrders = allOrders.filter(o => orderIds.includes(o.id));
      
      result = userHistory
        .map(history => {
          const order = relevantOrders.find(o => o.id === history.orderId);
          return order ? {
            ...order,
            actionTimestamp: history.changedAt,
          } : null;
        })
        .filter(o => o !== null)
        .sort((a, b) => b.actionTimestamp - a.actionTimestamp);
    }
    
    res.json(result);
  });

  // ===== Developer Panel API =====
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  const DEV_ACCESS_KEY = process.env.DEV_ACCESS_KEY || '';
  
  app.use('/api/dev', (req: Request, res: Response, next: NextFunction) => {
    if (isProduction) {
      const key = req.headers['x-dev-key'] || req.query.dev_key;
      if (!DEV_ACCESS_KEY || key !== DEV_ACCESS_KEY) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    next();
  });
  
  // Verify dev credentials (for dev panel access)
  app.post('/api/dev/verify', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword } = req.body;
      
      if (!devLogin || !devPassword) {
        return res.status(400).json({ error: 'Логин и пароль разработчика обязательны' });
      }
      
      const settings = await db.select().from(devSettings).where(eq(devSettings.id, 'default'));
      const currentDevLogin = settings[0]?.devLogin || 'developer';
      const currentDevPassword = settings[0]?.devPassword || '20242024';
      
      if (devLogin !== currentDevLogin || devPassword !== currentDevPassword) {
        return res.status(403).json({ error: 'Неверный логин или пароль разработчика' });
      }
      
      res.json({ success: true, login: currentDevLogin });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Change dev credentials (login and/or password)
  app.post('/api/dev/change-credentials', async (req: Request, res: Response) => {
    try {
      const { currentLogin, currentPassword, newLogin, newPassword } = req.body;
      
      if (!currentLogin || !currentPassword) {
        return res.status(400).json({ error: 'Текущий логин и пароль обязательны' });
      }
      
      const settings = await db.select().from(devSettings).where(eq(devSettings.id, 'default'));
      const currentDevLogin = settings[0]?.devLogin || 'developer';
      const currentDevPassword = settings[0]?.devPassword || '20242024';
      
      if (currentLogin !== currentDevLogin || currentPassword !== currentDevPassword) {
        return res.status(403).json({ error: 'Неверные текущие учетные данные' });
      }
      
      const updates: any = { updatedAt: Date.now() };
      if (newLogin) updates.devLogin = newLogin;
      if (newPassword) updates.devPassword = newPassword;
      
      await db.update(devSettings)
        .set(updates)
        .where(eq(devSettings.id, 'default'));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Helper function to verify dev credentials
  async function verifyDevCredentials(devLogin: string, devPassword: string): Promise<boolean> {
    const settings = await db.select().from(devSettings).where(eq(devSettings.id, 'default'));
    const currentDevLogin = settings[0]?.devLogin || 'developer';
    const currentDevPassword = settings[0]?.devPassword || '20242024';
    return devLogin === currentDevLogin && devPassword === currentDevPassword;
  }

  // Get all organizations (dev panel)
  app.post('/api/dev/organizations', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      const allOrganizations = await db.select().from(organizations);
      res.json(allOrganizations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all users across all organizations (dev panel) - now includes test password info
  app.post('/api/dev/users', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, organizationId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      let allUsers;
      if (organizationId) {
        allUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
      } else {
        allUsers = await db.select().from(users);
      }
      
      // Return users with email visible and standardized password note
      res.json(allUsers.map(u => ({ 
        ...u, 
        password: undefined,
        testPassword: u.plainPassword || 'Неизвестен',
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all orders across all organizations (dev panel)
  app.post('/api/dev/orders', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, organizationId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      let allOrders;
      if (organizationId) {
        allOrders = await db.select().from(orders)
          .where(eq(orders.organizationId, organizationId))
          .orderBy(desc(orders.createdAt));
      } else {
        allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      }
      
      res.json(allOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Login as user (dev panel - for quick access to accounts)
  app.post('/api/dev/login-as-user', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, userId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      if (!userId) {
        return res.status(400).json({ error: 'ID пользователя обязателен' });
      }
      
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      // Create session for this user
      const token = crypto.randomUUID();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      
      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt,
      });
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get global stats (dev panel)
  app.post('/api/dev/stats', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      const allOrganizations = await db.select().from(organizations);
      const allUsers = await db.select().from(users);
      const allOrders = await db.select().from(orders);
      const allSessions = await db.select().from(sessions);
      
      const now = Date.now();
      const activeSessions = allSessions.filter(s => s.expiresAt > now);
      
      const stats = {
        totalOrganizations: allOrganizations.length,
        totalUsers: allUsers.length,
        totalOrders: allOrders.length,
        activeSessions: activeSessions.length,
        ordersByStatus: {} as Record<string, number>,
        totalRevenue: 0,
      };
      
      allOrders.forEach(order => {
        stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
        if (order.status === 'DELIVERED') {
          stats.totalRevenue += order.amount;
        }
      });
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete organization (dev panel)
  app.post('/api/dev/organizations/delete', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, organizationId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      // Delete courier location data
      await db.delete(courierLocationLatest).where(eq(courierLocationLatest.organizationId, organizationId));
      await db.delete(courierLocations).where(eq(courierLocations.organizationId, organizationId));
      
      // Delete business expenses
      await db.delete(businessExpenses).where(eq(businessExpenses.organizationId, organizationId));
      
      // Delete order-related data
      const orgOrders = await db.select().from(orders).where(eq(orders.organizationId, organizationId));
      for (const order of orgOrders) {
        await db.delete(attachments).where(eq(attachments.orderId, order.id));
        await db.delete(orderHistory).where(eq(orderHistory.orderId, order.id));
        await db.delete(orderExpenses).where(eq(orderExpenses.orderId, order.id));
      }
      await db.delete(orders).where(eq(orders.organizationId, organizationId));
      
      // Delete user sessions and users
      const orgUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
      for (const user of orgUsers) {
        await db.delete(sessions).where(eq(sessions.userId, user.id));
      }
      await db.delete(users).where(eq(users.organizationId, organizationId));
      
      // Delete organization
      await db.delete(organizations).where(eq(organizations.id, organizationId));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete user (dev panel)
  app.post('/api/dev/users/delete', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, userId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      // Delete sessions
      await db.delete(sessions).where(eq(sessions.userId, userId));
      
      // Delete user
      await db.delete(users).where(eq(users.id, userId));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete order (dev panel)
  app.post('/api/dev/orders/delete', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, orderId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      // Delete related data
      await db.delete(attachments).where(eq(attachments.orderId, orderId));
      await db.delete(orderHistory).where(eq(orderHistory.orderId, orderId));
      
      // Delete order
      await db.delete(orders).where(eq(orders.id, orderId));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List sessions (dev panel)
  app.post('/api/dev/sessions', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      const allSessions = await db.select().from(sessions);
      const allUsers = await db.select().from(users);
      const allOrgs = await db.select().from(organizations);
      
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const orgMap = new Map(allOrgs.map(o => [o.id, o]));
      const now = Date.now();
      
      const result = allSessions.map(s => {
        const user = userMap.get(s.userId);
        const org = user ? orgMap.get(user.organizationId) : null;
        return {
          id: s.id,
          userId: s.userId,
          userName: user?.name || 'Неизвестный',
          userEmail: user?.email || '',
          userRole: user?.role || '',
          organizationName: org?.name || '',
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isActive: s.expiresAt > now,
        };
      }).sort((a, b) => b.createdAt - a.createdAt);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete session (dev panel)
  app.post('/api/dev/sessions/delete', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, sessionId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete all sessions for a user (dev panel)
  app.post('/api/dev/sessions/delete-user', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, userId } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      await db.delete(sessions).where(eq(sessions.userId, userId));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete expired sessions (dev panel)
  app.post('/api/dev/sessions/cleanup', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }
      
      const now = Date.now();
      const result = await db.delete(sessions).where(lte(sessions.expiresAt, now));
      
      res.json({ success: true, message: 'Просроченные сессии удалены' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate test data (dev panel)
  app.post('/api/dev/generate-test-data', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }

      const orgNames = [
        'Цветочный рай',
        'Букет Счастья',
        'Розовый сад',
        'Флора и Фауна',
        'Цветы от Марии'
      ];

      const clientNames = [
        'Анна Петрова', 'Иван Сидоров', 'Мария Козлова', 'Дмитрий Новиков',
        'Елена Волкова', 'Алексей Морозов', 'Наталья Соколова', 'Сергей Попов',
        'Ольга Лебедева', 'Андрей Федоров', 'Татьяна Михайлова', 'Павел Орлов'
      ];

      const flowerDescriptions = [
        'Букет из 25 красных роз', 'Композиция "Весенняя свежесть"', 'Корзина с лилиями',
        'Свадебный букет невесты', 'Букет из пионов', 'Коробка с орхидеями',
        'Букет "Радуга"', 'Композиция из тюльпанов', 'Букет из хризантем',
        'Траурный венок', 'Букет "Романтика"', 'Корзина фруктов с цветами'
      ];

      const moscowAddresses = [
        { addr: 'ул. Тверская, 15, Москва', lat: 55.7648, lon: 37.6055 },
        { addr: 'пр. Мира, 42, Москва', lat: 55.7812, lon: 37.6332 },
        { addr: 'ул. Арбат, 8, Москва', lat: 55.7513, lon: 37.5916 },
        { addr: 'Кутузовский пр., 23, Москва', lat: 55.7402, lon: 37.5534 },
        { addr: 'ул. Большая Ордынка, 100, Москва', lat: 55.7350, lon: 37.6270 },
        { addr: 'Ленинградский пр., 5, Москва', lat: 55.7867, lon: 37.5697 },
        { addr: 'ул. Бауманская, 67, Москва', lat: 55.7722, lon: 37.6788 },
        { addr: 'Садовое кольцо, 12, Москва', lat: 55.7590, lon: 37.6420 },
        { addr: 'ул. Покровка, 33, Москва', lat: 55.7595, lon: 37.6495 },
        { addr: 'Новый Арбат, 21, Москва', lat: 55.7520, lon: 37.5870 },
        { addr: 'ул. Маросейка, 7, Москва', lat: 55.7570, lon: 37.6370 },
        { addr: 'Пречистенка, 40, Москва', lat: 55.7390, lon: 37.5950 },
        { addr: 'ул. Никольская, 10, Москва', lat: 55.7570, lon: 37.6230 },
        { addr: 'Комсомольский пр., 28, Москва', lat: 55.7280, lon: 37.5890 },
        { addr: 'ул. Сретенка, 15, Москва', lat: 55.7680, lon: 37.6330 },
        { addr: 'Цветной бул., 19, Москва', lat: 55.7710, lon: 37.6200 },
      ];

      const paymentStatuses = ['NOT_PAID', 'ADVANCE', 'PAID'] as const;
      const clientSources = ['PHONE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE'] as const;

      const createdOrgs = [];
      const createdUsers = [];
      const createdOrders = [];

      const suffix = Date.now().toString(36);

      for (let i = 0; i < 5; i++) {
        const orgId = crypto.randomUUID();
        const orgName = orgNames[i];
        
        await db.insert(organizations).values({
          id: orgId,
          name: orgName,
          createdAt: Math.floor(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        });
        createdOrgs.push({ id: orgId, name: orgName });

        const hashedPassword = await hashPassword('Test1234');

        const ownerId = crypto.randomUUID();
        await db.insert(users).values({
          id: ownerId, organizationId: orgId,
          email: `owner${i + 1}_${suffix}@test.ru`,
          password: hashedPassword, plainPassword: 'Test1234',
          name: `Владелец ${i + 1}`, role: 'OWNER', isActive: true, createdAt: Date.now(),
        });
        createdUsers.push({ id: ownerId, role: 'OWNER', orgId });

        const managerId = crypto.randomUUID();
        const manager2Id = crypto.randomUUID();
        await db.insert(users).values({
          id: managerId, organizationId: orgId,
          email: `manager${i + 1}_${suffix}@test.ru`,
          password: hashedPassword, plainPassword: 'Test1234',
          name: `Менеджер ${i * 2 + 1}`, role: 'MANAGER', isActive: true, createdAt: Date.now(),
        });
        await db.insert(users).values({
          id: manager2Id, organizationId: orgId,
          email: `manager${i + 1}b_${suffix}@test.ru`,
          password: hashedPassword, plainPassword: 'Test1234',
          name: `Менеджер ${i * 2 + 2}`, role: 'MANAGER', isActive: true, createdAt: Date.now(),
        });
        createdUsers.push({ id: managerId, role: 'MANAGER', orgId });
        createdUsers.push({ id: manager2Id, role: 'MANAGER', orgId });

        const floristIds: string[] = [];
        for (let f = 0; f < 3; f++) {
          const fId = crypto.randomUUID();
          await db.insert(users).values({
            id: fId, organizationId: orgId,
            email: `florist${i + 1}_${f + 1}_${suffix}@test.ru`,
            password: hashedPassword, plainPassword: 'Test1234',
            name: `Флорист ${i * 3 + f + 1}`, role: 'FLORIST', isActive: true, createdAt: Date.now(),
          });
          floristIds.push(fId);
          createdUsers.push({ id: fId, role: 'FLORIST', orgId });
        }

        const courierIds: string[] = [];
        const courierNames = [`Курьер ${i * 2 + 1}`, `Курьер ${i * 2 + 2}`];
        for (let c = 0; c < 2; c++) {
          const cId = crypto.randomUUID();
          await db.insert(users).values({
            id: cId, organizationId: orgId,
            email: `courier${i + 1}_${c + 1}_${suffix}@test.ru`,
            password: hashedPassword, plainPassword: 'Test1234',
            name: courierNames[c], role: 'COURIER', isActive: true,
            phone: `+7 9${(10 + i * 2 + c).toString()} 555 ${(10 + c).toString().padStart(2, '0')} ${(20 + i).toString().padStart(2, '0')}`,
            createdAt: Date.now(),
          });
          courierIds.push(cId);
          createdUsers.push({ id: cId, role: 'COURIER', orgId });
        }

        const statusDistribution: Array<'NEW' | 'IN_WORK' | 'ASSEMBLED' | 'ON_DELIVERY' | 'DELIVERED' | 'CANCELED'> = [
          'NEW', 'NEW', 'NEW', 'NEW',
          'IN_WORK', 'IN_WORK', 'IN_WORK',
          'ASSEMBLED', 'ASSEMBLED', 'ASSEMBLED',
          'ON_DELIVERY', 'ON_DELIVERY', 'ON_DELIVERY',
          'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED',
          'CANCELED', 'CANCELED',
        ];

        for (let j = 0; j < 20; j++) {
          const status = statusDistribution[j % statusDistribution.length];
          const addrData = moscowAddresses[j % moscowAddresses.length];
          const orderCreatedAt = Math.floor(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
          const isFutureDelivery = ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY'].includes(status);
          const deliveryDateTime = isFutureDelivery
            ? Math.floor(Date.now() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000)
            : Math.floor(orderCreatedAt + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000);

          const selectedFlorist = floristIds[j % floristIds.length];
          const selectedCourier = courierIds[j % courierIds.length];
          const selectedManager = j % 3 === 0 ? manager2Id : managerId;

          const paymentStatus = status === 'DELIVERED' ? 'PAID' : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

          const [newOrder] = await db.insert(orders).values({
            organizationId: orgId,
            orderNumber: j + 1,
            clientName: clientNames[Math.floor(Math.random() * clientNames.length)],
            clientPhone: `+7 9${Math.floor(Math.random() * 100).toString().padStart(2, '0')} ${Math.floor(Math.random() * 1000).toString().padStart(3, '0')} ${Math.floor(Math.random() * 100).toString().padStart(2, '0')} ${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
            address: addrData.addr,
            latitude: addrData.lat.toString(),
            longitude: addrData.lon.toString(),
            geoStatus: 'SUCCESS',
            deliveryDateTime,
            comment: flowerDescriptions[Math.floor(Math.random() * flowerDescriptions.length)],
            amount: Math.floor(2000 + Math.random() * 8000),
            status,
            paymentStatus,
            clientSource: clientSources[Math.floor(Math.random() * clientSources.length)],
            floristId: ['IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED'].includes(status) ? selectedFlorist : null,
            courierId: ['ON_DELIVERY', 'DELIVERED'].includes(status) ? selectedCourier : null,
            managerId: selectedManager,
            createdAt: orderCreatedAt,
            updatedAt: Math.floor(Date.now()),
          }).returning();
          createdOrders.push({ id: newOrder.id, status, orgId });

          await db.insert(orderHistory).values({
            orderId: newOrder.id,
            changedByUserId: selectedManager,
            fromStatus: null,
            toStatus: 'NEW',
            changedAt: orderCreatedAt,
          });

          if (['IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED'].includes(status)) {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedFlorist,
              fromStatus: 'NEW',
              toStatus: 'IN_WORK',
              changedAt: orderCreatedAt + 3600000,
            });
          }
          if (['ASSEMBLED', 'ON_DELIVERY', 'DELIVERED'].includes(status)) {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedFlorist,
              fromStatus: 'IN_WORK',
              toStatus: 'ASSEMBLED',
              changedAt: orderCreatedAt + 7200000,
            });
          }
          if (['ON_DELIVERY', 'DELIVERED'].includes(status)) {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedCourier,
              fromStatus: 'ASSEMBLED',
              toStatus: 'ON_DELIVERY',
              changedAt: orderCreatedAt + 10800000,
            });
          }
          if (status === 'DELIVERED') {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedCourier,
              fromStatus: 'ON_DELIVERY',
              toStatus: 'DELIVERED',
              changedAt: orderCreatedAt + 14400000,
            });
          }
          if (status === 'CANCELED') {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedManager,
              fromStatus: 'NEW',
              toStatus: 'CANCELED',
              changedAt: orderCreatedAt + 3600000,
            });
          }
        }

        const courierLocations_data = [
          { lat: 55.7558, lon: 37.6173 },
          { lat: 55.7690, lon: 37.5950 },
        ];
        for (let c = 0; c < courierIds.length; c++) {
          await db.insert(courierLocationLatest).values({
            organizationId: orgId,
            courierUserId: courierIds[c],
            lat: courierLocations_data[c].lat.toString(),
            lon: courierLocations_data[c].lon.toString(),
            accuracy: '15',
            recordedAt: Date.now(),
          });
          await db.insert(courierLocations).values({
            organizationId: orgId,
            courierUserId: courierIds[c],
            lat: courierLocations_data[c].lat.toString(),
            lon: courierLocations_data[c].lon.toString(),
            accuracy: '15',
            recordedAt: Date.now(),
          });
        }
      }

      res.json({
        success: true,
        created: {
          organizations: createdOrgs.length,
          users: createdUsers.length,
          orders: createdOrders.length,
        },
        credentials: {
          password: 'Test1234',
          note: 'Все тестовые аккаунты используют этот пароль'
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clear all test data (dev panel)
  app.post('/api/dev/clear-all-data', async (req: Request, res: Response) => {
    try {
      const { devLogin, devPassword, confirmClear } = req.body;
      
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: 'Неверные учетные данные разработчика' });
      }

      if (confirmClear !== 'DELETE_ALL') {
        return res.status(400).json({ error: 'Подтвердите удаление' });
      }

      // Delete all data in correct order (respecting foreign keys)
      await db.delete(courierLocationLatest);
      await db.delete(courierLocations);
      await db.delete(attachments);
      await db.delete(orderHistory);
      await db.delete(orderExpenses);
      await db.delete(businessExpenses);
      await db.delete(orders);
      await db.delete(sessions);
      await db.delete(users);
      await db.delete(organizations);

      res.json({ success: true, message: 'Все данные удалены' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== COURIER TRACKING ENDPOINTS ==========

  // POST /api/courier/location - courier sends their location (every 60s when ON_DELIVERY)
  app.post('/api/courier/location', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'COURIER') {
        return res.status(403).json({ error: 'Только курьеры могут отправлять геопозицию' });
      }

      const { lat, lon, accuracy, activeOrderId } = req.body;

      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({ error: 'lat и lon обязательны' });
      }

      const orgId = req.user!.organizationId;
      const courierId = req.user!.id;
      const now = Date.now();

      await db.insert(courierLocationLatest).values({
        organizationId: orgId,
        courierUserId: courierId,
        lat,
        lon,
        accuracy: accuracy ?? null,
        recordedAt: now,
        updatedAt: now,
        activeOrderId: activeOrderId ?? null,
      }).onConflictDoUpdate({
        target: [courierLocationLatest.organizationId, courierLocationLatest.courierUserId],
        set: {
          lat,
          lon,
          accuracy: accuracy ?? null,
          recordedAt: now,
          updatedAt: now,
          activeOrderId: activeOrderId ?? null,
        },
      });

      await db.insert(courierLocations).values({
        organizationId: orgId,
        courierUserId: courierId,
        lat,
        lon,
        accuracy: accuracy ?? null,
        recordedAt: now,
        createdAt: now,
        activeOrderId: activeOrderId ?? null,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/courier/location/latest - get my own latest location (for courier)
  app.get('/api/courier/location/latest', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'COURIER') {
        return res.status(403).json({ error: 'Доступно только курьерам' });
      }

      const result = await db.select().from(courierLocationLatest)
        .where(and(
          eq(courierLocationLatest.organizationId, req.user!.organizationId),
          eq(courierLocationLatest.courierUserId, req.user!.id),
        ))
        .limit(1);

      res.json(result[0] ?? null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/manager/couriers/locations - get latest locations of all couriers (owner/manager)
  app.get('/api/manager/couriers/locations', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const orgId = req.user!.organizationId;

      const locations = await db.select({
        id: courierLocationLatest.id,
        courierUserId: courierLocationLatest.courierUserId,
        lat: courierLocationLatest.lat,
        lon: courierLocationLatest.lon,
        accuracy: courierLocationLatest.accuracy,
        recordedAt: courierLocationLatest.recordedAt,
        activeOrderId: courierLocationLatest.activeOrderId,
        courierName: users.name,
        courierPhone: users.phone,
      }).from(courierLocationLatest)
        .innerJoin(users, eq(courierLocationLatest.courierUserId, users.id))
        .where(eq(courierLocationLatest.organizationId, orgId));

      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/manager/couriers/:courierId/history - get location history for a courier
  app.get('/api/manager/couriers/:courierId/history', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const orgId = req.user!.organizationId;
      const { courierId } = req.params;
      const since = Number(req.query.since) || (Date.now() - 24 * 60 * 60 * 1000);

      const history = await db.select().from(courierLocations)
        .where(and(
          eq(courierLocations.organizationId, orgId),
          eq(courierLocations.courierUserId, courierId),
          gte(courierLocations.recordedAt, since),
        ))
        .orderBy(courierLocations.recordedAt);

      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ROUTE OPTIMIZATION ENDPOINT ==========

  const routeCache = new Map<string, { data: any; expiresAt: number }>();

  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function nearestNeighborRoute(points: { id: string; lat: number; lon: number }[], startLat: number, startLon: number) {
    const n = points.length;
    if (n === 0) return { order: [] as string[], totalDistance: 0 };

    const visited = new Set<number>();
    const routeOrder: string[] = [];
    let totalDistance = 0;
    let curLat = startLat;
    let curLon = startLon;

    for (let step = 0; step < n; step++) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;
        const d = haversineDistance(curLat, curLon, points[i].lat, points[i].lon);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      visited.add(bestIdx);
      routeOrder.push(points[bestIdx].id);
      totalDistance += bestDist;
      curLat = points[bestIdx].lat;
      curLon = points[bestIdx].lon;
    }

    return { order: routeOrder, totalDistance };
  }

  function twoOptImprove(points: { id: string; lat: number; lon: number }[], order: string[], maxIterations = 100) {
    const idxMap = new Map(points.map((p, i) => [p.id, i]));
    const route = order.map(id => idxMap.get(id)!);
    let improved = true;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const a = points[route[i]], b = points[route[i + 1]];
          const c = points[route[j]], d = points[route[(j + 1) % route.length]];
          const currentDist = haversineDistance(a.lat, a.lon, b.lat, b.lon) +
            haversineDistance(c.lat, c.lon, d?.lat ?? a.lat, d?.lon ?? a.lon);
          const newDist = haversineDistance(a.lat, a.lon, c.lat, c.lon) +
            haversineDistance(b.lat, b.lon, d?.lat ?? a.lat, d?.lon ?? a.lon);
          if (newDist < currentDist - 0.001) {
            route.splice(i + 1, j - i, ...route.slice(i + 1, j + 1).reverse());
            improved = true;
          }
        }
      }
    }

    return route.map(i => points[i].id);
  }

  // GET /api/manager/couriers/:courierId/route - optimized delivery route for a courier
  app.get('/api/manager/couriers/:courierId/route', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const orgId = req.user!.organizationId;
      const { courierId } = req.params;

      const cacheKey = `route:${orgId}:${courierId}`;
      const cached = routeCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.data);
      }

      const courierLoc = await db.select().from(courierLocationLatest)
        .where(and(
          eq(courierLocationLatest.organizationId, orgId),
          eq(courierLocationLatest.courierUserId, courierId),
        ))
        .limit(1);

      const courierOrders = await db.select().from(orders)
        .where(and(
          eq(orders.organizationId, orgId),
          eq(orders.courierUserId, courierId),
          or(
            eq(orders.status, 'ASSEMBLED'),
            eq(orders.status, 'ON_DELIVERY'),
          ),
        ));

      const geoOrders = courierOrders
        .filter(o => o.latitude != null && o.longitude != null)
        .map(o => ({ id: o.id, lat: o.latitude!, lon: o.longitude! }));

      if (geoOrders.length === 0) {
        const data = { route: [], totalDistanceKm: 0, courierLocation: courierLoc[0] ?? null, orderCount: 0 };
        return res.json(data);
      }

      const startLat = courierLoc[0]?.lat ?? geoOrders[0].lat;
      const startLon = courierLoc[0]?.lon ?? geoOrders[0].lon;

      let { order: routeOrder, totalDistance } = nearestNeighborRoute(geoOrders, startLat, startLon);

      if (geoOrders.length <= 30) {
        routeOrder = twoOptImprove(geoOrders, routeOrder);
      }

      const orderedOrders = routeOrder.map(id => {
        const o = courierOrders.find(co => co.id === id)!;
        const geo = geoOrders.find(g => g.id === id)!;
        return { orderId: id, lat: geo.lat, lon: geo.lon, address: o.deliveryAddress, status: o.status, clientName: o.clientName };
      });

      const data = {
        route: orderedOrders,
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
        courierLocation: courierLoc[0] ?? null,
        orderCount: orderedOrders.length,
      };

      routeCache.set(cacheKey, { data, expiresAt: Date.now() + 45000 });

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== GEOCODING ENDPOINTS ==========

  // POST /api/orders/geocode-all - batch geocode all orders without coordinates
  app.post('/api/orders/geocode-all', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const orgId = req.user!.organizationId;
      const ordersToGeocode = await db.select().from(orders)
        .where(and(
          eq(orders.organizationId, orgId),
          sql`${orders.latitude} IS NULL`,
          sql`${orders.address} IS NOT NULL AND ${orders.address} != ''`,
          inArray(orders.status, ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY']),
        ));

      let processed = 0;
      let success = 0;
      let failed = 0;

      for (const order of ordersToGeocode) {
        processed++;
        try {
          const encodedAddress = encodeURIComponent(order.address);
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
            headers: { 'User-Agent': 'FloraOrders/1.0' },
          });
          const results = await response.json() as any[];

          if (results && results.length > 0) {
            await db.update(orders)
              .set({
                latitude: parseFloat(results[0].lat),
                longitude: parseFloat(results[0].lon),
                geoStatus: 'SUCCESS',
                geoUpdatedAt: new Date(),
                updatedAt: Date.now(),
              })
              .where(eq(orders.id, order.id));
            success++;
          } else {
            await db.update(orders)
              .set({ geoStatus: 'FAILED', geoUpdatedAt: new Date(), updatedAt: Date.now() })
              .where(eq(orders.id, order.id));
            failed++;
          }

          // Nominatim rate limit: 1 request per second
          if (processed < ordersToGeocode.length) {
            await new Promise(resolve => setTimeout(resolve, 1100));
          }
        } catch (e) {
          await db.update(orders)
            .set({ geoStatus: 'FAILED', geoUpdatedAt: new Date(), updatedAt: Date.now() })
            .where(eq(orders.id, order.id));
          failed++;
        }
      }

      res.json({ success: success, failed, processed, total: ordersToGeocode.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/orders/:orderId/geocode - geocode an order's delivery address
  app.post('/api/orders/:orderId/geocode', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const { orderId } = req.params;
      const order = await db.select().from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, req.user!.organizationId)))
        .limit(1);

      if (!order[0]) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }

      if (!order[0].address) {
        return res.status(400).json({ error: 'Адрес доставки не указан' });
      }

      await db.update(orders)
        .set({ geoStatus: 'PENDING', updatedAt: Date.now() })
        .where(eq(orders.id, orderId));

      try {
        const encodedAddress = encodeURIComponent(order[0].address);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
          headers: { 'User-Agent': 'FloraOrders/1.0' },
        });
        const results = await response.json() as any[];

        if (results && results.length > 0) {
          await db.update(orders)
            .set({
              latitude: parseFloat(results[0].lat),
              longitude: parseFloat(results[0].lon),
              geoStatus: 'SUCCESS',
              geoUpdatedAt: new Date(),
              updatedAt: Date.now(),
            })
            .where(eq(orders.id, orderId));

          res.json({ success: true, lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
        } else {
          await db.update(orders)
            .set({ geoStatus: 'FAILED', geoUpdatedAt: new Date(), updatedAt: Date.now() })
            .where(eq(orders.id, orderId));
          res.json({ success: false, error: 'Адрес не найден' });
        }
      } catch (geoError: any) {
        await db.update(orders)
          .set({ geoStatus: 'FAILED', geoUpdatedAt: new Date(), updatedAt: Date.now() })
          .where(eq(orders.id, orderId));
        res.status(500).json({ error: 'Ошибка геокодирования: ' + geoError.message });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/orders/:orderId/coordinates - manually set coordinates for an order
  app.post('/api/orders/:orderId/coordinates', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER' && req.user!.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Доступно только владельцу и менеджеру' });
      }

      const { orderId } = req.params;
      const { lat, lon } = req.body;

      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({ error: 'lat и lon обязательны' });
      }

      const order = await db.select().from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, req.user!.organizationId)))
        .limit(1);

      if (!order[0]) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }

      await db.update(orders)
        .set({
          latitude: lat,
          longitude: lon,
          geoStatus: 'SUCCESS',
          geoUpdatedAt: new Date(),
          updatedAt: Date.now(),
        })
        .where(eq(orders.id, orderId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/courier/location/history - cleanup old location history (owner only, 7-day retention)
  app.delete('/api/courier/location/history', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'OWNER') {
        return res.status(403).json({ error: 'Доступно только владельцу' });
      }

      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const result = await db.delete(courierLocations)
        .where(and(
          eq(courierLocations.organizationId, req.user!.organizationId),
          lte(courierLocations.recordedAt, cutoff),
        ));

      res.json({ success: true, message: 'История старше 7 дней удалена' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/map-page', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" crossorigin="anonymous" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" crossorigin="anonymous"></script>
<style>
  * { margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #e8e8e8; }
  #map { width: 100%; height: 100%; }
  .courier-marker {
    background: #4CAF7A; color: #fff; border-radius: 50%;
    width: 40px; height: 40px; display: flex; align-items: center;
    justify-content: center; font-size: 15px; font-weight: bold;
    border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;
  }
  .courier-marker.selected {
    background: #FF5722; width: 46px; height: 46px;
    border: 3px solid #FFD54F; box-shadow: 0 3px 12px rgba(255,87,34,0.5);
  }
  .order-marker {
    width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center;
    justify-content: center; font-size: 10px; color: #fff; font-weight: bold; cursor: pointer;
  }
  .popup-content { font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; min-width: 180px; }
  .popup-content .name { font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a; }
  .popup-content .detail { color: #666; font-size: 12px; }
  .popup-content .status { display: inline-block; padding: 2px 8px; border-radius: 4px; color: #fff; font-size: 11px; font-weight: 500; }
  .popup-content .address { margin-top: 4px; color: #444; font-size: 12px; }
  .popup-content .time { color: #999; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function sendMsg(data) {
    var str = JSON.stringify(data);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(str);
    } else if (window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
  }

  var map = L.map('map', { zoomControl: true }).setView([55.75, 37.62], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM', maxZoom: 19
  }).addTo(map);

  var courierMarkers = {};
  var orderMarkersLayer = L.layerGroup().addTo(map);
  var routeLayer = L.layerGroup().addTo(map);
  var firstLoad = true;

  var statusColors = {
    NEW: '#2196F3', IN_WORK: '#FF9800', ASSEMBLED: '#9C27B0',
    ON_DELIVERY: '#FF5722', DELIVERED: '#4CAF50', CANCELED: '#757575'
  };
  var statusLabels = {
    NEW: 'Новый', IN_WORK: 'В работе', ASSEMBLED: 'Собран',
    ON_DELIVERY: 'Доставка', DELIVERED: 'Доставлен', CANCELED: 'Отменен'
  };

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2);
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return diff + ' сек назад';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    return Math.floor(diff / 3600) + ' ч назад';
  }

  function statusIcon(status) {
    switch(status) {
      case 'NEW': return 'H'; case 'IN_WORK': return 'P';
      case 'ASSEMBLED': return 'C'; case 'ON_DELIVERY': return 'D';
      default: return '';
    }
  }

  function updateData(data) {
    var couriers = data.couriers || [];
    var orders = data.orders || [];
    var selectedCourier = data.selectedCourier;

    routeLayer.clearLayers();

    var seenIds = {};
    couriers.forEach(function(c) {
      seenIds[c.courierUserId] = true;
      var isSelected = selectedCourier === c.courierUserId;
      var initials = getInitials(c.courierName);
      var className = 'courier-marker' + (isSelected ? ' selected' : '');
      var size = isSelected ? 46 : 40;

      var popupHtml = '<div class="popup-content">' +
        '<div class="name">' + c.courierName + '</div>' +
        '<div class="time">' + timeAgo(c.recordedAt) + '</div>' +
        (c.courierPhone ? '<div class="detail">' + c.courierPhone + '</div>' : '') +
        '</div>';

      if (courierMarkers[c.courierUserId]) {
        courierMarkers[c.courierUserId].setLatLng([c.lat, c.lon]);
        var icon = L.divIcon({ className: '', html: '<div class="' + className + '">' + initials + '</div>', iconSize: [size, size], iconAnchor: [size/2, size/2] });
        courierMarkers[c.courierUserId].setIcon(icon);
        courierMarkers[c.courierUserId].setPopupContent(popupHtml);
      } else {
        var icon = L.divIcon({ className: '', html: '<div class="' + className + '">' + initials + '</div>', iconSize: [size, size], iconAnchor: [size/2, size/2] });
        var marker = L.marker([c.lat, c.lon], { icon: icon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(popupHtml);
        courierMarkers[c.courierUserId] = marker;
      }

      if (isSelected) {
        var courierOrders = orders.filter(function(o) { return o.courierUserId === c.courierUserId; });
        if (courierOrders.length > 0) {
          courierOrders.forEach(function(o) {
            L.polyline([[c.lat, c.lon], [o.latitude, o.longitude]], {
              color: '#FF5722', weight: 3, opacity: 0.7, dashArray: '8, 4'
            }).addTo(routeLayer);
          });
        }
      }
    });

    Object.keys(courierMarkers).forEach(function(id) {
      if (!seenIds[id]) {
        map.removeLayer(courierMarkers[id]);
        delete courierMarkers[id];
      }
    });

    orderMarkersLayer.clearLayers();
    orders.forEach(function(o) {
      var color = statusColors[o.status] || '#999';
      var letter = statusIcon(o.status);
      var icon = L.divIcon({
        className: '',
        html: '<div class="order-marker" style="background:' + color + '">' + letter + '</div>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      var marker = L.marker([o.latitude, o.longitude], { icon: icon }).addTo(orderMarkersLayer);
      var statusHtml = '<span class="status" style="background:' + color + '">' + (statusLabels[o.status] || o.status) + '</span>';
      var dateStr = '';
      if (o.deliveryDateTime) {
        try {
          var d = new Date(parseInt(o.deliveryDateTime));
          dateStr = '<div class="time">' + d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>';
        } catch(e) {}
      }
      var orderNum = o.orderNumber ? '#' + o.orderNumber + ' - ' : '';
      var openBtn = '<div style="margin-top:8px"><a href="#" onclick="sendMsg({type:\\'openOrder\\',orderId:\\'' + o.id + '\\'});return false;" style="display:inline-block;padding:6px 12px;background:#3B82F6;color:#fff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;">Открыть заказ</a></div>';
      marker.bindPopup('<div class="popup-content"><div class="name">' + orderNum + (o.clientName || 'Без имени') + '</div>' + statusHtml + '<div class="address">' + (o.deliveryAddress || '') + '</div>' + dateStr + openBtn + '</div>');

      if (selectedCourier && o.courierUserId === selectedCourier) {
        marker.openPopup();
      }
    });

    if (firstLoad) {
      firstLoad = false;
      var allPoints = [];
      couriers.forEach(function(c) { allPoints.push([c.lat, c.lon]); });
      orders.forEach(function(o) { allPoints.push([o.latitude, o.longitude]); });
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.15));
      }
    }

    if (selectedCourier) {
      var sc = couriers.find(function(c) { return c.courierUserId === selectedCourier; });
      if (sc) {
        map.setView([sc.lat, sc.lon], 14, { animate: true });
      }
    }
  }

  document.addEventListener('message', function(e) {
    try { var data = JSON.parse(e.data); if (data.type === 'updateData') updateData(data); } catch(err) {}
  });
  window.addEventListener('message', function(e) {
    try { var data = JSON.parse(e.data); if (data.type === 'updateData') updateData(data); } catch(err) {}
  });
</script>
</body>
</html>`);
  });

  const httpServer = createServer(app);
  return httpServer;
}
