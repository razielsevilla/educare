# Pillar 3: Recovery

The final pillar of EduCare is **Recovery**. If Pillar 1 (Discovery) is about *finding* the problem, and Pillar 2 (Response) is about *acting* on it, Pillar 3 is about **measuring the outcome and ensuring follow-through**. 

To provide truly specialized care, the Recovery phase cannot be a passive waiting period. It must actively track the success of the intervention, learn from the data, and securely close the loop—all while protecting the teacher's time.

---

## 1. Automated Effectiveness Scoring (The Feedback Loop)
Recovery isn't just about tracking the student; it's about evaluating the intervention itself.
* **Closing the Loop on Response:** Once an action is taken (e.g., "Refer to Counselor"), the system monitors the student's metrics. If the student's grades and attendance stabilize, that specific intervention is tagged as a "Success" in their profile.
* **Systemic Learning:** If the system notices that "Parent Phone Calls" rarely lead to metric improvements for a specific demographic, but "1-on-1 Check-ins" almost always do, it feeds this data back into Pillar 2. The next time a similar student is flagged, the system will actively deprioritize parent calls and strongly recommend check-ins. 

## 2. "Shadow Monitoring" and Fade Out
Care doesn't end abruptly the moment a student scores a passing grade. Recovery employs a phased fade-out approach.
* **Elevated Sensitivity Window:** When a student’s metrics improve enough to be marked "Resolved," they enter a 30-day "Shadow Monitoring" phase. 
* **Early Relapse Detection:** During this window, the EWS engine operates with higher sensitivity for this specific student. A single missed homework assignment during this period might trigger an "Early Relapse Warning," whereas a baseline student would need three missed assignments to trigger a flag. This ensures the student doesn't slip backward immediately after the teacher's attention shifts elsewhere.

## 3. Automated Closure and Positive Reinforcement
A critical part of Recovery is recognizing success, which is often forgotten in traditional consequence-based systems.
* **The "Success Handshake":** When a student officially graduates from the Recovery phase and their baseline stabilizes, the system automatically prepares a *Positive Reinforcement Packet*.
* **One-Tap Celebrations:** The system pre-drafts a celebratory SMS to the parent (e.g., *"Magandang balita po! Gusto ko lang ipaalam na napakaganda ng naging improvement ni Maria sa klase nitong nakaraang buwan..."*) and prompts the teacher to send it. It also prompts the teacher to deliver a quick word of praise directly to the student in class.

## 4. Cohort Anomaly Detection (School-Wide Escalation)
Because EduCare is a multi-tenant, school-wide system, Recovery can spot issues that are larger than a single student.
* **Community-Level Triggers:** If the system detects that five different students from the same geographical neighborhood or demographic are all failing to recover despite standard interventions, it triggers a "Systemic Anomaly" to the Principal. 
* **Shifting the Burden:** This alerts administration that the problem is likely external (e.g., a local flood, a localized outbreak of illness, or community disruption) and requires institutional response (like a feeding program or community outreach) rather than individual teacher intervention.

---

## The Goal of Recovery

The Recovery pillar ensures that no intervention happens in a vacuum. By actively tracking post-intervention metrics, learning which strategies actually work, and formalizing positive reinforcement, the system permanently raises the floor for student care. When a case is finally closed, both the student and the teacher know that real, measurable progress was made.
