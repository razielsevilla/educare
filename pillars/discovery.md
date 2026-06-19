# Pillar 1: Discovery (Early Warning System)

The first pillar of EduCare is **Discovery**. This is where the application’s Early Warning System (EWS) lives. The goal of Discovery is to algorithmically learn which students require specialized care before they slip through the cracks, allowing the teacher to act proactively rather than reactively.

## The Core Constraint: Zero Additional Input
If a system requires a teacher to fill out additional forms to detect a struggling student, it will fail. Teachers are already at maximum capacity. Therefore, the EWS must operate entirely on the data teachers *already* input during their day-to-day administrative tasks:
1. **Attendance** (Present, Absent, Late, Excused)
2. **Assessment Scores** (Quizzes, Long Tests, Projects)
3. **Homework Submissions** (Submitted, Late, Missing)
4. **Behavioral Tags** (Quick 1-tap tags: Active, Passive, Incident)

To generate rich, predictive insights from this basic data, EduCare relies on advanced algorithmic processing rather than additional data entry.

---

## How Discovery Works

### 1. Velocity and Pattern Extraction
Instead of simple thresholds (e.g., "flag if 3 absences"), the EWS extracts meaning from the *distribution* of the data over time:
* **Attendance Patterns:** Missing three consecutive days is flagged as a likely physical illness (low EWS risk). However, missing every Monday for three weeks, or an escalating pattern of scattered absences, is flagged as a structural or home-life disruption (high EWS risk).
* **Homework Velocity:** A student missing an assignment is normal. A student missing an assignment *immediately following* an absence triggers a specific "Re-entry Risk" flag, catching the moment a student begins to fall behind.

### 2. Personal Historical Baselines
Traditional systems use flat thresholds (e.g., "failing is below 75"). The EduCare EWS calculates a personal baseline and tracks standard deviation. 
* If an A-student suddenly begins scoring C's, the system instantly flags an anomaly. 
* This makes the system sensitive to behavioral shifts in high-performing students who are often ignored by traditional failure-based EWS models.

### 3. Cross-Subject Aggregation (Multi-Tenant Architecture)
Because EduCare operates on a school-wide, zero-knowledge architecture, the backend can safely and anonymously aggregate signals across a student's entire schedule.
* If a student is tagged as "Passive" or "Withdrawn" in Math, Science, and English on the same day by three different teachers, the EWS instantly correlates this data and escalates a warning to the student's Advisory Teacher. 
* The Advisory Teacher gains a rich, multi-dimensional view of the student’s wellbeing, even though no single teacher did anything more than their standard daily logging.

### 4. NLP on Care Interaction Logs
When a teacher naturally completes a workflow (such as logging that they spoke to a parent), they might leave a short text note. 
* A lightweight, on-device Natural Language Processing (NLP) model scans these notes for keywords related to *fatigue, hunger, family disruption, or bullying*.
* If detected, it elevates the student's overall risk profile automatically, extracting qualitative data without requiring a formal behavioral survey.

---

## The Output of Discovery
When the EWS algorithms detect a pattern, the Discovery pillar pushes a notification to the teacher's dashboard. 

The teacher does not have to hunt for the struggling student. The system simply says: **"Maria needs your attention today, and here is why."** 

This hands off the workflow to **Pillar 2: Response**, where the teacher is guided on exactly what to do next.
