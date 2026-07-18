#!/bin/bash
set -euo pipefail

if [[ "${FIXTURE_GATE_FAIL:-0}" == "1" ]]; then
  echo "FIXTURE_GATE status=failed reason=requested-by-FIXTURE_GATE_FAIL"
  exit 1
fi

test -f src/alpha.txt
test -f src/beta.txt
test -f src/finale.txt
echo "FIXTURE_GATE status=passed"
