import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 md:flex-row md:px-8 md:py-10">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
