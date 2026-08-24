"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useKeep } from "@/lib/store";

export default function UnlockPage() {
  const router = useRouter();
  const { unlock, error, status } = useKeep();
  const [code, setCode] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const ok = await unlock(code);
    if (ok) router.push("/record");
  }

  return (
    <Shell>
      <form onSubmit={go} className="pt-10 max-w-measure">
        <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em]">
          Type your Keep code.
        </h1>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-muted">
          Four words and a number. It works on any computer — the school library, a
          friend&apos;s laptop, your phone. Your record is unlocked here, in this browser,
          and never anywhere else.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="river-copper-lantern-heron-482"
          className="mt-8 w-full rounded-2xl border border-line bg-surface px-5 py-4 font-display text-[1.25rem] tracking-[0.01em] focus:outline-none focus:border-keep/60"
        />

        {error && <p className="mt-3 text-[14px] text-signal">{error}</p>}

        <button
          type="submit"
          disabled={status === "unlocking" || code.trim().length < 3}
          className="btn-primary mt-5 w-full sm:w-auto disabled:opacity-40"
        >
          {status === "unlocking" ? "Unlocking…" : "Open my record"}
        </button>

        <p className="mt-10 pt-6 border-t border-line text-[14px] text-muted">
          Haven&apos;t got one yet?{" "}
          <Link href="/start" className="text-keep underline underline-offset-4">
            Start a record
          </Link>
        </p>
      </form>
    </Shell>
  );
}
