#!/bin/bash
# Verifies FitScape's database roles and permissions (see db/init/01-databases.sh).
#
# Usage (on the homelab, from infra/):  ./db/test-roles.sh [container] [host]
#   container  defaults to fitscape-db-1
#   host       defaults to 127.0.0.1; pass 192.168.68.15 to test over the network path
#
# Creates and drops a scratch table in prod named _role_probe, and removes it afterwards.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Load only the four app passwords (not the superuser's), without exporting them.
env_value() { grep -m1 "^$1=" .env | cut -d= -f2-; }
DEV_PW=$(env_value FITSCAPE_DEV_PASSWORD)
TEST_PW=$(env_value FITSCAPE_TEST_PASSWORD)
PROD_PW=$(env_value FITSCAPE_PROD_PASSWORD)
RO_PW=$(env_value FITSCAPE_READONLY_PASSWORD)

CONTAINER=${1:-fitscape-db-1}
HOST=${2:-127.0.0.1}
pass=0; fail=0

if ! docker exec "$CONTAINER" true 2>/dev/null; then
  echo "Container $CONTAINER is not running." >&2
  exit 2
fi

password_for() {
  case $1 in
    fitscape_dev) echo "$DEV_PW" ;;
    fitscape_test) echo "$TEST_PW" ;;
    fitscape_prod) echo "$PROD_PW" ;;
    fitscape_readonly) echo "$RO_PW" ;;
    *) echo "not-a-real-password" ;;
  esac
}

check() { # role db sql expect(ok|deny) label [password]
  local role=$1 db=$2 sql=$3 expect=$4 label=$5 out got result
  local password=${6:-$(password_for "$role")}
  # `-e PGPASSWORD` with no value forwards it from this environment, so it never appears in `ps`.
  out=$(PGPASSWORD="$password" docker exec -e PGPASSWORD "$CONTAINER" \
    psql -h "$HOST" -U "$role" -d "$db" -v ON_ERROR_STOP=1 -tAc "$sql" 2>&1)
  # psql exits 0 on success, non-zero on connection failure or any SQL error.
  if [ $? -eq 0 ]; then got=ok; else got=deny; fi
  if [ "$got" = "$expect" ]; then pass=$((pass + 1)); result=PASS; else fail=$((fail + 1)); result=FAIL; fi
  printf '%s  %-18s -> %-14s expect %-4s | %s\n' "$result" "$role" "$db" "$expect" "$label"
  if [ "$result" = FAIL ]; then printf '      got: %s\n' "$(head -1 <<<"$out")"; fi
}

echo "Testing $CONTAINER via $HOST"
for role in fitscape_dev fitscape_test fitscape_prod; do
  for db in fitscape_dev fitscape_test fitscape_prod; do
    if [ "$role" = "$db" ]; then expect=ok; else expect=deny; fi
    check "$role" "$db" "select 1" "$expect" "connect"
  done
done

check fitscape_dev fitscape_dev "select 1" deny "wrong password rejected" "wrong-password"
check nobody_here fitscape_prod "select 1" deny "unknown user rejected"
check fitscape_dev postgres "select 1" deny "app role kept out of admin database"
check fitscape_dev template1 "select 1" deny "app role kept out of template1"

check fitscape_prod fitscape_prod "create table _role_probe(id serial primary key, x int); insert into _role_probe(x) values (42)" ok "prod owner can create + insert"
check fitscape_readonly fitscape_prod "select x from _role_probe" ok "readonly reads tables created later"
check fitscape_readonly fitscape_prod "select last_value from _role_probe_id_seq" ok "readonly reads sequences created later"
check fitscape_readonly fitscape_prod "insert into _role_probe(x) values (1)" deny "readonly cannot insert"
check fitscape_readonly fitscape_prod "create table _hack(x int)" deny "readonly cannot create tables"
check fitscape_readonly fitscape_dev "select 1" deny "readonly cannot reach dev"
check fitscape_prod fitscape_prod "drop table _role_probe" ok "cleanup"

echo "== $pass passed, $fail failed"
[ "$fail" -eq 0 ]
