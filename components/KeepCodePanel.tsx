"use client";

export function KeepCodePanel({ code, onAck }: { code: string; onAck: () => void }) {
  function download() {
    const text =
      `Your Keep code\n\n${code}\n\n` +
      `This is the only way back into your record.\n` +
      `Type it at ${typeof window !== "undefined" ? window.location.origin : ""}/unlock on any computer.\n\n` +
      `Nobody can recover it for you, not even us, because we don't know who you are.\n` +
      `Keep this file somewhere only you can get to.\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keep-code.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="pop card p-6 sm:p-8 border-keep/25 bg-keepsoft/40">
      <p className="label text-keepdeep">Your Keep code</p>

      <p className="mt-4 font-display text-[1.5rem] sm:text-[2rem] leading-tight tracking-[-0.01em] text-keepdeep break-words">
        {code}
      </p>

      <p className="mt-5 text-[15px] leading-[1.7] text-ink/80">
        This is how you get back in, on this computer or any other one. It&apos;s also
        the key your record is locked with, which is why we don&apos;t keep a copy.
        <strong className="font-medium"> If you lose it, the record is gone.</strong> We
        can&apos;t get it back for you. Being able to would mean knowing who you are, and
        we&apos;d rather not know.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={download} className="btn-quiet !py-2.5 !px-5 text-[14px]">
          Save it as a file
        </button>
        <button onClick={() => window.print()} className="btn-quiet !py-2.5 !px-5 text-[14px]">
          Print it
        </button>
        <button onClick={onAck} className="btn-primary !py-2.5 !px-5 text-[14px]">
          I&apos;ve written it down
        </button>
      </div>
    </section>
  );
}
