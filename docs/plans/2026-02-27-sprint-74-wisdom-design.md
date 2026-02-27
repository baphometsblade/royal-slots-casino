# Sprint 74 — "The Wisdom"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Daily Playing Tip

**Motivation:** Responsible gaming tips and strategy hints add educational value.
A rotating tip in the lobby changes daily.

**UI:** Small element (`#dailyTip`) below the lobby greeting. Italic, muted text.
Shows one tip per day from a curated list.

**Behavior:** Deterministic daily selection (same hash as GOTD). Pure display.

### Feature 2: Lobby Footer Stats

**Motivation:** A compact footer at the bottom of the lobby showing total games,
categories, and how long the player has been online.

**UI:** Small footer bar (`#lobbyFooter`) at the bottom of the lobby content.
Shows "80+ Games | 8 Categories | Online: 5m".

**Behavior:** Game/category counts from GAMES array. Online timer from page load.
Updated every 60 seconds.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for daily tip + lobby footer.
**Step 3:** Daily tip JS in ui-lobby.js.
**Step 4:** Lobby footer JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
