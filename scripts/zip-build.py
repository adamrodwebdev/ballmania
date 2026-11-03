"""Zips a build folder for a portal: index.html at the root, forward slashes in paths.

Windows PowerShell 5.1's Compress-Archive writes backslashes, which break the game once
unpacked on a Linux server; this script does not. It keeps no archive a portal refuses: no
index.html at the root, or a name with a space, a backslash or a letter outside ASCII
(Yandex rule 1.22). It prints the unpacked size: Yandex takes 100 MB at most (rule 1.21).

Usage: python scripts/zip-build.py dist-playgama marketing/playgama/out/ball-mania-1.4.0.zip
"""

import os
import re
import sys
import zipfile

# Letters, digits, dots, dashes and underscores: names every portal unpacks as they are.
PLAIN_NAME = re.compile(r"[A-Za-z0-9._/-]+")

root, out = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(out), exist_ok=True)
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
    for base, _, files in os.walk(root):
        for name in sorted(files):
            if name == "robots.txt":
                continue
            full = os.path.join(base, name)
            archive.write(full, os.path.relpath(full, root).replace(os.sep, "/"))
with zipfile.ZipFile(out) as archive:
    entries = archive.infolist()
names = [entry.filename for entry in entries]
unpacked = sum(entry.file_size for entry in entries)
odd = [name for name in names if not PLAIN_NAME.fullmatch(name)]
print(f"{out}: {len(names)} files, {os.path.getsize(out) // 1024} KB")
print(f"unpacked: {unpacked / 1_000_000:.1f} MB")
print("index.html at the root:", "index.html" in names)
print("names with a space, a backslash or another character:", odd or "none")
if "index.html" not in names or odd:
    # A portal would refuse it: no archive to send by mistake.
    os.remove(out)
    sys.exit(f"{out} not kept")
