# __PROJECT_NAME__

SvelteKit app created from the Aionsoft private template package.

## Stack

- SvelteKit 2
- Svelte 5
- Tailwind CSS 4
- shadcn-svelte baseline
- Drizzle ORM + PostgreSQL baseline
- TypeScript 6

## Development

```bash
bun install
bun run dev
```

## Optional generation features

This project can be scaffolded with explicit auth selection at generation time:

```bash
npx @cesar-ornelas/template-svelte-kit my-app --auth logto
```

When `--auth logto` is enabled, the generated app includes:

- `@logto/sveltekit`
- `src/hooks.server.ts`
- `src/lib/features/auth-logto/server/config.ts`
- `src/lib/features/auth-logto/server/management.ts`
- `src/routes/auth/sign-in/+server.ts`
- `src/routes/auth/sign-out/+server.ts`
- `src/routes/setup/+page.server.ts`
- `src/routes/setup/+page.svelte`
- `src/lib/entities/access-control/model/schema.ts`
- `src/lib/entities/access-control/model/types.ts`
- `src/lib/features/authorization-rbac/server/permissions.ts`
- Logto env placeholders in `.env` (or `.env.example` when present)

First-run behavior with `--auth logto`:

- `/setup` is publicly accessible until at least one app-local user exists.
- The setup form creates the default Logto organization (if none exists), creates the first user (username, email, password), assigns the user to that organization, and stores the local user record.
- Once a local user exists, all app pages require authentication and `/setup` redirects to sign-in.

Additional Logto env options:

- `LOGTO_DEFAULT_ORGANIZATION_NAME` (default: `Default Organization`)
- `LOGTO_DEFAULT_ORGANIZATION_DESCRIPTION` (default: `Initial organization created during first-run setup.`)

## shadcn-svelte AI skill (optional)

If you use Copilot skills, install the shadcn-svelte skill in this project:

```bash
bun x skills add huntabyte/shadcn-svelte
```

Then restart your editor session so the skill is discovered.

## Design system configuration

This template ships with shadcn-svelte preconfigured.

- `components.json` stores builder-style choices such as `style`, `baseColor`, `iconLibrary`, `menuColor`, and `menuAccent`.
- `src/app.css` stores theme tokens such as fonts, radius, surface colors, and chart colors.
- `src/lib/utils.ts` provides the shared `cn()` helper used by shadcn components.

Current default baseline:

- style: `nova`
- base color: `neutral`
- icon library: `lucide`
- menu: `default`
- menu accent: `subtle`

If you generate a preset from the shadcn-svelte website builder, copy the structural settings into `components.json` and the theme token changes into `src/app.css`.

Current font setup:

- body: `DM Sans`
- headings: `Noto Sans`

## Build

```bash
bun run build
bun run preview
```

## Database baseline

This template includes a Drizzle ORM + PostgreSQL baseline.

Included files:

- `drizzle.config.ts`
- `src/lib/server/db/index.ts`
- `src/lib/server/db/schema/`
- `.env.example` with `DATABASE_URL`

Initial setup:

```bash
cp .env.example .env
```

### Create the database and app role

For internal usage, the database name and the application role name should match.

Set an existing PostgreSQL admin connection first, then choose the app database name and password:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=your_admin_password
export PGDATABASE=postgres

APP_DB_NAME=__PROJECT_NAME__
APP_DB_USER="$APP_DB_NAME"
APP_DB_PASSWORD=change-me
```

Run this bootstrap script with `psql`:

```bash
psql -v ON_ERROR_STOP=1 \
	-v app_db_name="$APP_DB_NAME" \
	-v app_db_user="$APP_DB_USER" \
	-v app_db_password="$APP_DB_PASSWORD" <<'SQL'
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_catalog.pg_roles
		WHERE rolname = :'app_db_user'
	) THEN
		EXECUTE format(
			'CREATE ROLE %I LOGIN PASSWORD %L',
			:'app_db_user',
			:'app_db_password'
		);
	ELSE
		EXECUTE format(
			'ALTER ROLE %I WITH LOGIN PASSWORD %L',
			:'app_db_user',
			:'app_db_password'
		);
	END IF;
END
$$;

SELECT format(
	'CREATE DATABASE %I OWNER %I',
	:'app_db_name',
	:'app_db_user'
)
WHERE NOT EXISTS (
	SELECT 1
	FROM pg_database
	WHERE datname = :'app_db_name'
)\gexec

SELECT format(
	'ALTER DATABASE %I OWNER TO %I',
	:'app_db_name',
	:'app_db_user'
)\gexec

SELECT format(
	'GRANT ALL PRIVILEGES ON DATABASE %I TO %I',
	:'app_db_name',
	:'app_db_user'
)\gexec
SQL
```

### Run the same setup from pgAdmin

If you prefer pgAdmin, use plain SQL instead of the `psql` version above.

Connect to an admin database such as `postgres`, then replace the role name, database name, and password values before running the statements below.

Create or update the application role:

```sql
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_catalog.pg_roles
		WHERE rolname = '__PROJECT_NAME__'
	) THEN
		EXECUTE format(
			'CREATE ROLE %I LOGIN PASSWORD %L',
			'__PROJECT_NAME__',
			'change-me'
		);
	ELSE
		EXECUTE format(
			'ALTER ROLE %I WITH LOGIN PASSWORD %L',
			'__PROJECT_NAME__',
			'change-me'
		);
	END IF;
END
$$;
```

Optionally check whether the database already exists:

```sql
SELECT datname
FROM pg_database
WHERE datname = '__PROJECT_NAME__';
```

If the database does not exist yet, create it:

```sql
CREATE DATABASE __PROJECT_NAME__ OWNER __PROJECT_NAME__;
```

Then ensure ownership and grants are correct:

```sql
ALTER DATABASE __PROJECT_NAME__ OWNER TO __PROJECT_NAME__;
```

```sql
GRANT ALL PRIVILEGES ON DATABASE __PROJECT_NAME__ TO __PROJECT_NAME__;
```

Set your database connection string:

```bash
DATABASE_URL=postgresql://__PROJECT_NAME__:change-me@localhost:5432/__PROJECT_NAME__
```

Drizzle commands:

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

If you prefer applying schema directly instead of generating migrations first:

```bash
bun run db:push
```

## RBAC starter seed

When this app is generated with `--auth logto`, it includes a starter access-control schema and a seed script.

The seed script creates generic starter permissions and roles:

- `view:dashboard`
- `manage:users`
- `manage:roles`
- `manage:permissions`
- `manage:settings`
- roles: `admin`, `editor`, `viewer`

Run schema setup first:

```bash
bun run db:push
```

Then run the seed:

```bash
bun run db:seed
```

If you want the seed to also create one bootstrap app user and assign the `admin` role, set these optional variables in `.env` first:

```bash
SEED_ADMIN_LOGTO_USER_ID=logto-user-id-from-your-account
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_DISPLAY_NAME=Your Name
```

Recommended flow for apps installed from this template:

1. Create the PostgreSQL role and database.
2. Set `DATABASE_URL` in `.env`.
3. Run `bun install`.
4. Run `bun run db:push` or `bun run db:migrate`.
5. Optionally set the `SEED_ADMIN_*` variables.
6. Run `bun run db:seed`.
7. Start the app with `bun run dev`.
8. Sign in through Logto using the user you seeded, or add your own user-to-role mapping later.

The template includes a minimal `app_settings` table as a starting point. Add new schemas under `src/lib/entities/<entity>/model/schema.ts`.

## Feature-Sliced architecture baseline

This template is organized with Feature-Sliced Design defaults:

- `src/lib/widgets/` for page-building blocks
- `src/lib/features/` for user workflows
- `src/lib/entities/` for business entities and persistence
- `src/lib/shared/` for generic utilities and technical infrastructure

Dependency direction is enforced with a boundary check script:

```bash
bun run lint:boundaries
```

The default reference slice demonstrates entity-owned persistence:

- `src/lib/entities/app-settings/model/schema.ts`
- `src/lib/entities/app-settings/server/repository.ts`
- `src/lib/features/settings-health/server/get-settings-health.ts`
- `src/lib/widgets/home-dashboard/ui/HomeDashboard.svelte`

`src/lib/server/db/` remains as a compatibility shim for older imports, but new code should use `src/lib/shared/server/db/client.ts` and entity-owned models.

## Project guidance

- `AGENTS.md` contains AI collaboration rules for the project.
- `specs/architecture.md` defines structure and delivery expectations.
- `specs/product-and-content.md` defines baseline product/content requirements.

## Swetrix analytics (optional)

The root layout includes built-in Swetrix wiring activated only when `PUBLIC_SWETRIX_PROJECT_ID` is set.

```bash
cp .env.example .env
```

Then set:

```bash
PUBLIC_SWETRIX_PROJECT_ID=YOUR_PROJECT_ID
```
