import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateOrderInput, type UpdateOrderInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useOrders(filters?: { status?: string; role?: 'FLORIST' | 'COURIER' }) {
  // Construct query string manually since we might pass it to a custom fetcher or just as key
  const queryString = filters ? `?${new URLSearchParams(filters as any).toString()}` : '';
  const queryKey = [api.orders.list.path, filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = api.orders.list.path + queryString;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return api.orders.list.responses[200].parse(await res.json());
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch order");
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create order");
      }
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({
        title: "Success",
        description: "Order created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateOrderInput) => {
      const url = buildUrl(api.orders.update.path, { id });
      const res = await fetch(url, {
        method: api.orders.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update order");
      }
      return api.orders.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, data.id] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.orders.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      return api.orders.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, data.id] });
      toast({
        title: "Status Updated",
        description: `Order is now ${data.status}`,
      });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.orders.delete.path, { id });
      const res = await fetch(url, { 
        method: api.orders.delete.method, 
        credentials: "include" 
      });

      if (!res.ok) {
        throw new Error("Failed to delete order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({
        title: "Deleted",
        description: "Order has been removed",
      });
    },
  });
}

export function useAssignStaff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, role, userId }: { id: number; role: 'FLORIST' | 'COURIER' | 'MANAGER'; userId: string | null }) => {
      const url = buildUrl(api.orders.assign.path, { id });
      const res = await fetch(url, {
        method: api.orders.assign.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, userId }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to assign staff");
      return api.orders.assign.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, data.id] });
      toast({
        title: "Assigned",
        description: "Staff assignment updated",
      });
    },
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, amount, comment }: { orderId: number; amount: number; comment: string }) => {
      const url = buildUrl(api.expenses.create.path, { orderId });
      const res = await fetch(url, {
        method: api.expenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, comment }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to add expense");
      return api.expenses.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, data.orderId] });
      toast({
        title: "Expense Added",
        description: "Expense recorded successfully",
      });
    },
  });
}
