# 📚 EduCare — Early Warning System for Student-Centered Care
> A teacher-facing, offline-first mobile application that transforms routine classroom data into automated early warnings and structured care workflows — so every student who needs individualized attention gets it, regardless of class size or teacher bandwidth.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Problem Validation](#problem-validation)
3. [The Friction Point](#the-friction-point)
4. [Proposed Solution](#proposed-solution)
5. [How It Works](#how-it-works)
6. [The Care Loop](#the-care-loop)
7. [Use Across the School Year](#use-across-the-school-year)
8. [Features](#features)
9. [Offline-First Architecture](#offline-first-architecture)
10. [MVP Scope](#mvp-scope)
11. [Future Directions](#future-directions)

---

## The Problem

Teachers across the Philippine public school system — and education systems globally — face a persistent and structurally embedded challenge: **they cannot provide individualized care to every student who needs it.**

This is not a matter of willingness. Teachers, by and large, care deeply about their students. The barrier is systemic and practical, rooted in three compounding constraints:

### 1. Time Poverty
Teachers carry a disproportionate administrative load — grading, reporting, compliance paperwork, lesson preparation — that crowds out student-facing time. Research from the OECD's Teaching and Learning International Survey (TALIS) consistently shows that in many countries, less than half of a teacher's total working hours are spent on actual instruction, let alone individualized student interaction.

### 2. Unsustainable Class Sizes
In the Philippine public school context, DepEd data has documented average class sizes well above 40 students per teacher in many regions, with some urban schools exceeding 60 students per class. At that ratio, even if a teacher dedicated two minutes of individualized attention to each student per day, that alone would consume over two hours — on top of all other responsibilities.

### 3. No Standard System for Individualized Care
There is no universally adopted framework for post-class individualized student care. What exists are fragmented, informal approaches — advisory periods, homeroom guidance, counselor referrals — that are inconsistent across schools and dependent entirely on a teacher's individual initiative, personality, and remaining bandwidth.

This means that student care, as it stands, is:
- **Untracked** — no record of who was attended to and who was not
- **Unscalable** — dependent on teacher memory and intuition
- **Inequitable** — students with more proactive teachers or more engaged parents receive it; many others do not

---

## Problem Validation

This problem is well-documented in education research and validated through direct practitioner experience.

### From Research
- **OECD TALIS findings** repeatedly identify administrative burden as the primary constraint on teacher-student relational time across multiple countries and education systems.
- **Early Warning System (EWS) research** in education has demonstrated that students who exhibit early behavioral, attendance, and academic signals — when caught early — have significantly better outcomes than those identified only after significant decline. The challenge is that existing EWS tools are built for administrators, require institutional infrastructure, and are inaccessible to individual classroom teachers.
- **Differentiated instruction literature** consistently names class size and time as the two greatest barriers to individualized teaching — confirming that the problem is structural, not motivational.

### From the Field
A conversation with a practicing teacher surfaced the same pain points independently:
- There is simply not enough time to attend to each student individually after class.
- The number of students per teacher makes one-on-one care logistically impossible at scale.
- There are no standard resources or systems to guide how a teacher should perform individualized care.
- Student concerns that are noticed informally often fall through the cracks because there is no mechanism to track or follow up on them.

### The Core Gap
Most EdTech solutions have historically optimized for **content delivery** — learning management systems, e-learning modules, digital textbooks. The **relationship and care infrastructure layer** — the tools that help teachers manage, track, and act on student wellbeing — remains deeply underbuilt. This is the gap this project addresses.

---

## The Friction Point

Viewed through a product lens, the problem maps cleanly onto a classic friction pattern:

| Element | State |
|---|---|
| **Known need** | Personalized student care |
| **Known constraint** | Teacher time and capacity |
| **Existing system** | None — care is informal, untracked, memory-dependent |
| **Result** | Need goes unmet at scale; outcomes are inequitable |

The absence of a governing system is not just an inconvenience — it means the quality of care a student receives is almost entirely determined by circumstances outside their control: which teacher they are assigned to, how overwhelmed that teacher is, and whether the student's struggles are visible enough to draw attention on their own.

---

## Proposed Solution

**EduCare** is a teacher-facing mobile application that sits on top of data teachers already collect — attendance, grades, homework submission — and uses that data to automatically identify which students need individualized care, then guides teachers through a structured response workflow.

### The Three Pillars of EduCare
The platform is built upon three foundational pillars that manage the entire lifecycle of student intervention:
1. **Pillar 1: Discovery** — The Early Warning System (EWS) lives here. The system analyzes routine data (attendance, grades, behavior) to automatically detect and learn which students need specialized care. For a deep dive into how we extract rich data with zero added teacher workload, see [discovery.md](file:///C:/Users/Raziel/OneDrive/Documents/06_Projects/Educare/discovery.md).
2. **Pillar 2: Response** — Once a need is discovered, the system assists the teacher in executing specialized care through guided, low-friction workflows (e.g., check-in guides, escalation paths).
3. **Pillar 3: Recovery** — The system monitors the ongoing status of students who have received a response, tracking subsequent data to determine if they are improving or if further intervention is required.

### The Core Design Principle
Rather than asking teachers to identify who needs care (which requires judgment, time, and emotional bandwidth they may not have), the system identifies students for them. Teachers input routine quantitative data. The system concludes who needs attention and what kind. The teacher becomes the responder, not the detector.

### Why Offline-First
The Philippine education context demands offline capability. Connectivity is uneven across municipalities and nearly absent in many rural and remote school settings. An app that requires internet access to function would exclude the schools that need it most. EduCare is built offline-first: all data lives on the device, all logic runs locally, and syncing to the cloud happens opportunistically when connectivity is available.

---

## How It Works

### Step 1 — Data Input
Teachers log routine classroom data through a fast, low-friction interface:

- **Attendance** — Present, Absent, Late, or Excused, marked per student per day with bulk-marking to minimize taps
- **Assessment scores** — Quizzes, long tests, projects, recitations, logged per student per assessment
- **Homework submission** — Submitted, late, or missing, tracked per assignment
- **Participation tags** — A one-tap per-session tag per student: active, passive, non-participating, or behavioral incident
- **Optional enrichment** — Parent communication status, observed mood changes, health-flagged absences

None of this is new work. These are records teachers maintain as part of their standard professional responsibilities. The app consolidates them into one place.

### Step 2 — Early Warning System (EWS) Engine
The EWS runs entirely on-device. It analyzes logged data against configurable thresholds and surfaces students whose patterns indicate a need for individualized attention.

**Example flag triggers:**
- 3 or more absences within any 2-week rolling window
- A grade drop of 15 or more points across consecutive assessments
- 3 consecutive missing homework submissions
- Any two concern categories active simultaneously (combined signal = higher severity)

**Concern severity tiers:**
- 🟡 **Monitoring** — one weak signal detected; system watches without alerting strongly
- 🟠 **Flagged** — pattern confirmed; teacher action recommended
- 🔴 **Critical** — multiple combined signals or a prolonged unresolved flag; escalation recommended

Every flag is accompanied by a plain-language explanation of why it was triggered — the specific data points, the time window, and the pattern that led to the conclusion. No teacher is left wondering why a student appeared on their list.

### Step 3 — Care Workflow
Once a student is flagged, the system guides the teacher through a structured response:

1. **Triage** — a summary of the concern, its severity, and the data behind it
2. **Suggested action** — a concrete recommended next step based on the concern profile (check-in, parent contact, counselor referral, admin escalation)
3. **Guided check-in support** — for teachers conducting a student interaction, suggested conversation prompts calibrated to the concern type
4. **Care interaction log** — after the interaction, the teacher logs a brief structured outcome: what was done, what was observed, and whether the situation is improving, unchanged, or worsening
5. **Follow-up scheduling** — the system sets or suggests a follow-up date, resurfaces the student on that date with full context, and escalates automatically if the situation does not improve

---

## The Care Loop

```
Routine Data Input (attendance, grades, homework)
        ↓
EWS Engine runs on-device
        ↓
Student flagged with severity tier and plain-language explanation
        ↓
Teacher reviews triage summary
        ↓
System suggests care action
        ↓
Teacher performs care interaction (check-in / parent contact / referral)
        ↓
Teacher logs outcome (improving / unchanged / worsening)
        ↓
Follow-up scheduled automatically
        ↓
System monitors subsequent data
        ↓
Resolved ──────────────────────── or ──────── Escalated
```

The loop is designed to be self-sustaining. Once a student enters it, they remain tracked until the concern is explicitly resolved or escalated. No student falls through the cracks between steps.

---

## Use Across the School Year

EduCare is designed around the natural rhythm of the Philippine school year (June–March, four quarters). Its behavior adapts to where in the year it is.

| Period | System Behavior |
|---|---|
| **June — Baseline Building** | Roster setup, early data flows in, no flags yet. System learns what "normal" looks like per student. |
| **July–August — First Signals** | Early attendance and participation patterns emerge. Light interventions begin. Students who fall under the radar are caught. |
| **September–October — Q1 Close** | First hard academic data (grades) available. Quarter-end review report auto-generated. Sustained concerns escalate. |
| **November — Mid-Year Peak** | Student motivation typically dips. Follow-up tracking earns its keep as Q1 cases are revisited alongside new ones. |
| **December — Continuity Hold** | Short academic period before break. Open concerns queued for January re-entry. |
| **January — Semester Reset** | First-semester history now informs prioritization. Teachers enter Q3 with a data-backed watchlist. |
| **February–March — Resolution and Handover** | Final grades, promotion decisions. System supports documentation, exports care summaries for incoming teachers. |

### Time-Aware Logic
The system knows where it is in the school year relative to configured quarter boundaries. Escalation sensitivity increases as the year progresses — a single absence in June is normal; the same absence in March, before final assessments, carries materially more weight.

---

## Features

### Class and Student Management
- Class roster setup with student profiles (name, ID, gender, age, guardian contact)
- Bulk CSV import for schools with existing digital records
- Student profile view consolidating all data: attendance, grades, homework, behavioral tags, and care history in one place
- Visual concern status indicator per student (Clear / Monitoring / Flagged / Critical)

### Data Input Module
- **Attendance Logger** — daily marking with bulk-mark and retroactive entry support
- **Assessment and Grade Entry** — per-assessment score logging with automatic grade trajectory computation
- **Homework and Submission Tracker** — per-assignment compliance tracking with running rate per student
- **Behavioral and Participation Tags** — one-tap per-session tagging, designed for speed
- **Optional Enrichment Inputs** — parent communication log, mood change flags, health-related absence markers

### Early Warning System Engine
- Rule-based flag logic with configurable thresholds per concern category
- Three-tier severity system: Monitoring, Flagged, Critical
- Combined-signal detection (multiple concern types active simultaneously)
- Plain-language flag explanations with supporting data
- Time-aware escalation sensitivity calibrated to school year position
- Runs entirely on-device — no internet required

### Care Workflow Module
- Concern triage summary with severity and data breakdown
- Care action suggestions mapped to concern profiles
- Guided check-in conversation prompts by concern type
- Structured care interaction log
- Follow-up scheduling with automatic resurface on follow-up date
- Escalation pathway with auto-populated referral notes for counselors, parents, and admin

### Dashboard and Insights
- Class health overview: distribution of students across concern tiers
- Student watchlist for teacher-curated monitoring outside of system flags
- Per-student trend tracking: improving, stable, or worsening
- Per-class trend summaries: which concern types are most prevalent this quarter
- Quarter-end review report auto-generated at each quarter boundary

### Handover and Continuity
- Student care summary export at year-end for incoming teachers
- Full class data export in PDF (summary) and CSV (raw data) formats
- Care history is preserved across school years and teacher transitions

### Security and Privacy
- All student data encrypted on-device
- App locked via PIN or biometric authentication
- No student data transmitted to third parties
- Data sync is opt-in and scoped to backup only

---

## Offline-First Architecture

EduCare is built on a **local-first data model**. The application is fully functional with zero network connectivity.

| Layer | Approach |
|---|---|
| **Local storage** | SQLite on-device database |
| **EWS logic** | Runs locally — lightweight rule-based engine viable on mid-range Android |
| **Sync** | Background sync to cloud backup when connectivity is detected |
| **Conflict resolution** | Last-write-wins with timestamp-based conflict handling for multi-device edge cases |
| **Data security** | On-device encryption; biometric/PIN app lock |

This architecture ensures the app works equally well in a Metro Manila school with stable Wi-Fi and a rural school in Laguna with no connectivity at all.

---

## MVP Scope

Not all features need to ship in the first version. A focused MVP that validates the core loop:

1. ✅ Class roster and student profiles
2. ✅ Attendance logger
3. ✅ Assessment and grade entry
4. ✅ Homework submission tracker
5. ✅ EWS engine with basic flag logic (attendance + academic thresholds)
6. ✅ Care action suggestions and interaction log
7. ✅ Follow-up scheduler
8. ✅ Class health dashboard

Everything beyond this — guided check-in prompts, escalation pathways, trend summaries, handover exports, time-aware logic — is Phase 2, once the core loop is validated with real teachers in real classroom conditions.

---

## Future Directions

| Direction | Description |
|---|---|
| **Student-facing view** | A read-only view for students to see their own flagged concerns and progress notes, fostering self-awareness |
| **Parent-facing view** | Periodic structured updates pushed to guardians when connectivity allows |
| **Multi-teacher sync** | Shared class data for schools where multiple teachers handle the same section |
| **Admin dashboard** | Aggregated school-level view of concern trends for guidance coordinators and principals |
| **AI-assisted pattern detection** | Moving beyond rule-based thresholds toward lightweight ML models that surface non-obvious at-risk patterns |
| **DepEd integration** | Alignment with official reporting formats so care data feeds into existing school documentation requirements |

---

## Context

This project was conceived in response to a real, validated pain point surfaced through direct conversation with a practicing teacher in the Philippine public school system. It is grounded in the recognition that the most underbuilt layer of educational technology is not content delivery — it is the infrastructure that supports teachers in their relational and care responsibilities toward students.

The goal is not to replace teacher judgment or the human relationship between a teacher and a student. It is to ensure that judgment is better informed, that no student is forgotten between hectic school days, and that the care teachers already want to provide is no longer constrained by the limits of memory, time, and informal process.

---

*Built for teachers. Designed for students. Works anywhere.*
