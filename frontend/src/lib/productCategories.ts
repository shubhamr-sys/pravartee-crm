export const PRODUCT_CATEGORY_HELP: Record<string, string> = {
  IT: "Computing and infrastructure products such as PCs, Laptops, Servers, Storage, Networking, UPS, Printers, and related hardware.",
  "Non-IT": "Products and services not directly related to information technology, including office, electrical, furniture, civil, and miscellaneous items.",
  Solution: "Integrated solutions and projects such as CCTV, Audio Visual Systems, Data Centres, Command Centres, Smart Classrooms, and turnkey deployments.",
};

export function getCategoryDescriptionById(
  categoryId: string,
  categories: { id: string; name: string; description?: string }[],
): string {
  const match = categories.find((item) => item.id === categoryId);
  if (match?.description) return match.description;
  if (match?.name) return PRODUCT_CATEGORY_HELP[match.name] ?? "";
  return "";
}
