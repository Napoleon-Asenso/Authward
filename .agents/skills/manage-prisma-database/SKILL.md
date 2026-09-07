---
name: manage-prisma-database
description: Rules for managing Prisma migrations, schema constraints, indexes, and referential integrity.
version: 1.0.0
---

# Manage Prisma Database

## Operational Context
Use this skill whenever modifying `prisma/schema.prisma`, creating Prisma migrations, or writing database query interactions.

## Non-Negotiable Directives

### 1. Schema Structural Requirements
* Maintain canonical database definitions strictly in `prisma/schema.prisma`[cite: 1, 4].
* Set Primary Keys to auto-generated UUIDs (`String @id @default(uuid())`)[cite: 4].
* Enforce explicit `@relation(fields: [userId], references: [id], onDelete: Cascade)` across `Session`, `VerificationCode`, and `PasswordResetToken` models[cite: 4].

### 2. Compound and Performance Indexing
* Enforce `@@index([userId, isUsed])` on `VerificationCode` and `PasswordResetToken` models[cite: 4].
* Enforce `@@index([userId])` on all dependent relational models[cite: 4].
* Enforce `@unique` constraints on `User.email`, `Session.tokenHash`, and `PasswordResetToken.tokenHash`[cite: 4].

### 3. Migration Protocol
* NEVER perform direct raw SQL mutations against the production PostgreSQL instance outside Prisma CLI commands.
* Execute schema updates strictly using `npx prisma migrate dev --name <migration_name>`.

## Step-by-Step Execution Protocol
1. Modify `prisma/schema.prisma` ensuring all foreign keys have `onDelete: Cascade` and required indexes[cite: 4].
2. Validate non-nullable fields (`email`, `passwordHash`, `expiresAt`, `tokenHash`, `codeHash`)[cite: 4].
3. Run `npx prisma validate` to confirm schema correctness.
4. Execute `npx prisma migrate dev` to generate migration files and update local database instances.