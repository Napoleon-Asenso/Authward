---
trigger: glob
---

# 

## Commit Message Format

* **Conventional Commits Required:** ALL commit messages MUST follow the format: `<type>(<scope>): <short directive description>`.
* **Allowed Types:**

  * `feat`: A new feature implementation (e.g., `feat(auth): implement bcrypt password hashing`)
  * `fix`: A bug or vulnerability resolution (e.g., `fix(security): resolve timing attack vector on signin`)
  * `db`: Schema changes and Prisma migrations (e.g., `db(prisma): add compound indexes for token models`)
  * `test`: Adding or updating test scripts/evidence generators
  * `docs`: Documentation update
* **Imperative Mood:** Write commit descriptions in the imperative present tense (e.g., "add rate limiter" not "added rate limiter").

## Branching \& Atomic Scope

* **Atomic Changes:** Keep each logical change scoped strictly to a single concern (e.g., schema migration separate from UI components).
* **No Unrelated Files:** DO NOT commit temporary workspace files, local `.env` values, or system artifacts.

