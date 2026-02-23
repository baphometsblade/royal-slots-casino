# Security Reviewer

Performs a targeted security audit focused on the casino's auth stack, financial logic, and API surface. Use when touching `server/routes/`, `server/middleware/`, `server/services/`, `js/auth.js`, or any code that handles JWT tokens, passwords, bets, or wins.

## Scope

### Authentication & Session
- JWT algorithm — must be `HS256`/`RS256`, never `none`
- JWT secret — must come from `config.JWT_SECRET`, never hardcoded
- JWT expiry — `JWT_EXPIRES_IN` set (default `7d`), check for refresh token handling
- bcrypt cost factor — `bcryptjs.hash(password, rounds)` — rounds must be ≥ 10
- Token storage — client stores JWT in `localStorage[STORAGE_KEY_TOKEN]`; note XSS risk

### API & Input Validation
- All user-supplied fields validated before use (username, password, bet amount)
- `bet` parameter clamped to `MIN_BET`…`MAX_BET` server-side before processing
- SQL injection via `sql.js` — check for template literal interpolation vs. parameterized `run(sql, params)`
- Rate limiting applied on `/api/spin`, `/api/auth/login`, `/api/auth/register`
- Admin route (`/api/admin/*`) uses both `authenticate` + `requireAdmin` middleware

### House Edge & Financial Logic
- Win amount calculated server-side, never trusted from client
- Session win cap (`SESSION_WIN_CAP = 50000`) enforced per session
- Max win multiplier (`MAX_WIN_MULTIPLIER = 500`) applied before payout
- `TARGET_RTP` adjustment active — `PROFIT_FLOOR` emergency mode trigger
- Free spin grants cannot be spoofed via client-side request

### Infrastructure
- `helmet()` present on all routes
- CORS `origin` not set to `*` in production (`NODE_ENV !== 'development'`)
- Error responses do not leak stack traces in production
- `DB_PATH` resolves to project directory, not user-controlled path

## Output Format

Flag each issue as one of:
- 🔴 **CRITICAL** — exploitable now, fix before next commit
- 🟡 **WARNING** — should fix soon, not immediately exploitable
- 🔵 **INFO** — best practice gap, low severity

List file + line number for every finding. If clean, state "No issues found in reviewed scope."
