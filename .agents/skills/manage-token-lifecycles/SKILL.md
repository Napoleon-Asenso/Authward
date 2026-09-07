---
name: manage-token-lifecycles
description: Rules for managing single-use OTPs, reset tokens, global session revocation, and pending cookies.
version: 1.0.0
---

# Manage Token Lifecycles

## Operational Context
Use this skill whenever issuing OTP verification codes, creating password reset tokens, validating token usage, or invalidating sessions[cite: 2, 3, 4].

## Non-Negotiable Directives

### 1. Invalidation on Re-issuance
* When generating a new OTP code or reset token, ALWAYS run a transaction setting `isUsed = true` on all existing active tokens for that `userId` prior to inserting the new record[cite: 3, 4].

### 2. Global Session Invalidation
* Upon successful password reset, mark the reset token `isUsed = true` AND execute `DELETE FROM "Session" WHERE "userId" = user_id` inside the same database transaction[cite: 3, 4].

### 3. Cookie Boundaries
* Set signed `pending_verification_token` cookies for unverified accounts expiring in 15 minutes[cite: 2, 3].
* Set full `session_token` cookies ONLY after successful credential authentication at `/signin`[cite: 2, 3].
* ALL auth cookies MUST set `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, and `path: "/"`[cite: 4].

## Step-by-Step Execution Protocol
1. Wrap token generation steps inside `prisma.$transaction([])` blocks[cite: 3, 4].
2. Execute `updateMany` setting `isUsed: true` for matching active `userId` records before `create` operations[cite: 3, 4].
3. Clear `pending_verification_token` cookies upon email verification completion[cite: 3].
4. Purge all `Session` records upon password updates[cite: 3, 4].