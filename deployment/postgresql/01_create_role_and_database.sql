-- =============================================================================
-- Pravartee CRM — PostgreSQL 16+ provisioning (Part 1 of 2)
-- =============================================================================
-- Run as a PostgreSQL superuser (e.g. postgres):
--
--   psql -U postgres -f deployment/postgresql/01_create_role_and_database.sql
--
-- BEFORE running: replace CHANGE_ME_STRONG_PASSWORD with a strong password
-- and use the same value in backend/.env as DB_PASSWORD.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Application role (least privilege)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_user') THEN
        CREATE ROLE crm_user WITH
            LOGIN
            PASSWORD 'CHANGE_ME_STRONG_PASSWORD'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            CONNECTION LIMIT 50;
        RAISE NOTICE 'Role crm_user created.';
    ELSE
        RAISE NOTICE 'Role crm_user already exists — skipped CREATE ROLE.';
    END IF;
END
$$;

-- Optional: rotate password on existing role
-- ALTER ROLE crm_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- -----------------------------------------------------------------------------
-- 2. Database
-- -----------------------------------------------------------------------------
SELECT 'CREATE DATABASE pravartee_crm'
    || ' OWNER crm_user'
    || ' ENCODING ''UTF8'''
    || ' LC_COLLATE ''en_US.UTF-8'''
    || ' LC_CTYPE ''en_US.UTF-8'''
    || ' TEMPLATE template0'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = 'pravartee_crm'
)\gexec

-- If the database already exists, ensure owner is correct:
ALTER DATABASE pravartee_crm OWNER TO crm_user;

-- -----------------------------------------------------------------------------
-- 3. Database-level privileges
-- -----------------------------------------------------------------------------
GRANT CONNECT, TEMPORARY ON DATABASE pravartee_crm TO crm_user;

-- =============================================================================
-- Next step: run Part 2 connected to pravartee_crm
--
--   psql -U postgres -d pravartee_crm -f deployment/postgresql/02_schema_grants.sql
-- =============================================================================
