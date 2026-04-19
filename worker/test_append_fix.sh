#!/usr/bin/env bash
# Synthetic test for the Worker append bug fix (2026-04-19).
# Runs read-only probes + one self-cleaning write cycle against
# Existing Client Reqs!Z1999 (far-out test cell, same pattern used
# during the 2026-04-17 action/mode alias verification).
#
# Pre-conditions:
#   - Local token available at ~/Agents/.secrets/command_center_token
#   - Network reachability to the Worker
#
# Expected results AFTER the fix ships:
#   T1  200  bounded append with valid appendRange
#   T2  400  bounded append with missing appendRange on critical tab
#   T3  400  bounded append with malformed appendRange
#   T4  400  unknown tab on POST /
#   T5  400  unknown tab on GET /?tab=
#   T6  200  update on critical tab (not affected by fail-closed)
#   T7  200  append on non-critical tab without appendRange (back-compat)
#
# Expected results BEFORE the fix ships (to prove the tests distinguish):
#   T1  400 or different behavior (unknown field `appendRange`)
#   T2  200 (fail-open, lands in phantom zone)
#   T3  200 (no regex validation exists)
#   T4  200 (no allow-list exists)
#   T5  200 (no allow-list exists)
#   T6  200
#   T7  200

set -u
W='https://command-center-api.willchasecreate.workers.dev'
T="$(cat "$HOME/Agents/.secrets/command_center_token")"

probe() {
  local name="$1"; shift
  local expect="$1"; shift
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$@")
  if [[ "$code" == "$expect" ]]; then
    echo "  PASS  $name  HTTP $code"
    return 0
  else
    echo "  FAIL  $name  expected $expect got $code"
    return 1
  fi
}

fails=0

echo "=== T1: bounded append on critical tab, valid appendRange (expect 200) ==="
probe "T1_append_bounded_valid" 200 \
  -X POST "$W/" \
  -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"action":"append","tab":"Existing Client Reqs","appendRange":"Z1998:Z1999","values":[[""]]}' || ((fails++))

echo "=== T2: bounded append missing appendRange on critical tab (expect 400) ==="
probe "T2_append_missing_appendRange" 400 \
  -X POST "$W/" \
  -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"action":"append","tab":"Existing Client Reqs","values":[[""]]}' || ((fails++))

echo "=== T3: bounded append with malformed appendRange (expect 400) ==="
probe "T3_append_malformed_appendRange" 400 \
  -X POST "$W/" \
  -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"action":"append","tab":"Existing Client Reqs","appendRange":"Sheet!A1","values":[[""]]}' || ((fails++))

echo "=== T4: unknown tab on POST / (expect 400) ==="
probe "T4_unknown_tab_post" 400 \
  -X POST "$W/" \
  -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"action":"update","tab":"Secret Tab","range":"A1","values":[["x"]]}' || ((fails++))

echo "=== T5: unknown tab on GET /?tab= (expect 400) ==="
probe "T5_unknown_tab_get" 400 \
  "$W/?tab=Secret+Tab" || ((fails++))

echo "=== T6: update on critical tab, unaffected by fail-closed (expect 200) ==="
probe "T6_update_unaffected" 200 \
  -X POST "$W/" \
  -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"action":"update","tab":"Existing Client Reqs","range":"Z1999","values":[[""]]}' || ((fails++))

echo "=== T7: append on non-critical tab without appendRange (expect 200) ==="
# NOTE: This writes a blank row to Tasks & To-Dos. Safe because blank
# is filtered by the dashboard parseRows.js. If you want a zero-impact
# test, skip this one (dry-run by commenting out).
# probe "T7_noncritical_append_backcompat" 200 \
#   -X POST "$W/" \
#   -H "Authorization: Bearer $T" \
#   -H 'Content-Type: application/json' \
#   -d '{"action":"append","tab":"Tasks & To-Dos","values":[[""]]}' || ((fails++))
echo "  SKIP  T7 (writes to Tasks & To-Dos — manually enable if desired)"

echo
if (( fails == 0 )); then
  echo "ALL TESTS PASS"
  exit 0
else
  echo "$fails TEST(S) FAILED"
  exit 1
fi
