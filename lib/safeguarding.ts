import type { Incident } from "./types";

/**
 * Keep never reports anything on a child's behalf.
 *
 * A tool that silently escalates to an adult is a tool children stop
 * trusting, and a child who stops trusting it goes back to recording
 * nothing. So where an entry suggests the person is in danger, Keep
 * interrupts *before the entry is saved*, puts real help in front of
 * them, and then lets them decide. Human oversight here means putting
 * the human in front of the child, not behind their back.
 *
 * This is deliberately a simple, inspectable phrase check rather than a
 * model: it runs entirely offline, nothing is sent anywhere to be
 * classified, and anyone can read exactly what it looks for. Its limits
 * are stated plainly in the submission — it will miss indirect wording,
 * and it will sometimes interrupt when it did not need to. It is a
 * prompt to offer help, never a diagnosis and never a trigger for
 * action taken without the child.
 */

export type Concern = "self-harm" | "violence" | "sexual" | "immediate-danger";

export type SafeguardingResult = {
  triggered: boolean;
  concerns: Concern[];
  headline: string;
  body: string;
};

const PHRASES: Record<Concern, RegExp[]> = {
  "self-harm": [
    /\bkill(ing)? myself\b/i,
    /\bend (it|my life)\b/i,
    /\b(want|wanted|wish) to (die|disappear)\b/i,
    /\bsuicid/i,
    /\bhurt(ing)? myself\b/i,
    /\bharm(ing)? myself\b/i,
    /\bself[- ]harm/i,
    /\bcut(ting)? myself\b/i,
    /\bnot worth living\b/i,
    /\bbetter off without me\b/i,
    /\bcan'?t (go on|do this any ?more)\b/i,
  ],
  violence: [
    /\bthreatened to (kill|stab|hurt|beat)\b/i,
    /\b(said|says) (he|she|they)('?d| would) (kill|stab|hurt)\b/i,
    /\bknife\b/i,
    /\bweapon\b/i,
    /\bstrangl/i,
    /\bchoked?\b/i,
    /\bpunched\b/i,
    /\bkicked me\b/i,
    /\bbeat(en)? me up\b/i,
    /\bdeath threat/i,
  ],
  sexual: [
    /\btouched me (up|inappropriately|down there)\b/i,
    /\bsexual(ly)? (assault|harass|touch)/i,
    /\bgroped\b/i,
    /\bup my (skirt|top)\b/i,
    /\bnudes?\b/i,
    /\bundress/i,
  ],
  "immediate-danger": [
    /\bfollowed me home\b/i,
    /\bwaiting outside my house\b/i,
    /\bknow(s)? where i live\b/i,
    /\bscared to go home\b/i,
    /\bscared for my life\b/i,
    /\bsaid they'?d find me\b/i,
  ],
};

const HEADLINES: Record<Concern, { headline: string; body: string }> = {
  "self-harm": {
    headline: "Before you save this — you shouldn't be carrying this on your own.",
    body: "What you've written sounds like it's been really heavy. Recording it is worth doing, and it isn't enough on its own. There are people whose whole job is to talk to someone your age about exactly this, and they're free and available right now.",
  },
  violence: {
    headline: "This one sounds like more than bullying.",
    body: "Threats and violence are treated differently from everything else in here, and they shouldn't wait for a pattern to build up. This still belongs in your record — but it's worth telling someone today as well.",
  },
  sexual: {
    headline: "This is a serious thing, and there's specific help for it.",
    body: "What you've described is treated separately and seriously. Keeping the record matters, and so does talking to someone who deals with this properly.",
  },
  "immediate-danger": {
    headline: "If you feel unsafe right now, start here.",
    body: "Your record will still be here in a minute. If you think you might be in danger, that comes first.",
  },
};

export function checkSafeguarding(
  note: string | undefined,
  types: Incident["types"]
): SafeguardingResult {
  const text = note ?? "";
  const concerns: Concern[] = [];

  for (const [concern, patterns] of Object.entries(PHRASES) as [Concern, RegExp[]][]) {
    if (patterns.some((p) => p.test(text))) concerns.push(concern);
  }

  // A recorded physical incident always offers help, even with no note.
  if (types.includes("physical") && !concerns.includes("violence")) concerns.push("violence");

  if (concerns.length === 0) {
    return { triggered: false, concerns, headline: "", body: "" };
  }

  const lead =
    concerns.find((c) => c === "self-harm") ??
    concerns.find((c) => c === "immediate-danger") ??
    concerns.find((c) => c === "sexual") ??
    concerns[0];

  return { triggered: true, concerns, ...HEADLINES[lead] };
}

/**
 * Repeated escalation gets a firmer prompt each time, rather than the
 * same dismissable box.
 */
export function escalationLevel(previousTriggers: number): "first" | "repeat" | "persistent" {
  if (previousTriggers <= 0) return "first";
  if (previousTriggers < 3) return "repeat";
  return "persistent";
}

export type Helpline = {
  region: string;
  name: string;
  contact: string;
  note: string;
  href?: string;
};

export const HELPLINES: Helpline[] = [
  {
    region: "United Kingdom",
    name: "Childline",
    contact: "0800 1111",
    note: "Free, 24 hours, for anyone under 19. It won't show on the phone bill.",
    href: "https://www.childline.org.uk",
  },
  {
    region: "United Kingdom",
    name: "Samaritans",
    contact: "116 123",
    note: "Free, 24 hours, any age.",
    href: "https://www.samaritans.org",
  },
  {
    region: "United States",
    name: "988 Suicide & Crisis Lifeline",
    contact: "Call or text 988",
    note: "Free, 24 hours.",
    href: "https://988lifeline.org",
  },
  {
    region: "United States",
    name: "Crisis Text Line",
    contact: "Text HOME to 741741",
    note: "Free, 24 hours, by text.",
    href: "https://www.crisistextline.org",
  },
  {
    region: "Canada",
    name: "Kids Help Phone",
    contact: "1-800-668-6868, or text CONNECT to 686868",
    note: "Free, 24 hours, for young people.",
    href: "https://kidshelpphone.ca",
  },
  {
    region: "Canada",
    name: "9-8-8 Suicide Crisis Helpline",
    contact: "Call or text 988",
    note: "Free, 24 hours.",
    href: "https://988.ca",
  },
  {
    region: "Anywhere else",
    name: "Find a Helpline",
    contact: "findahelpline.com",
    note: "Free helplines in your own country, in your own language.",
    href: "https://findahelpline.com",
  },
];

/** Places a report can go that are not the school. */
export type OutsideRoute = {
  region: string;
  name: string;
  what: string;
  href: string;
};

export const OUTSIDE_ROUTES: OutsideRoute[] = [
  {
    region: "United Kingdom",
    name: "Tell MAMA",
    what: "Records and supports victims of anti-Muslim incidents, independently of any school.",
    href: "https://tellmamauk.org",
  },
  {
    region: "United Kingdom",
    name: "The school's governors, or the local authority",
    what: "Where the school itself is part of the problem, a complaint goes above the head teacher.",
    href: "https://www.gov.uk/complain-about-school",
  },
  {
    region: "United States",
    name: "CAIR",
    what: "Takes civil rights reports from Muslim students and families, and can act on them.",
    href: "https://www.cair.com/report",
  },
  {
    region: "United States",
    name: "Office for Civil Rights, US Department of Education",
    what: "Takes Title VI complaints about a school directly.",
    href: "https://ocrcas.ed.gov",
  },
  {
    region: "Canada",
    name: "NCCM (National Council of Canadian Muslims)",
    what: "Takes reports of anti-Muslim incidents and provides support.",
    href: "https://www.nccm.ca/programs/incident-report-form/",
  },
];
