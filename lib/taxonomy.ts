import type { IncidentTypeId, PlaceId, JurisdictionId } from "./types";

/* ------------------------------------------------------------------ *
 * What happened, written the way a young person would say it.
 * `classification` is the plain, correct name for the thing, which is
 * the whole point: these are not "banter" and not generic "bullying".
 * ------------------------------------------------------------------ */

export type IncidentType = {
  id: IncidentTypeId;
  label: string;
  /** shown on the entry in the timeline and in the case file */
  classification: string;
  /** one sentence, addressed to the child */
  why: string;
  /** raises the severity read of a pattern */
  weight: 1 | 2 | 3;
};

export const INCIDENT_TYPES: IncidentType[] = [
  {
    id: "terrorist",
    label: "Called me a terrorist, or a bomber",
    classification: "Religiously motivated abuse",
    why: "Being called a terrorist because of your religion is a religiously motivated incident. It is not name-calling, and it is not banter.",
    weight: 2,
  },
  {
    id: "hijab-comments",
    label: "Comments about my hijab or how I dress",
    classification: "Religiously motivated harassment",
    why: "Unwanted comments about religious dress are harassment related to religion, which is treated separately from ordinary teasing.",
    weight: 2,
  },
  {
    id: "hijab-touched",
    label: "Someone pulled at or touched my hijab",
    classification: "Physical religiously motivated harassment",
    why: "Touching or pulling someone's religious dress without permission is a physical act, not a joke. It is one of the most commonly reported incidents by hijab-wearing students.",
    weight: 3,
  },
  {
    id: "posted-about",
    label: "Someone posted or sent something about me",
    classification: "Online religiously motivated harassment",
    why: "It counts even though it happened online and even though it happened outside school hours.",
    weight: 2,
  },
  {
    id: "excluded",
    label: "Left out or avoided because I'm Muslim",
    classification: "Religiously motivated exclusion",
    why: "Being deliberately excluded because of your faith is a form of discrimination, even when nobody says anything out loud.",
    weight: 1,
  },
  {
    id: "prayer-fasting",
    label: "Stopped or mocked for praying or fasting",
    classification: "Interference with religious practice",
    why: "Being obstructed or ridiculed for practising your religion is a religiously motivated incident, and where an adult did it, it may also be discrimination by the school.",
    weight: 2,
  },
  {
    id: "staff",
    label: "A teacher or another adult at school said it",
    classification: "Incident involving a member of staff",
    why: "When the person is an adult at the school, this is not only bullying. It may be discrimination by the school itself, and it may need to go to someone outside the school.",
    weight: 3,
  },
  {
    id: "physical",
    label: "Someone hurt me or threatened to",
    classification: "Physical assault or threat, religiously motivated",
    why: "Violence and threats of violence are separate from bullying, and are treated more seriously.",
    weight: 3,
  },
  {
    id: "property",
    label: "My things were damaged or taken",
    classification: "Religiously motivated damage to property",
    why: "Damage or theft targeted at you because of your faith is part of the same pattern, and it leaves evidence.",
    weight: 2,
  },
  {
    id: "other",
    label: "Something else",
    classification: "Religiously motivated incident",
    why: "If it happened because of your faith, it belongs in the record.",
    weight: 1,
  },
];

export const TYPE_BY_ID = Object.fromEntries(
  INCIDENT_TYPES.map((t) => [t.id, t])
) as Record<IncidentTypeId, IncidentType>;

/* ------------------------------------------------------------------ */

export type Place = {
  id: PlaceId;
  label: string;
  /** true where the school cannot normally see what happens */
  offSchoolView: boolean;
  group: "At school" | "Online";
};

export const PLACES: Place[] = [
  { id: "classroom", label: "In a lesson", offSchoolView: false, group: "At school" },
  { id: "corridor", label: "Corridor or stairs", offSchoolView: false, group: "At school" },
  { id: "playground", label: "Playground or outside", offSchoolView: false, group: "At school" },
  { id: "changing-room", label: "Changing rooms or PE", offSchoolView: false, group: "At school" },
  { id: "bus", label: "On the bus or walking home", offSchoolView: true, group: "At school" },
  { id: "outside-school", label: "Somewhere else", offSchoolView: true, group: "At school" },
  { id: "group-chat", label: "Group chat", offSchoolView: true, group: "Online" },
  { id: "snapchat", label: "Snapchat", offSchoolView: true, group: "Online" },
  { id: "instagram", label: "Instagram", offSchoolView: true, group: "Online" },
  { id: "tiktok", label: "TikTok", offSchoolView: true, group: "Online" },
  { id: "other-online", label: "Somewhere else online", offSchoolView: true, group: "Online" },
];

export const PLACE_BY_ID = Object.fromEntries(
  PLACES.map((p) => [p.id, p])
) as Record<PlaceId, Place>;

/* ------------------------------------------------------------------ *
 * What the receiving adult is looking at, and what duty attaches.
 * General information about published legal duties. Not legal advice.
 * ------------------------------------------------------------------ */

export type Jurisdiction = {
  id: JurisdictionId;
  label: string;
  /** the duty, in one paragraph a head of year can act on */
  duty: string;
  /** the specific instruments, for the footer of the case file */
  instruments: string[];
  /** the gap this record fills in that system */
  gap: string;
};

export const JURISDICTIONS: Record<JurisdictionId, Jurisdiction> = {
  "england-wales": {
    id: "england-wales",
    label: "England & Wales",
    duty:
      "Schools must not discriminate against or harass a pupil because of religion or belief, or because of race, and must take reasonable steps to prevent it. Harassment related to a protected characteristic is a distinct category from general bullying, and a school's behaviour policy is required to address it.",
    instruments: [
      "Equality Act 2010, s.85: discrimination and harassment of pupils",
      "Equality Act 2010, s.149: public sector equality duty",
      "Education and Inspections Act 2006, s.89: measures to prevent all forms of bullying",
      "Keeping Children Safe in Education: statutory safeguarding guidance",
    ],
    gap:
      "There is no legal requirement in England for a school to record racist or religiously motivated incidents. Mandatory recording was removed in 2012 and the government declined to reinstate it in March 2023. This record exists because nothing in the system produces one.",
  },
  "united-states": {
    id: "united-states",
    label: "United States",
    duty:
      "A school receiving federal funding has a duty under Title VI to address harassment based on race, colour or national origin, which the Department of Education applies to students targeted because they are, or are perceived to be, Muslim. The duty is triggered once the school has actual or constructive notice, and the legal standard is conduct that is sufficiently severe, pervasive or persistent to limit a student's ability to participate in or benefit from the school's programme.",
    instruments: [
      "Title VI of the Civil Rights Act of 1964",
      "US Department of Education guidance on racial incidents and harassment against students",
      "State anti-bullying statutes, where applicable",
    ],
    gap:
      "A single incident is rarely severe enough to meet the standard on its own. A dated, evidenced pattern is what 'pervasive or persistent' describes, and nothing in a student's life normally produces one. Receipt of this document is itself notice.",
  },
  canada: {
    id: "canada",
    label: "Canada",
    duty:
      "Creed is a protected ground under provincial human rights codes, and school boards carry a duty to provide an environment free from discrimination and harassment. In Ontario, employees who become aware of a serious student incident are required to report it to the principal.",
    instruments: [
      "Ontario Human Rights Code: creed as a protected ground",
      "Education Act, s.300.2 (Bill 157, Keeping Our Kids Safe at School Act)",
      "PPM 144: bullying prevention and intervention",
    ],
    gap:
      "Reporting duties are written around incidents judged individually serious. Persistent low-level religiously motivated harassment rarely qualifies one incident at a time, so the pattern never reaches the principal as a pattern.",
  },
  other: {
    id: "other",
    label: "Elsewhere",
    duty:
      "Most school systems place a duty on the school to protect students from harassment based on religion or ethnicity once the school is aware of it, and treat identity-based harassment as a category distinct from general bullying.",
    instruments: [
      "Local equality, human rights or education legislation",
      "The school's own behaviour and safeguarding policies",
    ],
    gap:
      "Systems act on incidents. This harm is a pattern. Wherever the duty is triggered by the school's awareness, a dated record is what creates that awareness.",
  },
};

export const JURISDICTION_LIST = Object.values(JURISDICTIONS);
