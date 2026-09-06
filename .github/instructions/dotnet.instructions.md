---
name: "Aionsoft .NET"
description: "Use when developing a .NET application, C# project, ASP.NET Core API, background service, Entity Framework model, or appsettings configuration in apps/."
applyTo:
  - "apps/**/*.cs"
  - "apps/**/*.csproj"
  - "apps/**/*.sln"
  - "apps/**/appsettings*.json"
---

# .NET Engineering Profile

- Use the SDK and target framework pinned by the owning solution; do not upgrade them as part of unrelated work.
- Follow the owning application's established architecture and namespace conventions before adding new layers.
- Use ASP.NET Core dependency injection, configuration, logging, and options patterns for application services.
- Keep controllers or endpoints focused on transport concerns and place business rules in the owning application or domain layer.
- Keep secrets out of `appsettings*.json`; use environment variables or the repository's approved secret provider.
- Pass cancellation tokens through asynchronous I/O and avoid blocking asynchronous calls.
- Use the persistence technology selected by that app; do not assume PostgreSQL, PocketBase, or Entity Framework without repository evidence.
- Run the narrowest relevant test project, then build the owning solution before completion.
