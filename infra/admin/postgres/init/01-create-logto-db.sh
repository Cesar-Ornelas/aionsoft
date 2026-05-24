#!/bin/sh
set -eu

logto_db_name="${LOGTO_DB_NAME:?LOGTO_DB_NAME must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	SELECT 'CREATE DATABASE "' || '${logto_db_name}' || '"'
	WHERE NOT EXISTS (
		SELECT 1 FROM pg_database WHERE datname = '${logto_db_name}'
	)\gexec
SQL