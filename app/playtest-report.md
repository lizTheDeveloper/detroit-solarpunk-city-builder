# Detroit Solarpunk City Builder - Usability Playtest Report

## Playtest Overview
- **Turns Played:** 4
- **Date:** May 16, 2026
- **Focus:** First-time player experience, discoverability, turn flow, and clarity of state.

---

## Turn-by-Turn Summary

### Turn 1
- **Actions:** Resolved "Flooding" event with "Full Flood Response". Funded Aisha Williams' "Maker Space" project in Livernois-McNichols.
- **Observations:** Tutorial hints were helpful but the initial state with "14 pending" on the End Turn button was confusing.

### Turn 2
- **Actions:** Resolved "Heat Wave" event with "Public Cooling Centers". Funded Andy Didorosi's "Maker Space" in Corktown.
- **Observations:** Proposal system makes sense with "turns left" timers. "3 expiring soon" on the End Turn button is much clearer than "pending".

### Turn 3
- **Actions:** Resolved "Power Outage" and "Water Contamination" events.
- **Observations:** Encountered a critical bug where the "Events" tab appeared empty despite the "End Turn" button indicating pending events. Needed to switch tabs/refresh to see them.

### Turn 4
- **Actions:** Encountered "Senator Voss: Political Interference" and "Marcus Webb: Track Record Check".
- **Observations:** Noticed the character conversation panel was mislabeled (Andy Didorosi's panel showed Aisha Williams' dialogue).

---

## UI/UX Issues (Ranked by Severity)

### 1. Critical: Events Occasionally Disappear (Game-Breaking)
The "Events" tab sometimes renders a blank state even when multiple events are pending. Since resolving events is a prerequisite for ending a turn, this can completely block progression for a first-time player who doesn't know to try switching tabs to "force" a refresh.

### 2. High: Character Conversation Panel Mismatch
In Turn 4, clicking on or being prompted by Andy Didorosi opened a panel that contained dialogue from Aisha Williams ("Aisha nods approvingly"). This is highly confusing for the narrative and suggests a state management issue in the UI.

### 3. Medium: "End Turn (X pending)" Ambiguity
The initial "14 pending" message on the End Turn button was extremely confusing. It wasn't clear if these were actions I *must* take or just things I *could* do. The later "X expiring soon" is much better, but the "pending" count should probably be broken down or linked to the specific actions required.

### 4. Medium: Tutorial Persistence
The tutorial alert "Select a neighborhood and start your first project" persists at the bottom of the screen even after a project has been started. It takes up significant vertical space and can overlap with other UI elements.

---

## Confusing Flows / Unclear Information
- **Calendar Burnout:** The "BURNED OUT" indicator in the calendar is clear, but it's not immediately obvious *why* I'm burned out or what the consequences are for the next turn.
- **Action Slots:** The "22/22 Slots" indicator at the top is useful, but the connection between actions in different tabs (Tiles vs. Calendar) could be more explicit.

---

## What Worked Well
- **Aesthetic:** The Solarpunk Detroit theme is consistent and visually appealing. The map is detailed and helps with immersion.
- **Meter Feedback:** Meter changes at the end of the turn are very clear and provide good feedback on the impact of choices.
- **Proposal Mechanics:** The community proposal system feels alive, and the leaders have distinct voices.

---

## Suggestions for Improvement
- **Fix the Event Refresh Bug:** Ensure the `EventPanel` re-renders correctly when `eventQueue` changes.
- **Clarify "Pending":** Change the "End Turn" button text to be more specific (e.g., "1 Event Must Be Resolved" vs "14 Actions Remaining").
- **Dynamic Tutorial:** Make the tutorial steps disappear as they are completed.
- **Conversation Context:** Ensure the conversation panel header matches the current participant and the dialogue history is cleared/filtered correctly.
- **Calendar Tooltips:** Add tooltips to the "Burned Out" and "Rest Day" sections of the calendar to explain the mechanics.
