# Sprint 48 — "The Engagement"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Spin Counter Badge

**Motivation:** Players like seeing total spin count in a session. A persistent
badge next to the spin button displays the running spin count with milestone
celebrations at 50, 100, 250, 500 spins.

**UI:** Small circular badge above the spin button showing spin count. Pulses
gold at milestone numbers. Resets on slot close.

**Behavior:** Increments on every spin (including free spins). Milestones
show a brief flash animation. Session-scoped.

### Feature 2: Provider Leaderboard in Lobby

**Motivation:** Players want to know which providers they've played the most
and how they've performed. A compact leaderboard widget shows top 3 providers
ranked by total play count.

**UI:** Small "My Top Providers" section in lobby sidebar area, showing
provider name and play count. Auto-updates when returning from a slot.

**Behavior:** Reads from recently played data in localStorage. Aggregates
by provider. Renders on lobby load.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for spin counter + provider leaderboard.
**Step 3:** Spin Counter JS in ui-slot.js.
**Step 4:** Provider Leaderboard JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
