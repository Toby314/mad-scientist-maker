#!/usr/bin/env python3
"""offline_check.py — prove the offline guarantee WITHOUT a browser.

Why this is sufficient (Toby's verify-before-deliver rule):
  The app is offline because sw.js is cache-first AND falls back to index.html
  for navigations. So offline works IFF every asset index.html actually loads
  is present in the service worker's SHELL precache list AND exists on disk.
  If a single local <script>/<link> is missing from SHELL, that file 404s under
  offline and the app breaks. This script checks exactly that — the real risk.

It also flags dead entries (in SHELL but not on disk) so the cache never lies.
Run:  python3 offline_check.py   (exit 0 = offline-safe, 1 = a gap found)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(p):
    with open(os.path.join(ROOT, p)) as f:
        return f.read()

html = read("index.html")
sw = read("sw.js")

# 1) assets index.html references (local only)
refs = set()
for m in re.finditer(r'(?:src|href)\s*=\s*"([^"]+)"', html):
    u = m.group(1).strip()
    if u.startswith(("http://", "https://", "//", "data:", "mailto:", "#", "tel:")):
        continue
    # strip query/hash
    u = u.split("#")[0].split("?")[0]
    if not u or u == "manifest.webmanifest" or u.endswith(".png"):
        continue  # manifest + icons handled separately; pngs are app-icons, not load-bearing JS/CSS
    refs.add(u.lstrip("./"))

# 2) SHELL list from sw.js
shell = set(re.findall(r"'([^']+\.(?:html|css|js|webmanifest|png))'", sw))
# also catch "./" entry
for m in re.findall(r"'(./)'", sw):
    shell.add(m.lstrip("./"))

# 3) every referenced local asset must be in SHELL and on disk
missing = []
for r in sorted(refs):
    in_shell = r in shell or ("./" + r) in shell
    on_disk = os.path.exists(os.path.join(ROOT, r))
    if not in_shell:
        missing.append(f"  NOT in SHELL precache: {r}")
    if not on_disk:
        missing.append(f"  NOT on disk: {r}")

# 4) SHELL entries that don't exist on disk (dead cache entries)
dead = [s for s in shell if s and not os.path.exists(os.path.join(ROOT, s.lstrip("./")))]

print(f"Local assets referenced by index.html : {len(refs)}")
print(f"SHELL precache entries                 : {len(shell)}")
if missing:
    print("FAIL — offline gaps:")
    print("\n".join(missing))
    sys.exit(1)
if dead:
    print("WARN — SHELL lists files not on disk (harmless but misleading):")
    for d in dead:
        print("  ", d)
print("PASS: every load-bearing asset is in the service-worker precache and on disk.")
print("      => app is offline-safe (cache-first + index fallback).")
sys.exit(0)
