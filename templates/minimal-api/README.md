# .NET Minimal API Template

Use this template for backend services and APIs where ASP.NET Core Minimal API is preferred.

## Recommended stack

- .NET SDK (LTS)
- ASP.NET Core Minimal API
- OpenAPI/Swagger
- Structured logging
- Optional: PostgreSQL + EF Core or Dapper

## Default structure blueprint

```text
minimal-api/
  src/
    Api/
      Program.cs
      Endpoints/
      Contracts/
      Services/
      Data/
  tests/
    Api.Tests/
  Directory.Build.props
  README.md
```

## First-run commands

```bash
# from a generated project directory
dotnet restore
dotnet run --project src/Api
dotnet build
dotnet test
```

## Minimum checklist

- Add health endpoint and readiness checks.
- Add OpenAPI with clear request/response contracts.
- Add centralized exception handling and validation responses.
- Add auth middleware and policy checks if endpoints are protected.
- Add integration tests for critical endpoint flows.

## Use this template when

- You need a standalone API service.
- You want strong typed contracts and .NET ecosystem tooling.
- You need predictable performance for backend workloads.
