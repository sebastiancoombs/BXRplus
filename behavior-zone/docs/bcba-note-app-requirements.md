# BCBA Note-Writing → BXR+ App Requirements

Purpose: quick product reference for building BXR+ notes around how ABA clinicians actually document sessions. This is not payer/legal advice. Real payer templates uploaded by the clinic remain the source of truth.

## Research basis

Public ABA documentation guidance consistently says session notes should:

- Be written promptly and objectively.
- Identify the client, provider, date, start/end time, duration, place of service, participants, service/CPT type, and signature/credentials when required.
- Link the session to treatment-plan goals/objectives.
- Capture what happened: behaviors observed, skill acquisition targets, antecedents/context, interventions/protocols used, prompt levels, reinforcement, and client response.
- Include measurable data where available: frequency, duration, intensity, trials, accuracy, percent independent, prompt level, latency, barriers, progress/regression.
- Document what changed and why, especially for BCBA/QHP protocol modification/supervision notes.
- State next steps: continue, modify, fade, monitor, caregiver/staff follow-up, or BCBA review.
- Avoid vague language like “did well” unless tied to observable data.
- Avoid copy/paste carry-forward as if it happened today.

Sources reviewed:
- CASP session note template resources: https://www.casproviders.org/session-note-template-resources
- ABA Coding Coalition/CPT supplemental guidance linked by CASP: https://abacodes.org/wp-content/uploads/2019/06/CPT_SupplementalGuidance190109.pdf
- TriWest/Tricare Autism Care Demonstration documentation QRG search result/PDF excerpts: https://tricare.triwest.com/globalassets/tricare/provider/autism-care-demonstration-documentation-and-quality-monitoring-qrg.pdf
- Passage Health ABA session note guidance: https://www.passagehealth.com/blog/aba-session-notes-examples
- Theralytics ABA session notes guidance: https://www.theralytics.net/blogs/aba-session-notes-examples

## Product rule

BXR+ should not force the clinician to think in billing/template structure before capturing the session. Capture first, structure later.

The app should support this sequence:

1. Pick/open client.
2. Start typing raw session notes immediately.
3. Optionally tag goals/behaviors during session, but never require it upfront.
4. Afterward, let AI organize raw notes into sections.
5. Clinician reviews suggested goal links and clicks to attach.
6. Clinician selects/uses payer + CPT template.
7. AI drafts the final insurance-facing note from clinician-entered facts, selected goals, data, prior context, and uploaded payer template.
8. Clinician edits/reviews before marking ready/submitted.

## Minimum data model requirements

### Client/profile
- client name
- DOB when needed for documentation/export
- assigned insurance payer
- default CPT template for that client, optional
- BXR+ reinforcement/work goals for token economy operations
- separate BCBA clinical goals for insurance-facing notes
- behavior reduction targets when clinically documented
- caregiver/team context when relevant

### Payer/template
- insurance payer
- CPT code
- payer-specific template body uploaded/pasted by clinic
- optional payer-specific required fields/checklist
- optional common default wording approved by clinic/Bryn
- source file metadata for template upload
- version/history of uploaded template

Important: starter CPT rows should be blank slots. Do not invent payer language.

### Clinical goals vs BXR+ work goals

BXR+ point/work goals are product/reinforcement goals used for the token economy. They are not automatically insurance-facing clinical goals. Notes must populate from BCBA-created clinical goals (`clinical_goals`), not from BXR+ behavior/point goals. A clinical goal may be manually added by the BCBA or extracted from treatment-plan PDFs, then selected/linked to notes through `session_note_clinical_goals`.

### Session note
- client_id
- service date
- start time / end time / duration
- location / telehealth flag if needed
- provider and credentials
- participants present
- CPT/template selected
- raw quick notes
- structured fields:
  - setting events / caregiver report / antecedent context
  - goals targeted
  - behavior observations / ABC data
  - interventions/protocols/prompting/reinforcement
  - client response / data / progress or barriers
  - protocol modifications, if applicable
  - caregiver/staff training, if applicable
  - plan / next steps
- linked goals
- generated final note draft
- review status: draft → ready → submitted
- signature/export metadata later

## CPT-aware app behavior

### 97153 — direct 1:1 treatment
App should help capture:
- goals targeted during direct treatment
- programs/interventions run
- prompt levels
- reinforcement used
- measurable response/data
- behavior reduction targets if relevant
- plan for next direct session

### 97155 — protocol modification / supervision
App should help capture:
- why modification/supervision occurred
- data/barrier that prompted change
- what protocol was changed
- BCBA/QHP direction/modeling/coaching provided
- client response to modification
- RBT/caregiver response if present
- next steps and what to monitor

### 97156 — parent/caregiver guidance
App should help capture:
- caregiver goal/training topic
- ABA strategy taught/modeled
- caregiver participation/response
- recommendations/home plan
- generalization/caregiver implementation notes

### 97151 — assessment/reassessment
App should help capture:
- assessment activity completed
- measures/observations reviewed
- records/data reviewed when allowed by payer
- findings or clinical impressions
- treatment-plan updates/recommendations

Do not hard-code these as final payer requirements. Treat them as UX prompts/checklists that can be overridden by payer templates.

## Low cognitive load UX requirements

### Blank workspace first-run
If clinician opens Notes with no setup:
- Show client folders if clients exist.
- Primary CTA: `Start Raw Note`.
- Do not block on payer/template.
- Show small banner: `No payer template connected yet. Capture notes now; connect template before final draft.`
- Secondary CTA: `Add payer template`.

### During session
The default note screen should be one big fast text box:
- cursor active immediately
- Enter creates a new line
- autosave every few seconds / on blur
- no required fields while typing
- mobile-friendly

Optional lightweight chips beside/under the text box:
- Setting event
- Goal
- Behavior
- Intervention
- Response/data
- Plan

Chips should help sorting but not be required.

### After session
Actions should be simple:
- `Organize note`
- `Link goals`
- `Draft final note`

`Organize note` should:
- parse raw notes into structured sections
- keep original raw note unchanged
- mark AI-sorted content as suggested/editable

`Link goals` should:
- suggest goals based on raw note text and client goals
- require clinician click to attach each goal
- show why the goal was suggested

`Draft final note` should:
- require payer/CPT template before insurance-facing output
- use uploaded payer template if available
- use only clinician-entered notes, selected goals, actual BXR+ data, and prior notes as continuity context
- never auto-insert prior-session content without clinician review
- produce editable draft, not final/submitted note

## AI guardrails

AI may:
- sort raw text into sections
- suggest likely goals to link
- rewrite objective wording
- draft payer-facing narrative from provided facts
- flag missing fields like `[add duration]`

AI must not:
- invent data, times, participants, payer requirements, diagnoses, outcomes, percentages, or progress
- copy prior-session details as if they occurred today
- auto-link goals without clinician confirmation
- submit/export without clinician review

## Development implications

Build the notes system around three layers:

1. **Capture layer** — fastest possible raw note entry.
2. **Clinical organization layer** — goals, behaviors, interventions, data, plan.
3. **Payer output layer** — selected insurance + CPT template + final reviewed draft.

Do not optimize first for template completion. Optimize first for fast accurate capture, then safe organization, then payer-ready output.

## Acceptance checklist for future features

A notes feature is aligned with Bryn’s workflow if:

- It reduces time before the clinician can start typing.
- It preserves raw session facts.
- It links to client goals without requiring perfect tagging upfront.
- It helps convert messy notes into objective, measurable language.
- It respects payer-specific templates uploaded by the clinic.
- It requires clinician review before final note output.
- It avoids invented clinical/payer content.

A notes feature is drift if:

- It adds generic note-app complexity before session capture.
- It hard-codes clinical language without Bryn/clinic approval.
- It assumes payer rules not provided by the payer template.
- It makes the clinician configure insurance/templates before typing anything.
- It auto-carries prior-session content into today’s official note.
