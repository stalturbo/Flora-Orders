import { Layout } from "@/components/Layout";
import { OrderForm } from "@/components/OrderForm";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateOrderPage() {
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const [, setLocation] = useLocation();

  const handleSubmit = async (data: any) => {
    try {
      await createOrder(data);
      setLocation("/orders");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/orders")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif text-primary">New Order</h1>
            <p className="text-muted-foreground">Create a new floral arrangement order</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50">
          <OrderForm 
            onSubmit={handleSubmit} 
            isSubmitting={isPending} 
            onCancel={() => setLocation("/orders")} 
          />
        </div>
      </div>
    </Layout>
  );
}
