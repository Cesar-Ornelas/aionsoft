---
name: "Aionsoft Data Portability"
description: "Use when modeling application data, adding repositories, persistence, authentication, provider SDK calls, migrations, files, realtime, or database-backed feature behavior."
applyTo:
  - "apps/**/*.{js,ts}"
  - "packages/**/*.{js,ts}"
  - "specs/**/*.md"
---

# Data Portability Profile

- Read `specs/data-access.md` before creating or changing feature data access.
- Keep provider-neutral models, ports, and services inside the owning feature.
- Put provider SDK imports, queries, record mapping, and provider error translation in server-only adapters.
- Construct adapters in a server-only composition root; routes must depend on feature services rather than provider clients.
- Use stable application identifiers and normalized domain records at port boundaries.
- Keep identity and authorization models independent from Logto, PocketBase, or another provider's record format.
- Represent transactions, files, realtime, schema administration, and provider management APIs as explicit capabilities.
- Require adapters to report unsupported capabilities instead of silently weakening guarantees.
- Add contract tests for every adapter and provider integration tests for provider-specific semantics.
- Document exceptions with their fallback, lock-in impact, owner, and review date.
