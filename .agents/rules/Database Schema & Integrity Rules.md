---
trigger: glob
---

# 

## Prisma \& PostgreSQL Rules

* **Schema Location:** Maintain the canonical database structure strictly in `prisma/schema.prisma`\[cite: 1, 4].
* **Direct Mutations Prohibited:** NEVER modify the PostgreSQL schema directly via raw SQL scripts or untracked manual alterations. ALWAYS use Prisma migrations (`npx prisma migrate dev`).

## Data Integrity \& Referential Constraints

* **Foreign Key Constraints:** ALWAYS configure foreign keys targeting `User.id` with `onDelete: Cascade` across `Session`, `VerificationCode`, and `PasswordResetToken` models\[cite: 4].
* **Explicit ID Generation:** ALWAYS default Primary Keys to UUIDs (`String @id @default(uuid())`)\[cite: 4].
* **Non-Nullable Fields:** Keep required fields (`email`, `passwordHash`, `expiresAt`, `tokenHash`, `codeHash`) strictly non-nullable unless explicitly allowed by the PRD\[cite: 4].

## Indexing Requirements

* **Unique Indexes:** Enforce `@unique` on `User.email`, `Session.tokenHash`, and `PasswordResetToken.tokenHash`\[cite: 4].
* **Compound Performance Indexes:** Enforce `@@index(\[userId, isUsed])` on both `VerificationCode` and `PasswordResetToken` models to optimize state lookup queries\[cite: 4].
* **Foreign Key Indexes:** Enforce `@@index(\[userId])` on all dependent tables to optimize relational joins\[cite: 4].

