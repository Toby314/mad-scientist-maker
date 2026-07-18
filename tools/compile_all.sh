#!/usr/bin/env bash
# compile_all.sh — verify every sketch actually compiles on ESP32.
# Honors per-file header directives:
#   // COMPILE_FQBN: <fqbn>   -> compile for this board (e.g. esp32:esp32:esp32cam)
#   // COMPILE_SKIP: <reason> -> skip (e.g. needs ESP-IDF Zigbee; not buildable here)
# Default FQBN (no directive) = esp32:esp32:esp32
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0; FAIL=0; SKIP=0; FAILS=""
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

shopt -s nullglob
inos=( sketches/*/*.ino )
if [ ${#inos[@]} -eq 0 ]; then echo "No sketches found."; exit 2; fi

for ino in "${inos[@]}"; do
  head1="$(head -1 "$ino")"
  fqbn="esp32:esp32:esp32"

  if echo "$head1" | grep -q "COMPILE_SKIP"; then
    echo "SKIP (directive): $ino"
    SKIP=$((SKIP+1)); continue
  fi
  if echo "$head1" | grep -q "COMPILE_FQBN:"; then
    fqbn="$(echo "$head1" | sed 's/.*COMPILE_FQBN:[[:space:]]*//; s/[[:space:]]*$//')"
  fi

  log="$TMP/$(basename "$ino" .ino).log"
  if arduino-cli compile --fqbn "$fqbn" --build-path "$TMP/build_$(basename "$ino" .ino)" "$ino" >"$log" 2>&1; then
    echo "PASS: $ino"
    PASS=$((PASS+1))
  else
    echo "FAIL: $ino"
    tail -8 "$log"
    FAIL=$((FAIL+1)); FAILS="$FAILS $ino"
  fi
done

echo "=== SUMMARY: PASS=$PASS FAIL=$FAIL SKIP=$SKIP ==="
if [ "$FAIL" -gt 0 ]; then
  echo "FAILED:$FAILS"
  exit 1
fi
exit 0
