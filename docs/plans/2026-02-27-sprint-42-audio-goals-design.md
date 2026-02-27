# Sprint 42 — "The Tuner"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Sound Volume Control

**Motivation:** Current sound system is on/off only. A volume slider gives players
fine-grained control over game audio levels.

**UI:** Volume slider in settings modal replacing/augmenting the existing sound
toggle. Range 0-100. Also a small volume icon in slot view for quick access.

**Behavior:** Stores volume level in appSettings. Applies to SoundManager's
master gain node. 0 = muted, 100 = full volume. Persists across sessions.

### Feature 2: Session Win Goal

**Motivation:** Goal-setting adds excitement. Players set a target win amount for
the session, with a progress tracker showing how close they are.

**UI:** "Set Goal" button in slot top bar. When active, a compact goal tracker
shows below the balance: target amount, current session winnings, progress %.
Celebration animation when goal is reached.

**Behavior:** Session-scoped (resets on slot close). Tracks cumulative wins only
(not net — pure win total). Optional — player can dismiss. Shows confetti burst
when goal is hit.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for volume control + win goal tracker.
**Step 3:** Volume control JS in settings + SoundManager integration.
**Step 4:** Win goal JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
