import { useState } from "react";
import { Link } from "wouter";
import { useOrders } from "@/hooks/use-orders";
import { useCurrentUser } from "@/hooks/use-users";
import { Layout } from "@/components/Layout";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader 
} from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  MapPin, 
  DollarSign,
  User
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orderStatusEnum } from "@shared/schema";

export default function OrdersPage() {
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // Logic: Florists/Couriers see their own + unassigned relevant ones
  // For now, we fetch all and filter client-side for simplicity or use the backend filters
  // Let's rely on backend filtering logic via role later, but for now simple listing
  const { data: orders, isLoading } = useOrders();

  const isManager = user?.role === 'MANAGER' || user?.role === 'OWNER';

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.clientName.toLowerCase().includes(search.toLowerCase()) ||
      order.orderNumber.toString().includes(search);
    
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-primary">Orders</h1>
            <p className="text-muted-foreground mt-1">Manage and track your floral deliveries</p>
          </div>
          {isManager && (
            <Link href="/orders/new">
              <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by client or order #..." 
              className="pl-9 bg-background" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-background">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {orderStatusEnum.enumValues.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders?.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="h-full hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <span className="font-mono text-sm text-muted-foreground">#{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {order.clientName}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {order.comment || "No special instructions"}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary/60" />
                        <span>{format(new Date(order.deliveryDateTime), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary/60" />
                        <span className="truncate">{order.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary/60" />
                        <span>{order.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{order.clientPhone}</span>
                    </div>
                    <span>{format(new Date(order.createdAt!), "h:mm a")}</span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
            {filteredOrders?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-muted">
                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No orders found</h3>
                <p>Try adjusting your filters or create a new order.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
