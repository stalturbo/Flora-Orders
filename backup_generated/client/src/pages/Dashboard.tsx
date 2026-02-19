import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders } from "@/hooks/use-orders";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, TrendingUp, DollarSign, Package, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Calculate Stats
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const deliveredOrders = orders?.filter(o => o.status === 'DELIVERED').length || 0;
  const activeOrders = orders?.filter(o => ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY'].includes(o.status)).length || 0;

  // Chart Data: Orders by Status
  const statusData = [
    { name: 'New', value: orders?.filter(o => o.status === 'NEW').length || 0, color: '#3b82f6' },
    { name: 'In Work', value: orders?.filter(o => o.status === 'IN_WORK').length || 0, color: '#eab308' },
    { name: 'Assembled', value: orders?.filter(o => o.status === 'ASSEMBLED').length || 0, color: '#a855f7' },
    { name: 'On Delivery', value: orders?.filter(o => o.status === 'ON_DELIVERY').length || 0, color: '#f97316' },
    { name: 'Delivered', value: orders?.filter(o => o.status === 'DELIVERED').length || 0, color: '#22c55e' },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-slide-in">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Business overview and performance metrics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center">
                <DollarSign className="h-6 w-6 mr-1 opacity-75" />
                {totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-orange-500" />
                {activeOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground flex items-center">
                <Package className="h-6 w-6 mr-2 text-blue-500" />
                {totalOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground flex items-center">
                <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
                {deliveredOrders}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Orders List (Mini) */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders?.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{order.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt!), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full 
                      ${order.status === 'NEW' ? 'bg-blue-100 text-blue-700' : 
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
