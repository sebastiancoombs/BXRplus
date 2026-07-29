"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";

export default function BxrProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ClientProvider>{children}</ClientProvider>
    </AuthProvider>
  );
}
