import ReportsGuard from "@/components/ReportsGuard";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReportsGuard>{children}</ReportsGuard>;
}
