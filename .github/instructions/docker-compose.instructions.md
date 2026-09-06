---
name: "Aionsoft Docker Compose"
description: "Use when editing Dockerfiles, Compose services, development infrastructure, environment wiring, health checks, volumes, or container commands."
applyTo:
  - "docker/**"
  - "infra/**/*.{yml,yaml}"
---

# Docker Compose Profile

- Keep each application's Compose files and environment wiring under its owning `infra/<app>/` directory.
- Keep image build definitions under `docker/` unless an established app-specific pattern requires otherwise.
- Reference secrets through environment variables or secret providers; do not commit secret values.
- Add health checks and dependency conditions when startup ordering affects correctness.
- Preserve persistent data in named volumes and avoid destructive volume operations unless explicitly requested.
- Validate changed Compose files with the corresponding `<app>:infra:config` root script.
