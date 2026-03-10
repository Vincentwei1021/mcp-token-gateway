import { AuthProvider } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
import DashboardShell from "@/components/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <DashboardShell>{children}</DashboardShell>
      </AuthGate>
    </AuthProvider>
  );
}
