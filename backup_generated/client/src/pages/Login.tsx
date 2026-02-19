import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flower2 } from "lucide-react";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/orders");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex flex-col bg-primary text-primary-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1591886960571-74d43a9d4166?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Flower2 className="h-8 w-8" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight">FloraOrders</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-5xl font-serif font-bold leading-tight mb-6">
              Effortless Floral Management
            </h1>
            <p className="text-lg opacity-90 leading-relaxed">
              Streamline your flower shop operations. Manage orders, track deliveries, and coordinate your team in one beautiful place.
            </p>
          </div>
          <div className="text-sm opacity-60">© 2024 FloraOrders System</div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold font-serif text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground mt-2">Sign in to access your dashboard</p>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-4">
              <Button 
                size="lg" 
                className="w-full h-12 text-base font-semibold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                onClick={() => window.location.href = "/api/login"}
              >
                Sign in with Replit
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-8">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
