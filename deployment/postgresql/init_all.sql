-- =============================================================================
-- Pravartee CRM — single-file bootstrap (psql meta-commands)
-- =============================================================================
-- From repository root:
--
--   psql -U postgres -v ON_ERROR_STOP=1 \
--     -f deployment/postgresql/init_all.sql
--
-- Set password before running:
--   \set crm_password `'your_strong_password_here'`
-- =============================================================================

\set ON_ERROR_STOP on

-- Replace via: psql ... -v crm_password="'MySecretPass'"
\if :{?crm_password}
\else
\echo 'ERROR: Pass password with -v crm_password="''your_password''"'
\quit
\endif

-- Part 1: role + database
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_user') THEN
        EXECUTE format(
            'CREATE ROLE crm_user WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT CONNECTION LIMIT 50',
            :'crm_password'
        );
    ELSE
        EXECUTE format('ALTER ROLE crm_user WITH PASSWORD %L', :'crm_password');
    END IF;
END
$$;

SELECT format(
    'CREATE DATABASE pravartee_crm OWNER crm_user ENCODING ''UTF8'' TEMPLATE template0'
) WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'pravartee_crm')
\gexec

ALTER DATABASE pravartee_crm OWNER TO crm_user;
GRANT CONNECT, TEMPORARY ON DATABASE pravartee_crm TO crm_user;

-- Part 2: schema (requires connection switch)
\connect pravartee_crm

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO crm_user;

ALTER DEFAULT PRIVILEGES FOR ROLE crm_user IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES FOR ROLE crm_user IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO crm_user;

ALTER ROLE crm_user SET client_encoding TO 'UTF8';
ALTER ROLE crm_user SET timezone TO 'UTC';
ALTER ROLE crm_user SET statement_timeout TO '30s';
ALTER ROLE crm_user SET lock_timeout TO '10s';
ALTER ROLE crm_user SET idle_in_transaction_session_timeout TO '60s';

\echo 'Pravartee CRM database provisioning complete.'
