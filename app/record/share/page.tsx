"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Chip } from "@/components/Chip";
import { formatDate } from "@/lib/analysis";
import { deriveShareKey, generateKeepCode, seal, shareId } from "@/lib/crypto";
import { getShareStatuses, putShare, revokeShare, syncAvailable } from "@/lib/supabase";
import { JURISDICTION_LIST, TYPE_BY_ID } from "@/lib/taxonomy";
import { OUTSIDE_ROUTES as ROUTES } from "@/lib/safeguarding";
import { useKeep } from "@/lib/store";
import type { JurisdictionId, SharePayload, ShareRef } from "@/lib/types";

export default function SharePage() {
  const router = useRouter();
  const { record, patchRecord, isDemo } = useKeep();

  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"named" | "anonymous">("anonymous");
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [jurisdiction, setJurisdiction] = useState<JurisdictionId>("england-wales");
  const [link, setLink] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record) router.replace("/start");
    else if (selected.length === 0) setSelected(record.incidents.map((i) => i.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  /* pull back "has it been opened" for links already sent */
  useEffect(() => {
    const ids = (record?.shares ?? []).filter((s) => !s.revoked).map((s) => s.id);
    if (!ids.length || !syncAvailable()) return;
    getShareStatuses(ids)
      .then((statuses) => {
        const shares = (record?.shares ?? []).map((s) =>
          statuses[s.id] ? { ...s, ...statuses[s.id], receivedAt: statuses[s.id].received_at } : s
        );
        void patchRecord({ shares });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.shares?.length]);

  const chosen = useMemo(
    () => (record?.incidents ?? []).filter((i) => selected.includes(i.id)),
    [record, selected]
  );

  if (!record) return null;

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const payload: SharePayload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        identity:
          mode === "named"
            ? { mode: "named", name: name.trim() || undefined, yearGroup: yearGroup.trim() || undefined }
            : { mode: "anonymous", yearGroup: yearGroup.trim() || undefined },
        incidents: chosen,
        jurisdiction,
      };

      // Four words and a number, exactly like a Keep code. The bundle is
      // sealed with a key derived from it and stored under a short hash
      // of it, so the address gives no route to the contents.
      const shareCode = generateKeepCode();
      const key = await deriveShareKey(shareCode);
      const id = await shareId(shareCode);
      const sealed = await seal(key, payload);

      let url: string;
      if (syncAvailable()) {
        await putShare(id, sealed);
        url = `${window.location.origin}/case/${id}#c=${shareCode}`;
      } else {
        // Nothing configured to store it, so the sealed bundle travels
        // inside the link itself. Long, but it works with no server.
        const inline = encodeURIComponent(`${sealed.iv}.${sealed.blob}`);
        url = `${window.location.origin}/case/${id}#c=${shareCode}&d=${inline}`;
      }

      setLink(url);
      setCode(shareCode);

      const ref: ShareRef = {
        id,
        createdAt: new Date().toISOString(),
        incidentCount: chosen.length,
        identityMode: mode,
        jurisdiction,
        receivedAt: null,
        revoked: false,
      };
      await patchRecord({ shares: [...(record!.shares ?? []), ref] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong making the link.");
    } finally {
      setBusy(false);
    }
  }

  async function kill(id: string) {
    await revokeShare(id);
    await patchRecord({
      shares: (record!.shares ?? []).map((s) => (s.id === id ? { ...s, revoked: true } : s)),
    });
    if (link?.includes(id)) setLink(null);
  }

  const live = (record.shares ?? []).filter((s) => !s.revoked);

  return (
    <Shell
      action={
        <Link href={isDemo ? "/demo" : "/record"} className="btn-ghost text-[14px]">
          Back
        </Link>
      }
    >
      <div className="pt-6">
        <p className="label">Hand it over</p>
        <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.02em]">
          You decide what they see, and who you are.
        </h1>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-muted">
          This makes one link. Whoever opens it sees the entries you pick, laid out
          clearly, with the school&apos;s duty at the top. You can switch the link off at
          any time, even after you&apos;ve sent it.
        </p>
      </div>

      {/* -------------------------- pick entries -------------------------- */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[1.375rem]">What to include</h2>
          <button
            className="text-[13px] text-keep underline underline-offset-4"
            onClick={() =>
              setSelected(
                selected.length === record.incidents.length ? [] : record.incidents.map((i) => i.id)
              )
            }
          >
            {selected.length === record.incidents.length ? "none" : "all"}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {record.incidents.map((i) => {
            const on = selected.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() =>
                  setSelected((cur) =>
                    cur.includes(i.id) ? cur.filter((x) => x !== i.id) : [...cur, i.id]
                  )
                }
                className={
                  "w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-200 active:scale-[0.995] " +
                  (on
                    ? "border-keep bg-keepsoft/60"
                    : "border-line bg-surface hover:border-ink/20 hover:-translate-y-[1px]")
                }
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14.5px] text-ink">
                    {TYPE_BY_ID[i.types[0]]?.classification}
                  </span>
                  <span className="text-[12.5px] text-faint whitespace-nowrap tabular-nums">
                    {formatDate(i.date)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* --------------------------- identity ---------------------------- */}
      <section className="mt-10">
        <h2 className="font-display text-[1.375rem]">How you want to be named</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
          <Chip selected={mode === "anonymous"} onClick={() => setMode("anonymous")}>
            Don&apos;t use my name
            <span className="block mt-1 text-[13px] text-muted">
              They&apos;ll see &ldquo;a student&rdquo;. Useful if you&apos;re not sure yet.
            </span>
          </Chip>
          <Chip selected={mode === "named"} onClick={() => setMode("named")}>
            Use my name
            <span className="block mt-1 text-[13px] text-muted">
              So the school can act on it formally.
            </span>
          </Chip>
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
          {mode === "named" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] focus:outline-none focus:border-keep/60"
            />
          )}
          <input
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
            placeholder="Year group, e.g. Year 9 (optional)"
            className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] focus:outline-none focus:border-keep/60"
          />
        </div>
      </section>

      {/* ------------------------- jurisdiction -------------------------- */}
      <section className="mt-10">
        <h2 className="font-display text-[1.375rem]">Where your school is</h2>
        <p className="mt-2 text-[14px] text-muted">
          This decides which rules get quoted to them at the top of the page.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
          {JURISDICTION_LIST.map((j) => (
            <Chip key={j.id} selected={jurisdiction === j.id} onClick={() => setJurisdiction(j.id)}>
              {j.label}
            </Chip>
          ))}
        </div>
      </section>

      {/* --------------------------- generate ---------------------------- */}
      <section className="mt-10">
        <button
          onClick={generate}
          disabled={busy || chosen.length === 0}
          className="btn-primary w-full disabled:opacity-40"
        >
          {busy ? "Locking it…" : `Make the link for ${chosen.length} entries`}
        </button>
        {err && <p className="mt-3 text-[14px] text-signal">{err}</p>}

        {link && code && (
          <div className="pop mt-6 rounded-2xl border border-keep/25 bg-keepsoft/40 p-6">
            <p className="label text-keepdeep">Give them this</p>
            <p className="mt-3 font-display text-[1.5rem] sm:text-[2rem] leading-tight tracking-[-0.01em] text-keepdeep break-words">
              {code}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-ink/80">
              Write it down and hand it over, or say it out loud. They type it at{" "}
              <span className="font-medium">
                {typeof window !== "undefined" ? window.location.host : ""}/open
              </span>{" "}
              and your record opens. Nothing else needed, no account, no app.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="btn-primary !py-2.5 !px-5 text-[14px]"
                onClick={async () => {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied" : "Copy the code"}
              </button>
              <button
                className="btn-quiet !py-2.5 !px-5 text-[14px]"
                onClick={() => window.print()}
              >
                Print it
              </button>
            </div>

            <details className="mt-6 pt-5 border-t border-keep/20">
              <summary className="cursor-pointer text-[13.5px] text-keepdeep">
                Or send a link instead
              </summary>
              <p className="mt-3 break-all rounded-xl bg-surface border border-line px-4 py-3 text-[12.5px] font-mono text-ink/75">
                {link}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  className="btn-quiet !py-2.5 !px-5 text-[14px]"
                  onClick={() => navigator.clipboard.writeText(link)}
                >
                  Copy the link
                </button>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-quiet !py-2.5 !px-5 text-[14px]"
                >
                  See what they&apos;ll see
                </a>
              </div>
              <p className="mt-3 text-[12.5px] leading-[1.65] text-muted">
                The part after the <span className="font-mono">#</span> is the code again.
                Browsers never send that part to a server, so what we hold is a bundle we
                can&apos;t open.
              </p>
            </details>
          </div>
        )}

      </section>

      {/* ------------------------- live links ---------------------------- */}
      {live.length > 0 && (
        <section className="mt-12 pt-8 border-t border-line">
          <h2 className="font-display text-[1.375rem]">Links you&apos;ve sent</h2>
          <ul className="mt-4 space-y-2.5">
            {live.map((s) => (
              <li key={s.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14.5px] text-ink">
                    {s.incidentCount} entries · sent {formatDate(s.createdAt.slice(0, 10))}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {s.receivedAt
                      ? `Opened ${formatDate(s.receivedAt.slice(0, 10))}`
                      : "Not opened yet"}
                  </p>
                </div>
                <button
                  onClick={() => kill(s.id)}
                  className="text-[13px] text-signal underline underline-offset-4 whitespace-nowrap"
                >
                  switch it off
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------ outside routes ------------------------- */}
      <section className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display text-[1.375rem]">If the school isn&apos;t the right place</h2>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-muted">
          Sometimes the person who should help is part of the problem. About a third of
          Muslim students say an adult at school has made anti-Muslim comments to them.
          These take reports directly, and none of them are your school.
        </p>
        <ul className="mt-5 space-y-3">
          {ROUTES.map((r) => (
            <li key={r.name} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium text-ink">{r.name}</span>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[13px] text-keep underline underline-offset-4 whitespace-nowrap"
                >
                  {r.region}
                </a>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-muted">{r.what}</p>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
