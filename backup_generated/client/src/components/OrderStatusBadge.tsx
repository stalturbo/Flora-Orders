import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@shared/schema";

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const variantClass = {
    NEW: "badge-new",
    IN_WORK: "badge-in-work",
    ASSEMBLED: "badge-assembled",
    ON_DELIVERY: "badge-delivery",
    DELIVERED: "badge-delivered",
    CANCELED: "badge-canceled",
  }[status] || "badge-new";

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
      variantClass,
      className
    )}>
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
}
