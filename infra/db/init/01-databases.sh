#!/bin/bash
# Creates FitScape's databases and login roles. See docs/adr/0003-hosting-and-environments.md.
#
# The official postgres image runs this ONCE, when the data volume is empty.
# Changing this file later does nothing to an existing database. Use a migration instead.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v dev_pw="$FITSCAPE_DEV_PASSWORD" \
  -v test_pw="$FITSCAPE_TEST_PASSWORD" \
  -v prod_pw="$FITSCAPE_PROD_PASSWORD" \
  -v ro_pw="$FITSCAPE_READONLY_PASSWORD" <<'SQL'
-- One login role per environment, so the dev role can never touch prod data.
CREATE ROLE fitscape_dev      LOGIN PASSWORD :'dev_pw';
CREATE ROLE fitscape_test     LOGIN PASSWORD :'test_pw';
CREATE ROLE fitscape_prod     LOGIN PASSWORD :'prod_pw';
-- For browsing prod in DBeaver without any risk of changing it.
CREATE ROLE fitscape_readonly LOGIN PASSWORD :'ro_pw';

CREATE DATABASE fitscape_dev  OWNER fitscape_dev;
CREATE DATABASE fitscape_test OWNER fitscape_test;
CREATE DATABASE fitscape_prod OWNER fitscape_prod;

-- By default any role may connect to any database. Lock each one down to its owner.
REVOKE ALL ON DATABASE fitscape_dev  FROM PUBLIC;
REVOKE ALL ON DATABASE fitscape_test FROM PUBLIC;
REVOKE ALL ON DATABASE fitscape_prod FROM PUBLIC;
GRANT CONNECT ON DATABASE fitscape_prod TO fitscape_readonly;
SQL

# Read-only access to prod: existing tables now, and tables created later by migrations.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname fitscape_prod <<'SQL'
GRANT USAGE ON SCHEMA public TO fitscape_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fitscape_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE fitscape_prod IN SCHEMA public
  GRANT SELECT ON TABLES TO fitscape_readonly;
SQL

echo "FitScape databases and roles created."
