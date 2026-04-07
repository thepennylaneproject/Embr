#!/bin/bash
# Creates the embr_test database used by local test runs and grants embr_app
# access to it so RLS policies are exercised during testing.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE embr_test OWNER $POSTGRES_USER'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'embr_test')
  \gexec

  GRANT CONNECT ON DATABASE embr_test TO embr_app;
EOSQL
