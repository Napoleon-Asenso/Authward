# 

## Core Principles

* **Source of Truth:** Treat `PRD.md` and `AGENTS.md` as non-negotiable architectural authorities.
* **Server Authority:** Perform all critical logic, data mutations, and session validations on the server\[cite: 2, 4].
* **Strict Type Safety:** Enable strict type checking with zero tolerance for `any` or implicit `unknown` escape hatches.

## Next.js App Router \& Component Boundaries

* **Default Component Type:** Treat all components in `src/app/` as Server Components by default.
* **Client Component Restraint:** Reserve `"use client"` exclusively for interactive UI elements (e.g., forms, toggles, loading states)\[cite: 2].
* **No Direct DB Access in Client Components:** NEVER import Prisma Client or database modules inside Client Components.
* **Server Action Validation:** ALWAYS validate all Server Action inputs using Zod schemas before executing business or database logic.

## TypeScript Standards

* **No `any` Types:** NEVER write `any`. Use explicit interface definitions or Zod-inferred types (`z.infer<typeof schema>`).
* **Strict Null Checks:** Handle `null` and `undefined` explicitly across all data fetches and form inputs.

## Input Validation (Zod Schemas)

* **Single Location:** Place all shared authentication schemas in `src/lib/validation/auth.ts`.
* **String Normalization:** ALWAYS apply `.trim().toLowerCase()` to email fields in Zod schemas prior to processing.
* **Password Bounds:** Enforce minimum 8 characters and maximum 72 characters (`z.string().min(8).max(72)`) with rules for uppercase, lowercase, numbers, and special characters\[cite: 4].
* **OTP Format:** Enforce exactly 6 numeric digits (`z.string().regex(/^\[0-9]{6}$/)`)\[cite: 4].

