# Spec — Teacher / Classroom (School) Layer

> Goal: open Numera's **distribution and revenue channel**. Ed-tech money is overwhelmingly
> B2B2C (schools/districts) and parent subscriptions — and Numera already computes the exact
> data (multi-dimensional mastery, misconception diagnosis) that teachers pay for and can't get
> elsewhere. Roadmap items #12/#13 (Impact 9 / Difficulty 8). Status: design. Migration: **v13+**.

## 1. Why this is the highest-leverage *business* move
- Numera's `masteryEngine` (accuracy/fluency/retention/independence/transfer) and
  `misconceptionEngine` already produce **class-analytics gold**: a teacher seeing *"61% of the
  class shares the 'subtract-across-zero' misconception"* is a feature IXL/Khan would envy. You've
  built the hard part (the intelligence); you're missing the **container** (classes, rosters,
  assignments, dashboard) to sell it.
- Schools are how you get **users at zero CAC** (a teacher onboards 30 students at once) and how
  you get **recurring revenue** (per-seat site licenses).

## 2. Hard dependencies (be honest — these gate "schoolable")
This layer can be *built* independently but cannot be *sold to schools* until three other tracks
land. State these up front:
1. **Accessibility** (audit M4): the KaTeX-WebView math is opaque to screen readers + color-only
   state cues → **fails ADA/§508 → US public schools legally can't adopt it.** The accessible-math
   work is a school blocker, not a nice-to-have.
2. **Standards alignment**: teachers assign by standard (Common Core / state / GCSE). Requires the
   curriculum-expansion track (roadmap #3) to tag concepts with standard codes.
3. **Child-privacy decision** (audit C2): schools use the **COPPA school-consent exception** +
   **FERPA**. That requires a documented child-data model, DPA templates, and high-privacy defaults
   — the very decision the compliance audit defers. This layer forces it.

Build the container now; sequence the *sale* after those land.

## 3. Roles & identity
You already added **roles** in the auth overhaul. Extend the enum: `student` (default), `teacher`,
`school_admin`. Notes:
- Teacher accounts verify an email (you have the mailer + verification flow). Optionally gate
  teacher self-serve behind a lightweight check; districts get provisioned `school_admin`.
- **Student join model:** teacher creates a class → gets a **join code** (like friend-room codes,
  which already exist) → students join with the code. Under-13 students are permitted under the
  school-consent exception **only** with the documented child model from §2.3.

## 4. Schema — migrations v13+ (add every user/org table to `USER_SCOPED_TABLES`/deletion logic)
```
organizations(id, name, type)                              -- school/district (optional tier)
classes(id, teacher_id, org_id, name, join_code UNIQUE, grade_band, archived, created_at)
class_memberships(class_id, student_id, status, joined_at) -- roster; status: active|removed
                                                            PK(class_id, student_id)
assignments(id, class_id, title, concept_ids_json,         -- skills pulled from knowledgeGraph
            target_mastery, due_at, created_at)
assignment_progress(assignment_id, student_id, status,     -- not_started|in_progress|complete
            mastery_snapshot_json, completed_at)
licenses(org_id, seats, seats_used, plan, expires_at)      -- entitlement (shared w/ monetization)
```
- **Deletion semantics differ from consumer tables:** a student's *learning* data is theirs
  (delete on account deletion), but `class_memberships`/`assignment_progress` may be **education
  records** a school must retain (FERPA). Resolve in the child-data model: on student account
  delete, anonymize roster rows rather than orphan them; document it. (This nuance is exactly why
  C4's "delete every user table" needs a documented carve-out here.)

## 5. Server — routes & services
- `routes/teacher.js`: `POST /api/classes` (create + join code), `GET /api/classes`,
  `POST /api/classes/:id/archive`, `GET /api/classes/:id/roster`,
  `DELETE /api/classes/:id/students/:studentId`.
- `routes/assignments.js`: `POST /api/assignments` (pick concepts from the knowledge graph, set
  due + target mastery), `GET /api/assignments?classId=`, `GET /api/assignments/:id/progress`.
- `routes/classroom.js` (student side): `POST /api/classes/join` (code), `GET /api/my-classes`,
  assigned work surfaces in the existing learning path.
- `services/classroomService.js`: roster ops, assignment fan-out, and the **analytics
  aggregator** — this is the value. It reads existing `user_mastery`, `user_misconceptions`,
  `user_concept_analytics` scoped to a class roster and returns:
  - per-student mastery across the 5 dimensions,
  - **class misconception heatmap** (top shared misconceptions — the killer feature),
  - assignment completion + time-on-task,
  - **struggling-student alerts** (low mastery / high frustration_index / burnout_risk).
- **Authorization is critical (IDOR risk):** every teacher endpoint must verify
  `class.teacher_id === req.user.id` (or org membership) before returning *any* student data —
  the same per-route ownership discipline the audit already enforces elsewhere. Add tests.
- Respect `telemetry_enabled`/consent: analytics derived from behavioral profiling must honor the
  child model; a school DPA is the lawful basis in the classroom context.

## 6. Client — teacher dashboard is **web-first**
Teachers work on laptops; a teacher dashboard on a phone is the wrong form factor. This is the
natural first use of the **web client** (roadmap #17), and it sidesteps building a second complex
Android surface. Minimum web dashboard:
- Class list + create/join-code share.
- Roster with per-student mastery (the 5 dimensions) + last-active.
- **Class misconception heatmap** (lead with this in demos — nobody else has it).
- Assignment builder (browse knowledge graph by standard → assign → due date) + completion view.
- Struggling-student alerts.
Student side stays on the **existing Android app** (assigned work appears in their path); add a
"Join a class" entry and an assignments surface.

## 7. Monetization tie-in (shared with the consumer-subscription track)
- **Per-seat site license** (`licenses` table) is the school revenue model; **parent subscription**
  (Prodigy's wedge) reuses the same entitlement system. Build a single `entitlementService` that
  both consumer subscriptions and org licenses resolve through — gate premium analytics/assignment
  features by entitlement, never gate *core learning* (keep the free product genuinely good and
  non-pay-to-win, per the audit).
- No real-money mechanics touch *gameplay*; payments are for access/seats only.

## 8. Compliance (this layer is a compliance event — loop counsel before selling)
- **FERPA** (US education records): data ownership, parent/eligible-student access, retention,
  the §4 deletion carve-out, vendor DPA templates.
- **COPPA school-consent** model documented (the deferred C2 decision); high-privacy defaults;
  profiling consented via the school.
- **State student-privacy laws** (e.g. SOPIPA) and the standard **Student Privacy Pledge**.
- Accessibility (§2.1) is a procurement gate, not optional.
- Update Privacy Policy + add a **Schools/DPA** addendum and a child-mode policy record.

## 9. Test plan
- Authorization: a teacher cannot read another class's roster/analytics (IDOR tests, like the
  `profile_private` fix).
- Join-code lifecycle (create → join → remove → archive); assignment fan-out + progress rollup.
- Analytics aggregator over a seeded class on a throwaway DB (mastery + misconception heatmap).
- Deletion carve-out: student delete anonymizes roster/education rows without orphaning.

## 10. Build order
1. **Roles + classes + join code + roster** (smallest sellable nucleus; reuses friend-code +
   role infra). 2. **Assignments** (concept picker over the knowledge graph) + student surfacing.
3. **Analytics aggregator** (mastery + misconception heatmap) — the demo-winning value.
4. **Web teacher dashboard** (first web-client beachhead). 5. **Entitlement/licensing + billing**
   (shared with consumer subscription). 6. Compliance pack (FERPA/COPPA-school, DPA, accessibility)
   **before** any school sale.

> Sequencing reality: you can build steps 1–4 now to *demo* and gather teacher feedback, but
> steps 5–6 + the accessibility/standards dependencies must close before money changes hands with
> a real school.
