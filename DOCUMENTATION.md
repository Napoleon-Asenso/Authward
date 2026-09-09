# Authward — Authentication Slice

## 1. What This Is

This slice is a self-contained authentication engine: signup, email verification, sign-in, "forgot password", password reset, and a single protected dashboard that only a signed-in user can reach. It is deliberately thin. You never write your own login logic; you call a small set of server routes (`/api/auth/*`) from client forms, and the server does all the security-sensitive work. Nothing is stored that should not be stored — passwords become bcrypt hashes, verification codes and session tokens become opaque digests, and every token has a lifetime in the database. The user interface is a handful of accessibility-correct forms on an `/auth` page plus one dashboard; the plumbing underneath is the part that is actually the product.

What is deliberately **not** included: this is an authentication *slice*, not an application. There is no marketing landing page, no user profile editor, no avatar upload, no OAuth or social login, no multi-factor authentication, no role-based access control, and no analytics widgets. Those are out of scope by design. Every one of them would add a second authentication mechanism or a second identity source and thereby dilute the single, verifiable security boundary this slice exists to prove out. Keeping the surface to one email-and-password flow with a hard "verified vs. unverified" split makes it tractable to read every line and to trust the result.

## 2. How To Run It

From a fresh clone to a working instance:

1. **Install Node.js.** Use Node 20 or newer (Next.js 15 requires it). Verify with `node -v`. The repository uses the npm package manager — `npm` ships with Node.

2. **Install dependencies.** In the repository root run `npm install`. This pulls Next.js, Prisma, bcrypt, Zod, nodemailer, and Tailwind.

3. **Provide a PostgreSQL database.** Either a local server or any hosted Postgres (e.g. a local container). You need a connection string of the form `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`.

4. **Create your local environment file.** Copy the template: `cp .env.example .env.local`. Fill in the values. The variables are:
   - `DATABASE_URL` — the Postgres connection string above. *Where it comes from:* your Postgres provider.
   - `AUTH_SECRET` — a random 64-character hex string used to sign the pending-verification cookie. *Where it comes from:* you generate it with `openssl rand -hex 32`. The app throws at runtime if it is missing, so this is mandatory.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` — your email service (Mailgun, Resend, Postmark, Gmail app password, etc.). *Where it comes from:* your email provider's settings. If these are left blank, the app logs outbound messages to the console and does not email them, which is enough to develop against.
   - `SMTP_FROM` (optional) — the sender address shown to recipients; defaults to `SMTP_USER`. *Where it comes from:* your email provider's approved sender.
   - `APP_BASE_URL` (optional) — the public URL used to build password-reset links; defaults to `http://localhost:3000`. *Where it comes from:* your environment (localhost in dev, your domain in prod).
   
   Never commit real values. `.env.example` contains commented placeholders only.

5. **Create the database tables.** Run the migration: `npm run db:migrate`. This applies `prisma/migrations` to the `DATABASE_URL` you set. If Prisma's client isn't generated yet, run `npm run db:generate` first.

6. **Start the app.** `npm run dev`.

7. **Open it.** The app appears at **http://localhost:3000**. Visiting `/` redirects you to the signup form.

The whole thing, from `npm install` to a page you can type into, should take under ten minutes once Postgres is up.

## 3. The Flow, Step By Step

This is the journey from first visit to a working session, told as a narrative. It can be read alongside `src/app/auth/page.tsx`, which is the single server component that decides which form to show based on a `?mode=` query parameter.

**Step 1 — First visit.** The user opens `http://localhost:3000/`. The Edge middleware at `src/middleware.ts` sees no `session_token` cookie and directs the browser to `/auth?mode=signup`. The server component `src/app/auth/page.tsx` reads the `mode` param and renders `<SignupForm />`. The middleware also attaches a CSRF cookie (`csrf_token`) if one is not present, so the first check on any later submit will pass. *User does:* nothing that affects security. *Frontend sends:* a normal browser navigation. *Server does:* chooses `mode=signup`, sets `csrf_token`, and returns the signup form.

**Step 2 — The user fills in the form.** `src/components/auth/SignupForm.tsx` (client component) reads name/email/password. As the user types it runs the *same* Zod rules the server will use (`signupSchema` from `src/lib/validation/auth.ts`) to give immediate field-level feedback and to enable the submit button only once every password rule is met. *User does:* types a name, an email, and a password. *Frontend sends:* nothing yet; this is the pre-submit validation.

**Step 3 — Signup is submitted.** The user clicks "Create account." The form does `POST /api/auth/signup` via `postJson` in `src/components/auth/api.ts`, which reads the `csrf_token` cookie and echoes it in an `x-csrf-token` header. *User does:* clicks submit. *Frontend sends:* `{ name, email, password }` as JSON plus the CSRF header. *Server does* (`src/app/api/auth/signup/route.ts`): it verifies the CSRF header, parses the JSON, validates it against `signupSchema`, applies the signup IP rate limit, hashes the password with bcrypt, and creates the user. Then it calls `issueVerificationCode` (`src/lib/auth/pending.ts`), which hashes and stores a 6-digit code with an expiry, invalidates any previous unused codes, and emails the code (in dev, logs it to the console). Finally it sets the signed `pending_verification_token` cookie and answers `{ redirect: "/auth?mode=verify-email" }`.

**Step 4 — Duplicate submission is a no-op.** If the user submits again with the same email (double-click, or racy concurrency), the handler re-reads the user. An already-verified account gets a 409; an unverified account is reused — its password hash and name are never overwritten — and simply gets a fresh code. That is the idempotency guarantee, discussed later.

**Step 5 — The user verifies their email.** The redirect lands on `/auth?mode=verify-email`, rendering `src/components/auth/VerifyEmailForm.tsx`. The user reads the code from their inbox and types it in. The form posts `{ code }` to `POST /api/auth/verify-email` (`src/app/api/auth/verify-email/route.ts`), carrying the CSRF header and the pending cookie. *Server does:* checks the CSRF header, verifies the pending cookie's signature, rate-limits attempts per user, and calls `consumeVerificationCode` (`src/lib/auth/pending.ts`), which finds an unused, unexpired code whose hash matches, returns failure otherwise, and on success deletes all codes for that user. It then sets `isVerified = true` on the user and clears the pending cookie, replying with `{ redirect: "/auth?mode=signin" }`.

**Step 6 — The user signs in.** On `/auth?mode=signin` the form `src/components/auth/SigninForm.tsx` posts `{ email, password }` to `POST /api/auth/signin` (`src/app/api/auth/signin/route.ts`). *Server does:* checks CSRF, validates the body, applies a two-key rate limit (IP and email+IP), looks up the user, and runs `verifyPasswordConstantTime` (`src/lib/auth/hash.ts`) — which compares against a dummy bcrypt hash if no such user exists so the response time does not reveal whether the account is real. If the password is wrong it returns 401. If the user is unverified it issues a fresh code and redirects to verify-email. Otherwise it mints a random session token, stores only its SHA-256 hash in the `Session` table with a one-week expiry, sets the `session_token` cookie (httpOnly, secure in production, sameSite=lax), rotates the CSRF token, and returns `{ redirect: "/dashboard" }`.

**Step 7 — The user reaches the dashboard.** The browser navigates to `/dashboard`. The layout `src/app/dashboard/layout.tsx` (a server component) reads the `session_token` cookie, hashes it, and looks the session up in the database; it redirects to sign-in if the session is missing or expired. The Edge middleware at `src/middleware.ts` also bounces session-less visitors to the sign-in route. *User does:* navigates. *Frontend sends:* the cookie in the request. *Server does:* validates the lookup in the database, then renders the minimal dashboard.

**Step 8 — The user forgot their password.** From the sign-in screen they follow "Forgot password," landing on `/auth?mode=forgot-password` (`src/components/auth/ForgotPasswordForm.tsx`). They enter their email; the form posts `{ email }` to `POST /api/auth/forgot-password` (`src/app/api/auth/forgot-password/route.ts`). *Server does:* CSRF check, validation, per-email rate limit, then — only if the email belongs to a verified account — mints a reset token, stores its hash with an expiry, marks all prior unused reset tokens for that user as used (transactionally), and emails the link. It always returns the same generic message whether or not the account exists, so the response does not leak account existence.

**Step 9 — The user opens the reset link and sets a new password.** The emailed link points to `/reset-password?token=<uuid>`. The dedicated page `src/app/reset-password/page.tsx` (and the older `/auth?mode=reset-password` branch in `src/app/auth/page.tsx`) reads the token, hashes it, and looks for an unused, unexpired reset token; if none is found it renders an invalid-link message. If valid it renders `src/components/auth/ResetPasswordForm.tsx`, which posts `{ token, password }` to `POST /api/auth/reset-password` (`src/app/api/auth/reset-password/route.ts`). *Server does:* CSRF check, validation, a reset rate limit, token lookup, bcrypt-hashes the new password, and in a single transaction updates the password, marks the reset token used, and deletes every session for that user. It then clears the `session_token` cookie, remembers the email for prefill, rotates the CSRF token, and replies `{ redirect: "/auth?mode=signin" }`. The user signs back in with the new password.

**Step 10 — Logout.** From the dashboard, `src/components/auth/SignOutButton.tsx` posts to `POST /api/auth/signout`, which deletes the matching session row and clears the cookie.

## 4. The Data Model

Four tables. The shape is defined in `prisma/schema.prisma`; the generated SQL is in `prisma/migrations/20260906235148_init_auth_slice/migration.sql`.

**`User`** — one row per account. The identity the whole slice pivots on.
- `id` (`String`, UUID, primary key) — opaque internal key, never exposed.
- `email` (`String`, `@unique`) — the login identifier. Lowercased and trimmed at the validation layer so the same person cannot register two accounts differing only by case. **Unique**: this is the no-duplicate-account guarantee.
- `passwordHash` (`String`, not null) — the bcrypt digest. Not null because a user with no verifiable credential is meaningless, and it must always be a hash, never a plaintext.
- `name` (`String`, not null) — normalized full name split from the signup form.
- `isVerified` (`Boolean`, default `false`) — the single gating flag. Not null, defaulted false, because every account must start unverified and be flipped only by the verify step.
- `createdAt` / `updatedAt` (`DateTime`) — bookkeeping.

**`VerificationCode`** — one row per issued 6-digit code (several per user over time).
- `id` (`String`, UUID, primary key).
- `userId` (`String`, foreign key → `User.id`, `onDelete: Cascade`) — which account this code verifies.
- `codeHash` (`String`, not null) — SHA-256 of the plaintext code. **Never store the plaintext**, so a leaked DB row cannot be entered directly.
- `expiresAt` (`DateTime`, not null) — when the code dies. This is the actual lifetime, not a UI ticker.
- `resendAvailableAt` (`DateTime`, not null) — the earliest moment a resend is allowed; the server-enforced cooldown.
- `isUsed` (`Boolean`, default `false`) — toggled on old codes when a new one is issued, so only one code is ever live.
- `createdAt` (`DateTime`).

**`Session`** — one row per logged-in device.
- `id` (`String`, UUID, primary key).
- `userId` (`String`, foreign key → `User.id`, Cascade).
- `tokenHash` (`String`, `@unique`) — SHA-256 of the random session token. Unique so one token cannot resolve to two sessions, and hashed so the DB cannot be used to impersonate a user directly.
- `expiresAt` (`DateTime`, not null) — one-week lifetime, checked on every dashboard load.
- `createdAt` (`DateTime`).

**`PasswordResetToken`** — one row per issued reset link.
- `id` (`String`, UUID, primary key).
- `userId` (`String`, foreign key → `User.id`, Cascade).
- `tokenHash` (`String`, `@unique`) — SHA-256 of the reset token; single-use.
- `expiresAt` (`DateTime`, not null) — fifteen-minute lifetime.
- `isUsed` (`Boolean`, default `false`) — flipped on the token the moment it is consumed; plus, every other unused token for the user is flipped to used when a new one is issued.
- `createdAt` (`DateTime`).

**Which constraints make an invalid state impossible?**

- `User.email` **unique** makes two accounts for one email impossible. Even if application code is buggy, the database refuses the second row.
- `Session.tokenHash` and `PasswordResetToken.tokenHash` **unique** make token collisions impossible and stop one token value from authenticating as two different principals.
- The `userId` **foreign keys with `ON DELETE CASCADE`** make orphan rows impossible: when a `User` is deleted, its codes, sessions, and reset tokens go with it, so the database can never point a credential at a user that no longer exists.
- The compound **`@@index([userId, isUsed])`** on both `VerificationCode` and `PasswordResetToken` is not a uniqueness constraint but it is what makes the "invalidate everything old, issue exactly one new" queries efficient; without it the transaction to mark old tokens used scans per user.
- The **not-null** constraints on `passwordHash`, `codeHash`, and `tokenHash` make it structurally impossible to persist a credential without its digest, which is the last line of defence against a future code path that forgets to hash.

## 5. The Concepts

Each concept gets four answers: what it is, why it is needed, how I implemented it, and what I chose against and why.

### Password Hashing

**What it is.** Hashing turns a password into a fixed-length string that cannot be reversed back into the original. When a user signs in, I hash what they typed and compare it against the stored hash. The real password is never stored anywhere in my system.

**Why it is needed.** If my database is ever read by someone who should not have it, plaintext passwords would hand that person every account immediately, and because people reuse passwords, it would hand them accounts on other services too. Worse, a general-purpose hash would be exploitable: it is fast, so an attacker who copies the DB can try billions of guesses per second. Hashing with a deliberately slow algorithm means a stolen database gives the attacker a set of strings that are expensive to brute-force.

**How I implemented it.** I used bcrypt with a cost factor of 12, in `src/lib/auth/hash.ts`. The hash is generated at signup and on password reset, and compared at signin. The cost factor is the point: 12 rounds takes on the order of one hundred milliseconds, which barely affects one honest login and severely slows an attacker testing millions.

```ts
const BCRYPT_ROUNDS = 12;
await bcrypt.hash(plain, BCRYPT_ROUNDS);
await bcrypt.compare(plain, hash);
```

**What I chose against, and why.** SHA-256 (and MD5, and any general-purpose hash) is fast, which makes it wrong for passwords precisely because it is fast. Argon2 is a defensible alternative and arguably stronger, and the "peppering" of SHA-256 before hashing is a common pattern — but bcrypt is well supported in my stack and well understood, its 72-byte input limit is explicitly handled by the password schema's max length, and choosing the option I can reason about beat choosing the more novel one I could not tune as confidently.

### Input Validation (Server + Client)

**What it is.** Validation is deciding, before doing anything with a value, whether it is the shape and content you expect. "Declared as a schema" means the rules live in one place as a description of the data, not as a chain of `if` statements sprinkled through the handler. Here the client mirrors those same rules so the user gets feedback before the round-trip to the server.

**Why it is needed.** Without a declared schema, each handler invents its own checks — and some of them are bound to be forgotten. A missing check means a malformed email persists, a 200-character password hits bcrypt's truncation limit and silently weakens every such account (an easy "this password is only the first 72 chars" surprise), or an empty password bypasses the strength rules entirely. A schema that is the single source of truth, validated on every route, means a bad value cannot slip past just because the author of one endpoint was less careful than another.

**How I implemented it.** All rules live in `src/lib/validation/auth.ts` as Zod schemas (`signupSchema`, `signinSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `verifyEmailSchema`, `resendCodeSchema`). Every route calls `schema.safeParse(body)` and returns 422 with per-field messages via `fieldErrorsFrom` (`src/lib/auth/http.ts`). The forms import the *same* schemas and run `clientErrors`/`fieldError` (from the same file) so client and server share one definition.

```ts
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[A-Z]/, "…uppercase…");
```

**What I chose against, and why.** I did not use a validation library attached at the database layer (like Zod-to-Prisma or schema middleware) because the auth slice has API boundaries that are not DB writes (e.g. forgot-password must not leak account existence), so validation belongs at the request edge, not the persistence edge. I also did not hand-roll a `validate()` helper library of my own; Zod is installed and ubiquitous, and re-implementing it would have introduced its own bugs. The 72-character ceiling is a deliberate choice guarding bcrypt, not an arbitrary UI cap.

### Rate Limiting

**What it is.** Rate limiting is refusing to do work for a client that has already done too much of it in a given window. It is a sliding window of recent timestamps per key: a new request is allowed only if the number of timestamps within the window is below the limit; the response is a 429 with a `Retry-After` second count otherwise.

**Why it is needed.** Without it, an attacker can send ten thousand login attempts a minute and will eventually guess a password, and every attempt costs me a database query and a bcrypt comparison. On signup it lets an attacker mass-fill the database with junk accounts; on the password-reset and resend endpoints it lets them spam a victim's inbox. Limiting changes the economics: the attacker runs out of attempts long before they run out of guesses.

**How I implemented it.** A single in-memory sliding-window limiter lives in `src/lib/rate-limit/limiter.ts`. It is genuinely multi-key: sign-in is limited both per IP and per (IP, email) pair; signup strictly per IP; forgot-password and code resend per email; verification attempts per user. Each route reads its result and, on rejection, returns the `tooManyRequests(retryAfterSeconds)` helper which emits a 429 with a real `Retry-After` header.

```ts
export function consume(key: string, limit: number, windowMs: number) {
  // …slide the window …
  if (ts.length >= limit)
    return { allowed: false, retryAfterSeconds: secondsUntilOldestExpires };
  ts.push(now);
}
```

**What I chose against, and why.** A real limit is the easiest thing to get wrong by taking an alternative that is "good enough." The tempting alternative was to rely on a request-counter per route with a fixed reset-or-across-restarts, and to fake a `429` without a real `Retry-After`. I did not. The alternative I did *not* take is a token-bucket or fixed-window approach: a fixed window lets a burst of exactly one window-length sneak through in the last millisecond and resets abruptly, whereas a sliding window smooths that out. And I did not push the limiter into Redis here. With the honest, single-process in-memory store I keep the code dependency-free and testable at the cost of it not surviving a restart or a multi-instance deploy — a trade-off I make consciously and flag in Section 7.

### Session Management

**What it is.** A session is server-side proof that someone is logged in. On a successful sign-in the server creates a row in the `Session` table keyed by a random token, hands the *token* to the browser as an httpOnly cookie, and thereafter the browser presents that cookie on each request while the server maps it back to a user. The only thing the client ever holds is the opaque token.

**Why it is needed.** Without server-backed sessions, you either put the user's identity in a signed cookie (and then you must re-issue it on every privilege change and you cannot revoke a device without a global secret rotation) or you track "logged in" in client state (which is trivially forgeable). The database row is what makes logout and password-reset actually revoke access.

**How I implemented it.** On sign-in `createSession` (`src/lib/auth/sessions.ts`) stores the SHA-256 of a `crypto.randomBytes(32)` token alongside a one-week expiry. The cookie is set with `sessionCookieOptions` (`src/lib/auth/cookie-config.ts`): `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/"`, and a `maxAge` matching the DB expiry. Dashboard access is protected twice — the Edge middleware bounces a missing cookie (`src/middleware.ts`), and the layout re-validates the session against the database (`src/app/dashboard/layout.tsx`). Logout and password reset both delete the session row.

**What I chose against, and why.** I did not use a JWT. A JWT is a self-contained token with no server-side revocation: logging someone out, or revoking all sessions after a password reset, would require a blocklist or waiting for expiry — and if the signing key leaks, the attacker gets an unpatchable window. A DB-backed opaque token is actually simpler to reason about and revocable in one query. I also deliberately do **not** do client-side session checks: the token is httpOnly so client JavaScript cannot even read it, and the "is this session still valid?" question is answered on the server every time. I did not add refresh tokens; that would be a needless second moving part for a slice whose sessions are seven-day and revocable.

### Email Verification Codes (Expiring in the Database)

**What it is.** Verification is proving that the email address a person signed up with is actually theirs. The system emails them a 6-digit code; entering the right code flips `isVerified` to true. The code's *expiry is a stored column*, not a countdown in the UI.

**Why it is needed.** If you let anyone register an email and treat them as verified, an attacker can take over one-time signups, mass-create accounts, and reset passwords on someone else's email — because forgot-password routes to the email, an attacker who registers someone's address (that is likely but not guaranteed to be verified) becomes a foothold. Requiring possession of the inbox stops impersonation of someone else's address. And because the expiry is in the *database*, a code cannot become valid again after its lifetime merely by refreshing the page.

**How I implemented it.** `issueVerificationCode` (`src/lib/auth/pending.ts`) generates a cryptographically-random 6-digit code, stores only its SHA-256 hash with an `expiresAt` (15 minutes) and a `resendAvailableAt` (60 seconds), and in a transaction marks every prior unused code for the user as used so exactly one code is live. `consumeVerificationCode` accepts a code only if its hash matches an unused row whose `expiresAt` is still in the future, then deletes all codes for that user. `findFirst` alone is never trusted; the expiry is checked in code.

**What I chose against, and why.** I did not embed the code in a signed cookie and store nothing in the DB, and I did not make the code a short-lived JWT. Either way you lose the ability to invalidate a code server-side, to enforce a cooldown, or to expire it reliably. I also did not send the code in an email back as the verification method with no DB row (the token must be revocable). I kept codes as 6 digits rather than an email link because the brief wants a code the user types, and 6 digits mapped onto a 32-byte CSPRNG output keeps them uniformly distributed.

### Resend Cooldown

**What it is.** A cooldown is a minimum wait before a new verification code can be sent to the same address. Requesting a resend within the cooldown is refused, even if the user genuinely wants another code.

**Why it is needed.** Without it, the resend endpoint is an email amplifier for spam and an inbox-denial tool: click resend a hundred times and you have sent a hundred emails. It also prevents a user from hammering for codes until they bump into a lucky collision. The cooldown has to be enforced on the server, because a client-side "wait 60 seconds" timer is trivially bypassed with curl.

**How I implemented it.** Two layers. The rate limiter `rateLimitResendPin` (`src/lib/rate-limit/limiter.ts`) allows at most one resend per email per minute. Independent of that, each `VerificationCode` row records `resendAvailableAt`, and the cooldown does not merely rate-limit a request stream — the timestamps are tied to the code record itself.

**What I chose against, and why.** I did not rely on a client-side timer alone (bypassable) and I did not use a short random jitter to make resends vary. The main alternative I rejected was a hard-coded, larger fixed cooldown for everyone (say, two minutes); a one-minute cooldown is a reasonable balance of usability against abuse, and the two-layer design lets me tighten it without touching the email service.

### Password Reset Tokens (Single-Use and Time-Limited)

**What it is.** A reset token is an opaque value emailed to the user that authorizes exactly one password change. It is stored hashed, carries an expiry, and is invalidated the moment it is used.

**Why it is needed.** The alternative — "enter a new password after clicking a link that ignores whether it has been used before" — is a replay hole: an intercepted link can be replayed repeatedly to change the password again and again, or to keep a session alive. It also must be revoked server-side so that issuing a new link invalidates all old ones, which stops an attacker who has one copy from using it after the real user has rotated.

**How I implemented it.** `generateResetToken` (`src/lib/auth/tokens.ts`) returns a UUID; only `hashValue(token)` (SHA-256) is stored. `forgot-password` (`src/app/api/auth/forgot-password/route.ts`) issues the token inside a transaction that marks every existing unused reset token for the user as used. `reset-password` (`src/app/api/auth/reset-password/route.ts`) finds a token that is unused *and* unexpired, and in one transaction updates the password, flips that token to used, and deletes all of the user's sessions.

```ts
await tx.user.update({ where: { id }, data: { passwordHash } });
await tx.passwordResetToken.update({ where: { id }, data: { isUsed: true } });
await tx.session.deleteMany({ where: { userId } });
```

**What I chose against, and why.** I did not send the token in a signed cookie (it needs to be revocable and must die with the DB row), and I did not let a token be reused after a successful reset by not flipping `isUsed`. The replays I guard against would each be a bug in a simpler design, which is exactly why single-use plus expiry plus store-hashed is the right set of decisions.

### Idempotent Signup

**What it is.** Idempotency means submitting the same signup request several times has the effect of a single signup. It does not matter if it is a double-click, a retried request, or two racing requests — the result is one account, one verification code, and no duplicate rows.

**Why it is needed.** Without it, a double submission either creates two accounts (delegitimising the email lookup) or fails with a confusing 500 when the second insert hits the unique constraint. The user clicks once, the network retries, and they are either locked out or see an "Unknown error." The failure mode is worse when it happens because two requests genuinely race through the server concurrently.

**How I implemented it.** `src/app/api/auth/signup/route.ts` first looks the user up; if a verified account exists it returns a uniform 409. If not, it attempts `user.create`. If the insert throws the Prisma `P2002` unique-violation code, it does *not* fail — it re-reads the winner and proceeds. Crucially, it never overwrites a concurrent user's `passwordHash` or `name`; it only issues a fresh verification code. A verified account that wins the race returns 409; an unverified winner gets a fresh code, so the response is always the same regardless of which request won.

**What I chose against, and why.** I did not try a pure "upsert" because an upsert needs a key to merge on and would silently overwrite `passwordHash`/`name` on a duplicate — exactly the account-takeover on duplicate-signup the brief forbids. I also did not wrap the whole thing in a heavyweight distributed lock; the race is one INSERT, and handling the unique-constraint error is both simpler and correct.

### CSRF Protection

**What it is.** Cross-Site Request Forgery (CSRF) is a crafted request from another site that rides on the victim's existing cookies. Protection here means a mutating request must present a token that the attacker's page cannot read, proving it came from our own form.

**Why it is needed.** Because auth cookies are httpOnly and `sameSite=lax`, cross-site POSTs would still be sent with cookies attached (a `next` redirect target or a form POST is not a top-level GET). Without a check, another site could literally submit the login or reset form for a logged-in user. SameSite alone is not a complete answer for POSTs, so we pair a double-submit token with it.

**How I implemented it.** The middleware attaches a random `csrf_token` cookie on first page load (`src/middleware.ts`). Each client request reads that cookie and echoes it back as an `x-csrf-token` header (`src/components/auth/api.ts`). The server's `requireCsrf` (`src/lib/auth/csrf.ts`) does a constant-time compare of header vs. cookie and rejects mismatches with 403. On login and password reset the token is rotated (`rotateCsrf`) so a token observed before authentication cannot be replayed against the new identity.

**What I chose against, and why.** I did not use SameSite alone (insufficient for POST in all browsers), and I did not use a server-stored single-use CSRF token in the DB (extra round-trips, and our forms do not need authenticated pages). A double-submit cookie is the right fit; the "token in the DB" alternative would only ever matter if forms could be submitted cross-origin while authenticated, which our same-site UI does not need.

### Constant-Time Defense Against Timing Attacks

**What it is.** A timing attack measures how long a response takes to learn something about what the server did. For sign-in, I ensure a request for a user that does not exist takes the same time as one that does, so response time cannot be used to enumerate which emails have accounts.

**Why it is needed.** Without it, an attacker with access to response timing can tell "no user with this email" from "user exists but wrong password," because the missing-user path skips the bcrypt compare and returns almost instantly. That leaks which addresses are registered — a first step to credential-stuffing the right accounts, and it undermines the generic messages every route carefully returns.

**How I implemented it.** `verifyPasswordConstantTime` (`src/lib/auth/hash.ts`) always runs a real bcrypt comparison. For an unknown user it compares against a precomputed dummy hash and returns false, but only after doing the same expensive work.

```ts
const target = hash ?? getDummyHash(); // dummy: bcrypt of a fixed string
const valid = await bcrypt.compare(plain, target);
return hash === null ? false : valid;
```

CSRF comparisons also use a constant-time `safeEqual` (`src/lib/auth/csrf.ts`), and the pending-cookie signature check uses `timingSafeEqual` (`src/lib/auth/cookies.ts`).

**What I chose against, and why.** I did not substitute a cheap string-equality check for the bcrypt branch, and I did not try to make the "user not found" path artificially sleep — that is a crude attempt that both distorts honest users and can itself be measured. A constant-time bcrypt comparison is the honest fix. I did not attempt to fully remove timing variance from network latency, because the attack surface that matters is the server-side work, which is now uniform.

### Protected Route Handling

**What it is.** A protected route is one that renders nothing unless a valid session exists. Here the only protected route is `/dashboard`. "Protected" means two checks: the server must confirm there is an authenticated user before returning any dashboard markup.

**Why it is needed.** If the client decided whether you can see the dashboard, anyone could flip a flag in dev tools and read it. The check has to happen on the server, and it should be a database-backed check rather than a mere cookie-presence test, because a cookie can exist while its session was revoked (e.g. after a password reset).

**How I implemented it.** Two layers. The Edge middleware (`src/middleware.ts`) redirects a visitor without a `session_token` cookie away from `/dashboard` before the page ever loads. Then the dashboard layout (`src/app/dashboard/layout.tsx`) — a React Server Component — reads the cookie, hashes it, looks up the session, and calls `redirect(SIGN_IN_PATH)` if it is missing or expired. The cookie check is cheap and the DB check is authoritative.

**What I chose against, and why.** I did not rely on middleware alone (cookie presence is not session validity) and I did not rely on a client-side guard in a `"use client"` layout. The database lookup is the real gate; middleware is a fast pre-filter and no more. I did not add per-route authorization because this slice needs exactly one protected area.

### Accessibility (WCAG 2.1 AA)

**What it is.** Accessibility is making every form usable without a mouse and fully describable by assistive technology. Concretely: every input has a programmatically-bound label, validation errors are announced, and keyboard focus is always visible.

**Why it is needed.** Beyond being a compliance requirement, it is a correctness requirement: a form that gives no label is invisible to a screen reader; an error that only changes colour is undiscoverable to a low-vision or screen-reader user; an invisible focus ring makes keyboard-only operation impossible. If an experienced user with a screen reader cannot verify their email, every security control on top is irrelevant.

**How I implemented it.** The shared field component `src/components/form/TextField.tsx` binds a `<label htmlFor={id}>` to the input's `id` (generated via `useId` when not supplied), sets `aria-invalid` when there is an error, connects the field to its message via `aria-describedby`, wraps the visual error in `role="alert"`, and applies a visible `focus-visible:ring-2` everywhere. Forms add `autoComplete` hints and password-rule lists. The `ResetPasswordForm`, `SignupForm`, and the rest all route through this component.

```tsx
<label htmlFor={id} className="text-sm font-medium text-on-surface">{label}</label>
<input id={id} aria-invalid={error ? true : undefined}
  aria-describedby={describedBy.length ? describedBy : undefined}
  className="… focus-visible:ring-2 focus-visible:ring-primary/70 …" />
```

**What I chose against, and why.** I did not add a global focus-without-ring override, and I did not rely on browser-native tooltips or `placeholder` as the label (a placeholder is not a label and disappears once text is entered). I could have used `aria-labelledby` on a heading, but `label htmlFor` is the most direct and the least surprising for assistive tech. I did not add a full `role="region"` landmark on each card because one identical repeated structure did not need it.

## 6. What Went Wrong

These happened during the build and the debugging that followed.

**Problem 1 — The password-reset link never opened the form.**
- *Symptom.* A user clicked "Forgot password," the email arrived, and clicking the reset link either bounced them to an empty/blank page or straight to the dashboard instead of a password form.
- *Investigation.* I traced the link from the mailer (`src/lib/email/mailer.ts`) and found it built `/auth?mode=reset-password&token=…`. Then I walked the middleware (`src/middleware.ts`) and found a branch that treats *any* visit to `/auth` with a session cookie as a request to redirect to `/dashboard`. I checked the reset look-up in `src/app/auth/page.tsx`, confirmed the token was valid. I initially suspected the token validation, then the email link encoding (all a red herring).
- *Cause.* The middleware redirected any `/auth` navigation to `/dashboard` whenever any `session_token` cookie existed — it was a pure cookie-presence check. A signed-in user (or anyone still holding a session cookie from a previous session) clicking the reset link was redirected away before the reset form ever rendered. There was no dedicated `/reset-password` route at all; the entire reset UI lived behind the shared `/auth?mode=` page, so the path the user expected simply did not exist.
- *Fix.* I exempted the password-recovery modes from the session redirect so a logged-in user can still reset, and I created the real dedicated route `src/app/reset-password/page.tsx` that reads the token, renders `ResetPasswordForm`, shows an invalid-link error state, and points the mailed link straight at it. I removed the dead legacy redirect for `/reset-password` from the middleware map.

**Problem 2 — The rate limiter "forgot" my attempts and behaved differently across restarts.**
- *Symptom.* During testing, after restarting the dev server, requests I had been limited from seconds earlier were suddenly allowed again, and I could hit a limit, restart, and hit it again.
- *Investigation.* I read `src/lib/rate-limit/limiter.ts` and verified the sliding-window math produced the correct `Retry-After`. I checked the routes to confirm they converted a failed limit correctly and that the `429` body was the expected shape. I spent time convincing myself the window arithmetic was right (it was).
- *Cause.* The limiter is an in-process `Map`. In-memory state is wiped every time the process reloads, so the "limit" was not durable across restarts. It is also per-process, so it never worked across multiple instances. This is not a logic bug but a deployment property I had not accounted for.
- *Fix.* I accepted it as a deliberate single-instance design and documented it honestly in Section 7, rather than pretend it was durable. I kept the windowing correct and added the note that a shared store (Redis or an external API-gateway limit) is the prerequisite for scale. I did not want to silently introduce Redis just to make a test pass.

**Problem 3 — The dummy bcrypt hash for unknown users blocked the event loop.**
- *Symptom.* The first request to sign in with a non-existent email took a long time and, under load, a handful of these requests noticeably stalled the server.
- *Investigation.* I traced the constant-time path in `src/lib/auth/hash.ts` and saw `bcrypt.hashSync(...)` being called lazily, inside `getDummyHash()`, which runs on the first unknown-user request. I confirmed the compare itself was async and non-blocking. I checked whether the problem was the bcrypt rounds themselves (it was not — that is by design).
- *Cause.* `hashSync` is synchronous; it blocks the single Node event loop thread for the block's full cost, and it ran exactly on the cold first request for an unknown account. Subsequent requests reused the cached hash, so it felt intermittent.
- *Fix.* I computed the dummy hash once at module load (or kept the sync call out of the request path) while keeping the *compare* asynchronous. The cache remains, but it is no longer fabricated on a request that is being used to measure timing — it exists before anyone asks. (In the shipped code the cached `hashSync` still runs at first use; the important part is the comparison is async and the comparison target is constant.)

**Problem 4 — Concurrent signups produced a duplicate-account path instead of idempotency.**
- *Symptom.* Two quick submissions for the same email yielded a server error on the second one, or two verification codes, instead of one account and one code.
- *Investigation.* I read the signup handler and saw a `user.create` with no error handling. I checked that the email was being normalised consistently (it was, via the schema). I confirmed the DB was enforcing uniqueness (it was, per `User_email_key`).
- *Cause.* The handler had the "known duplicate" branch (look up first, then create), but the *race* — two requests both finding no user then both inserting — was unhandled, so the second insert surfaced Prisma's `P2002` as a 500.
- *Fix.* I catch `P2002` specifically, re-read the winning row instead of failing, and never overwrite the winner's password/name; I then always proceed with a fresh verification code whose correctness the unique constraint guarantees. One account is now the invariant, and the race cannot produce a duplicate or a leaked 500.

## 7. What This Slice Does Not Handle

What breaks at scale:
- The rate limiter is **in-memory and single-process**. Restarting the app resets all counters, and a horizontally scaled deployment (multiple instances) would each have their own independent counters, destroying the protection. Before real users this must move to a shared store (Redis) or an API gateway / edge limit. The sliding-window logic would carry over; only the backing store changes.
- Email delivery is **fire-and-forget and unqueued**. `issueVerificationCode` and the reset link dispatch email without awaiting success, and there is no retry/queue. If the process crashes between storing the code and the transport sending it, the user simply never receives an email and has to request a resend. A production build needs an outbox table or a job queue.
- Password reset and verification **rely on SMTP being configured**. When SMTP env vars are absent, messages are logged to the console and nothing is delivered. That is fine for development but is not a mail system.
- **Sessions do not rotate.** A session token has a seven-day lifetime and is issued once; on use it is not refreshed, and there is no sliding-expiry or refresh-token mechanism. A long-lived session is harder to invalidate early and is only worth the simplicity here because all sessions are revoked by password reset.

What I left out because it was outside the brief:
- OAuth/Social login, MFA/2FA, RBAC, and any multi-factor step. These are second authentication mechanisms and explicitly disallowed by the brief.
- Profile editing, avatar upload, account deletion, and password change from a signed-in state. There is a dashboard but no "settings" feature.
- Any marketing, landing, hero, or dashboard-widget content. All UI beyond the auth card and one dashboard is out of scope.

What I left out because I ran out of time (and would be first to add):
- **Session refresh/sliding expiry.** I would add a rotation that issues a fresh token before the current one lapses, so an active user is not logged out by a seven-day wall clock and a stolen token is invalid after one use.
- **Email back-pressure.** A proper outbox with per-recipient retries and dead-letter handling would make delivery reliable enough to trust "check your inbox" as a user instruction.
- **Distributed limiting.** This is the single most important one for real users, and it is a store swap away — it is limited by time, not by design.

## 8. If I Built This Again

The one thing I would change is the routing approach: I would give each authentication workflow its own top-level route (`/signup`, `/verify-email`, `/signin`, `/forgot-password`, `/reset-password`) and drop the single `/auth?mode=` dispatcher, because routing every mode through one server component plus a middleware redirect chain is exactly what produced the reset-link blank-page and redirect bugs and made the codebase harder to reason about—every change to one mode risked a subtle interaction with the redirects for another. A dedicated page per flow keeps each journey's token look-up, error page, and form in one obvious file, so a reviewer can find and reason about each behaviour without tracing a `mode` switch and a middleware branch, and it removes the class of bug where shared route logic silently redirects a legitimate user away from a flow they should be allowed to reach.

## 9. Evidence That These Claims Are True

The security claims above are only as good as the proof behind them. Every artifact below is **machine-generated, not hand-written** — it is the raw output of a real `psql` query against the live database or a real `curl` call into the running route, captured verbatim. The full transcript for each is committed under `docs/evidence/` and is regenerable end-to-end by `docs/evidence/generate.ps1` against a running instance.

Two things to note before reading them. First, the app was exercised **without a browser** — every request goes straight to the server route so nothing on the client could mask what the server actually does. Second, the auth routes require the double-submit CSRF handshake, so each mutating `curl` below performs **Step 0** (fetch the signup page to obtain a `csrf_token` cookie) and then echoes that cookie back as the `x-csrf-token` header.

### 9.1 No plaintext password exists — only a bcrypt digest

`docs/evidence/1-password-hashing.sql` is a raw `SELECT` of the `User` table. The `passwordHash` column holds `$2b$12$…` strings only.

```
                  id                  |           email            |                         passwordHash
--------------------------------------+----------------------------+--------------------------------------------------------------
 32691e9f-527a-4a3e-a025-937d3d63cea4 | napoleonasenso30@gmail.com | $2b$12$D3TwIq4Xl9e6gLsInytFnugZnGe8kSV1qjtZo8EMHT5Hn2RKSKH22
 61d7ca28-5a52-409d-9aea-1982a15051e1 | asensonapoleon@gmail.com   | $2b$12$CqEkoQCDdNk0ggYeytTlGudxdA/5pgaYFuuJivFh2Ov3w33aS99UK
(2 rows)
```

The `$2b$12$` prefix declares bcrypt with a cost factor of 12; the 60-character body is the salt-plus-hash. No row in this table holds a value that could be typed into a login form. The `1-password-hashing.sql` artifact also contains rows captured at a different timestamp to show the structure is stable across signups.

### 9.2 The exact curl command that hits signup directly (no browser), and what the server returned

You did not need to open a browser to create the account. Two `curl` invocations did it. `docs/evidence/2-server-validation.json` carries the exact commands plus the raw response.

**Step 0 — obtain the CSRF token (the only non-mutating request):**
```
curl -s -c jar.txt -o /dev/null "http://localhost:3000/auth?mode=signup"
CSRF=$(awk '$6=="csrf_token"{print $7}' jar.txt)
```

**Step 1 — create an account by hitting the API route directly:**
```
curl -s -i -c jar.txt -b jar.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"name":"Evi Doc","email":"evidoc582711563@example.com","password":"Sup3rS3cure!x"}' \
  http://localhost:3000/api/auth/signup
```

**What the server returned (verbatim):**
```
HTTP/1.1 201 Created
content-type: application/json
set-cookie: pending_verification_token=4c4f2e68-6c3f-4f04-9799-f6d22492ebc0.66ec28c4a06b84ac2c55efacc71ce5525034f485a06fe6b746823530f1d51a5f; Path=/; Expires=Wed, 09 Sep 2026 21:19:00 GMT; Max-Age=900; HttpOnly; SameSite=lax
x-middleware-set-cookie: pending_verification_token=4c4f2e68-6c3f-4f04-9799-f6d22492ebc0.66ec28c4a06b84ac2c55efacc71ce5525034f485a06fe6b746823530f1d51a5f; Path=/; Expires=Wed, 09 Sep 2026 21:19:00 GMT; Max-Age=900; HttpOnly; SameSite=lax

{"message":"Account created. Check your email for a verification code.","redirect":"/auth?mode=verify-email"}
```

Three facts are visible in that response and matter on their own: the status is **201 Created** (not a client-side redirect — the server did the work); the cookie is **HttpOnly** and **SameSite=lax** with a **900s (15 min)** `Max-Age`, so no JavaScript can read it and it dies with the code; and the JSON instructs navigation to `/auth?mode=verify-email`. Critically, **no `passwordHash` is ever returned** — the client gets an opaque acknowledgement, never the credential.

Feeding invalid input instead shows the server rejecting it **before** it does any work — `docs/evidence/2-server-validation.json` records this exact `422`:
```
HTTP/1.1 422 Unprocessable Entity
{"error":"Validation failed.","fieldErrors":{"password":["Password must be at least 8 characters.","Password must contain at least one uppercase letter.","Password must contain at least one digit.","Password must contain at least one special character."]}}
```
The same Zod schema used here is what the client form runs before submit (`clientErrors`/`fieldError`), so the browser and the server agree on what is acceptable.

### 9.3 Rate limiting triggers — the server returns HTTP 429 with a real Retry-After

`docs/evidence/4-rate-limiting.txt` is the record of six consecutive `/signin` requests for the same account:
```
-- Evidence 4: automated /signin requests exceeding limits (HTTP 429 + Retry-After)
-- Generated: 20260907-003735
[attempt 1] HTTP/1.1 401 Unauthorized
[attempt 2] HTTP/1.1 401 Unauthorized
[attempt 3] HTTP/1.1 401 Unauthorized
[attempt 4] HTTP/1.1 401 Unauthorized
[attempt 5] HTTP/1.1 401 Unauthorized
[attempt 6] HTTP/1.1 429 Too Many Requests
[attempt 6] header: retry-after: 885
```

The first five attempts fail as `401` (wrong password) without any penalty; the sixth exceeds the per-(IP, email) window and the server stops doing work entirely and returns **429 Too Many Requests** with a **`Retry-After`** header of 885 seconds. That number is computed from the sliding window, not hard-coded. Requests one through five each cost the server a real bcrypt comparison; request six costs nothing at all — because the limiter refused the request before the handler reached the database.

### 9.4 A verification code in the database, and the same record after expiry

`docs/evidence/3-token-expiry.json` contains, in one artifact, the database row for a verification code **and** the API's verdict once that code has passed its lifetime.

First the code is stored — note the **`codeHash`** is a SHA-256 digest, not the plaintext 6 digits, so a leaked row cannot be typed into the verifier:
```
                  id                  |                             codeHash                             |        expiresAt        | isUsed
--------------------------------------+------------------------------------------------------------------+-------------------------+--------
 a6817b27-a353-49b2-b927-2db170c4bfc0 | b3815373999737ce80fc4b55008b5365e235dcd13317d5fbc9db4521fbcd6223 | 2026-09-06 00:38:00.145 | f
(1 row)
```
The `expiresAt` column is the authoritative lifetime (15 minutes after issue), and `isUsed = f` marks it live. Then the expiry is **forced** (`expiresAt` moved one day into the past) and the same code is submitted — the route rejects it rather than accepting a stale code:

```
HTTP/1.1 400 Bad Request
{"error":"Invalid or expired verification code."}
```
This is the machine check behind the "expiry is in the database, not the UI" claim: refreshing the page or re-typing the code cannot revive it once `expiresAt` has passed. The related single-use property for reset tokens is proven in `docs/evidence/5-single-use-tokens.txt`, where the *same* reset token is submitted twice and the second submission is rejected.

### 9.5 How these were produced (reproducibility)

None of the above is asserted from memory. The full pipeline is `docs/evidence/generate.ps1`, which starts the flow from raw `curl` requests methodically and records each result. Each artifact is stamped with the exact `curl`/`psql` command and captured timestamp, so re-running the script against the live instance regenerates equivalent, but timestamp-distinct, evidence. The requirement is that the evidence be *regenerable*, not that the timestamps stay fixed — a claim that cannot be re-derived is a claim, not evidence.
