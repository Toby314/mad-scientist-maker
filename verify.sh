#!/usr/bin/env bash
# verify.sh — one command to verify Phase 3A end-to-end.
# 1) compile every sketch on real ESP32 (arduino-cli)
# 2) regenerate the web sketch data from the verified .ino files
# 3) run the engine + DOM test suites
set -e
cd "$(dirname "$0")"

echo "=== 1/3 compile_all sketches ==="
bash tools/compile_all.sh

echo "=== 2/3 regenerate js/sketches-data.js ==="
python3 tools/build_sketch_data.py

echo "=== 3/3 web tests ==="
node engine.test.js
node test/dom.test.js

echo "=== ALL CHECKS PASSED ==="
