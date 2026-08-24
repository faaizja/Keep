import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function Landing() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 sm:px-10 py-6">
        <Wordmark />
      </header>

      <div className="flex-1 flex items-center px-6 sm:px-10">
        <div className="w-full max-w-measure mx-auto pb-20">
          <h1 className="font-display text-[2.5rem] sm:text-[3.25rem] leading-[1.08] tracking-[-0.02em] text-ink">
            A place to keep
            <br />
            a record.
          </h1>

          <p className="mt-6 text-[17px] leading-[1.65] text-muted max-w-[34rem]">
            When something happens to you because of your faith, it can feel too
            small to tell anyone. Write it down here instead. Over time you will
            have something no single moment could ever be — a record.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/start" className="btn-primary">
              Start your own
            </Link>
            <Link href="/demo" className="btn-quiet">
              See how it works
            </Link>
          </div>

          <div className="mt-14 pt-8 border-t border-line">
            <p className="text-[14px] leading-[1.7] text-faint max-w-[32rem]">
              No account. No name, no email, no age. Everything you write is
              locked on your own device before it goes anywhere, and nobody —
              including us — can read it without your Keep&nbsp;code.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
