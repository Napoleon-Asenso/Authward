---
trigger: glob
---

# 

## Required Artifact Storage

* **Directory Location:** Output all generated testing evidence directly into `docs/evidence/`\[cite: 4].
* **No File Renaming:** Preserve exact filenames matching the PRD specification\[cite: 4].

## Artifact Standards \& Generation Rules

1. **`docs/evidence/1-password-hashing.sql`**

   * Output: Raw SQL query output confirming stored bcrypt hashes\[cite: 4].
   * Requirement: Execute `SELECT id, email, "passwordHash" FROM "User";` against the PostgreSQL instance\[cite: 4].
2. **`docs/evidence/2-server-validation.json`**

   * Output: Server response payload resulting from an invalid request\[cite: 4].
   * Requirement: Send a direct `curl` POST with invalid input (e.g., password > 72 chars or missing special char) demonstrating an HTTP 400 or 422 error\[cite: 4].
3. **`docs/evidence/3-token-expiry.json`**

   * Output: Database query result alongside API error output showing rejection of an expired token/OTP code\[cite: 4].
4. **`docs/evidence/4-rate-limiting.txt`**

   * Output: HTTP header log proving rate limiter execution\[cite: 4].
   * Requirement: Execute automated requests exceeding rate limits on `/signin` to show an HTTP 429 response containing a `Retry-After` header\[cite: 4].
5. **`docs/evidence/5-single-use-tokens.txt`**

   * Output: Terminal output log demonstrating immediate server rejection when attempting to reuse an OTP or reset token\[cite: 4].

