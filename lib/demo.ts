import type { KeepRecord, Incident } from "./types";

/**
 * A worked example, used for the "See how it works" door.
 *
 * Every entry is synthetic. In line with the hackathon's safety rules,
 * no hateful material is reproduced anywhere in this file: incidents are
 * described, never quoted. The student, the other pupils and the school
 * are fictional.
 */

export const DEMO_CODE = "demo";

const i = (
  id: string,
  date: string,
  types: Incident["types"],
  place: Incident["place"],
  note: string,
  extra: Partial<Incident> = {}
): Incident => ({
  id,
  date,
  createdAt: `${date}T19:40:00.000Z`,
  types,
  place,
  note,
  ...extra,
});

const INCIDENTS: Incident[] = [
  i("d1", "2025-11-12", ["terrorist"], "corridor",
    "Two boys in my year said it as I walked past. Everyone laughed. I laughed too so it would stop.",
    { people: ["R."] }),

  i("d2", "2025-11-20", ["excluded"], "classroom",
    "Nobody would be my partner in science. The teacher put me with whoever was left.",
    { people: ["R."] }),

  i("d3", "2025-12-02", ["hijab-comments"], "playground",
    "Comments about my hijab and about my mum. It went on for most of lunch.",
    { people: ["R.", "T."], toldAdult: true,
      adultResponse: "Said he would have a word with them." }),

  i("d4", "2025-12-09", ["terrorist"], "corridor",
    "Same thing as before, louder, right after the meeting about it.",
    { people: ["R.", "T."], toldAdult: true,
      adultResponse: "Told me to ignore it and not let them get a reaction." }),

  i("d5", "2025-12-15", ["posted-about"], "group-chat",
    "A picture of me from sports day was put in the year group chat with a caption about my religion. 40-odd people in there.",
    { people: ["T."] }),

  i("d6", "2026-01-08", ["posted-about", "excluded"], "snapchat",
    "A private story got made about me. Someone I don't really know sent me a screenshot of it.",
    { people: ["T.", "another boy in Year 10"] }),

  i("d7", "2026-01-19", ["hijab-touched"], "corridor",
    "Someone pulled the back of my hijab hard enough that it came loose. I went to the toilets to fix it and missed the start of English.",
    { people: ["R."] }),

  i("d8", "2026-02-03", ["posted-about", "excluded"], "group-chat",
    "They made a separate group chat with everyone from my form in it except me, and screenshots of it kept getting sent to me.",
    { people: ["R.", "T."] }),

  i("d9", "2026-02-12", ["staff"], "classroom",
    "A teacher made a remark about my religion in front of the class while handing back books. People brought it up for the rest of the week.",
    { toldAdult: false }),

  i("d10", "2026-02-27", ["property"], "bus",
    "My bag was taken on the bus and thrown to the back. My prayer beads were broken when I got it back.",
    { people: ["R."] }),

  i("d11", "2026-03-09", ["physical", "hijab-touched"], "playground",
    "Three of them cornered me by the sports hall. One of them pulled my hijab off. I stayed in the medical room until my dad came.",
    { people: ["R.", "T."], toldAdult: true,
      adultResponse: "Sent home. Nothing in writing yet." }),
];

export const DEMO_RECORD = (): KeepRecord => ({
  version: 1,
  createdAt: "2025-11-12T19:40:00.000Z",
  updatedAt: "2026-03-09T18:10:00.000Z",
  incidents: INCIDENTS,
  identity: { mode: "anonymous", yearGroup: "Year 9" },
});
