"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useKeep } from "@/lib/store";

export default function StartPage() {
  const router = useRouter();
  const { begin, status } = useKeep();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    await begin();
    router.push("/record/new");
  }

  return (
    <Shell>
      <div className="pt-8 max-w-measure">
        <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em]">
          Three things before you start, and then it&apos;s yours.
        </h1>

        <ol className="mt-8 space-y-6">
          <li className="flex gap-4">
            <span className="font-display text-[1.25rem] text-keep">1</span>
            <p className="text-[15.5px] leading-[1.7] text-muted">
              <span className="text-ink font-medium">There&apos;s no sign-up.</span> No
              name, no email, no age, nothing about your school. We don&apos;t know who
              you are and we&apos;d rather keep it that way.
            </p>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-[1.25rem] text-keep">2</span>
            <p className="text-[15.5px] leading-[1.7] text-muted">
              <span className="text-ink font-medium">Everything is locked before it
              leaves this browser.</span> Your entries are stored as scrambled text that
              nobody can read without your Keep code. Not your school, and not us.
            </p>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-[1.25rem] text-keep">3</span>
            <p className="text-[15.5px] leading-[1.7] text-muted">
              <span className="text-ink font-medium">Nothing goes to anyone unless you
              send it.</span> Not to a teacher, not to your parents. That stays your
              decision, for as long as you want to think about it.
            </p>
          </li>
        </ol>

        <button onClick={go} disabled={busy || status === "unlocking"} className="btn-primary mt-10 w-full sm:w-auto">
          {busy ? "One moment…" : "Write my first entry"}
        </button>

        <p className="mt-8 pt-6 border-t border-line text-[14px] text-muted">
          Already started somewhere else?{" "}
          <Link href="/unlock" className="text-keep underline underline-offset-4">
            Enter your Keep code
          </Link>
        </p>
      </div>
    </Shell>
  );
}
