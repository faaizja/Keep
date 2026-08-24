"use client";
import { KeepProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <KeepProvider>{children}</KeepProvider>;
}
