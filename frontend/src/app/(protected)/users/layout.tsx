import UsersGuard from "@/components/UsersGuard";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <UsersGuard>{children}</UsersGuard>;
}
