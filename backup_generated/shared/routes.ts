import { z } from 'zod';
import { 
  insertOrderSchema, 
  orders, 
  insertOrderExpenseSchema, 
  orderExpenses,
  userSettings,
  authUsers,
  insertUserSettingsSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

export const api = {
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      input: z.object({
        status: z.string().optional(), // Comma separated
        role: z.enum(['FLORIST', 'COURIER']).optional(), // Filter by my role
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id' as const,
      responses: {
        200: z.custom<typeof orders.$inferSelect & { 
          attachments: any[], 
          history: any[], 
          expenses: any[],
          assistants: any[]
        }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: insertOrderSchema,
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/orders/:id' as const,
      input: insertOrderSchema.partial(),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status' as const,
      input: z.object({
        status: z.enum(['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED']),
        note: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/orders/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        403: errorSchemas.forbidden,
      },
    },
    assign: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/assign' as const,
      input: z.object({
        role: z.enum(['FLORIST', 'COURIER', 'MANAGER']),
        userId: z.string().nullable(),
      }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  expenses: {
    create: {
      method: 'POST' as const,
      path: '/api/orders/:orderId/expenses' as const,
      input: insertOrderExpenseSchema,
      responses: {
        201: z.custom<typeof orderExpenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<typeof authUsers.$inferSelect & Partial<typeof userSettings.$inferSelect>>()),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/users/me' as const,
      responses: {
        200: z.custom<typeof authUsers.$inferSelect & Partial<typeof userSettings.$inferSelect>>(),
      },
    },
    updateProfile: {
      method: 'PUT' as const,
      path: '/api/users/profile' as const,
      input: insertUserSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof userSettings.$inferSelect>(),
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type Order = z.infer<typeof api.orders.get.responses[200]>;
export type CreateOrderInput = z.infer<typeof api.orders.create.input>;
export type UpdateOrderInput = z.infer<typeof api.orders.update.input>;
