# Authentication Slice PRD

## Post-Audit Build-Ready Specification & Core Architecture Document

**Project:** Assessment 1 - Authentication Slice  
**Status:** Approved & Hardened (Post-Audit)  
**Version:** 2.0-Final  
**Stack:** Next.js (App Router), TypeScript, Prisma, PostgreSQL, bcrypt, Zod  
**Audit Decision:** 7/7 Sections Hardened  
**Target Environment:** Production Node.js / Vercel Edge

## Executive Audit Summary & Hardening Notice

This specification represents the final, hardened Product Requirement Document (PRD v2.0) for the Authentication Slice. It incorporates all technical verdicts and corrections established during the rigorous 5-role engineering review debate.

Critical vulnerabilities—including unverified account overwrite (ATO), session premature issuance, constant-time user enumeration via bcrypt, token accumulation vectors, and password DoS vectors—have been formally resolved in this build-ready document.

## 1. Product Summary

This Product Requirement Document defines the software architecture, security specifications, data constraints, and operational scope for the Authentication Slice (Assessment 1 of the Product Engineering Bootcamp). The product is a self-contained, production-grade authentication engine constructed using Next.js (App Router), TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, and Zod.

The standalone product implements two core authentication workflows:

1. Account registration with database-enforced email verification.
2. Credential recovery via single-use, time-limited reset tokens.

Access control is enforced using `middleware.ts` edge checks combined with server-side database session validation inside protected route layouts, terminating at a minimal protected dashboard.

The slice exists solely to demonstrate uncompromising server-side security boundaries, explicit data modeling, database constraint enforcement, web accessibility, rate-limiting controls, and testable evidence generation required for a live technical defence.

## 2. Problem Statement

Naive authentication implementations and unconstrained AI-generated codebases frequently rely on client-side state validation, insecure session storage, weak or non-adaptive password hashing, and unhandled edge cases such as duplicate form submissions, timing analysis user enumeration, or expired verification tokens.

These architectural mistakes expose applications to credential stuffing, account takeover (ATO), user enumeration, and unauthorized access via direct route navigation or cached RSC layout rendering.

To eliminate these vulnerabilities, authentication mechanics must be computed exclusively on the server, backed by strict database schema constraints, guarded by multi-key rate limiters, and decoupled from client-side state assumptions.

This project addresses these requirements by constructing a hardened authentication slice where security boundaries are enforced strictly at the database, edge middleware, and server layers.

## 3. Goals

- Provide a fully functional user onboarding journey: **Signup → Email Verification → Signin → Protected Dashboard Access**.
- Provide a fully functional credential recovery journey for verified accounts: **Forgot Password Request → Token Generation → Password Reset → Global Session Invalidation → Signin**.
- Enforce 100% server-side authority for all validation rules, session evaluations, token verification steps, and expiry state checks.
- Guarantee database integrity through explicit unique constraints, non-nullable foreign keys, compound indexes, and cascading deletions.
- Prevent user enumeration attacks via constant-time dummy password hashing on non-existent user accounts.
- Ensure complete web accessibility (WCAG 2.1 AA) compliance across all form inputs, interactive states, and error notifications.
- Produce deterministic, verifiable evidence artifacts proving that security and database mechanics function as designed under live test conditions.

## 4. Non-Goals (Explicit Exclusions)

The engineering agent **MUST NOT** implement, scaffold, or generate code for any of the following items:

- Landing pages, marketing layouts, pricing tables, or hero sections.
- User profile editing, avatar uploads, or account settings management.
- Social authentication providers (OAuth via Google, GitHub, etc.).
- Multi-factor authentication (MFA/2FA via TOTP or SMS).
- Application features, analytical widgets, data tables, or navigation links within the `/dashboard` route.
- Role-based access control (RBAC) or complex permission hierarchies.

## 5. User Personas

### Persona A: Unverified New User

**Needs:** Clear guidance through account creation, transparent form validation feedback, immediate delivery of a verification code, and an accessible mechanism to complete verification.

**Security Context:** Must **NOT** be permitted to authenticate or access the protected dashboard until email ownership is confirmed in the database. **MUST NOT** receive a full database `Session` record prior to completing email verification.

### Persona B: Returning Authenticated User

**Needs:** Secure, low-friction entry using valid credentials, clear session status, and a deterministic sign-out control.

**Security Context:** Must be blocked if account state is unverified or credentials are invalid. Active session must persist safely across requests via secure HTTP cookies verified at the Edge middleware layer.

### Persona C: User with Forgotten Password

**Needs:** Simple password recovery method that sends a secure recovery link without exposing system state.

**Security Context:** Must be protected against account enumeration attacks. Reset tokens for unverified accounts **MUST** be rejected with a generic message. Reset tokens must expire automatically, function only once, and invalidate all existing active database sessions upon completion.

## 6. User Journeys (Post-Audit Hardened)

### Journey A: Standard Signup and Onboarding Flow

1. User navigates to `/signup` and submits Name, Email, and Password (max 72 chars).
2. Server validates input using Zod and checks for existing user records.
3. If the user does not exist:
   - Server hashes the password via bcrypt.
   - Writes a new `User` record (`isVerified: false`).
   - Generates a 6-digit verification code stored as a hash in `VerificationCode`.
   - Logs the code.
4. **AUDIT FIX:** Server sets a signed, `httpOnly` temporary cookie named `pending_verification_token` containing the encrypted `userId` (expiring in 15 minutes).
5. **No record is created in the `Session` table.**
6. User is redirected to `/verify-email`.
7. User enters the 6-digit OTP code and submits the form.
8. Server verifies code validity, checking `isUsed == false` and `expiresAt > NOW()`, scoped strictly by `userId` from the pending cookie.
9. Upon success:
   - Server updates `User.isVerified = true`.
   - Marks the verification code as consumed (`isUsed = true`).
   - Purges the `pending_verification_token` cookie.
   - Redirects the user to `/signin` with a success notice.
10. User enters verified credentials at `/signin`.
11. Server verifies the hash, creates a record in `Session`, issues a secure `session_token` cookie, and redirects to `/dashboard`.

### Journey B: Unverified User Signin Attempt & Registration Collision

1. User enters valid credentials at `/signin` for an account where `User.isVerified == false`.
2. Server rejects session creation, issues a `pending_verification_token` cookie, halts processing, and redirects to `/verify-email` with a notification.
3. **AUDIT FIX:** If a user attempts to sign up again with an unverified existing email address, the server **MUST NOT** overwrite or update the existing `passwordHash` or `name` (preventing Account Takeover).
4. The server invalidates all active verification codes for that user, generates a fresh OTP, sets the pending cookie, and redirects to `/verify-email`.

### Journey C: Credential Recovery Flow (Verified Accounts Only)

1. User navigates to `/forgot-password` and submits an email address.
2. Server queries the user database.
3. If the account does not exist **OR** `isVerified == false`, server returns the generic confirmation:
   > "If an account exists, a reset link has been sent"
4. No token is issued for nonexistent or unverified accounts, preventing enumeration and verification bypass.
5. If a verified account exists:
   - Server invalidates all existing active reset tokens for this user (`isUsed = true`).
   - Creates a new `PasswordResetToken` record (15-minute expiry).
   - Logs/sends the reset link.
6. User visits `/reset-password?token=UUID_TOKEN_STRING`.
7. **AUDIT FIX — RSC Pre-Validation:** Server component queries the database on initial render. If the token is invalid, used, or expired, the page renders an explicit error immediately, preventing form submission.
8. User enters a new password and submits the form.
9. Server executes a database transaction that:
   - Updates `User.passwordHash`.
   - Marks the token `isUsed = true`.
   - Executes `DELETE FROM "Session" WHERE "userId" = user_id` to log out all active sessions globally.

### Journey D: Unauthorized Protected Route Navigation

1. An unauthenticated user or user holding only a `pending_verification_token` navigates directly to `/dashboard`.
2. Next.js Edge Middleware intercepts the request and checks for presence of `session_token`.
3. If missing or invalid, middleware issues an HTTP `307` redirect to `/signin`.
4. For valid cookie presence, `app/dashboard/layout.tsx` performs server-side database hash validation against the `Session` table.
5. If expired or revoked, the session cookie is cleared and the user is redirected to `/signin`.

## 7. Screen and Route Requirements

### `/signup`

Form with Name, Email, Password (with toggle). Validates client and server side. Maximum password length is 72 characters.

### `/verify-email`

Form with a 6-digit OTP code input. Accessible via `pending_verification_token` cookie. Displays a cooldown timer for the resend control.

### `/signin`

Form with Email and Password. Constant-time execution path for valid and invalid emails.

### `/forgot-password`

Form with Email input. Returns a uniform generic confirmation message regardless of user presence.

### `/reset-password`

RSC pre-validates the URL token parameter before rendering the input form. Shows an immediate error card if the token is invalid or expired.

### `/dashboard`

Protected layout. Displays **"Welcome, [User Name]"** and a **"Sign Out"** button. Sign Out executes a server action deleting the DB session and purging the cookie.

## 8. Functional & Security Requirements

### Input Validation (Zod Schema)

- **Email:** RFC 5322 compliant, trimmed, converted to lowercase before query execution.
- **Password:** Minimum 8 characters, maximum 72 characters, minimum 1 uppercase, 1 lowercase, 1 digit, and 1 special character.
- **Verification Code:** Exactly 6 numeric digits: `^[0-9]{6}$`.

### Authentication Security & Anti-Enumeration

- **Adaptive Password Hashing:** Passwords hashed using bcrypt. Plaintext passwords **MUST NOT** be persisted or logged.
- **AUDIT FIX — Constant-Time Signin Verification:** To eliminate timing-based user enumeration, if `prisma.user.findUnique()` yields `null` during signin, the server **MUST** execute a dummy password comparison against a pre-computed dummy bcrypt hash before returning an `"Invalid credentials"` HTTP `401` error.
- **Credential Isolation:** Database queries **MUST** select specific fields, explicitly excluding `passwordHash` except in authentication handlers.

### Session Management

- Sessions are database-backed in the `Session` table using cryptographically secure random token hashes (`crypto.randomBytes(32)`).
- Cookies are configured with:
  - `httpOnly: true`
  - `secure: process.env.NODE_ENV === "production"`
  - `sameSite: "lax"`
  - `path: "/"`
  - `maxAge: 604800` (7 days)
- Middleware at Edge handles initial route redirection; the layout RSC enforces database validation.

## 9. Rate Limiting Requirements

Rate limits are enforced using sliding window counters based on client IP (extracted safely from `x-forwarded-for` leftmost entry) and target email identifiers in `src/lib/rate-limit/limiter.ts`.

| Target Action / Route | Max Allowed Requests | Time Window | Key Identification Strategy | Exceeded Limit Response |
|---|---:|---|---|---|
| Account Signup (`/signup`) | 5 attempts | 60 minutes | Client IP Address | HTTP 429 + `Retry-After` Header |
| User Sign-in (`/signin`) | 10 attempts (IP); 5 attempts (Pair) | 15 minutes | Dual Key: Client IP AND (Client IP + Email) | HTTP 429 + `Retry-After` Header |
| Resend Verification Code | 1 attempt | 60 seconds | Email Address | HTTP 429 / UI Cooldown |
| Password Reset Request | 3 attempts | 60 minutes | Email Address | HTTP 429 + `Retry-After` Header |

## 10. Token & Single-Use Enforcement Mechanics

### Verification Code Invalidation

**AUDIT FIX:** When issuing a new OTP or resending a code, the server **MUST** execute a transaction setting `isUsed = true` for all existing unconsumed `VerificationCode` records belonging to that `userId` prior to creating the new code.

### Password Reset Token Invalidation

**AUDIT FIX:** Generating a new reset token **MUST** set `isUsed = true` on all existing active tokens for that `userId`.

Upon successful password reset, the token is marked `isUsed = true` and all active user records in `Session` are deleted globally.

## 11. Data Model (Prisma Schema v2.0)

The schema definition includes all required compound indexes for high-performance state lookups and integrity constraints.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                  String             @id @default(uuid())
  email               String             @unique
  passwordHash        String
  name                String
  isVerified          Boolean            @default(false)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  sessions            Session[]
  verificationCodes   VerificationCode[]
  passwordResetTokens PasswordResetToken[]
}

model VerificationCode {
  id                 String   @id @default(uuid())
  userId             String
  codeHash           String
  expiresAt          DateTime
  resendAvailableAt  DateTime
  isUsed             Boolean  @default(false)
  createdAt          DateTime @default(now())
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isUsed]) // Audit Fix: Optimized state lookup index
}

model Session {
  id         String   @id @default(uuid())
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model PasswordResetToken {
  id         String   @id @default(uuid())
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  isUsed     Boolean  @default(false)
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isUsed]) // Audit Fix: Single-use state validation index
}
```

## 12. Accessibility (WCAG 2.1 AA) & Edge Error Specifications

- **Form Controls:** Every input element is programmatically linked to an explicit `<label>` using matching `id` and `htmlFor` attributes.
- **Visual Indicators:** All interactive controls display high-contrast focus rings: `focus-visible:ring-2 focus-visible:ring-offset-2`.
- **Dynamic Validation:** Failed fields set `aria-invalid="true"` and reference error messages via `aria-describedby="[id]"`. Error banners use `role="alert"`.
- **Keyboard Navigation:** 100% of workflows are executable using Tab, Shift+Tab, Space, and Enter keys.

## 13. Evidence Artifact Requirements

During automated testing and evaluation, the developer must generate and capture artifacts in `docs/evidence/`:

1. **Evidence 1 — Password Hashing:** Raw SQL output (`SELECT id, email, "passwordHash" FROM "User";`) confirming bcrypt hash structures.
2. **Evidence 2 — Server Validation:** Direct curl HTTP POST sending an invalid payload (e.g. password > 72 chars or missing special character) receiving HTTP 400/422.
3. **Evidence 3 — Token Expiry:** Database query showing an expired `VerificationCode` alongside the server API response rejecting usage.
4. **Evidence 4 — Rate Limiting:** Automated script exceeding limits on `/signin`, demonstrating HTTP 429 status and `Retry-After` header.
5. **Evidence 5 — Single-Use Tokens:** Terminal transcript attempting token re-use, showing immediate server rejection.

## 14. Post-Audit Ranked Vulnerability & Gap Log

| # | Vulnerability / Gap | Description | Severity | Resolution / Corrective Action |
|---:|---|---|---|---|
| 1 | Unverified Account Overwrite (ATO) | Duplicate signups on unverified accounts overwrote name and password hash. | CRITICAL | Updated Section 6 & 19: Duplicate signups on unverified accounts NEVER update credentials; they re-issue OTPs to the original email. |
| 2 | Premature Session Issuance | Issuing full session cookies upon signup allowed bypassing `/verify-email`. | CRITICAL | Updated Section 6 & 11: Set signed `pending_verification_token` cookie. Full DB session created strictly after verification at `/signin`. |
| 3 | Timing Attack User Enumeration | Missing email sign-in attempts returned immediately, revealing user existence. | HIGH | Updated Section 8: Enforced execution of dummy bcrypt hash verification on non-existent email lookup failures. |
| 4 | Multiple Active Tokens Accumulation | Re-issuing OTPs left prior codes active, increasing brute-force probability. | HIGH | Updated Section 10: Enforced transactional `updateMany` marking all old user tokens `isUsed = true` upon new issuance. |
| 5 | Unbounded Password Memory DoS | Absence of max length on password inputs allowed CPU/memory exhaustion via bcrypt. | MEDIUM | Updated Section 8: Added `.max(72)` constraint across all Zod password schemas. |
| 6 | Unprotected Static Layout Leaks | RSC layout state leaks when route protection relied solely on page components. | MEDIUM | Updated Section 1 & 6: Mandatory Next.js Edge `middleware.ts` cookie pre-check combined with layout DB session checks. |
| 7 | Missing Database Compound Indexes | Unindexed token lookups (`userId + isUsed`) caused performance degradation. | LOW | Updated Section 11: Added `@@index([userId, isUsed])` to `VerificationCode` and `PasswordResetToken` models. |

## 15. Revised, Build-Ready Action Plan

1. **Database Migration:** Deploy updated `prisma/schema.prisma` containing compound indexes for `VerificationCode` and `PasswordResetToken`.
2. **Validation Boundaries:** Apply `z.string().min(8).max(72)` bounds in `src/lib/validation/auth.ts`.
3. **Edge Middleware & Session Isolation:** Implement Edge `middleware.ts` checking for `session_token`. Configure `/signup` to issue strictly `pending_verification_token` cookies.
4. **Constant-Time Auth Engine:** Add dummy bcrypt hash routines to `src/lib/auth/hash.ts` and integrate into the `/signin` server action.
5. **Transactional Token Invalidation:** Wrap verification and reset token issuance inside Prisma transactions to invalidate legacy active codes.
6. **Dual Rate Limiters:** Refactor `src/lib/rate-limit/limiter.ts` to track dual IP and IP+Email keys with safe `x-forwarded-for` extraction.

---

*Source: Authentication Slice PRD — Post-Audit Build-Ready, Version 2.0-Final.*
