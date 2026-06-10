export const LEAD_ITEM_UOM_OPTIONS = [
  { value: "NOS", label: "Nos" },
  { value: "UNIT", label: "Unit" },
  { value: "LOT", label: "Lot" },
  { value: "METER", label: "Meter" },
  { value: "FEET", label: "Feet" },
  { value: "LICENSE", label: "License" },
  { value: "USER", label: "User" },
  { value: "PROJECT", label: "Project" },
] as const;

export function getUomLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const match = LEAD_ITEM_UOM_OPTIONS.find((item) => item.value === value);
  return match?.label ?? value;
}
