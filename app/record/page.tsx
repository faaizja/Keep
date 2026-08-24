"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Timeline } from "@/components/Timeline";
import { KeepCodePanel } from "@/components/KeepCodePanel";
import { useKeep } from "@/lib/store";

export default function RecordPage() {
  const router = useRouter();
  const { status, record, code, wipe, syncing, canSync } = useKeep();
  const [ackCode, setAckCode] = useState(false);

  useEffect(() => {
    if (status === "idle" && !record) router.replace("/start");
  }, [status, record, router]);

  if (!record) return null;

  const empty = record.incidents.length === 0;
  const showCode = Boolean(code) && !ackCode && !empty;

  return (
    <Shell
      action={
        <div className="flex items-center gap-2">
          {record.incidents.length > 0 && (
            <Link href="/record/share" className="btn-quiet !py-2.5 !px-5 text-[14px]">
              Hand it over
            </Link>
          )}
          <Link href="/record/new" className="btn-primary !py-2.5 !px-5 text-[14px]">
            Add an entry
          </Link>
        </div>
      }
    >
      <div className="pt-6 pb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label">Your record</p>
          <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.02em]">
            {empty ? "Nothing in here yet." : "Here it is, all together."}
          </h1>
        </div>
        <span className="text-[12.5px] text-faint">
          {syncing ? "locking and saving…" : canSync ? "locked and saved" : "saved on this device"}
        </span>
      </div>

      {showCode && (
        <div className="mb-8">
          <KeepCodePanel code={code!} onAck={() => setAckCode(true)} />
        </div>
      )}

      {empty ? (
        <div className="card p-8 text-center">
          <p className="text-[15.5px] leading-[1.7] text-muted">
            The first entry is the hardest one, and it doesn&apos;t have to be a big
            thing. Small things are the point — that&apos;s what nobody has ever been
            able to see all at once.
          </p>
          <Link href="/record/new" className="btn-primary mt-6">
            Write the first one
          </Link>
        </div>
      ) : (
        <Timeline incidents={record.incidents} />
      )}

      <div className="mt-14 pt-8 border-t border-line flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] leading-[1.6] text-faint max-w-sm">
          When you&apos;re finished, clear this computer. Your record stays safe — you
          can open it again anywhere with your Keep code.
        </p>
        <button
          onClick={async () => {
            await wipe();
            router.push("/");
          }}
          className="btn-quiet !py-2.5 !px-5 text-[14px]"
        >
          I&apos;m done — clear this computer
        </button>
      </div>
    </Shell>
  );
}
