import { useParams, Link } from "wouter";
import { useOrder, useUpdateOrderStatus, useAssignStaff, useAddExpense } from "@/hooks/use-orders";
import { useUsers, useCurrentUser } from "@/hooks/use-users";
import { Layout } from "@/components/Layout";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  Truck, 
  Flower2, 
  Clock,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { orderStatusEnum, ORDER_STATUS_LABELS } from "@shared/schema";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const orderId = parseInt(id || "0");
  
  const { data: order, isLoading } = useOrder(orderId);
  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { mutate: assignStaff } = useAssignStaff();
  const { mutate: addExpense } = useAddExpense();

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseComment, setExpenseComment] = useState("");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  if (isLoading || !order) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  const florists = users?.filter(u => u.role === 'FLORIST' || u.role === 'OWNER' || u.role === 'MANAGER');
  const couriers = users?.filter(u => u.role === 'COURIER' || u.role === 'OWNER' || u.role === 'MANAGER');

  const handleAddExpense = () => {
    if (!expenseAmount || !expenseComment) return;
    addExpense(
      { orderId, amount: parseFloat(expenseAmount), comment: expenseComment },
      { onSuccess: () => {
        setExpenseDialogOpen(false);
        setExpenseAmount("");
        setExpenseComment("");
      }}
    );
  };

  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'OWNER';

  return (
    <Layout>
      <div className="space-y-8 animate-slide-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-muted-foreground text-lg">#{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} className="text-sm px-3 py-1" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground">{order.clientName}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" /> {order.clientPhone}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {format(new Date(order.deliveryDateTime), "PPP")}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select 
              value={order.status} 
              onValueChange={(val) => updateStatus({ id: orderId, status: val })}
            >
              <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                {orderStatusEnum.enumValues.map(status => (
                  <SelectItem key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isManager && (
              <Button variant="outline" asChild>
                <Link href={`/orders/${orderId}/edit`}>Edit Order</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Delivery Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="text-lg font-medium">{order.address}</div>
                {order.comment && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm">
                    <span className="font-semibold text-yellow-800 dark:text-yellow-500 block mb-1">Note:</span>
                    {order.comment}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Financials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-bold font-mono">${order.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm text-muted-foreground">Payment Status</span>
                  <span className={`font-medium ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-orange-600'}`}>
                    {order.paymentStatus.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-sm">Expenses</h4>
                    <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8">
                          <Button className="h-6 w-6 mr-1" variant="ghost" size="icon"><PlusIcon className="h-4 w-4"/></Button> Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Expense</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input 
                              type="number" 
                              value={expenseAmount} 
                              onChange={(e) => setExpenseAmount(e.target.value)} 
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Comment</Label>
                            <Input 
                              value={expenseComment} 
                              onChange={(e) => setExpenseComment(e.target.value)} 
                              placeholder="e.g. Extra ribbons"
                            />
                          </div>
                          <Button onClick={handleAddExpense} className="w-full">Save Expense</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {order.expenses?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No expenses recorded</p>
                  ) : (
                    <ul className="space-y-2">
                      {order.expenses?.map((exp: any) => (
                        <li key={exp.id} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                          <span>{exp.comment}</span>
                          <span className="font-mono font-medium text-destructive">-${exp.amount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staff Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Flower2 className="h-4 w-4" /> Florist
                  </Label>
                  {isManager ? (
                    <Select 
                      value={order.floristId || "unassigned"} 
                      onValueChange={(val) => assignStaff({ id: orderId, role: 'FLORIST', userId: val === "unassigned" ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {florists?.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted/20 rounded text-sm font-medium">
                      {order.florist ? `${order.florist.firstName} ${order.florist.lastName}` : "Unassigned"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" /> Courier
                  </Label>
                  {isManager ? (
                    <Select 
                      value={order.courierId || "unassigned"} 
                      onValueChange={(val) => assignStaff({ id: orderId, role: 'COURIER', userId: val === "unassigned" ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {couriers?.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted/20 rounded text-sm font-medium">
                      {order.courier ? `${order.courier.firstName} ${order.courier.lastName}` : "Unassigned"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" /> History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative border-l border-border ml-2 space-y-6 pb-2">
                  {order.history?.map((event: any, idx: number) => (
                    <div key={idx} className="ml-4 relative">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{event.toStatus}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(event.changedAt), "MMM d, h:mm a")}</span>
                        {event.note && <span className="text-xs text-muted-foreground mt-1 italic">"{event.note}"</span>}
                      </div>
                    </div>
                  ))}
                  <div className="ml-4 relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted ring-4 ring-background" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Created</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt!), "MMM d, h:mm a")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
