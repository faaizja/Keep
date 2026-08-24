"use client";

import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function Shell({
  children,
  action,
  banner,
  wide = false,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  banner?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      {banner}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between gap-4">
        <Link href="/" aria-label="Keep, home">
          <Wordmark />
        </Link>
        {action}
      </header>
      <main
        className={
          "flex-1 px-5 sm:px-10 pb-24 w-full mx-auto " +
          (wide ? "max-w-5xl" : "max-w-2xl")
        }
      >
        {children}
      </main>
    </div>
  );
}
