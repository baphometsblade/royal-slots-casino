# Sprint 22: Retention Engine — Weekly Missions + Notification Center + Live Feed

**Date:** 2026-02-26
**Status:** Approved (user-delegated)

---

## Goal

Three net-new retention features:
1. **Weekly Missions** — 4 harder challenges that reset every Monday, bigger XP payouts
2. **Notification Center** — persistent bell icon in header accumulating important events (achievement, tournament, bonus), with a slide-in panel
3. **Live Activity Feed** — lobby widget showing real masked player wins from the DB, refreshed every 15s

---

## Feature 1: Weekly Missions

### 4 Weekly Challenges (7-day reset, Monday midnight)

| id | label | desc | target | xp | type |
|----|-------|------|--------|----|------|
| weekly_spins_200 | Marathon Spinner | Complete 200 spins this week | 200 | 300 | spins |
| weekly_games_10 | World Tour | Play 10 different games this week | 10 | 250 | games |
| weekly_big_win | Century Club | Land a win worth 100× your bet | 1 | 500 | winMult |
| weekly_wager_2k | High Roller Week | Wager $2,000 total this week | 2000 | 400 | wager |

### Storage
- Key: `STORAGE_KEY_WEEKLY_MISSIONS = 'matrixWeeklyMissions'` (add to constants.js)
- State: `{ weekStart: <ISO Monday>, progress: {id: val}, completed: [id] }`
- Reset: on `openStatsModal()` load, compare `weekStart` to current Monday; if stale, reset progress

### Event tracking
- Weekly missions listen to the same `onChallengeEvent` payload as daily challenges
- `onWeeklyMissionEvent(eventType, payload)` — parallel to `onChallengeEvent`
- Called from the same place in ui-slot.js (the existing `onChallengeEvent` call site)

### UI
- New "Weekly" tab in the Stats modal challenges panel (alongside "Today" tab)
- Tab bar: `[Today] [Weekly]` — clicking switches which list renders
- Progress bars identical to daily challenge style
- Completion toast: same `_showChallengeCompleteToast` reused with "Weekly" prefix

### Files: `constants.js`, `js/ui-modals.js` only

---

## Feature 2: Notification Center

### Notification types
| type | icon | example trigger |
|------|------|-----------------|
| `achievement` | 🏆 | Achievement unlock in `showAchievementNotification()` |
| `tournament` | ⚡ | Tournament completion in `tournament.service.js` tick |
| `weekly` | 📋 | Weekly mission completion |
| `daily_bonus` | 🎁 | Daily bonus claimed |
| `system` | 📣 | Generic (future use) |

### Storage
- Key: `STORAGE_KEY_NOTIFICATIONS = 'matrixNotifications'` (add to constants.js)
- Shape: `[{ id, type, icon, title, body, ts, read: bool }]` — max 30, auto-expire >7 days

### Public API (global functions)
- `addNotification(type, title, body)` — prepends to localStorage list, updates badge
- `markAllNotificationsRead()` — sets all `read: true`, hides badge
- `openNotificationPanel()` / `closeNotificationPanel()` — toggle panel

### Integration hooks
- `showAchievementNotification()` → also calls `addNotification('achievement', name, desc)`
- `_showChallengeCompleteToast()` (daily) → also calls `addNotification('daily', ...)`
- Weekly mission complete → calls `addNotification('weekly', ...)`
- Daily bonus claimed (openDailyBonusModal claim path) → calls `addNotification('daily_bonus', ...)`

### UI
- Bell button in `header-actions` (between settings gear and STATS button)
  - `<button id="notifBell" class="btn btn-user btn-notif" onclick="openNotificationPanel()">`
  - Red badge `<span id="notifBadge" class="notif-badge">3</span>` — hidden when 0
- Notification panel: slides in from right, fixed position, z-index 9900
  - Header: "Notifications" + "Mark all read" link
  - List of notifications (newest first), each with icon/title/body/time-ago
  - Empty state: "No notifications yet"

### Files: `constants.js`, `js/ui-modals.js`, `index.html`, `styles.css`

---

## Feature 3: Live Activity Feed

### Backend — `GET /api/feed`
No auth required. Returns last 20 wins where `win_amount >= bet_amount * 15` (15× or better).
```sql
SELECT u.username, s.game_id, s.win_amount, s.bet_amount,
       ROUND(s.win_amount / s.bet_amount, 1) as mult,
       s.created_at
FROM spins s
JOIN users u ON s.user_id = u.id
WHERE s.win_amount >= s.bet_amount * 15
  AND s.bet_amount > 0
ORDER BY s.created_at DESC
LIMIT 20
```
Username privacy: mask to first 2 chars + `***` server-side before returning.

### Lobby widget — `#liveFeedWidget`
- Injected by `initLiveFeed()` in `js/ui-lobby.js`
- Position: below tournament banner, above game grid
- Shows 5 entries at a time in a compact list
- Auto-refreshes every 15s; animates new entries sliding in
- Falls back gracefully (hides) when endpoint unreachable

Entry format:
```
🎰 Ma*** won $245.00 (49×) on Dragon Fortune    2m ago
```

### Files: `server/routes/feed.routes.js` (new), `server/index.js`, `js/ui-lobby.js`, `index.html`, `styles.css`

---

## Parallel Agent Map

| Group | Agent | Files (exclusive) |
|-------|-------|-------------------|
| A | 1 | `constants.js` |
| A | 2 | `js/ui-modals.js` |
| A | 3 | `server/routes/feed.routes.js` (new) |
| B | 4 | `server/index.js` |
| B | 5 | `js/ui-lobby.js` |
| C | 6 | `index.html` + `styles.css` |
| D | QA + commit | — |

---

## Success Criteria
- Weekly missions tab visible in Stats modal, resets on new week
- Notification bell shows unread count, panel opens with entries
- Achievement unlock → also appears in notification panel
- `GET /api/feed` returns masked usernames + win data
- Live feed widget visible in lobby, refreshes every 15s
- `npm run qa:regression` passes
