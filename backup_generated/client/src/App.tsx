import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import OrdersPage from "@/pages/Orders";
import CreateOrderPage from "@/pages/CreateOrder";
import OrderDetailsPage from "@/pages/OrderDetails";
import Dashboard from "@/pages/Dashboard";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <Route path="/" component={() => <Redirect to="/orders" />} />
      <Route path="/orders">
        <ProtectedRoute component={OrdersPage} />
      </Route>
      <Route path="/orders/new">
        <ProtectedRoute component={CreateOrderPage} />
      </Route>
      <Route path="/orders/:id">
        <ProtectedRoute component={OrderDetailsPage} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      {/* Placeholder for staff page if not implemented yet */}
      <Route path="/staff">
         <ProtectedRoute component={() => <div className="p-8">Staff Management coming soon...</div>} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
