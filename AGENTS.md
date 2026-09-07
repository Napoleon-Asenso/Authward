
1. Project Context & Source of Truth
This repository contains the Authentication Slice (Assessment 1), a production-grade, self-contained authentication engine built with Next.js (App Router), TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, and Zod.  
MD
+ 1

The absolute functional and security source of truth for this repository is PRD.md (or Authentication_PRD_Final_2.pdf). The AI agent MUST treat the PRD as the immutable specification for features, data models, security boundaries, and user journeys. AGENTS.md governs agent behavior, enforcing operational directives, coding standards, and architectural compliance while implementing the PRD.  
PDF
+ 2

2. Locked Technology Stack & Constraints
The agent MUST strictly adhere to the following technological boundaries. Swapping, updating, or introducing unapproved dependencies is forbidden:  
MD
+ 2

Framework: Next.js (App Router)  
MD
+ 1

Language: TypeScript (Strict mode enabled, zero any allowed)  
MD
+ 1

Database & ORM: PostgreSQL managed via Prisma ORM  
MD
+ 1

Styling: Tailwind CSS  
MD
+ 1

Input Validation: Zod schemas  
MD
+ 1

Password Hashing: bcrypt exclusively  
MD
+ 1

Prohibited Dependencies: You MUST NOT install or introduce NextAuth.js / Auth.js, Supabase Auth, Clerk, Passport.js, Express, or any external authentication management libraries. All authentication logic must be built natively using Next.js App Router capabilities, Prisma, bcrypt, and Zod.  
PDF
+ 2

3. Non-Negotiable Business & Security Rules ("What Must NEVER Happen")
The AI agent MUST NOT violate any of the following absolute directives:  
PDF

NEVER store or log plaintext passwords: ALWAYS hash passwords using bcrypt before saving to the database. NEVER include passwordHash in database select statements unless explicitly required for authentication handlers.  
PDF
+ 3

NEVER execute client-side session checks: Session validation MUST occur exclusively on the server via Next.js Edge middleware.ts combined with database token validation in layout React Server Components (RSC).  
PDF
+ 4

NEVER store unhashed tokens in the database: Verification codes, password reset tokens, and session tokens MUST be cryptographically hashed (e.g., bcrypt or crypto hashes) prior to persistence.  
PDF
+ 3

NEVER permit account takeover on duplicate signups: If a signup attempt occurs with an existing unverified email, NEVER overwrite the existing passwordHash or name. Invalidate old verification codes, generate a fresh OTP, set the pending token cookie, and redirect to /verify-email.  
HTML
+ 2

NEVER issue a full Session record prior to email verification: Unverified users must ONLY receive a signed, httpOnly pending_verification_token cookie. Database Session records are strictly issued after successful credential verification at /signin.  
PDF
+ 3

NEVER allow timing attacks for non-existent users: If prisma.user.findUnique() returns null during sign-in, the agent MUST run a dummy bcrypt password verification against a pre-computed dummy hash before returning an HTTP 401.  
PDF
+ 2

NEVER omit HTTP security flags on auth cookies: Auth cookies MUST set httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", and path: "/".  
PDF
+ 2

NEVER bypass single-use token constraints: When re-issuing an OTP or reset token, the agent MUST execute a Prisma transaction setting isUsed = true on all existing active tokens for that userId.  
PDF
+ 1

NEVER build out-of-scope features: DO NOT scaffold marketing pages, landing layouts, hero sections, user profile editors, avatar uploads, OAuth/Social logins, MFA/2FA, RBAC, or dashboard analytical widgets.  
PDF
+ 1

4. Directory Structure & Workspace Layout
The agent MUST place all files within the following standardized layout:  
MD
+ 1

Plaintext
├── prisma/
│   └── schema.prisma                 # Hardened Prisma schema & compound indexes
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Isolated auth route group
│   │   │   ├── signup/
│   │   │   ├── verify-email/
│   │   │   ├── signin/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── dashboard/                # Protected route group
│   │   │   ├── layout.tsx            # Server-side DB session validation
│   │   │   └── page.tsx              # Minimal dashboard view
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Root redirect logic
│   ├── lib/
│   │   ├── auth/                     # Server Actions, bcrypt hashing, session logic
│   │   ├── db/                       # Prisma client singleton
│   │   ├── rate-limit/               # Sliding window rate limiter (limiter.ts)
│   │   └── validation/               # Zod validation schemas (auth.ts)
│   └── middleware.ts                 # Next.js Edge middleware for cookie checks
└── docs/
    └── evidence/                     # Captured test evidence artifacts
Server Actions MUST reside in src/lib/auth/ or route-adjacent action modules.

Shared Zod schemas MUST reside in src/lib/validation/auth.ts.

Client Components ("use client") MUST be limited strictly to interactive UI forms and buttons. Route protection logic MUST remain in Server Components and Middleware.  
PDF
+ 2

5. Coding & Security Standards
TypeScript & Strict Typing
Zero any or unknown escape hatches allowed. Define explicit types or Zod inferred types (z.infer<typeof schema>).  
PDF

Enable strict type checking in tsconfig.json.

Input Validation (Zod)
Email: Must be trimmed, normalized with .toLowerCase(), and RFC 5322 compliant.  
PDF

Password: Minimum 8 characters, maximum 72 characters (preventing bcrypt Denial of Service attacks), containing at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character.  
PDF

Verification Code: Must match exactly 6 numeric digits (^[0-9]{6}$).  
PDF

Accessibility Compliance (WCAG 2.1 AA)
Every form control MUST have an explicit <label> associated via matching id and htmlFor attributes.  
PDF

All interactive form inputs MUST render visible focus indicators (focus-visible:ring-2 focus-visible:ring-offset-2).

Failed input validation states MUST programmatically set aria-invalid="true" and link to visible error element IDs via aria-describedby="[id]".

Form level error alerts MUST use role="alert".

All workflows MUST be 100% navigable using keyboard inputs (Tab, Shift+Tab, Space, Enter).

6. Definition of Done (Completion Checklist)
Before completing any task or marking a module complete, the AI agent MUST verify:

[ ] Zero TypeScript errors and zero linter warnings.

[ ] Database schema in prisma/schema.prisma matches PRD v2.0 exactly (including compound indexes @@index([userId, isUsed])).  
PDF

[ ] All form submissions validate on both client and server via shared Zod schemas.  
HTML
+ 1

[ ] Sign-in logic contains dummy bcrypt hash routines for non-existent users.  
PDF

[ ] Global session deletion (DELETE FROM "Session" WHERE "userId" = ...) is executed inside a transaction upon successful password resets.  
HTML

[ ] Multi-key sliding window rate limiting is active on /signup, /signin, resend code, and reset requests.  
PDF

[ ] The environment and implementation preserve conditions necessary to generate the 5 technical evidence artifacts in docs/evidence/:

1-password-hashing.sql: Raw SQL output showing bcrypt hash structures.

2-server-validation.json: HTTP 400/422 response payload from invalid curl POSTs.

3-token-expiry.json: Database query and API rejection for expired OTP codes.

4-rate-limiting.txt: HTTP 429 response log containing Retry-After header.  
PDF

5-single-use-tokens.txt: Terminal log showing rejection on token re-use attempts.

7. Agent Operational Protocol When Unsure
When encountering ambiguities, missing configuration values, or edge cases during code generation:

NEVER Invent or Speculate: DO NOT introduce custom features, extra database fields, speculative route helpers, or unasked-for UI additions.  
PDF

Consult PRD First: Search PRD.md for explicit rulings regarding data types, state behaviors, and security protocols.  
PDF

Fail Safe & Ask: If a requirement conflicts with security boundaries or database integrity, STOP and ask the user a concise clarifying question rather than making unverified assumptions.  
PDF
+ 1

Preserve Security Defaults: If an architectural trade-off arises, default strictly to server-side enforcement, database transaction safety, and constant-time execution over client convenience.  
PDF
+ 1