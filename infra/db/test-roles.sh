#!/bin/bash
# Verifies FitScape's database roles and permissions (see db/init/01-databases.sh).
#
# Usage (on the homelab, from infra/):  ./db/test-roles.sh [container] [host]
#   container  defaults to fitscape-db-1
#   host       defaults to 127.0.0.1; pass 192.168.68.15 to test over the network path
#
# Creates and drops a scratch table in each database. Safe on a fresh stack. On prod it
# only touches a table named _role_probe, which it removes afterwards.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
set -a; . ./.env; set +a

CONTAINER=${1:-fitscape-db-1}
HOST=${2:-127.0.0.1}
pass=0; fail=0

password_for() {
  case $1 in
    fitscape_dev) echo "$FITSCAPE_DEV_PASSWORD" ;;
    fitscape_test) echo "$FITSCAPE_TEST_PASSWORD" ;;
    fitscape_prod) echo "$FITSCAPE_PROD_PASSWORD" ;;
    fitscape_readonly) echo "$FITSCAPE_READONLY_PASSWORD" ;;
    *) echo "not-a-real-password" ;;
  esac
}

run_sql() { # role db sql [password]
  local password=${4:-$(password_for "$1")}
  docker exec -e PGPASSWORD="$password" "$CONTAINER" \
    psql -h "$HOST" -U "$1" -d "$2" -v ON_ERROR_STOP=1 -tAc "$3" 2>&1
}

check() { # role db sql expect(ok|deny) label [password]
  local role=$1 db=$2 sql=$3 expect=$4 label=$5 password=${6:-} out got result
  out=$(run_sql "$role" "$db" "$sql" "$password")
  if grep -qiE "denied|FATAL|ERROR" <<<"$out"; then got=deny; else got=ok; fi
  if [ "$got" = "$expect" ]; then pass=$((pass + 1)); result=PASS; else fail=$((fail + 1)); result=FAIL; fi
  printf '%s  %-18s -> %-14s expect %-4s | %s\n' "$result" "$role" "$db" "$expect" "$label"
  [ "$result" = FAIL ] && printf '      got: %s\n' "$(head -1 <<<"$out")"
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

check fitscape_prod fitscape_prod "create table _role_probe(x int); insert into _role_probe values (42)" ok "prod owner can create + insert"
check fitscape_readonly fitscape_prod "select x from _role_probe" ok "readonly reads tables created later"
check fitscape_readonly fitscape_prod "insert into _role_probe values (1)" deny "readonly cannot insert"
check fitscape_readonly fitscape_prod "create table _hack(x int)" deny "readonly cannot create tables"
check fitscape_readonly fitscape_dev "select 1" deny "readonly cannot reach dev"
check fitscape_prod fitscape_prod "drop table _role_probe" ok "cleanup"

echo "== $pass passed, $fail failed"
[ "$fail" -eq 0 ]
