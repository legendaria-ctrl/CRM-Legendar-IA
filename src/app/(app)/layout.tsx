import { Sidebar } from "@/components/Sidebar";
import { CertificacionTabs } from "@/components/CertificacionTabs";
import { MobileActionsProvider } from "@/lib/mobile-actions-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileActionsProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:flex-row md:px-8 md:pb-10 md:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <CertificacionTabs />
          {children}
        </main>
      </div>
    </MobileActionsProvider>
  );
}
