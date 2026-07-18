#!/usr/bin/env python3
"""
fix_ledc_api.py — convert ESP32 Arduino CORE 2.x LEDC API to CORE 3.x.

The ESP32 core 3.x REMOVED ledcSetup()/ledcAttachPin() and changed ledcWrite() to
take the PIN (not the channel). Correct 3.x usage:
    ledcAttach(pin, freqHz, resolutionBits);   // auto-assigns a channel
    ledcWrite(pin, duty);
This script rewrites the common 2.x pattern robustly, including #define'd channel names.

Patterns handled:
  2.x:
    #define CH 0
    ledcSetup(CH, 5000, 8);
    ledcAttachPin(ENA, CH);
    ledcWrite(CH, duty);
  3.x:
    ledcAttach(ENA, 5000, 8);
    ledcWrite(ENA, duty);

Run: python3 tools/fix_ledc_api.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKETCHES = os.path.join(ROOT, "sketches")

setup_re = re.compile(r'^\s*ledcSetup\s*\(\s*([A-Za-z0-9_]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*;', re.M)
attach_re = re.compile(r'ledcAttachPin\s*\(\s*([^,]+?)\s*,\s*([A-Za-z0-9_]+)\s*\)', re.M)
write_re  = re.compile(r'ledcWrite\s*\(\s*([A-Za-z0-9_]+)\s*,', re.M)

changed = 0
for pid in sorted(os.listdir(SKETCHES)):
    d = os.path.join(SKETCHES, pid)
    ino = os.path.join(d, f"{pid}.ino")
    if not os.path.isfile(ino) or pid == "_ref":
        continue
    with open(ino, encoding="utf-8") as f:
        src = f.read()

    # Collect #define CH val  (capture macro channel names -> literal)
    defines = dict(re.findall(r'#define\s+([A-Za-z_][A-Za-z0-9_]*)\s+(\d+)', src))

    def lit(name):
        n = name.strip()
        if n.isdigit():
            return int(n)
        return int(defines.get(n, -1))

    ch_map = {}  # resolved channel int -> (pin, freq, res)
    for m in attach_re.finditer(src):
        pin, ch_name = m.group(1).strip(), m.group(2).strip()
        ch = lit(ch_name)
        freq, res = 5000, 8
        for sm in setup_re.finditer(src):
            if lit(sm.group(1)) == ch:
                freq, res = int(sm.group(2)), int(sm.group(3))
        ch_map[ch] = (pin, freq, res)

    if not ch_map:
        continue

    out = src
    out = setup_re.sub("", out)  # drop ledcSetup lines

    def repl_attach(m):
        pin, ch_name = m.group(1).strip(), m.group(2).strip()
        ch = lit(ch_name)
        pin, freq, res = ch_map.get(ch, (pin, 5000, 8))
        return f"ledcAttach({pin}, {freq}, {res})"
    out = attach_re.sub(repl_attach, out)

    def repl_write(m):
        ch_name = m.group(1).strip()
        ch = lit(ch_name)
        if ch in ch_map:
            pin, _, _ = ch_map[ch]
            return f"ledcWrite({pin},"
        return m.group(0)
    out = write_re.sub(repl_write, out)

    if out != src:
        with open(ino, "w", encoding="utf-8") as f:
            f.write(out)
        changed += 1
        print(f"fixed LEDC API in {pid}")

print(f"Done. {changed} file(s) rewritten.")
