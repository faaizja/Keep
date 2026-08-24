"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Timeline } from "@/components/Timeline";
import { useKeep } from "@/lib/store";
import { DEMO_RECORD } from "@/lib/demo";

export default function DemoPage() {
  const { openDemo, record, isDemo } = useKeep();

  useEffect(() => {
    if (!isDemo) openDemo();
  }, [isDemo, openDemo]);

  const shown = isDemo && record ? record : DEMO_RECORD();

  return (
    <Shell
      banner={
        <div className="bg-ink text-paper px-6 sm:px-10 py-2.5 text-[13px] flex flex-wrap items-center justify-between gap-3">
          <span>
            A worked example. Fictional student, invented incidents. Nothing here is a
            real person, and no real abuse is reproduced.
          </span>
          <Link href="/start" className="underline underline-offset-4 hover:no-underline">
            Start your own
          </Link>
        </div>
      }
      action={
        <Link href="/record/share" className="btn-primary !py-2.5 !px-5 text-[14px]">
          Hand it over
        </Link>
      }
    >
      <div className="pt-6 pb-8">
        <p className="label">The record of</p>
        <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.02em]">
          A student in {shown.identity.yearGroup}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.7] text-muted">
          Each of these was small enough, on its own, to be waved away. Here they are
          together.
        </p>
      </div>

      <Timeline incidents={shown.incidents} />
    </Shell>
  );
}
