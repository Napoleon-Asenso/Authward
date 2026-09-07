---
name: generate-assessment-evidence
description: Instructions for executing scripts and saving required test artifacts to docs/evidence/.
version: 1.0.0
---

# Generate Assessment Evidence

## Operational Context
Use this skill whenever running verification sweeps or generating output files required for assessment defense in `docs/evidence/`[cite: 4].

## Non-Negotiable Directives

### 1. Output Location & Preservation
* Place generated test artifacts directly into `docs/evidence/`[cite: 4].
* Preservation of exact filenames is MANDATORY[cite: 4].

### 2. Artifact Standards
1. `docs/evidence/1-password-hashing.sql`: Save raw PostgreSQL output from `SELECT id, email, "passwordHash" FROM "User";` demonstrating bcrypt formatting[cite: 4].
2. `docs/evidence/2-server-validation.json`: Capture `curl` HTTP POST error response payload (`HTTP 400`/`422`) for payloads exceeding password limits or missing special characters[cite: 4].
3. `docs/evidence/3-token-expiry.json`: Output database state showing expired OTP codes alongside API responses rejecting their use[cite: 4].
4. `docs/evidence/4-rate-limiting.txt`: Output terminal log showing `HTTP 429` status code and `Retry-After` header when rate limit thresholds are passed[cite: 4].
5. `docs/evidence/5-single-use-tokens.txt`: Output terminal log demonstrating rejection on token re-use attempts[cite: 4].

## Step-by-Step Execution Protocol
1. Execute raw SQL query via Prisma or psql CLI and output results to `docs/evidence/1-password-hashing.sql`[cite: 4].
2. Issue invalid payload via `curl` command saving output to `docs/evidence/2-server-validation.json`[cite: 4].
3. Query expired `VerificationCode` records and append API error output to `docs/evidence/3-token-expiry.json`[cite: 4].
4. Run automated rate limit flooding script on `/signin` writing logs to `docs/evidence/4-rate-limiting.txt`[cite: 4].
5. Re-submit consumed reset token and write terminal response to `docs/evidence/5-single-use-tokens.txt`[cite: 4].