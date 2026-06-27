import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="staff">{children}</DashboardLayout>;
}
