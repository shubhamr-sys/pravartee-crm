import type { PricingLeadLineItem } from "@/types/pricing";

export function pricingHierarchyLabel(item: {
  category_name: string;
  product_name: string;
  brand_name: string | null;
  model_name: string | null;
}): string {
  return [item.category_name, item.product_name, item.brand_name, item.model_name]
    .filter(Boolean)
    .join(" → ");
}

export function pricingLineSummary(item: PricingLeadLineItem): string {
  return `${pricingHierarchyLabel(item)} × ${item.quantity} ${item.uom}`;
}
