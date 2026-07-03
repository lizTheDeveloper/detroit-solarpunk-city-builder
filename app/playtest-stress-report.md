# Solarpunk Detroit Stress Test Report

**Tester:** Gemini CLI (Adversarial QA)
**Date:** May 16, 2026
**Environment:** http://localhost:5175/

## Summary
The game exhibits several state inconsistencies and UI glitches when subjected to rapid interactions. Most notably, the modal system frequently displays the wrong content, and the calendar slot system seems to miscalculate consumption during project rejections.

## Bugs Found

### 1. Modal Content/State Mismatch (High Priority)
- **Reproduction:** Fund or Reject multiple community proposals in rapid succession.
- **Observed Behavior:** The modal for one leader (e.g., Andy Didorosi) displays the name and text of another leader (e.g., Aisha Williams). For example, the header says "Andy Didorosi" but the message box says "AISHA WILLIAMS: Aisha nods approvingly."
- **Impact:** Significant player confusion and breaks immersion.

### 2. Rejecting Proposals Consumes Calendar Slots (Medium Priority)
- **Reproduction:** Go to the "Tiles" tab and click "Reject" on multiple proposals.
- **Observed Behavior:** The "Slots" count in the top bar decreases as if projects were started. In one test, slots went from 20/22 to 8/22 after rejecting several proposals.
- **Impact:** Players are penalized for rejecting projects, which should only remove the proposal without consuming time/resources.

### 3. Community Trust State Stale (Medium Priority)
- **Reproduction:** Mass reject all community proposals in the Tiles tab.
- **Observed Behavior:** Community Trust remained at 50% despite mass rejection of projects that supposedly carry trust penalties.
- **Impact:** Feedback loop for player actions is broken; consequences for negative actions are not reflected in the UI.

### 4. 401 Unauthorized Errors on `/api/chat` (Low Priority)
- **Reproduction:** Rapidly click "Fund" or "Discuss" on community proposals.
- **Observed Behavior:** Console logs multiple 401 errors for the `/api/chat` endpoint.
- **Impact:** Potential break in the LLM-driven chat features.

### 5. Browser/Context Crashes (High Priority)
- **Reproduction:** Perform rapid UI interactions (e.g., clicking End Turn via JS bypass or rapid tab switching).
- **Observed Behavior:** The Playwright browser context frequently closed unexpectedly ("Target page, context or browser has been closed"). While this might be a Playwright-specific flakiness, it often correlated with heavy UI state changes in the app.

## UI Glitches & Layout Breaks

### 1. Tutorial Overlay Persistence
- **Observed Behavior:** Clicking "Got it" in the initial tutorial prompt sometimes fails to dismiss the alert box entirely, instead replacing the content but keeping the alert container visible at the bottom.
- **Snapshot Mismatch:** The accessibility snapshot often showed "Select a neighborhood..." while the visual UI had already moved to "Lucia Espinoza..." or "Check the tiles tab."

### 2. Modal Content Overlap
- **Observed Behavior:** During rapid clicks, multiple modals or chat windows seemed to fight for the same space, leading to the name/content mismatch mentioned in Bug #1.

## What DIDN'T Break
- **Map Responsiveness:** The MapLibre map remained surprisingly stable and responsive even during rapid tab switching.
- **Budget Display:** The budget value in the top bar seemed to update correctly (or at least consistently) when projects were funded.
- **Vite/HMR Stability:** The development server handled the load well, though some unexplained HMR updates were observed in `MapPanel.tsx`.

## Recommendations
- **Atomic State Updates:** Ensure that opening a modal and setting its content are tied together more strictly to prevent stale data from previous leaders.
- **Action Validation:** Verify that the `rejectProposal` action in the state machine does not decrement the `slots` count.
- **Trust Re-calculation:** Force a trust update event whenever a proposal is rejected.
- **Throttling:** Implement UI-level throttling for high-impact buttons like "Fund" and "Reject" to prevent race conditions in state updates.
