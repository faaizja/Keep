"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { shareId } from "@/lib/crypto";

/**
 * Where a teacher, a parent or a governor lands with nothing but four
 * words on a piece of paper. No account, no app, no login.
 */
export default function OpenPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const trimmed = code.trim();
    const id = await shareId(trimmed);
    router.push(`/case/${id}#c=${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  }

  return (
    <Shell>
      <form onSubmit={go} className="pt-10 max-w-measure">
        <p className="label">Someone shared a record with you</p>
        <h1 className="mt-3 font-display text-[2rem] leading-[1.15] tracking-[-0.02em]">
          Type the code you were given.
        </h1>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-muted">
          Four words and a number. There is nothing to sign up for and nothing to
          install. The record unlocks in this browser, and Keep never sees what is
          inside it.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="river-copper-lantern-heron-482"
          className="mt-8 w-full rounded-2xl border border-line bg-surface px-5 py-4 font-display text-[1.25rem] focus:outline-none focus:border-keep/60"
        />

        <button
          type="submit"
          disabled={busy || code.trim().length < 3}
          className="btn-primary mt-5 w-full sm:w-auto disabled:opacity-40"
        >
          {busy ? "Opening…" : "Open the record"}
        </button>

        <p className="mt-10 pt-6 border-t border-line text-[13.5px] leading-[1.7] text-faint">
          If the code doesn&apos;t work, ask the person who gave it to you to check it.
          They can also switch a shared record off at any time, and when they do there is
          nothing left at that address to open.
        </p>
      </form>
    </Shell>
  );
}
