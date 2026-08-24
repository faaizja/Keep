"use client";

import { use, useCallback, useEffect, useState } from "react";
import { analyse, formatDate } from "@/lib/analysis";
import { deriveShareKey, importKey, unseal } from "@/lib/crypto";
import { getShare, markShareReceived, syncAvailable } from "@/lib/supabase";
import { JURISDICTIONS, PLACE_BY_ID, TYPE_BY_ID } from "@/lib/taxonomy";
import { Timeline } from "@/components/Timeline";
import { PatternHeader } from "@/components/PatternHeader";
import { Wordmark } from "@/components/Wordmark";
import type { SharePayload } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "needs-code" }
  | { kind: "gone"; reason: string }
  | { kind: "open"; payload: SharePayload; receivedAt: string | null; canMark: boolean };

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [marking, setMarking] = useState(false);

  const [code, setCode] = useState("");
  const [tryingCode, setTryingCode] = useState(false);

  const load = useCallback(
    async (shareCode: string) => {
      const frag = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const inline = frag.get("d");
      try {
        const key = await deriveShareKey(shareCode);

        if (inline) {
          const [iv, blob] = inline.split(".");
          const payload = await unseal<SharePayload>(key, { iv, blob });
          setState({ kind: "open", payload, receivedAt: null, canMark: false });
          return true;
        }

        if (!syncAvailable()) {
          setState({
            kind: "gone",
            reason: "This copy of Keep isn't connected to a store, so it can't fetch the record.",
          });
          return false;
        }

        const row = await getShare(id);
        if (!row || row.revoked || !row.blob) {
          setState({
            kind: "gone",
            reason:
              "This has been switched off by the person who sent it. Nothing is stored here any more.",
          });
          return false;
        }

        const payload = await unseal<SharePayload>(key, { iv: row.iv, blob: row.blob });
        setState({ kind: "open", payload, receivedAt: row.received_at, canMark: true });
        return true;
      } catch {
        return false;
      }
    },
    [id]
  );

  useEffect(() => {
    (async () => {
      const frag = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const shareCode = frag.get("c");
      const legacyKey = frag.get("k");
      const inline = frag.get("d");

      // Links made before share codes carried a raw key instead.
      if (!shareCode && legacyKey) {
        try {
          const key = await importKey(legacyKey);
          if (inline) {
            const [iv, blob] = inline.split(".");
            const payload = await unseal<SharePayload>(key, { iv, blob });
            setState({ kind: "open", payload, receivedAt: null, canMark: false });
            return;
          }
          const row = await getShare(id);
          if (!row || row.revoked || !row.blob) {
            setState({ kind: "gone", reason: "This has been switched off by the person who sent it." });
            return;
          }
          const payload = await unseal<SharePayload>(key, { iv: row.iv, blob: row.blob });
          setState({ kind: "open", payload, receivedAt: row.received_at, canMark: true });
        } catch {
          setState({ kind: "gone", reason: "This link couldn't be opened." });
        }
        return;
      }

      if (!shareCode) {
        // Someone has the address but not the code. That is the design
        // working, not a failure: ask them for it.
        setState({ kind: "needs-code" });
        return;
      }

      const ok = await load(shareCode);
      if (!ok) {
        setState({
          kind: "gone",
          reason:
            "This couldn't be opened. The code may be wrong, or the person who sent it may have switched it off.",
        });
      }
    })();
  }, [id, load]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-dvh grid place-items-center px-6">
        <p className="text-[15px] text-muted">Unlocking this in your browser…</p>
      </div>
    );
  }

  if (state.kind === "needs-code") {
    return (
      <div className="min-h-dvh grid place-items-center px-6">
        <form
          className="w-full max-w-measure"
          onSubmit={async (e) => {
            e.preventDefault();
            setTryingCode(true);
            const ok = await load(code);
            setTryingCode(false);
            if (!ok) setState({ kind: "needs-code" });
          }}
        >
          <Wordmark />
          <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.02em]">
            Type the code you were given.
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-muted">
            A student has shared a record with you. Four words and a number. It unlocks
            in your browser, so nobody else can read what you are about to.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="river-copper-lantern-heron-482"
            className="mt-7 w-full rounded-2xl border border-line bg-surface px-5 py-4 font-display text-[1.125rem] focus:outline-none focus:border-keep/60"
          />
          <button
            type="submit"
            disabled={tryingCode || code.trim().length < 3}
            className="btn-primary mt-5 disabled:opacity-40"
          >
            {tryingCode ? "Opening…" : "Open the record"}
          </button>
        </form>
      </div>
    );
  }

  if (state.kind === "gone") {
    return (
      <div className="min-h-dvh grid place-items-center px-6">
        <div className="max-w-measure text-center">
          <Wordmark className="justify-center" />
          <p className="mt-6 text-[16px] leading-[1.7] text-muted">{state.reason}</p>
        </div>
      </div>
    );
  }

  const { payload } = state;
  const pattern = analyse(payload.incidents);
  const j = JURISDICTIONS[payload.jurisdiction];
  const who =
    payload.identity.mode === "named" && payload.identity.name
      ? payload.identity.name
      : `A student${payload.identity.yearGroup ? ` in ${payload.identity.yearGroup}` : ""}`;

  const typeTally = new Map<string, number>();
  for (const i of payload.incidents)
    for (const t of i.types)
      typeTally.set(
        TYPE_BY_ID[t]?.classification ?? t,
        (typeTally.get(TYPE_BY_ID[t]?.classification ?? t) ?? 0) + 1
      );

  return (
    <div className="min-h-dvh">
      {/* ------------------------- what this is ------------------------- */}
      <header className="bg-ink text-paper print:bg-white print:text-black">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
          <Wordmark className="[&_span]:!text-paper print:[&_span]:!text-black" />
          <h1 className="mt-6 font-display text-[1.75rem] sm:text-[2.125rem] leading-[1.15] tracking-[-0.02em]">
            A record kept by a student at your school.
          </h1>
          <p className="mt-4 text-[15.5px] leading-[1.75] text-paper/75 print:text-black/70">
            {who} recorded {pattern.count} incidents between{" "}
            {pattern.first ? formatDate(pattern.first) : "?"} and{" "}
            {pattern.last ? formatDate(pattern.last) : "?"}, and has chosen to show them
            to you. They were written down as they happened, not recalled afterwards.
          </p>
        </div>
      </header>

      {/* ---------------------------- the duty --------------------------- */}
      <section className="border-b border-line bg-keepsoft">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-7">
          <p className="label text-keepdeep">What you are looking at, and what it engages</p>
          <p className="mt-3 text-[15.5px] leading-[1.75] text-ink/85">{j.duty}</p>
          <p className="mt-4 text-[14.5px] leading-[1.7] text-keepdeep">{j.gap}</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-10 space-y-10">
        <PatternHeader pattern={pattern} audience="school" />

        {/* -------------------------- by category ------------------------ */}
        <section className="card p-6 sm:p-8">
          <h2 className="font-display text-[1.375rem]">By category</h2>
          <ul className="mt-5 space-y-2.5">
            {[...typeTally.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([label, n]) => (
                <li key={label} className="flex items-center justify-between gap-4 text-[14.5px]">
                  <span className="text-ink">{label}</span>
                  <span className="tabular-nums text-muted">{n}</span>
                </li>
              ))}
          </ul>

          <h3 className="mt-8 font-display text-[1.125rem]">Where</h3>
          <ul className="mt-3 space-y-2 text-[14px] text-muted">
            <li>At school: {pattern.atSchoolCount}</li>
            <li>Online or outside school: {pattern.onlineCount}</li>
          </ul>
        </section>

        {/* ------------------------- the entries ------------------------- */}
        <section>
          <h2 className="font-display text-[1.375rem] mb-5">Every entry, in order</h2>
          <Timeline
            incidents={payload.incidents}
            showWhy={false}
            audience="school"
            showHeader={false}
          />
          <p className="mt-5 text-[13px] leading-[1.65] text-faint">
            Screenshots were redacted by the student on their own device before being
            saved. Faces were blurred automatically and the student confirmed each image
            by hand before it was kept. Keep never received the originals.
          </p>
        </section>

        {/* -------------------------- what now --------------------------- */}
        <section className="card p-6 sm:p-8 print:hidden">
          <h2 className="font-display text-[1.375rem]">Two things that would help</h2>

          <div className="mt-5">
            <p className="text-[15px] leading-[1.7] text-ink/85">
              <strong className="font-medium">Tell them you&apos;ve read it.</strong>{" "}
              Nearly three quarters of people who report this kind of thing never hear
              anything back, and it is the single most common reason they stop reporting.
              This button does nothing except let them know a person opened it.
            </p>

            {state.receivedAt ? (
              <p className="pop mt-4 flex items-start gap-2.5 rounded-xl bg-keepsoft border border-keep/25 px-4 py-3 text-[14.5px] text-keepdeep">
                <span className="tick mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-keep text-white">
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.2 3.8 7.5 8.5 2.6" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  Marked as received on {formatDate(state.receivedAt.slice(0, 10))}. They
                  can see this.
                </span>
              </p>
            ) : state.canMark ? (
              <button
                disabled={marking}
                onClick={async () => {
                  setMarking(true);
                  const at = await markShareReceived(id);
                  setState((s) =>
                    s.kind === "open" ? { ...s, receivedAt: at ?? new Date().toISOString() } : s
                  );
                  setMarking(false);
                }}
                className="btn-primary mt-4"
              >
                {marking ? "Sending…" : "I've read this, let them know"}
              </button>
            ) : (
              <p className="mt-4 text-[14px] text-muted">
                (Read receipts are unavailable on this preview link.)
              </p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-line">
            <p className="text-[15px] leading-[1.7] text-ink/85">
              <strong className="font-medium">Put it on file.</strong> Print this page, or
              save it as a PDF, so the record exists in the school&apos;s own system rather
              than only in a browser tab.
            </p>
            <button onClick={() => window.print()} className="btn-quiet mt-4">
              Print or save as PDF
            </button>
          </div>
        </section>

        <footer className="pt-8 border-t border-line">
          <p className="text-[13px] leading-[1.7] text-faint">
            Generated {formatDate(payload.generatedAt.slice(0, 10))} by Keep. The student
            holds the only key to this record; Keep stores it as ciphertext and cannot read
            it. The student can switch this link off at any time, after which nothing
            remains at this address.
          </p>
          <p className="mt-4 text-[12.5px] leading-[1.7] text-faint">
            Relevant instruments for {j.label}: {j.instruments.join("; ")}. This is general
            information about published duties, not legal advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
