import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthSync } from "@/components/auth-sync";
import { ELI5Provider } from "@/components/eli5/eli5-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ELI5Provider>
      <AuthSync />
      <div className="flex min-h-screen bg-canvas text-text-primary selection:bg-cyan-500/25 selection:text-cyan-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ELI5Provider>
  );
}
