import { PRODUCT_CATEGORY_HELP } from "@/lib/productCategories";

export default function CategoryHelpContent() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Product categories
      </p>
      {PRODUCT_CATEGORY_HELP.map((category) => (
        <div key={category.name} className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{category.name}</p>
          <p className="text-sm leading-relaxed text-slate-600">
            {category.description}
          </p>
        </div>
      ))}
    </div>
  );
}
