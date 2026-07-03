"use client";

import { SessionProvider } from "@/lib/session-context";
import { CertificacionProvider } from "@/lib/certificacion-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CertificacionProvider>{children}</CertificacionProvider>
    </SessionProvider>
  );
}
