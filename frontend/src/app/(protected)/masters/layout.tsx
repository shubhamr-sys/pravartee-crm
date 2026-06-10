import CategoryMasterGuard from "@/components/CategoryMasterGuard";

export default function MastersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CategoryMasterGuard>{children}</CategoryMasterGuard>;
}
