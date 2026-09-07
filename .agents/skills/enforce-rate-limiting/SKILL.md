---
name: enforce-rate-limiting
description: Procedures for implementing sliding window rate limiters, multi-key strategies, and HTTP 429 headers.
version: 1.0.0
---

# Enforce Rate Limiting

## Operational Context
Use this skill whenever building or updating route handlers, Server Actions, or request protection layers in `src/lib/rate-limit/limiter.ts`[cite: 4].

## Non-Negotiable Directives

### 1. Identifier Extraction
* Extract client IP addresses safely using the leftmost entry of the `x-forwarded-for` header[cite: 4].
* Normalize target emails using `.toLowerCase().trim()` before constructing identifier keys[cite: 4].

### 2. Multi-Key Requirements
* **`/signup`:** Enforce 5 attempts per 60 minutes per IP address[cite: 4].
* **`/signin`:** Enforce DUAL-KEY tracking: Max 10 attempts per IP AND Max 5 attempts per (IP + Email) pair per 15 minutes[cite: 4].
* **Resend OTP:** Enforce 1 attempt per 60 seconds per Email address[cite: 4].
* **`/forgot-password`:** Enforce 3 attempts per 60 minutes per Email address[cite: 4].

### 3. Rate Limit Exceeded Responses
* ALWAYS throw or return an HTTP 429 status code when rate limits are exceeded[cite: 4].
* ALWAYS attach a valid `Retry-After` header indicating remaining wait time in seconds[cite: 4].

## Step-by-Step Execution Protocol
1. Implement sliding window memory or store limiters in `src/lib/rate-limit/limiter.ts`[cite: 4].
2. Parse client IP from headers in Next.js Server Actions or Middleware[cite: 4].
3. Evaluate rate-limit keys prior to executing database lookups or password hashing routines[cite: 4].
4. Return `HTTP 429` with `Retry-After` headers if limit counters exceed defined thresholds[cite: 4].