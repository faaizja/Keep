"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Chip, Section } from "@/components/Chip";
import { Redactor } from "@/components/Redactor";
import { SafeguardingInterrupt } from "@/components/SafeguardingInterrupt";
import { INCIDENT_TYPES, PLACES } from "@/lib/taxonomy";
import { checkSafeguarding, escalationLevel } from "@/lib/safeguarding";
import { useKeep } from "@/lib/store";
import type { EvidenceImage, IncidentTypeId, PlaceId } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function NewEntryPage() {
  const router = useRouter();
  const { status, record, addIncident } = useKeep();

  const [types, setTypes] = useState<IncidentTypeId[]>([]);
  const [place, setPlace] = useState<PlaceId | null>(null);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [people, setPeople] = useState("");
  const [toldAdult, setToldAdult] = useState(false);
  const [adultResponse, setAdultResponse] = useState("");
  const [evidence, setEvidence] = useState<EvidenceImage[]>([]);
  const [interrupt, setInterrupt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EvidenceImage | null>(null);
  const [sgSeen, setSgSeen] = useState(0);

  useEffect(() => {
    if (status !== "ready" || !record) router.replace("/start");
  }, [status, record, router]);

  const check = useMemo(() => checkSafeguarding(note, types), [note, types]);
  const ready = types.length > 0 && place !== null;

  async function commit() {
    setSaving(true);
    await addIncident({
      id: crypto.randomUUID(),
      date,
      createdAt: new Date().toISOString(),
      types,
      place: place!,
      note: note.trim() || undefined,
      people: people
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
      toldAdult: toldAdult || undefined,
      adultResponse: toldAdult ? adultResponse.trim() || undefined : undefined,
      evidence: evidence.length ? evidence : undefined,
    });
    router.push("/record");
  }

  function attemptSave() {
    if (!ready) return;
    if (check.triggered) {
      setSgSeen((n) => n + 1);
      setInterrupt(true);
      return;
    }
    void commit();
  }

  const level = escalationLevel(sgSeen - 1);

  const atSchool = PLACES.filter((p) => p.group === "At school");
  const online = PLACES.filter((p) => p.group === "Online");

  return (
    <Shell
      action={
        <button onClick={() => router.push("/record")} className="btn-ghost text-[14px]">
          Cancel
        </button>
      }
    >
      <div className="pt-4">
        <h1 className="font-display text-[1.875rem] leading-tight tracking-[-0.02em]">
          What happened?
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Only the first two are needed. Everything else is up to you.
        </p>
      </div>

      <Section step="01" title="The thing itself" hint="Pick as many as fit.">
        <div className="grid sm:grid-cols-2 gap-2.5">
          {INCIDENT_TYPES.map((t) => (
            <Chip
              key={t.id}
              selected={types.includes(t.id)}
              strong={t.weight === 3}
              onClick={() =>
                setTypes((cur) =>
                  cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]
                )
              }
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section step="02" title="Where">
        <p className="label mb-2.5">At school</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {atSchool.map((p) => (
            <Chip key={p.id} selected={place === p.id} onClick={() => setPlace(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
        <p className="label mt-5 mb-2.5">Online</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {online.map((p) => (
            <Chip key={p.id} selected={place === p.id} onClick={() => setPlace(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section step="03" title="When">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px]"
          />
          <button
            type="button"
            className="btn-quiet !py-2.5 !px-4 text-[14px]"
            onClick={() => setDate(today())}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-quiet !py-2.5 !px-4 text-[14px]"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setDate(d.toISOString().slice(0, 10));
            }}
          >
            Yesterday
          </button>
        </div>
      </Section>

      <Section
        step="04"
        title="Anything you want to say about it"
        hint="Optional. Your own words are the part nobody can argue with later."
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="What happened, who was there, how it left you."
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] leading-[1.6] resize-y focus:outline-none focus:border-keep/60"
        />

        <input
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          placeholder="Who was involved? Initials are fine, separated with commas"
          className="mt-3 w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] focus:outline-none focus:border-keep/60"
        />

        <label className="mt-3 flex items-center gap-3 text-[14.5px] text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={toldAdult}
            onChange={(e) => setToldAdult(e.target.checked)}
            className="h-4 w-4 accent-[#2F5D50]"
          />
          I told an adult at school about this one
        </label>

        {toldAdult && (
          <input
            value={adultResponse}
            onChange={(e) => setAdultResponse(e.target.value)}
            placeholder="What did they do or say?"
            className="mt-3 w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] focus:outline-none focus:border-keep/60"
          />
        )}
      </Section>

      <Section step="05" title="A screenshot, if you have one" hint="Optional.">
        {evidence.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {evidence.map((e) => (
              <div key={e.id} className="w-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.dataUrl}
                  alt="Redacted screenshot"
                  className="h-24 w-full object-cover rounded-lg border border-line"
                />
                <div className="mt-1.5 flex items-center gap-3 text-[12.5px]">
                  <button
                    type="button"
                    className="text-keep underline underline-offset-4"
                    onClick={() => setEditing(e)}
                  >
                    blur more
                  </button>
                  <button
                    type="button"
                    className="text-signal underline underline-offset-4"
                    onClick={() => setEvidence((cur) => cur.filter((x) => x.id !== e.id))}
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Redactor
          initial={editing}
          onCancelEdit={() => setEditing(null)}
          onAdd={(e) => {
            setEvidence((cur) =>
              cur.some((x) => x.id === e.id) ? cur.map((x) => (x.id === e.id ? e : x)) : [...cur, e]
            );
            setEditing(null);
          }}
        />
      </Section>

      <div className="mt-10 sticky bottom-4">
        <button
          onClick={attemptSave}
          disabled={!ready || saving}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed shadow-lift"
        >
          {saving ? "Saving…" : ready ? "Save it" : "Pick what happened, and where"}
        </button>
      </div>

      {interrupt && (
        <SafeguardingInterrupt
          result={check}
          level={level}
          onSaveAnyway={() => {
            setInterrupt(false);
            void commit();
          }}
          onBack={() => setInterrupt(false)}
        />
      )}
    </Shell>
  );
}
