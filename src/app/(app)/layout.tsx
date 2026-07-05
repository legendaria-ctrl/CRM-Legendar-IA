import { Sidebar } from "@/components/Sidebar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { CertificacionTabs } from "@/components/CertificacionTabs";
import { MobileActionsProvider } from "@/lib/mobile-actions-context";
import { SidebarDrawerProvider } from "@/lib/sidebar-drawer-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileActionsProvider>
      <SidebarDrawerProvider>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-8 md:flex-row md:gap-6 md:px-8 md:pb-10 md:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]">
          {/* Encabezado móvil fijo: barra superior + certificaciones no se mueven al hacer scroll */}
          <div className="sticky top-0 z-30 -mx-4 flex flex-col gap-3 bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:hidden">
            <MobileTopBar />
            <CertificacionTabs />
          </div>

          <Sidebar />

          <main className="min-w-0 flex-1 pt-6 md:pt-0">
            <div className="hidden md:sticky md:top-[calc(env(safe-area-inset-top,0px)+2.5rem)] md:z-30 md:mb-6 md:block md:bg-background md:pb-2">
              <CertificacionTabs />
            </div>
            {children}
          </main>
        </div>
      </SidebarDrawerProvider>
    </MobileActionsProvider>
  );
}
