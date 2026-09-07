---
trigger: glob
---

# 

## Sliding Window Rate Limiting

* **Limiter Location:** Enforce rate-limiting logic inside `src/lib/rate-limit/limiter.ts`\[cite: 4].
* **IP Extraction:** ALWAYS extract the client IP address from the leftmost entry of the `x-forwarded-for` header safely\[cite: 4].
* **HTTP 429 Responses:** When limits are exceeded, ALWAYS return an HTTP 429 status accompanied by a valid `Retry-After` header\[cite: 4].

## Route-Specific Limits

* **Signup (`/signup`):** Max 5 attempts per 60 minutes per IP address\[cite: 4].
* **Signin (`/signin`):** Enforce Dual-Key limits: Max 10 attempts per IP AND Max 5 attempts per (IP + Email) combination per 15 minutes\[cite: 4].
* **Resend Code:** Max 1 attempt per 60 seconds per Email address\[cite: 4].
* **Password Reset Request:** Max 3 attempts per 60 minutes per Email address\[cite: 4].

## Single-Use Token Lifecycle Rules

* **OTP Invalidation:** Before creating a new verification code, execute a database transaction marking `isUsed = true` for all existing unconsumed `VerificationCode` records for that `userId`\[cite: 3, 4].
* **Reset Token Invalidation:** Before issuing a new reset link, execute a database transaction marking `isUsed = true` for all active `PasswordResetToken` records for that `userId`\[cite: 3, 4].
* **Global Session Revocation:** Upon successful password reset, mark the reset token `isUsed = true` AND execute `DELETE FROM "Session" WHERE "userId" = user\_id` inside the same transaction\[cite: 3, 4].

