-- =============================================================================
-- Pravartee CRM — PostgreSQL 16+ provisioning (Part 2 of 2)
-- =============================================================================
-- Run connected to pravartee_crm:
--
--   psql -U postgres -d pravartee_crm -f deployment/postgresql/02_schema_grants.sql
-- =============================================================================

-- Restrict default public access (PostgreSQL 15+ hardening)
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant schema usage to application user
GRANT USAGE, CREATE ON SCHEMA public TO crm_user;

-- Django migrations create tables owned by crm_user when connecting as crm_user.
-- When migrations run as postgres, transfer ownership or run migrations as crm_user.

ALTER DEFAULT PRIVILEGES FOR ROLE crm_user IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_user;

ALTER DEFAULT PRIVILEGES FOR ROLE crm_user IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO crm_user;

-- Recommended session settings for the application role
ALTER ROLE crm_user SET client_encoding TO 'UTF8';
ALTER ROLE crm_user SET timezone TO 'UTC';
ALTER ROLE crm_user SET statement_timeout TO '30s';
ALTER ROLE crm_user SET lock_timeout TO '10s';
ALTER ROLE crm_user SET idle_in_transaction_session_timeout TO '60s';

-- Optional: enable extensions when required by future modules
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- fuzzy search
-- CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive text
