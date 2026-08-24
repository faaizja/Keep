# Keep

**A private place for a Muslim student to keep a record of anti-Muslim incidents — and to hand that record over, on their own terms, as something a school has to act on.**

Built for the Harvest Anti-Muslim Hate Hackathon (GNCI, 22–25 August 2026). Track: **Report**.

---

## The problem

A Muslim child is targeted in small pieces. A name in a corridor. A comment about a hijab. A picture in a group chat. A rumour that runs for weeks.

No single piece is big enough for anyone to act on. In England there is **no legal requirement for a school to record any of it**. And the moment an adult intervenes, it moves into a private group chat where the school cannot see it at all.

So a pattern never forms. No consequence ever escalates. And the child learns that telling an adult costs them something and changes nothing.

**48%** of Muslim students report being bullied for their faith in a single school year, **22%** monthly or more often. **35%** report anti-Muslim comments from teachers or staff. And the outcome the numbers point to is the one that matters most: **23% have considered altering their behaviour or appearance to conceal their faith.** Bully a child for being Muslim for long enough and they stop being visibly Muslim.

## The insight

**Every legal system acts on incidents. This harm is a pattern. Nothing in a child's life produces one.**

| | The duty | Where it fails |
|---|---|---|
| **England & Wales** | Equality Act 2010 s.85 — schools must not harass or discriminate on religion or race | No requirement to *record* racist incidents. Removed in 2012; reinstatement refused in March 2023. The record never exists, so no pattern can form. |
| **United States** | Title VI — duty triggered by *actual or constructive notice*; standard is conduct "severe, **pervasive or persistent**" | A single incident almost never meets the standard. Nothing produces documented notice of a pattern. |
| **Canada (Ontario)** | Education Act s.300.2 — staff must report *serious* student incidents to the principal | Persistent low-level religiously motivated harassment never individually qualifies as serious. |

Different systems, identical failure point. Keep is an instrument for producing documented notice of a pattern — which is precisely what these laws ask for and what nothing currently supplies.

## What it does

1. **Log it** — about twenty seconds. Preset incident types written the way a fourteen-year-old would say them, where it happened, when, an optional sentence, an optional screenshot.
2. **See the pattern** — the child's own months on one screen. A fog of individually-shruggable humiliations becomes a visible campaign, with escalation, frequency, repeat individuals, and the point it moved online all derived and shown.
3. **Name it properly** — every entry carries its correct classification. *Being called a terrorist because of your religion is a religiously motivated incident. It is not name-calling, and it is not banter.* This is the top recommendation of the Welsh study into why pupils don't report: stop filing racist incidents under generic "bullying".
4. **Hand it over** — one link produces a designed case view for a chosen adult, with the relevant legal duty stated at the top. Or a route that bypasses the school entirely, because a third of students say staff are part of the problem.
5. **Hear back** — the recipient marks it received, and the child sees the date. **73.5%** of people who report never receive a single update; it is the most common reason they stop reporting.

## How the privacy actually works

This is the part we would most like to be judged on.

**No account, ever.** No name, no email, no age, no school. A sign-up wall in front of a distressed thirteen-year-old is where the product dies — and a school-issued email address is readable by the school's IT administrator, which for a child documenting harassment by staff would be a betrayal, not a feature.

**A Keep code instead.** Four words and a number, generated in the browser from the platform CSPRNG. It is the only way back in, and it is also the encryption key. Keep cannot recover it, because Keep does not know who anyone is. That trade-off is stated to the child in one plain sentence at the moment the code appears.

**Everything is sealed before it moves — including on disk.** The record is encrypted with AES-GCM under a key derived by PBKDF2 (250,000 iterations, SHA-256) from the Keep code. Browser storage holds ciphertext only, so opening developer tools on a shared school computer reveals nothing. The key exists in page memory and nowhere else; a refresh requires the code again.

**The server holds ciphertext it cannot read.** Two Supabase tables of `{ id, iv, blob }`. The row id is a SHA-256 hash of the Keep code, derived down a *different* path from the encryption key, so an id cannot be worked backwards into a key. There is no key anywhere in the system.

**Share links keep their key out of the request.** The decryption key travels in the URL fragment, which browsers never transmit to a server. The recipient's own browser does the decryption. The child can switch the link off at any time — the bundle is emptied and the address goes dead.

**The shared computer is cleaned up.** Local data is wiped on close and after an idle timeout, so the next child who sits down at the library machine finds an app with nothing in it.

**Screenshots are redacted on the device, by a human.** Faces are detected and blurred automatically by a model **served from Keep's own origin** — the picture, which contains other children, never reaches a third-party service. Redaction is destructive: the blurred pixels are burned into a re-encoded image, the original is discarded, and EXIF metadata including location is stripped in the same step. The child then *has* to look at the result and confirm it before it can be saved.

## Safeguarding: interrupt, offer, never report

Where an entry suggests self-harm, violence, sexual harm or immediate danger, Keep interrupts **before the entry is saved**, puts real region-specific helplines in front of the child, and then lets them decide. Repeated triggers escalate the prompt.

**Keep never contacts anyone on a child's behalf.** A tool that silently escalates to an adult is a tool children stop trusting, and a child who stops trusting it goes back to recording nothing — which is worse than where we started. Human oversight here means putting the human in front of the child, not behind their back.

The check is a deliberately simple, inspectable phrase match rather than a model: it runs offline, nothing is sent anywhere to be classified, and anyone can read exactly what it looks for in `lib/safeguarding.ts`.

## Running it

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Keep runs with **no configuration at all** — without Supabase it works entirely in the browser, and share links carry their sealed payload inside the URL fragment instead. To enable cross-device Keep codes and revocable links, create a Supabase project, run `supabase-schema.sql` in the SQL editor, and fill in `.env.local`.

The anon key is safe to publish: the tables hold nothing but ciphertext.

## Built with

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Supabase (ciphertext storage only) · Web Crypto API · `@vladmandic/face-api` tiny face detector, self-hosted

## Known limitations

Stated plainly, and each one checked by hand.

- **Automatic text redaction is not included.** Faces are detected; names, @handles and phone numbers are not. In-browser OCR was slow and unreliable enough that shipping it would have implied a completeness we could not deliver. The interface says so where the child can see it, and the human confirmation step is mandatory rather than advisory.
- **Face detection is not perfect.** It performs poorly on partial faces, unusual angles and very small faces. This is why the child must confirm every image rather than trusting the automatic pass.
- **A lost Keep code is unrecoverable.** Deliberate. The alternative is knowing who the child is.
- **Keep-code entropy is roughly 42 bits**, chosen so a young person can write four words and a number on paper. Guessing is constrained by rate limiting at the API layer; a production deployment should add a proof-of-work or per-IP throttle on record reads.
- **Row-level security is permissive by design** — rows are addressable only by unguessable ids, and there is no listing policy. A production deployment would add server-side rate limiting rather than relying on id entropy alone.
- **A child may never choose to escalate.** Keep does not solve that, and does not claim to. The record exists for the day they do.
- **No outcomes are claimed.** Keep addresses a documented structural gap; it has not been trialled with students, and we do not assert that it changes school behaviour.
- **Jurisdiction text is general information about published duties, not legal advice.**

## Safety of this repository

Every incident in the worked example is synthetic and describes what happened rather than reproducing it. No hateful material appears anywhere in this codebase, in the demo data, or in any test fixture. The student, the other pupils and the school are fictional. No real personal data was collected or used at any point.

## AI disclosure

Built with **Claude (Anthropic)** used for research, product design and code generation throughout, in the Cowork environment. All legal and statistical claims were checked against the primary sources listed below. All product decisions, all architectural decisions, and all copy were reviewed by a human before inclusion.

## Sources

- FRA, *Being Muslim in the EU* (2024) — https://fra.europa.eu/en/publication/2024/being-muslim-eu
- Davis et al. (2025), why pupils do not report racist incidents — https://journals.sagepub.com/doi/10.1177/27526461241312235
- US Department of Education, racial incidents and harassment against students — https://www.ed.gov/laws-and-policy/civil-rights-laws/harassment-bullying-and-retaliation/racial-incidents-and-harassment-against-students
- Government rejects demand for schools to record racist incidents — https://www.voice-online.co.uk/entertainment/exclusive/2023/03/10/government-rejects-demand-for-schools-to-record-racist-incidents/
- Massachusetts Muslim student bullying survey — https://www.campussafetymagazine.com/news/nearly-half-of-muslim-students-in-massachusetts-bullied-for-their-religious-identity/167136
- Muslim students feel unsafe at school (CAIR-CA) — https://19thnews.org/2021/11/muslim-students-schools-hijab/
- Bill 157, Keeping Our Kids Safe at School Act (Ontario) — https://www.wcdsb.ca/our-schools/safe-schools/bill-157-keeping-our-kids-safe-at-school-act/
- Tell MAMA, *The New Norm of Anti-Muslim Hate* (2025) — https://tellmamauk.org
