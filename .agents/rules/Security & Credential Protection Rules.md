# 

## Password \& Token Hashing

* **bcrypt Enforcement:** ALWAYS hash user passwords using bcrypt\[cite: 1, 4]. NEVER use md5, sha1, or plain sha256 for password credentials.
* **No Plaintext Persist/Log:** NEVER output plaintext passwords or unhashed security tokens to console logs, database tables, or client-side responses\[cite: 4].
* **Database Token Hashing:** Cryptographically hash all session tokens, reset tokens, and OTP codes before saving them to the database\[cite: 2, 4].

## Anti-Enumeration \& Constant-Time Auth

* **Constant-Time Verification:** When `prisma.user.findUnique()` returns `null` during sign-in, ALWAYS run a dummy bcrypt hash comparison against a fixed hash before returning an HTTP 401\[cite: 4].
* **Generic Responses:** For `/forgot-password`, ALWAYS return a uniform success response ("If an account exists, a reset link has been sent") regardless of email existence.

## Session \& Cookie Governance

* **Cookie Flags:** ALL issued authentication cookies MUST include:

  * `httpOnly: true`\[cite: 4]
  * `secure: process.env.NODE\_ENV === "production"`\[cite: 4]
  * `sameSite: "lax"`\[cite: 4]
  * `path: "/"`\[cite: 4]
* **Unverified User Boundary:** NEVER create or issue a full database `Session` record for unverified accounts\[cite: 2, 3]. Use strictly a signed `pending\_verification\_token` cookie\[cite: 2, 3].

## Scope Enforcement ("What Must NEVER Exist")

* **Prohibited Features:** DO NOT construct landing pages, profile upload tools, social OAuth options, MFA widgets, or complex RBAC tables\[cite: 4].

