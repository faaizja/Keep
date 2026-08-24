export type IncidentTypeId =
  | "terrorist"
  | "hijab-comments"
  | "hijab-touched"
  | "posted-about"
  | "excluded"
  | "staff"
  | "physical"
  | "property"
  | "prayer-fasting"
  | "other";

export type PlaceId =
  | "classroom"
  | "corridor"
  | "playground"
  | "changing-room"
  | "bus"
  | "outside-school"
  | "group-chat"
  | "snapchat"
  | "instagram"
  | "tiktok"
  | "other-online";

export type Incident = {
  id: string;
  /** ISO date (yyyy-mm-dd) the incident happened */
  date: string;
  /** ISO timestamp the entry was written */
  createdAt: string;
  types: IncidentTypeId[];
  place: PlaceId;
  /** free text, optional — the child's own words */
  note?: string;
  /** first names / initials the child chose to record, optional */
  people?: string[];
  /** did an adult at school already know about this one */
  toldAdult?: boolean;
  adultResponse?: string;
  evidence?: EvidenceImage[];
};

export type EvidenceImage = {
  id: string;
  /** redacted image, base64 data URL — the original is never stored */
  dataUrl: string;
  width: number;
  height: number;
  facesFound: number;
  textRegionsFound: number;
  manualRedactions: number;
  /** the child confirmed they looked at it */
  humanChecked: true;
  checkedAt: string;
};

export type ShareRef = {
  id: string;
  createdAt: string;
  incidentCount: number;
  /** what the child chose to show the recipient */
  identityMode: "named" | "anonymous";
  jurisdiction: JurisdictionId;
  /** filled in locally once the recipient opens it */
  receivedAt?: string | null;
  revoked?: boolean;
};

export type KeepRecord = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  incidents: Incident[];
  /** how the child wants to be identified in anything they share */
  identity: { mode: "named" | "anonymous"; name?: string; yearGroup?: string };
  shares?: ShareRef[];
};

export type SharePayload = {
  version: 1;
  generatedAt: string;
  identity: KeepRecord["identity"];
  incidents: Incident[];
  jurisdiction: JurisdictionId;
};

export type JurisdictionId = "england-wales" | "united-states" | "canada" | "other";

export const EMPTY_RECORD = (): KeepRecord => ({
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  incidents: [],
  identity: { mode: "anonymous" },
  shares: [],
});
